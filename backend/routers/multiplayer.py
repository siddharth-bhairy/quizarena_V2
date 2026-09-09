import asyncio
import json
import random
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

import models
from auth import get_user_from_token_str
from database import SessionLocal

router = APIRouter(tags=["multiplayer"])

QUESTIONS_PER_ROUND = 5
SECONDS_PER_QUESTION = 15


class Room:
    """Holds everything about one live multiplayer match."""

    def __init__(self, room_id: str, category: str):
        self.room_id = room_id
        self.category = category
        self.connections: Dict[int, WebSocket] = {}   # user_id -> websocket
        self.usernames: Dict[int, str] = {}
        self.scores: Dict[int, int] = {}
        self.questions: List[models.Question] = []
        self.current_answers: Dict[int, int] = {}      # user_id -> selected_index, per question
        self.started = False
        self.current_index = -1

    async def broadcast(self, message: dict):
        dead = []
        for uid, ws in self.connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections.pop(uid, None)

    def leaderboard(self):
        return sorted(
            [{"username": self.usernames[uid], "score": s} for uid, s in self.scores.items()],
            key=lambda r: r["score"],
            reverse=True,
        )


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def get_or_create(self, room_id: str, category: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id, category)
        return self.rooms[room_id]

    def remove_if_empty(self, room_id: str):
        room = self.rooms.get(room_id)
        if room and not room.connections:
            del self.rooms[room_id]


manager = RoomManager()


async def run_round(room: Room):
    """Server-driven game loop: pushes one question at a time to everyone
    in the room, waits for answers (or the timer), then reveals results."""
    db = SessionLocal()
    try:
        room.questions = (
            db.query(models.Question)
            .filter(models.Question.category == room.category)
            .all()
        )
        random.shuffle(room.questions)
        room.questions = room.questions[:QUESTIONS_PER_ROUND]

        for uid in room.connections:
            room.scores.setdefault(uid, 0)

        for idx, question in enumerate(room.questions):
            room.current_index = idx
            room.current_answers = {}

            await room.broadcast({
                "type": "question",
                "index": idx,
                "total": len(room.questions),
                "question_id": question.id,
                "text": question.question_text,
                "options": question.options,
                "seconds": SECONDS_PER_QUESTION,
            })

            # wait for either everyone to answer or the timer to run out
            for _ in range(SECONDS_PER_QUESTION * 2):
                await asyncio.sleep(0.5)
                if len(room.current_answers) >= len(room.connections) and room.connections:
                    break

            for uid, selected in room.current_answers.items():
                if selected == question.correct_index:
                    room.scores[uid] = room.scores.get(uid, 0) + 20  # 20 pts per correct answer

            await room.broadcast({
                "type": "reveal",
                "question_id": question.id,
                "correct_index": question.correct_index,
                "leaderboard": room.leaderboard(),
            })
            await asyncio.sleep(2)

        # persist a GameSession per participant
        for uid, score in room.scores.items():
            db.add(models.GameSession(
                user_id=uid,
                category=room.category,
                difficulty="mixed",
                score=score,
                correct_count=score // 20,
                total_questions=len(room.questions),
                room_id=room.room_id,
            ))
        db.commit()

        await room.broadcast({"type": "game_over", "leaderboard": room.leaderboard()})
    finally:
        db.close()


@router.websocket("/ws/room/{room_id}")
async def room_socket(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...),
    category: str = Query("geography"),
):
    db = SessionLocal()
    user = get_user_from_token_str(token, db)
    db.close()
    if not user:
        await websocket.close(code=4401)  # custom "unauthorized" close code
        return

    await websocket.accept()
    room = manager.get_or_create(room_id, category)
    room.connections[user.id] = websocket
    room.usernames[user.id] = user.username

    await room.broadcast({
        "type": "player_joined",
        "username": user.username,
        "players": list(room.usernames.values()),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            action = data.get("action")

            if action == "start" and not room.started:
                room.started = True
                asyncio.create_task(run_round(room))

            elif action == "answer":
                # only the first answer per question per user counts
                if user.id not in room.current_answers:
                    room.current_answers[user.id] = data.get("selected_index")

    except WebSocketDisconnect:
        room.connections.pop(user.id, None)
        await room.broadcast({
            "type": "player_left",
            "username": user.username,
            "players": list(room.usernames.values()),
        })
        manager.remove_if_empty(room_id)
