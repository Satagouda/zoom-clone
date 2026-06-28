"""
routers/participants.py - Join a meeting and list participants.

All routes are mounted under /api/meetings by main.py.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, get_optional_current_user
from models import Meeting, MeetingStatus, Participant, User
from schemas import JoinMeetingRequest, JoinMeetingResponse, MeetingResponse, ParticipantResponse

router = APIRouter(prefix="/api/meetings", tags=["Participants"])


# ---------------------------------------------------------------------------
#  Internal helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_meeting(meeting_id_code: str, db: Session) -> Meeting:
    """
    Look up a meeting by its Zoom-style join code (meeting_id column).
    Raises 404 if not found.
    """
    meeting = (
        db.query(Meeting)
        .filter(Meeting.meeting_id == meeting_id_code)
        .first()
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id_code}' not found.",
        )
    return meeting


def _meeting_to_response(meeting: Meeting, db: Session) -> MeetingResponse:
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


# ---------------------------------------------------------------------------
#  POST /api/meetings/{meeting_id}/join
# ---------------------------------------------------------------------------

@router.post(
    "/{meeting_id}/join",
    response_model=JoinMeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join a meeting",
    description=(
        "Adds the caller as a participant to the specified meeting. "
        "Authenticated users are linked by user_id; guests join with display_name only."
    ),
)
def join_meeting(
    meeting_id: str,
    payload: JoinMeetingRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    meeting = _resolve_meeting(meeting_id, db)

    if meeting.status == MeetingStatus.ended:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This meeting has already ended.",
        )

    if payload.invite_link and payload.invite_link != meeting.invite_link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid invite link for this meeting.",
        )

    if current_user:
        existing = (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.user_id == current_user.id,
                Participant.left_at.is_(None),
            )
            .first()
        )
        if existing:
            return JoinMeetingResponse(
                meeting=_meeting_to_response(meeting, db),
                participant=ParticipantResponse.model_validate(existing),
            )
    else:
        existing_guest = (
            db.query(Participant)
            .filter(
                Participant.meeting_id == meeting.id,
                Participant.user_id.is_(None),
                Participant.display_name == payload.display_name,
                Participant.left_at.is_(None),
            )
            .first()
        )
        if existing_guest:
            return JoinMeetingResponse(
                meeting=_meeting_to_response(meeting, db),
                participant=ParticipantResponse.model_validate(existing_guest),
            )

    is_host = current_user is not None and meeting.host_id == current_user.id

    if meeting.status == MeetingStatus.waiting:
        meeting.status = MeetingStatus.active
        db.add(meeting)

    participant = Participant(
        id=str(uuid.uuid4()),
        meeting_id=meeting.id,
        user_id=current_user.id if current_user else None,
        display_name=payload.display_name,
        joined_at=_now(),
        left_at=None,
        is_host=is_host,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    db.refresh(meeting)

    return JoinMeetingResponse(
        meeting=_meeting_to_response(meeting, db),
        participant=ParticipantResponse.model_validate(participant),
    )


# ---------------------------------------------------------------------------
#  POST /api/meetings/{meeting_id}/leave
# ---------------------------------------------------------------------------

@router.post(
    "/{meeting_id}/leave",
    status_code=status.HTTP_200_OK,
    summary="Leave a meeting",
    description="Marks the current user as having left the meeting.",
)
def leave_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _resolve_meeting(meeting_id, db)

    participant = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting.id,
            Participant.user_id == current_user.id,
            Participant.left_at.is_(None),
        )
        .first()
    )
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not an active participant in this meeting.",
        )

    participant.left_at = _now()
    db.add(participant)
    db.commit()

    return {"message": "Left meeting successfully."}


# ---------------------------------------------------------------------------
#  GET /api/meetings/{meeting_id}/participants
# ---------------------------------------------------------------------------

@router.get(
    "/{meeting_id}/participants",
    response_model=List[ParticipantResponse],
    summary="List participants in a meeting",
    description=(
        "Returns active participant records for the meeting, ordered by joined_at."
    ),
)
def list_participants(meeting_id: str, db: Session = Depends(get_db)):
    meeting = _resolve_meeting(meeting_id, db)

    participants = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting.id,
            Participant.left_at.is_(None),
        )
        .order_by(Participant.joined_at.asc())
        .all()
    )

    return [ParticipantResponse.model_validate(p) for p in participants]
