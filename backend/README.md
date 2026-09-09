# QuizArena — Starter Project

A single-player + multiplayer quiz platform (Math & Geography) with JWT auth,
adaptive difficulty, and a live leaderboard. Built with **FastAPI**.

## Why FastAPI (over Flask / Django) for this project

| Need | FastAPI | Flask | Django |
|---|---|---|---|
| Real-time multiplayer (WebSockets) | Native, async, built-in | Needs Flask-SocketIO add-on | Needs Django Channels + extra setup |
| JWT auth | A few lines with `python-jose` | Similar effort, more boilerplate | Heavier — usually pulls in DRF + SimpleJWT |
| Auto API docs (Swagger/OpenAPI) | Built-in at `/docs`, free | Not built-in | Not built-in |
| Speed of building a demo | Fastest | Fast | Slower (batteries-included, more structure than you need) |
| Async performance | Best-in-class | Sync by default | Sync by default (ASGI support exists but bolted-on) |
| Cloud deploy (containers, Lambda) | Trivial — plays nicely with Docker, and with `Mangum` you can even run it on AWS Lambda to mirror the original serverless synopsis | Trivial | Works, but heavier image/cold start |

Since you need auth **and** real-time multiplayer **and** an easy path to
containerized cloud deployment, FastAPI is the best fit. Flask would need an
extra library for WebSockets; Django is more machinery than a demo project
needs (though its admin panel is nice if you ever want one for free).

## Project layout

```
quizarena/
├── main.py              # FastAPI app, mounts routers + static frontend
├── database.py          # SQLAlchemy engine/session (SQLite by default)
├── models.py             # User, Question, GameSession tables
├── schemas.py            # Pydantic request/response models
├── auth.py                # password hashing + JWT create/verify
├── seed_data.py           # sample Math & Geography questions
├── routers/
│   ├── auth_router.py     # /auth/signup, /auth/login
│   ├── game.py             # /game/start, /game/submit (solo play)
│   ├── leaderboard.py      # /leaderboard/{category}
│   └── multiplayer.py      # /ws/room/{room_id} — live multiplayer
├── static/index.html      # minimal demo UI (vanilla JS, no build step)
├── requirements.txt
└── Dockerfile
```

## Upgrading from an earlier copy of this project

This version adds a new `avatar_base64` column to `users`, a new `follows`
table (for the follow/following feature), and fixes a leaderboard bug (see
below). SQLite won't add new tables/columns to an existing `quizarena.db`
file on its own — if you already have one from a previous run, delete it
before starting the server again:

```bash
rm quizarena.db   # Windows: del quizarena.db
```

A fresh one gets created (and re-seeded with sample questions) automatically
on next startup.

**Follow feature:** `routers/social.py` adds:
- `POST /social/follow/{username}` / `DELETE /social/follow/{username}`
- `GET /social/users/{username}` — public profile with follower/following counts
- `GET /social/followers/{username}`, `GET /social/following/{username}`
- `GET /social/users` — simple "browse all players" list

**Leaderboard fix:** the previous version's `/leaderboard/{category}` query
joined a user's best score back onto `GameSession` by `(user_id, score)`
only, without also constraining on `category`. If you'd played, say, a
Geography round and a Math round with the same score, that join could
cross-match and leak a row into the wrong category's leaderboard. It's now
aggregated in Python instead of via that ambiguous SQL join, which avoids
the whole class of bug.

**Option D — GCP (Cloud Run + Firebase Hosting, genuinely free for a demo)**

Cloud Run's free tier isn't a 12-month trial like AWS's — it's always-free
up to 2 million requests/month, which a demo won't come close to. This is
the most "actually free forever" option of the three big clouds.

**Backend on Cloud Run:**
1. Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), then:
   ```bash
   gcloud auth login
   gcloud projects create quizarena-demo --set-as-default
   gcloud billing projects link quizarena-demo --billing-account=YOUR_BILLING_ID
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com
   ```
   (A billing account still has to be attached even though usage will stay
   in the free tier — Google requires it as a fraud check.)
