"""
seed.py - Populate zoom_clone.db with realistic development data.

Usage (run from the backend/ directory):
    python seed.py

What this script does
---------------------
1. Drops and re-creates all tables (clean reseed every run).
2. Creates the single default user: Raj Kumar <raj@zoom.local>.
3. Creates 3 upcoming scheduled meetings (next 3, 5, 7 days).
4. Creates 4 past/ended meetings (7, 14, 21, 30 days ago).
5. Creates Participant rows for every meeting:
     - 1 host row  (default user, is_host=True)
     - 2-4 named guest rows (user_id=None - unauthenticated guests)
6. Prints a success banner at the end.

Callable as a module: from seed import seed; seed()
"""

import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from passlib.hash import bcrypt

from database import Base, SessionLocal, engine
from models import Meeting, MeetingStatus, MeetingType, Participant, User

# =============================================================================
#  Config
# =============================================================================

DEFAULT_USER_ID    = "default-user-001"
DEFAULT_USER_NAME  = "Raj Kumar"
DEFAULT_USER_EMAIL = "raj@zoom.local"

GUEST_NAMES = [
    "Priya Sharma",
    "Ankit Verma",
    "Sunita Patel",
    "Rohit Singh",
    "Meena Iyer",
    "Deepak Nair",
    "Kavya Reddy",
    "Arjun Mehta",
]

# =============================================================================
#  Helpers
# =============================================================================

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC)."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _uuid() -> str:
    return str(uuid.uuid4())


def _meeting_code() -> str:
    """Generate a Zoom-style XXX-XXX-XXX numeric join code."""
    digits = "".join(random.choices(string.digits, k=9))
    return f"{digits[0:3]}-{digits[3:6]}-{digits[6:9]}"


def _invite_link() -> str:
    return f"http://localhost:3000/meeting/join?invite={uuid.uuid4()}"


# =============================================================================
#  Meeting definitions  (built at call time so 'now' is accurate)
# =============================================================================

def _build_meetings(now: datetime) -> list:
    return [
        # --- Upcoming meetings (next 3, 5, 7 days) ---------------------------
        {
            "title":            "Team Standup",
            "description":      "Daily 15-minute sync for the engineering team.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.waiting,
            "scheduled_at":     now + timedelta(days=3, hours=9),
            "duration_minutes": 15,
            "created_at":       now - timedelta(hours=6),
        },
        {
            "title":            "Product Demo",
            "description":      "Live walkthrough of Zoom Clone features for stakeholders.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.waiting,
            "scheduled_at":     now + timedelta(days=5, hours=14),
            "duration_minutes": 45,
            "created_at":       now - timedelta(hours=12),
        },
        {
            "title":            "1:1 with Manager",
            "description":      "Weekly one-on-one: performance, career goals, and feedback.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.waiting,
            "scheduled_at":     now + timedelta(days=7, hours=11),
            "duration_minutes": 30,
            "created_at":       now - timedelta(hours=24),
        },

        # --- Past / ended meetings (7, 14, 21, 30 days ago) ------------------
        {
            "title":            "Sprint 13 Retrospective",
            "description":      "What went well, what didn't, and action items for Sprint 14.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.ended,
            "scheduled_at":     now - timedelta(days=7, hours=10),
            "duration_minutes": 60,
            "created_at":       now - timedelta(days=8),
        },
        {
            "title":            "Backend Architecture Review",
            "description":      "Deep-dive into FastAPI + SQLite and migration path to PostgreSQL.",
            "type":             MeetingType.instant,
            "status":           MeetingStatus.ended,
            "scheduled_at":     None,
            "duration_minutes": 75,
            "created_at":       now - timedelta(days=14),
        },
        {
            "title":            "Client Demo - Acme Corp",
            "description":      "Live product demonstration for Acme Corp stakeholders.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.ended,
            "scheduled_at":     now - timedelta(days=21, hours=15),
            "duration_minutes": 60,
            "created_at":       now - timedelta(days=22),
        },
        {
            "title":            "Onboarding Kick-off",
            "description":      "Welcome session for new team members joining this month.",
            "type":             MeetingType.scheduled,
            "status":           MeetingStatus.ended,
            "scheduled_at":     now - timedelta(days=30, hours=9),
            "duration_minutes": 30,
            "created_at":       now - timedelta(days=31),
        },
    ]


# =============================================================================
#  Seeding helpers
# =============================================================================

