import logging
import os
import random
import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import admin, auth, cricheroes, leaderboard, matches, players, points, teams
from app.seed import seed_database

import app.models  # noqa: F401  # register models

logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("bachpan")

API_PREFIX = "/api"


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Several workers start at once; whichever loses the create/seed race just retries against the winner's result.
    for attempt in range(3):
        try:
            Base.metadata.create_all(bind=engine)
            with SessionLocal() as db:
                seed_database(db)
            break
        except (IntegrityError, ProgrammingError, OperationalError):
            if attempt == 2:
                raise
            logger.info("Startup init raced with another worker; retrying")
            time.sleep(0.5 + random.random())
    logger.info("Started in %s mode", settings.environment)
    yield


app = FastAPI(
    title="Bachpan Cricket League",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,  # auth uses a bearer header, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if settings.is_production:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


api = APIRouter(prefix=API_PREFIX)
for module in (auth, matches, players, teams, points, leaderboard, admin, cricheroes):
    api.include_router(module.router)


@api.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check database probe failed")
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})
    return {"status": "ok", "app": "Bachpan Cricket League"}


app.include_router(api)
app.add_api_route("/health", health, methods=["GET"], include_in_schema=False)

# --- Serve the built frontend (single-container deploys such as Docker / Hugging Face Spaces) ---
frontend_dist = os.path.realpath(
    os.environ.get("FRONTEND_DIST", os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
)

if os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        # Serve real top-level files (favicon.svg, icons.svg, ...) but never escape the dist folder.
        candidate = os.path.realpath(os.path.join(frontend_dist, full_path))
        if full_path and candidate.startswith(frontend_dist + os.sep) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(frontend_dist, "index.html"), headers={"Cache-Control": "no-cache"})