2. From the `backend/` folder, build and deploy in one step:
   ```bash
   gcloud run deploy quizarena-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars JWT_SECRET=some-random-secret-here \
     --max-instances 1
   ```
   `--max-instances 1` matters here specifically: the multiplayer rooms
   live in memory in `routers/multiplayer.py`. If Cloud Run scaled to 2+
   instances, two players could land on different instances and never see
   each other in the same room. Capping at 1 instance keeps it correct for
   a demo (it just means the backend can't handle heavy concurrent load —
   fine for showing a few people the app).
3. `gcloud run deploy` prints a `*.run.app` URL when it finishes — that's
   your live backend. Confirm it works: `curl https://your-url.run.app/leaderboard/math`

**Frontend on Firebase Hosting:**
1. ```bash
   npm install -g firebase-tools
   firebase login
   cd frontend
   firebase init hosting   # pick "Use an existing project" → quizarena-demo,
                            # public directory → dist, single-page app → Yes
   ```
2. Point the build at your Cloud Run URL, then build and deploy:
   ```bash
   echo "VITE_API_URL=https://your-backend-url.run.app" > .env
   npm run build
   firebase deploy --only hosting
   ```
3. Firebase prints your live URL (something like `quizarena-demo.web.app`)
   — that's the link you share.

**One more thing to fix before sharing the link:** the backend's CORS is
currently wide open (`allow_origins=["*"]` in `main.py`). For a real deploy,
narrow that to your Firebase URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://quizarena-demo.web.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
then redeploy the backend (`gcloud run deploy ...` again).

## Giving it a persistent database (recommended before deploying)

SQLite is a file on disk — fine for running locally, but **Cloud Run
containers are ephemeral**. Every restart, redeploy, or scale-to-zero (which
happens automatically after inactivity on the free tier) wipes that file.
Deploy as-is and your leaderboard/accounts will reset unpredictably.

The code already supports swapping in Postgres via the `DATABASE_URL` env
var (see `database.py`) — nothing else in the codebase needs to change.

**Recommended: Neon (free, works from anywhere, not GCP-specific)**

