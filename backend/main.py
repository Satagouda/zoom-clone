"""
main.py - FastAPI application factory for the Zoom Clone backend.

Start with:
    uvicorn main:app --reload --port 8000

API docs: http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

import models  # noqa: F401 - registers all ORM models with Base.metadata
from database import Base, SessionLocal, engine
from routers import auth as auth_router
from routers import meetings as meetings_router
from routers import participants as participants_router
from routers import users as users_router

logger = logging.getLogger("uvicorn.error")


# ---------------------------------------------------------------------------
#  Startup: create tables + auto-seed if DB is empty
# ---------------------------------------------------------------------------

def _db_is_empty(db: Session) -> bool:
    """Return True when the users table has zero rows."""
    try:
        return db.query(models.User).count() == 0
    except Exception:
        return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and optionally seed on first run."""
    # Always ensure all tables exist (idempotent)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    # ── Migrate: add password_hash column if missing ────────────────────────
    try:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("users")]
        if "password_hash" not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
                conn.commit()
            logger.info("Added missing password_hash column to users table.")
    except Exception as exc:
        logger.warning(f"Could not add password_hash column (may already exist): {exc}")

    db: Session = SessionLocal()
    try:
        if _db_is_empty(db):
            logger.info("Database is empty — running seed...")
            try:
                from seed import seed as run_seed
                run_seed()
                logger.info("Seed completed successfully.")
            except Exception as exc:
                logger.error(f"Seed failed: {exc}")
        else:
            logger.info("Database already has data — skipping seed.")
    finally:
        db.close()

    yield  # Application runs here


# ---------------------------------------------------------------------------
#  App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Zoom Clone API",
    description=(
        "REST API for the Zoom Clone video-conferencing application. "
        "Built with FastAPI + SQLAlchemy + SQLite."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
#  CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",        # for Vercel frontend deployment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "X-Total-Count"],
)


# ---------------------------------------------------------------------------
#  Routers
# ---------------------------------------------------------------------------

# Mount auth and users before meeting routes
app.include_router(auth_router.router)
app.include_router(users_router.router)

# Mount meetings BEFORE participants so that /schedule and /upcoming
# are resolved before the /{meeting_id} wildcard.
app.include_router(meetings_router.router)
app.include_router(participants_router.router)


# ---------------------------------------------------------------------------
#  Root health-check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"], summary="API health check")
async def root():
    return {"status": "ok", "service": "zoom-clone-api", "version": "1.0.0"}


@app.get("/health", tags=["Health"], summary="Detailed health check")
async def health():
    db: Session = SessionLocal()
    try:
        user_count    = db.query(models.User).count()
        meeting_count = db.query(models.Meeting).count()
    finally:
        db.close()

    return {
        "status":   "ok",
        "database": "connected",
        "users":    user_count,
        "meetings": meeting_count,
    }
