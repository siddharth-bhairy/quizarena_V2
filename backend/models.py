from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_base64 = Column(Text, nullable=True)  # small data-URL image, set via PATCH /auth/me/avatar
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("GameSession", back_populates="user")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(30), index=True, nullable=False)   # "math" | "geography"
    difficulty = Column(String(10), index=True, default="easy")  # easy | medium | hard
    question_text = Column(String(500), nullable=False)
    options = Column(JSON, nullable=False)          # ["opt1", "opt2", "opt3", "opt4"]
    correct_index = Column(Integer, nullable=False)  # index into options[]


class GameSession(Base):
    """A single completed round (used for both solo play and multiplayer)."""
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(30), nullable=False)
    difficulty = Column(String(10), nullable=False)
    score = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    room_id = Column(String(50), nullable=True)   # set only for multiplayer rounds
    played_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class Follow(Base):
    """A directed follow relationship: follower_id follows followee_id."""
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    followee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("follower_id", "followee_id", name="uq_follow_pair"),)