[Neon](https://neon.tech) gives you a real serverless Postgres database on
a permanent free tier — no credit card required, and it works from Cloud
Run (or anywhere) since it's just a connection string over the network.

1. Sign up at neon.tech, create a project → a database called `quizarena`
   is created for you.
2. Copy the connection string it gives you. It'll look like:
   ```
   postgres://user:password@ep-something.us-east-2.aws.neon.tech/quizarena?sslmode=require
   ```
3. Pass it to Cloud Run as an env var when you deploy:
   ```bash
   gcloud run deploy quizarena-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars JWT_SECRET=some-random-secret,DATABASE_URL="postgres://user:password@ep-something.us-east-2.aws.neon.tech/quizarena?sslmode=require" \
     --max-instances 1
   ```
   (Note `database.py` automatically rewrites `postgres://` → `postgresql://`
   for you — Neon/Supabase hand out the former, SQLAlchemy 2.x needs the
   latter. This is the single most common gotcha with these providers, so
   it's handled for you already.)
4. On first startup, `Base.metadata.create_all()` in `main.py`'s lifespan
   hook creates all the tables in your new Postgres database automatically
   — no manual migration step needed for a project this size.

**Alternative: GCP Cloud SQL (fully GCP-native, but not free)**

If you specifically need everything inside GCP for an assignment
requirement: create a Cloud SQL for PostgreSQL instance (`db-f1-micro` is
the cheapest tier, a few dollars/month — there's no permanent free tier for
Cloud SQL, unlike Cloud Run), then connect Cloud Run to it via a Cloud SQL
connection and set `DATABASE_URL` the same way as above, pointing at the
Cloud SQL instance's connection string.

For a demo, Neon is the more practical choice — same result, zero cost.

## 1. Run it locally

```bash
cd quizarena
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload
```

Open **http://127.0.0.1:8000/** for the demo UI, or **http://127.0.0.1:8000/docs**
for the interactive Swagger API docs (this comes free with FastAPI).

The SQLite DB file (`quizarena.db`) and sample questions are created
automatically on first run.

## 2. How the pieces map to your synopsis

- **Frontend** → `static/index.html` here (swap for a real React SPA later;
  the API doesn't care what calls it).
- **Authentication** → `auth.py` + `routers/auth_router.py` (JWT instead of
  Cognito — same idea, self-hosted). Swapping in Cognito later just means
  replacing this file; the rest of the app is unaffected.
- **APIs** (`/start-game`, `/submit-answer`, `/history`) → `routers/game.py`
  (`/game/start`, `/game/submit`) plus you can add a `/game/history` endpoint
  the same way (query `GameSession` by `user_id`).
- **Question Engine** → `select_questions()` + `_pick_difficulty()` in
  `routers/game.py` — the adaptive "intelligent" core from your synopsis.
- **Score/History storage** → `GameSession` table in `models.py`.
- **Multiplayer + Leaderboard** (your new requirements) → `routers/multiplayer.py`
  (WebSocket-driven rooms, live question broadcast, per-round scoring) and
  `routers/leaderboard.py` (top scores per category).
- **Monitoring** → for the demo, `uvicorn`'s logs are enough. On real cloud
  deployment, point stdout/stderr at CloudWatch (if on AWS) or your platform's
  logging (Render/Railway capture this automatically).

## 3. Extending the "avoid recently-seen questions" logic

Right now `_recently_seen_question_ids()` in `routers/game.py` is a stub.
For a real version, add a small `seen_questions` table (`user_id`,
`question_id`, `seen_at`) written to on every `/game/start`, and query the
last N rows there instead. Kept out of the starter code so you can decide how
much history to track without over-engineering the demo.

## 4. Deploying for a demo (not public-scale)

You said this is just for demonstration, so skip the full AWS synopsis stack
for now — a single container is enough:

**Option A — Render.com / Railway.app (easiest, free tier, good for a demo link)**
1. Push this folder to a GitHub repo.
2. Create a new "Web Service" and point it at the repo — both platforms
   detect the `Dockerfile` automatically.
3. Set the `JWT_SECRET` environment variable to a random string.
4. Deploy. You'll get a public HTTPS URL you can share for the demo.
5. Note: SQLite on these platforms doesn't survive redeploys — fine for a
   demo, but if you want data to persist, add a free Postgres addon and set
   `DATABASE_URL` (the app already reads this env var — no code changes needed).

**Option B — Single AWS EC2 instance (closer to your original synopsis)**
1. Launch a small EC2 instance (t3.micro is enough for a demo).
2. Install Docker, `git clone` your repo.
3. `docker build -t quizarena . && docker run -d -p 80:8000 -e JWT_SECRET=... quizarena`
4. Open the instance's security group to port 80, share the public IP/DNS.
5. (Optional) Put it behind CloudFront + an ACM cert if you want HTTPS for
   the demo — mirrors the frontend delivery layer from your original synopsis.

**Option C — Stay fully serverless (matches your synopsis most closely)**
Wrap the FastAPI app with [`Mangum`](https://github.com/jordaneremieff/mangum)
(`pip install mangum`, one extra line: `handler = Mangum(app)`), deploy it as
a single Lambda function behind API Gateway, and swap `auth.py` for calls to
Cognito if you want to match the synopsis 1:1. WebSockets get more involved
here (API Gateway WebSocket APIs + a Lambda per action), so this path is more
work than A or B — worth it only if you specifically need to demo the
serverless architecture itself.

For a course/demo deadline, **Option A** is the fastest path to a shareable link.

## 5. Multiplayer flow (how it works)

1. Both players call `joinRoom()` in the UI (or connect to
   `wss://.../ws/room/{room_id}?token=...&category=geography`).
2. Either player sends `{"action": "start"}` once at least 2 people are in
   the room.
3. The server pushes one question at a time to everyone, waits up to 15s
   (or until everyone's answered), reveals the correct answer + live
   leaderboard, then moves to the next question.
4. At the end, each player's score is saved as a `GameSession` (so it also
   shows up in `/leaderboard/{category}` and, once you add it, `/game/history`).

This is intentionally simple (in-memory rooms, no reconnect/resume logic) —
good enough for a demo with a couple of players in the same room at once.
For true production multiplayer at scale you'd move room state into Redis
so it survives across multiple server instances.
