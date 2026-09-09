from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user, decode_access_token
from database import get_db

router = APIRouter(prefix="/social", tags=["social"])

# A version of the auth dependency that doesn't *require* a token — public
# profile/list endpoints work for anyone, but include `is_following` when
# the caller happens to be logged in.
_optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_optional_user(
    token: Optional[str] = Depends(_optional_oauth2), db: Session = Depends(get_db)
) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return db.query(models.User).filter(models.User.id == int(payload.get("sub"))).first()
    except Exception:
        return None


def _get_user_or_404(db: Session, username: str) -> models.User:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _followers_count(db: Session, user_id: int) -> int:
    return db.query(models.Follow).filter(models.Follow.followee_id == user_id).count()


def _following_count(db: Session, user_id: int) -> int:
    return db.query(models.Follow).filter(models.Follow.follower_id == user_id).count()


def _is_following(db: Session, follower_id: Optional[int], followee_id: int) -> bool:
    if follower_id is None:
        return False
    return (
        db.query(models.Follow)
        .filter(models.Follow.follower_id == follower_id, models.Follow.followee_id == followee_id)
        .first()
        is not None
    )


@router.get("/users/{username}", response_model=schemas.PublicProfile)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
    viewer: Optional[models.User] = Depends(get_optional_user),
):
    user = _get_user_or_404(db, username)
    return schemas.PublicProfile(
        username=user.username,
        avatar_base64=user.avatar_base64,
        followers_count=_followers_count(db, user.id),
        following_count=_following_count(db, user.id),
        is_following=_is_following(db, viewer.id if viewer else None, user.id),
    )


@router.post("/follow/{username}", response_model=schemas.FollowActionResponse)
def follow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = _get_user_or_404(db, username)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")

    existing = (
        db.query(models.Follow)
        .filter(models.Follow.follower_id == current_user.id, models.Follow.followee_id == target.id)
        .first()
    )
    if not existing:
        db.add(models.Follow(follower_id=current_user.id, followee_id=target.id))
        db.commit()

    return schemas.FollowActionResponse(
        is_following=True, followers_count=_followers_count(db, target.id)
    )


@router.delete("/follow/{username}", response_model=schemas.FollowActionResponse)
def unfollow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = _get_user_or_404(db, username)
    db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id, models.Follow.followee_id == target.id
    ).delete()
    db.commit()

    return schemas.FollowActionResponse(
        is_following=False, followers_count=_followers_count(db, target.id)
    )


@router.get("/followers/{username}", response_model=List[schemas.PublicProfile])
def list_followers(
    username: str,
    db: Session = Depends(get_db),
    viewer: Optional[models.User] = Depends(get_optional_user),
):
    user = _get_user_or_404(db, username)
    follower_ids = [
        f.follower_id
        for f in db.query(models.Follow).filter(models.Follow.followee_id == user.id).all()
    ]
    people = db.query(models.User).filter(models.User.id.in_(follower_ids)).all()
    return [
        schemas.PublicProfile(
            username=p.username,
            avatar_base64=p.avatar_base64,
            followers_count=_followers_count(db, p.id),
            following_count=_following_count(db, p.id),
            is_following=_is_following(db, viewer.id if viewer else None, p.id),
        )
        for p in people
    ]


@router.get("/following/{username}", response_model=List[schemas.PublicProfile])
def list_following(
    username: str,
    db: Session = Depends(get_db),
    viewer: Optional[models.User] = Depends(get_optional_user),
):
    user = _get_user_or_404(db, username)
    followee_ids = [
        f.followee_id
        for f in db.query(models.Follow).filter(models.Follow.follower_id == user.id).all()
    ]
    people = db.query(models.User).filter(models.User.id.in_(followee_ids)).all()
    return [
        schemas.PublicProfile(
            username=p.username,
            avatar_base64=p.avatar_base64,
            followers_count=_followers_count(db, p.id),
            following_count=_following_count(db, p.id),
            is_following=_is_following(db, viewer.id if viewer else None, p.id),
        )
        for p in people
    ]


@router.get("/users", response_model=List[schemas.PublicProfile])
def list_all_users(
    db: Session = Depends(get_db),
    viewer: Optional[models.User] = Depends(get_optional_user),
    limit: int = 30,
):
    """Simple 'browse players' list — used to discover people to follow."""
    people = db.query(models.User).order_by(models.User.created_at.desc()).limit(limit).all()
    return [
        schemas.PublicProfile(
            username=p.username,
            avatar_base64=p.avatar_base64,
            followers_count=_followers_count(db, p.id),
            following_count=_following_count(db, p.id),
            is_following=_is_following(db, viewer.id if viewer else None, p.id),
        )
        for p in people
    ]
