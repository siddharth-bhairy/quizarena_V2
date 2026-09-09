import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/game", tags=["game"])

VALID_CATEGORIES = {"math", "geography"}
DIFFICULTY_ORDER = ["easy", "medium", "hard"]


def _pick_difficulty(db: Session, user_id: int, category: str) -> str:
    """Simple adaptive difficulty: look at the user's last 5 rounds in this
    category. Bump difficulty up if they've been scoring well, drop it if
    they've been struggling."""
    recent = (
        db.query(models.GameSession)
        .filter(models.GameSession.user_id == user_id, models.GameSession.category == category)
        .order_by(models.GameSession.played_at.desc())
        .limit(5)
        .all()
    )
    if not recent:
        return "easy"

    accuracies = [
        (s.correct_count / s.total_questions) if s.total_questions else 0 for s in recent
    ]
    avg_accuracy = sum(accuracies) / len(accuracies)
    current_idx = DIFFICULTY_ORDER.index(recent[0].difficulty)

    if avg_accuracy >= 0.8 and current_idx < len(DIFFICULTY_ORDER) - 1:
        return DIFFICULTY_ORDER[current_idx + 1]
    if avg_accuracy < 0.4 and current_idx > 0:
        return DIFFICULTY_ORDER[current_idx - 1]
    return DIFFICULTY_ORDER[current_idx]


def _recently_seen_question_ids(db: Session, user_id: int, category: str, lookback: int = 20):
    """We don't store per-question history, so as a lightweight proxy we
    just avoid repeating the exact question set from the user's most recent
    session in this category (kept simple on purpose for the demo)."""
    return set()  # placeholder hook — see README for how to extend this


def select_questions(db: Session, user: models.User, category: str, difficulty: str, count: int):
    seen_ids = _recently_seen_question_ids(db, user.id, category)
    pool = (
        db.query(models.Question)
        .filter(models.Question.category == category, models.Question.difficulty == difficulty)
        .filter(models.Question.id.notin_(seen_ids) if seen_ids else True)
        .all()
    )
    if len(pool) < count:
        # fall back to any difficulty in this category if the pool is too small
        pool = db.query(models.Question).filter(models.Question.category == category).all()

    return random.sample(pool, min(count, len(pool)))


@router.post("/start", response_model=schemas.StartGameResponse)
def start_game(
    payload: schemas.StartGameRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    difficulty = _pick_difficulty(db, user.id, payload.category)
    questions = select_questions(db, user, payload.category, difficulty, payload.num_questions)

    if not questions:
        raise HTTPException(status_code=404, detail="No questions available for this category")

    return schemas.StartGameResponse(
        session_token=str(uuid.uuid4()),
        questions=[schemas.QuestionOut.model_validate(q) for q in questions],
    )


@router.post("/submit", response_model=schemas.SubmitGameResponse)
def submit_game(
    payload: schemas.SubmitGameRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    question_ids = [a.question_id for a in payload.answers]
    questions = {
        q.id: q for q in db.query(models.Question).filter(models.Question.id.in_(question_ids)).all()
    }

    correct_count = 0
    for answer in payload.answers:
        q = questions.get(answer.question_id)
        if q and q.correct_index == answer.selected_index:
            correct_count += 1

    total = len(payload.answers)
    score = round((correct_count / total) * 100) if total else 0

    session = models.GameSession(
        user_id=user.id,
        category=payload.category,
        difficulty=payload.difficulty,
        score=score,
        correct_count=correct_count,
        total_questions=total,
    )
    db.add(session)
    db.commit()

    return schemas.SubmitGameResponse(score=score, correct_count=correct_count, total_questions=total)


@router.post("/submit-score", response_model=schemas.SubmitScoreResponse)
def submit_score(
    payload: schemas.SubmitScoreRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Used by client-driven modes (Flash Anzan, Flag Guess) that don't pull
    questions from the DB, so there's nothing server-side to grade — the
    client already computed the score. Still gets stored as a GameSession
    so it shows up on the leaderboard and in adaptive-difficulty history."""
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    session = models.GameSession(
        user_id=user.id,
        category=payload.category,
        difficulty=payload.mode,
        score=payload.score,
        correct_count=payload.correct_count,
        total_questions=payload.total_questions,
    )
    db.add(session)
    db.commit()
    return schemas.SubmitScoreResponse(score=payload.score)