def _create_user(db: Session) -> User:
    user = User(
        id=DEFAULT_USER_ID,
        name=DEFAULT_USER_NAME,
        email=DEFAULT_USER_EMAIL,
        password_hash=bcrypt.hash("password123"),
        avatar_url="https://api.dicebear.com/8.x/initials/svg?seed=RajKumar",
        created_at=_utc(_now() - timedelta(days=90)),
    )
    db.add(user)
    db.flush()
    return user


def _create_meeting(db: Session, host: User, data: dict) -> Meeting:
    """Insert one Meeting row. Retries code generation on collision."""
    for _ in range(10):
        code = _meeting_code()
        if not db.query(Meeting).filter(Meeting.meeting_id == code).first():
            break

    meeting = Meeting(
        id=_uuid(),
        meeting_id=code,
        title=data["title"],
        description=data.get("description"),
        host_id=host.id,
        type=data["type"],
        status=data["status"],
        scheduled_at=_utc(data["scheduled_at"]) if data.get("scheduled_at") else None,
        duration_minutes=data.get("duration_minutes", 60),
        invite_link=_invite_link(),
        created_at=_utc(data["created_at"]),
    )
    db.add(meeting)
    db.flush()
    return meeting


def _create_participants(db: Session, meeting: Meeting, host: User) -> int:
    """
    Insert participant rows for a meeting:
      - 1 host row  (default user, is_host=True, user_id=host.id)
      - 2-4 guest rows (named guests, user_id=None)

    Returns total participant count inserted.
    """
    base_time = _utc(meeting.scheduled_at or meeting.created_at)
    is_ended  = meeting.status == MeetingStatus.ended

    # Host row
    db.add(Participant(
        id=_uuid(),
        meeting_id=meeting.id,
        user_id=host.id,
        display_name=host.name,
        joined_at=base_time,
        left_at=_utc(base_time + timedelta(minutes=meeting.duration_minutes)) if is_ended else None,
        is_host=True,
    ))

    # Guest rows
    guest_count = random.randint(2, 4)
    for guest_name in random.sample(GUEST_NAMES, guest_count):
        joined = _utc(base_time + timedelta(minutes=random.randint(1, 8)))
        db.add(Participant(
            id=_uuid(),
            meeting_id=meeting.id,
            user_id=None,   # guest - no registered account
            display_name=guest_name,
            joined_at=joined,
            left_at=_utc(joined + timedelta(minutes=random.randint(15, meeting.duration_minutes))) if is_ended else None,
            is_host=False,
        ))

    return 1 + guest_count


# =============================================================================
#  Main seed function
# =============================================================================

def seed() -> None:
    sep = "=" * 55
    print("\n" + sep)
    print("  ZoomClone -- Database Seeder")
    print(sep)

    # Step 1: Drop all existing tables (clean reseed)
    print("\n[1/4] Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("      Done.")

    # Step 2: Re-create tables
    print("\n[2/4] Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("      Done.")

    # Step 3: Insert seed data
    print("\n[3/4] Seeding data...")
    db: Session = SessionLocal()
    now = _now()

    try:
        user = _create_user(db)
        print(f"      + User: {user.name} <{user.email}>")

        upcoming_count = 0
        past_count     = 0

        for data in _build_meetings(now):
            meeting = _create_meeting(db, user, data)
            p_count = _create_participants(db, meeting, user)
            tag     = "upcoming" if meeting.status == MeetingStatus.waiting else "ended"
            print(f"      + Meeting [{tag:8}]: \"{meeting.title}\"  ({meeting.meeting_id})  - {p_count} participants")
            if meeting.status == MeetingStatus.waiting:
                upcoming_count += 1
            else:
                past_count += 1

        db.commit()

        # Step 4: Summary
        print("\n[4/4] Summary:")
        print(f"      Users    : 1  ({DEFAULT_USER_NAME} / {DEFAULT_USER_EMAIL})")
        print(f"      Upcoming : {upcoming_count} meetings  (next 3, 5, 7 days)")
        print(f"      Past     : {past_count} meetings  (7, 14, 21, 30 days ago)")
        print(f"      Database : zoom_clone.db")
        print("\n" + sep)
        print("  Database seeded successfully!")
        print(sep + "\n")

    except Exception as exc:
        db.rollback()
        print(f"\n[FAIL] Seed failed -- rolled back.")
        print(f"       Error: {exc}")
        raise
    finally:
        db.close()


# =============================================================================
#  Standalone entry point
# =============================================================================

if __name__ == "__main__":
    seed()
