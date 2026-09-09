from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    avatar_base64: Optional[str] = None

    class Config:
        from_attributes = True


class AvatarUpdate(BaseModel):
    avatar_base64: str  # a data URL, e.g. "data:image/jpeg;base64,...."


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Game ----------
class StartGameRequest(BaseModel):
    category: str            # "math" | "geography"
    num_questions: int = 5


class QuestionOut(BaseModel):
    id: int
    question_text: str
    options: List[str]
    difficulty: str
    # NOTE: correct_index is intentionally excluded so the client can't cheat

    class Config:
        from_attributes = True


class StartGameResponse(BaseModel):
    session_token: str       # opaque id tying together the questions served
    questions: List[QuestionOut]


class AnswerSubmission(BaseModel):
    question_id: int
    selected_index: int


class SubmitGameRequest(BaseModel):
    category: str
    difficulty: str
    answers: List[AnswerSubmission]


class SubmitGameResponse(BaseModel):
    score: int
    correct_count: int
    total_questions: int


class SubmitScoreRequest(BaseModel):
    """For game modes that don't pull questions from the bank (Flash Anzan,
    Flag Guess) — the client computes the score itself and just reports it."""
    category: str          # "math" | "geography"
    mode: str               # e.g. "flash_anzan", "flag_guess"
    score: int
    correct_count: int = 0
    total_questions: int = 0


class SubmitScoreResponse(BaseModel):
    status: str = "ok"
    score: int


class LeaderboardEntry(BaseModel):
    username: str
    best_score: int
    played_at: datetime

    class Config:
        from_attributes = True


# ---------- Social ----------
class PublicProfile(BaseModel):
    username: str
    avatar_base64: Optional[str] = None
    followers_count: int
    following_count: int
    is_following: bool = False   # relative to the requesting user, if authenticated


class FollowActionResponse(BaseModel):
    status: str = "ok"
    is_following: bool
    followers_count: int
