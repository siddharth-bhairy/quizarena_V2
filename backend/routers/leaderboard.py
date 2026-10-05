from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/{category}", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(category: str, db: Session = Depends(get_db), limit: int = 10):
    """Total score per user for a category, highest first."""
    sessions = (
        db.query(models.GameSession, models.User.username)
        .join(models.User, models.User.id == models.GameSession.user_id)
        .filter(models.GameSession.category == category)
        .order_by(models.GameSession.played_at.desc())
        .all()
    )

    totals = {}
    last_played = {}
    for session, username in sessions:
        totals[username] = totals.get(username, 0) + session.score
        if username not in last_played or session.played_at > last_played[username]:
            last_played[username] = session.played_at

    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:limit]

    return [
        schemas.LeaderboardEntry(username=username, best_score=total, played_at=last_played[username])
        for username, total in ranked
    ]