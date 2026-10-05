from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import auth_router, game, leaderboard, multiplayer, social
import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_data.seed()  # no-ops if questions already exist
    yield


app = FastAPI(title="QuizArena API", version="0.1.0", lifespan=lifespan)

# Demo-only: wide-open CORS so the static frontend can call the API from
# any origin. Lock this down to your real frontend domain before sharing
# the link with anyone outside your demo audience.
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://quizarena-v2.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(game.router)
app.include_router(leaderboard.router)
app.include_router(multiplayer.router)
app.include_router(social.router)

app.mount("/", StaticFiles(directory="static", html=True), name="static")
