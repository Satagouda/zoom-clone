"""
models.py — SQLAlchemy ORM models for the Zoom Clone application.

Tables
------
    users               — registered accounts
    meetings            — instant & scheduled meeting rooms
    participants        — per-meeting join/leave audit log
"""

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# ══════════════════════════════════════════════════════════════════════════════
#  Enumerations
# ══════════════════════════════════════════════════════════════════════════════

class MeetingType(str, enum.Enum):
    """Whether the meeting was created on the fly or scheduled in advance."""
    instant   = "instant"
    scheduled = "scheduled"


class MeetingStatus(str, enum.Enum):
    """Lifecycle state of a meeting room."""
    waiting = "waiting"   # created but host hasn't started yet
    active  = "active"    # currently in progress
    ended   = "ended"     # finished / closed by host


# ══════════════════════════════════════════════════════════════════════════════
#  users
# ══════════════════════════════════════════════════════════════════════════════

class User(Base):
    """
    A registered user account.

    Columns
    -------
    id             UUID string — primary key (e.g. "user-abc-123")
    name           Display name shown in meetings
    email          Unique login identifier
    password_hash  Bcrypt hash of the user's password
    avatar_url     Optional profile picture URL
    created_at     UTC timestamp of account creation
    """

    __tablename__ = "users"

    id             = Column(String, primary_key=True, index=True)
    name           = Column(String(120), nullable=False)
    email          = Column(String(255), unique=True, index=True, nullable=False)
    password_hash  = Column(String(255), nullable=True)
    avatar_url     = Column(String(500), nullable=True)
    created_at     = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    hosted_meetings = relationship(
        "Meeting",
        back_populates="host",
        foreign_keys="Meeting.host_id",
        cascade="all, delete-orphan",
    )
    participations = relationship(
        "Participant",
        back_populates="user",
        foreign_keys="Participant.user_id",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r}>"


# ══════════════════════════════════════════════════════════════════════════════
#  meetings
# ══════════════════════════════════════════════════════════════════════════════

class Meeting(Base):
    """
    A video meeting room.

    Columns
    -------
    id                UUID string — primary key
    meeting_id        10-char alphanumeric Zoom-style join code (e.g. "AB3KP9XZ2Q")
    title             Human-readable room name
    description       Optional notes / agenda
    host_id           FK → users.id
    type              'instant' | 'scheduled'
    status            'waiting' | 'active' | 'ended'
    scheduled_at      UTC start time (null for instant meetings)
    duration_minutes  Expected duration (default 60)
    invite_link       Unique shareable URL slug
    created_at        UTC creation timestamp
    """

    __tablename__ = "meetings"

    id               = Column(String, primary_key=True, index=True)
    meeting_id       = Column(String(11), unique=True, index=True, nullable=False)
    title            = Column(String(200), nullable=False)
    description      = Column(Text, nullable=True)
    host_id          = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type             = Column(
                           Enum(MeetingType, name="meeting_type"),
                           nullable=False,
                           default=MeetingType.instant,
                       )
    status           = Column(
                           Enum(MeetingStatus, name="meeting_status"),
                           nullable=False,
                           default=MeetingStatus.waiting,
                       )
    scheduled_at     = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    invite_link      = Column(String(500), unique=True, nullable=False)
    created_at       = Column(
                           DateTime(timezone=True),
                           server_default=func.now(),
                           nullable=False,
                       )

    # ── Relationships ──────────────────────────────────────────────────────────
    host = relationship(
        "User",
        back_populates="hosted_meetings",
        foreign_keys=[host_id],
    )
    participants = relationship(
        "Participant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Meeting meeting_id={self.meeting_id!r} "
            f"status={self.status!r} host={self.host_id!r}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  participants
# ══════════════════════════════════════════════════════════════════════════════

class Participant(Base):
    """
    A per-meeting join/leave record.

    user_id is nullable to support unauthenticated / guest participants who
    only supply a display_name.

    Columns
    -------
    id           UUID string — primary key
    meeting_id   FK → meetings.id
    user_id      FK → users.id (nullable for guests)
    display_name Name shown in the meeting tile
    joined_at    UTC timestamp when participant entered
    left_at      UTC timestamp when participant left (null = still in room)
    is_host      Whether this participant is the meeting host
    """

    __tablename__ = "participants"

    __table_args__ = (
        # Prevent the same registered user from joining the same meeting twice
        # (allow NULL user_id freely for guests)
        UniqueConstraint("meeting_id", "user_id", name="uq_participant_meeting_user"),
    )

    id           = Column(String, primary_key=True, index=True)
    meeting_id   = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id      = Column(String, ForeignKey("users.id",    ondelete="SET NULL"), nullable=True,  index=True)
    display_name = Column(String(120), nullable=False)
    joined_at    = Column(
                       DateTime(timezone=True),
                       server_default=func.now(),
                       nullable=False,
                   )
    left_at      = Column(DateTime(timezone=True), nullable=True)
    is_host      = Column(Boolean, nullable=False, default=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    meeting = relationship("Meeting", back_populates="participants")
    user    = relationship(
        "User",
        back_populates="participations",
        foreign_keys=[user_id],
    )

    def __repr__(self) -> str:
        return (
            f"<Participant meeting={self.meeting_id!r} "
            f"user={self.user_id!r} host={self.is_host}>"
        )
