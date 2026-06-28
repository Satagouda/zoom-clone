"""
database.py — SQLAlchemy engine, session factory, and declarative base.

Usage
-----
    from database import Base, engine, get_db, SessionLocal

    # In FastAPI route:
    def my_route(db: Session = Depends(get_db)): ...
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# ── Connection URL ─────────────────────────────────────────────────────────────
DATABASE_URL = "sqlite:///./zoom_clone.db"

# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    # Required for SQLite when used with multi-threaded frameworks (FastAPI)
    connect_args={"check_same_thread": False},
    # Echo SQL statements to stdout during development; set to False in production
    echo=False,
)

# Enable WAL mode for better concurrent read performance with SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")   # Enforce FK constraints
    cursor.close()


# ── Session factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── Declarative base ───────────────────────────────────────────────────────────
Base = declarative_base()


# ── FastAPI dependency ─────────────────────────────────────────────────────────
def get_db():
    """
    Yield a SQLAlchemy Session and guarantee it is closed afterwards.

    Example::

        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
