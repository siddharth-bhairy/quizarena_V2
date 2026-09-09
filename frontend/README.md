# QuizArena Frontend (React + Vite)

A dark, neon-accented arena UI — styled after the reference you shared —
built on top of the FastAPI backend in `../backend`.

## Latest update: palette + follow feature

- Color tokens now use the charcoal/wine/plum/off-white palette (see
  `src/styles/tokens.css`) — Math stays mapped to the warmer accent (wine),
  Geography to the cooler one (plum), same pattern as before, new hues.
- Border radius brought back to a small amount (6–12px) instead of fully
  sharp corners — see `--radius-*` in `tokens.css` if you want to tune it.
- **Follow / Following**: follow other players from the Leaderboard or the
  "Browse players" list, see follower/following counts and lists from your
  Profile page. Backend model + endpoints are in `../backend/routers/social.py`.

## What's new vs. the plain-JS demo

- Real React app (Vite, React Router) instead of the single `index.html` test page
- Distinct visual identity: near-black surfaces, one neon-lime accent, gold
  "duel rating" badges, Bebas Neue display type for headlines/tile labels,
  JetBrains Mono for scores/timers — see `src/styles/tokens.css` for the
  full palette and the reasoning is in the code comments
- **Flash Anzan** (Math): numbers flash on screen one at a time, green for
  add / red for subtract, then you type the running total before the next
  round starts — same idea as the "Flash Anzan Duels" mode in your reference
- **Flag Guess** (Geography): a flag renders full-bleed, you pick the
  country from 4 options against an 8-second clock, 8 flags per round
- Both new modes post to a new backend endpoint, `POST /game/submit-score`,
  since they don't pull questions from the DB — see `../backend/routers/game.py`

## Run it

```bash
cd frontend
npm install
cp .env.example .env      # points the app at http://127.0.0.1:8000 by default
npm run dev
```

Open **http://127.0.0.1:5173**. Make sure the backend is also running
(`cd ../backend && uvicorn main:app --reload`) — signup/login and both
duel modes need it.

## Project layout

```
frontend/src/
├── main.jsx / App.jsx        # entry point, router, protected routes
├── api.js                     # fetch wrapper for the FastAPI backend
├── auth/AuthContext.jsx       # JWT + username, kept in localStorage
├── data/countries.js          # flag data for Flag Guess (flagcdn.com, no key needed)
├── styles/
│   ├── tokens.css              # color / type / radius tokens — edit here to reskin
│   └── arena.css                # component-level styles (tiles, cards, quiz, results)
├── components/
│   ├── BottomNav.jsx            # Arena / Compete / Profile tab bar
│   ├── CategoryTile.jsx          # Math/Geography/Memory/Logic duel tiles
│   └── ModeCard.jsx               # "Speed Quiz" / "Flash Anzan" style cards
└── pages/
    ├── Login.jsx
    ├── Arena.jsx                  # dashboard — category tiles + mode cards
    ├── ClassicQuiz.jsx             # reused for both math & geography classic quizzes
    ├── FlashAnzan.jsx               # new math duel mode
    ├── FlagGuess.jsx                 # new geography duel mode
    ├── Leaderboard.jsx
    └── Profile.jsx
```

## Extending it further

- **Memory / Logic tiles** are stubbed out ("Soon") in `Arena.jsx` — wire
  them up the same way Flash Anzan / Flag Guess are: a client-driven game
  page that calls `api.submitScore(token, category, mode, score, ...)` at
  the end.
- **Real duel rating (ELO)**: right now the tile badge is a cosmetic stand-in
  (`1000 + best_score * 3`) computed client-side from the leaderboard. For
  true ELO, add a `rating` column to `User` in the backend and update it
  server-side after each `GameSession` is written, using a standard ELO
  formula against an opponent (or a fixed "par" score for solo modes).
- **More flags**: `data/countries.js` has 40 countries. Add more `{code,
  name}` entries — `code` must be a valid ISO 3166-1 alpha-2 code that
  flagcdn.com recognizes.
- **Styling**: everything funnels through the CSS variables in
  `tokens.css`, so re-theming (e.g. a different accent color) is a
  one-file change.

## Deploying alongside the backend

The two are independent static/served apps:
- `npm run build` produces `frontend/dist` — deploy it anywhere that serves
  static files (Netlify, Vercel, S3+CloudFront, or even the same container
  as the backend behind a reverse proxy).
- Set `VITE_API_URL` at build time to your deployed backend's URL before
  running `npm run build`.
- Backend CORS is currently wide open (`allow_origins=["*"]`) for the demo
  — lock it to your actual frontend domain before sharing the link widely.
