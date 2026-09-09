from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# Rough cap so a demo user can't stuff a multi-MB image into a TEXT column.
# The frontend already resizes to a small square before uploading, so this
# is a safety net, not the primary control.
MAX_AVATAR_CHARS = 400_000


@router.post("/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm gives us .username and .password (standard field names)
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token)


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/me/avatar", response_model=schemas.UserOut)
def update_avatar(
    payload: schemas.AvatarUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if len(payload.avatar_base64) > MAX_AVATAR_CHARS:
        raise HTTPException(status_code=400, detail="Image is too large — try a smaller photo")
    if not payload.avatar_base64.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Expected a data:image/... URL")

    user.avatar_base64 = payload.avatar_base64
    db.commit()
    db.refresh(user)
    return user
