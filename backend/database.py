import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# For the demo we use SQLite (zero setup). For a real cloud deployment,
# set DATABASE_URL to a Postgres connection string, e.g.
#   postgresql://user:pass@host:5432/quizarena
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./quizarena.db")

# Neon, Supabase, and Heroku-style connection strings are often handed out
# as "postgres://", but SQLAlchemy 2.x only accepts "postgresql://" — this
# is the single most common deploy-time gotcha with those providers.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
