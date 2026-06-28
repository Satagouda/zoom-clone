"""
routers/meetings.py - Meeting CRUD + lifecycle routes.

All routes are mounted under /api/meetings by main.py.

Default user for all requests: id = "default-user-001"
"""

import random
import string
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Meeting, MeetingStatus, MeetingType, Participant, User
from schemas import MeetingCreate, MeetingResponse

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

FRONTEND_BASE   = "http://localhost:3000"


# ---------------------------------------------------------------------------
#  Internal helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_meeting_code() -> str:
    """
    Generate a 9-digit Zoom-style code formatted as XXX-XXX-XXX.
    Digits only, matching real Zoom meeting IDs.
    """
    digits = "".join(random.choices(string.digits, k=9))
    return f"{digits[0:3]}-{digits[3:6]}-{digits[6:9]}"


def _make_invite_link() -> str:
    """Unique invite URL using a UUIDv4 token."""
    return f"{FRONTEND_BASE}/meeting/join?invite={uuid.uuid4()}"


def _meeting_to_response(meeting: Meeting, db: Session) -> MeetingResponse:
    """Convert a Meeting ORM object to a MeetingResponse schema."""
    host_name = meeting.host.name if meeting.host else "Unknown"
    participant_count = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting.id,
            Participant.left_at.is_(None),
        )
        .count()
    )
    return MeetingResponse(
        id=meeting.id,
        meeting_id=meeting.meeting_id,
        title=meeting.title,
        description=meeting.description,
        host_id=meeting.host_id,
        host_name=host_name,
        type=meeting.type,
        status=meeting.status,
        scheduled_at=meeting.scheduled_at,
        duration_minutes=meeting.duration_minutes,
        invite_link=meeting.invite_link,
        created_at=meeting.created_at,
        participant_count=participant_count,
    )


def _ensure_unique_meeting_code(db: Session) -> str:
    """Retry until we get a collision-free meeting code."""
    for _ in range(10):
        code = _make_meeting_code()
        exists = db.query(Meeting).filter(Meeting.meeting_id == code).first()
        if not exists:
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate a unique meeting code. Try again.",
    )


# ---------------------------------------------------------------------------
#  POST /api/meetings/instant
# ---------------------------------------------------------------------------

@router.post(
    "/instant",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an instant meeting",
    description="Creates and immediately starts an instant meeting for the default user.",
)
def create_instant_meeting(
    title: str = "Instant Meeting",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = _ensure_unique_meeting_code(db)

    meeting = Meeting(
        id=str(uuid.uuid4()),
        meeting_id=code,
        title=title,
        description=None,
        host_id=current_user.id,
        type=MeetingType.instant,
        status=MeetingStatus.active,   # instant meetings start immediately
        scheduled_at=None,
        duration_minutes=60,
        invite_link=_make_invite_link(),
        created_at=_now(),
    )
    db.add(meeting)

    # Auto-add host as participant
    db.add(Participant(
        id=str(uuid.uuid4()),
        meeting_id=meeting.id,
        user_id=current_user.id,
        display_name=current_user.name,
        joined_at=_now(),
        left_at=None,
        is_host=True,
    ))

    db.commit()
    db.refresh(meeting)
    return _meeting_to_response(meeting, db)


# ---------------------------------------------------------------------------
#  POST /api/meetings/schedule
# ---------------------------------------------------------------------------

@router.post(
    "/schedule",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a future meeting",
    description="Creates a scheduled meeting with a future start time.",
)
def create_scheduled_meeting(
    payload: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = _ensure_unique_meeting_code(db)

    meeting = Meeting(
        id=str(uuid.uuid4()),
        meeting_id=code,
        title=payload.title,
        description=payload.description,
        host_id=current_user.id,
        type=MeetingType.scheduled,
        status=MeetingStatus.waiting,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        invite_link=_make_invite_link(),
        created_at=_now(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _meeting_to_response(meeting, db)


# ---------------------------------------------------------------------------
#  GET /api/meetings/upcoming
# ---------------------------------------------------------------------------

@router.get(
    "/upcoming",
    response_model=List[MeetingResponse],
    summary="Get upcoming meetings",
    description="Returns waiting/scheduled meetings for the default user with scheduled_at in the future.",
)
def get_upcoming_meetings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now  = _now()

    meetings = (
        db.query(Meeting)
        .filter(
            Meeting.host_id == current_user.id,
            Meeting.status  == MeetingStatus.waiting,
        )
        .order_by(Meeting.scheduled_at.asc().nullsfirst(), Meeting.created_at.desc())
        .all()
    )

    return [_meeting_to_response(m, db) for m in meetings]


# ---------------------------------------------------------------------------
#  GET /api/meetings/recent
# ---------------------------------------------------------------------------

@router.get(
    "/recent",
    response_model=List[MeetingResponse],
    summary="Get recent meetings",
    description="Returns the last 10 ended or active meetings for the default user.",
)
def get_recent_meetings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meetings = (
        db.query(Meeting)
        .filter(
            Meeting.host_id == current_user.id,
            Meeting.status.in_([MeetingStatus.ended, MeetingStatus.active]),
        )
        .order_by(Meeting.created_at.desc())
        .limit(10)
        .all()
    )

    return [_meeting_to_response(m, db) for m in meetings]


# ---------------------------------------------------------------------------
#  GET /api/meetings/by-invite/{token}
# ---------------------------------------------------------------------------

@router.get(
    "/by-invite/{token}",
    response_model=MeetingResponse,
    summary="Get a meeting by invite token",
    description="Looks up a meeting using the UUID token from its invite link.",
)
def get_meeting_by_invite(token: str, db: Session = Depends(get_db)):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.invite_link.contains(token))
        .first()
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite link.",
        )
    return _meeting_to_response(meeting, db)


# ---------------------------------------------------------------------------
#  GET /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
    summary="Get a single meeting",
    description="Looks up a meeting by its Zoom-style join code (e.g. '123-456-789').",
)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.meeting_id == meeting_id)
        .first()
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' not found.",
        )
    return _meeting_to_response(meeting, db)


# ---------------------------------------------------------------------------
#  DELETE /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="End a meeting",
    description=(
        "Marks the meeting as ended and records leave times for active participants. "
        "Only the host can end their own meetings."
    ),
)
def end_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.meeting_id == meeting_id)
        .first()
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' not found.",
        )
    if meeting.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the host can end this meeting.",
        )

    now = _now()
    meeting.status = MeetingStatus.ended
    db.add(meeting)

    active_participants = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting.id,
            Participant.left_at.is_(None),
        )
        .all()
    )
    for participant in active_participants:
        participant.left_at = now
        db.add(participant)

    db.commit()
    # 204 No Content — return nothing
