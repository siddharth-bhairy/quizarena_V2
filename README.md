# QuizArena — Full Project (Backend + React Frontend)

```
quizarena_v2/
├── backend/    FastAPI API — auth, quiz engine, multiplayer rooms, leaderboard
└── frontend/   React (Vite) UI — dark neon arena theme, Flash Anzan, Flag Guess
```

## Quick start (two terminals)

**Terminal 1 — backend**
```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1      # Windows PowerShell — use `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs at `http://127.0.0.1:8000` (docs at `/docs`).

**Terminal 2 — frontend**
```bash
cd frontend
npm install
copy .env.example .env         # Windows — use `cp .env.example .env` on Mac/Linux
npm run dev
```
Runs at `http://127.0.0.1:5173` — open this in your browser.

Sign up, log in, and you'll land on the Arena dashboard with four duel
tiles (Math, Geography, Memory, Logic — the last two are "Soon" stubs).

## What's playable right now

| Category | Classic Quiz | Duel mode |
|---|---|---|
| Math | 5-question adaptive quiz | **Flash Anzan** — numbers flash on screen, sum them up |
| Geography | 5-question adaptive quiz | **Flag Guess** — name the country from its flag, 8s/flag |

All four modes save a score to the backend and feed the leaderboard.

## Details

See `backend/README.md` for API structure, framework rationale, and cloud
deployment options. See `frontend/README.md` for the design system, file
layout, and how to extend it (more flags, real ELO rating, Memory/Logic
modes).
