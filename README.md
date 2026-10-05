# Pakka Local Cricket Fantasy League

Simple fantasy cricket for local tournaments. Built for about 10–15 players and one admin.

## Stack

- Frontend: React 18, Vite, TypeScript, React Router, Tailwind CSS, Axios
- Backend: FastAPI, SQLAlchemy, SQLite, JWT
- Hosting: Netlify (frontend) + Render (backend)

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000  
Docs: http://127.0.0.1:8000/docs

The first start creates `pakka_fantasy.db`, seeds an admin user, one sample match, and 22 players.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Copy `frontend/.env.example` to `frontend/.env` if you need a different API URL:

```
VITE_API_URL=http://127.0.0.1:8000
```

## Default admin

- Mobile: `9999999999`
- Password: `admin123`

Admin login page: `/admin/login`

## How a league weekend works

1. Admin creates a match (`Team A` vs `Team B`) and adds players.
2. Users register, open the match, pick exactly 7 players, set captain (2X) and vice captain (1.5X), then save.
3. Admin locks the match so teams cannot change.
4. After the game, admin enters fantasy points on `/admin/scoring`.
5. Leaderboard updates automatically.

Match statuses: `open` → `locked` → `closed`.

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Auth |
| GET | `/matches` | Auth |
| POST | `/matches` | Admin |
| PATCH | `/matches/{id}/status` | Admin |
| GET | `/players` | Auth |
| POST | `/players` | Admin |
| PUT | `/players/{id}` | Admin |
| DELETE | `/players/{id}` | Admin |
| POST | `/teams` | User |
| GET | `/teams/me` | User |
| GET | `/leaderboard/{match_id}` | Auth |
| POST | `/points` | Admin |
| GET | `/admin/stats` | Admin |

## Deployment

### Backend on Render

1. Create a Web Service from this repo.
2. Root directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment:
   - `SECRET_KEY` — long random string
   - `CORS_ORIGINS` — your Netlify URL, e.g. `https://your-app.netlify.app`
   - `DATABASE_URL` — leave default SQLite, or keep `sqlite:///./pakka_fantasy.db`

SQLite on Render’s free disk is wiped on some dyno cycles. For a 10–15 player weekend league that is usually fine; export/backup the `.db` file if you need to keep history.

### Frontend on Netlify

1. Base directory: `frontend`
2. Build: `npm run build`
3. Publish: `dist`
4. Environment: `VITE_API_URL=https://your-backend.onrender.com`
5. SPA redirects are already in `frontend/netlify.toml`

## Project layout

```
backend/app/{routers,models,schemas,services}
frontend/src/{components,pages,services,hooks,types}
```
