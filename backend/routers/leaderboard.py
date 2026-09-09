from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/{category}", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(category: str, db: Session = Depends(get_db), limit: int = 10):
    """Best score per user for a category, highest first.

    Aggregated in Python on purpose: an earlier version joined GameSession
    back onto itself by (user_id, score) without also constraining on
    category, so a Math score and a Geography score of the same value
    could cross-match and leak into the wrong leaderboard. Grouping here
    avoids that class of bug entirely.
    """
    sessions = (
        db.query(models.GameSession, models.User.username)
        .join(models.User, models.User.id == models.GameSession.user_id)
        .filter(models.GameSession.category == category)
        .order_by(models.GameSession.played_at.desc())
        .all()
    )

    best_by_user = {}
    for session, username in sessions:
        current = best_by_user.get(username)
        if current is None or session.score > current.score:
            best_by_user[username] = session

    ranked = sorted(best_by_user.items(), key=lambda kv: kv[1].score, reverse=True)[:limit]

    return [
        schemas.LeaderboardEntry(username=username, best_score=session.score, played_at=session.played_at)
        for username, session in ranked
    ]
