"""
schemas.py - Pydantic v2 request/response models for the Zoom Clone API.

All datetime fields are returned as ISO-8601 UTC strings.
MeetingResponse always includes the host's display name via host_name.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from models import MeetingStatus, MeetingType


# =============================================================================
#  Shared / base config
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
#  Meeting schemas
# =============================================================================

class MeetingCreate(BaseModel):
    """Request body for POST /api/meetings/schedule."""
    title:            str            = Field(..., min_length=1, max_length=200, examples=["Team Standup"])
    description:      Optional[str]  = Field(None, max_length=2000)
    scheduled_at:     Optional[datetime] = Field(
        None,
        description="UTC datetime for scheduled meetings. Omit for instant meetings.",
        examples=["2026-07-01T10:00:00Z"],
    )
    duration_minutes: int            = Field(60, ge=5, le=480)
    type:             MeetingType    = Field(MeetingType.scheduled)

    @field_validator("scheduled_at", mode="before")
    @classmethod
    def scheduled_at_must_be_future(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            from datetime import timezone
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        now = datetime.now(v.tzinfo or __import__("datetime").timezone.utc)
        if v <= now:
            raise ValueError("scheduled_at must be a future datetime")
        return v


class MeetingResponse(_Base):
    """Full meeting representation returned by all meeting endpoints."""
    id:               str
    meeting_id:       str            = Field(description="Zoom-style join code, e.g. '123-456-789'")
    title:            str
    description:      Optional[str]
    host_id:          str
    host_name:        str            = Field(description="Display name of the host user")
    type:             MeetingType
    status:           MeetingStatus
    scheduled_at:     Optional[datetime]
    duration_minutes: int
    invite_link:      str
    created_at:       datetime
    participant_count: Optional[int] = Field(None, description="Number of participants currently in the meeting")


# =============================================================================
#  Participant schemas
# =============================================================================

class ParticipantCreate(BaseModel):
    """Request body for explicitly adding a participant (internal use)."""
    display_name: str  = Field(..., min_length=1, max_length=120, examples=["Priya Sharma"])
    meeting_id:   str  = Field(..., description="The meetings.id UUID (internal primary key)")


class ParticipantResponse(_Base):
    """Participant record returned after join or list operations."""
    id:           str
    meeting_id:   str
    user_id:      Optional[str]
    display_name: str
    joined_at:    datetime
    left_at:      Optional[datetime]
    is_host:      bool


# =============================================================================
#  Join meeting schema
# =============================================================================

class JoinMeetingRequest(BaseModel):
    """
    Request body for POST /api/meetings/{meeting_id}/join.

    Supply either the Zoom-style meeting_id code OR the full invite_link.
    display_name is always required.
    """
    display_name: str           = Field(..., min_length=1, max_length=120, examples=["Ankit Verma"])
    invite_link:  Optional[str] = Field(
        None,
        description="Full invite URL, e.g. http://localhost:3000/meeting/join?invite=<uuid>",
    )


# =============================================================================
#  Composite response for join
# =============================================================================

class JoinMeetingResponse(BaseModel):
    """Returned after a successful join — contains both meeting and participant info."""
    meeting:     MeetingResponse
    participant: ParticipantResponse


# =============================================================================
#  Auth schemas
# =============================================================================

class RegisterRequest(BaseModel):
    """Request body for POST /auth/register."""
    name:     str = Field(..., min_length=1, max_length=120, examples=["Raj Kumar"])
    email:    str = Field(..., max_length=255, examples=["raj@example.com"])
    password: str = Field(..., min_length=6, max_length=128, examples=["securepassword"])


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""
    email:    str = Field(..., max_length=255, examples=["raj@zoom.local"])
    password: str = Field(..., max_length=128)


class TokenResponse(BaseModel):
    """JWT token pair returned by login and refresh."""
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class RefreshRequest(BaseModel):
    """Request body for POST /auth/refresh."""
    refresh_token: str


# =============================================================================
#  User schemas
# =============================================================================

class UserResponse(_Base):
    """Public user profile returned by /users/me."""
    id:         str
    name:       str
    email:      str
    avatar_url: Optional[str]
    created_at: datetime


class UserUpdate(BaseModel):
    """Request body for PUT /users/me."""
    name:       Optional[str] = Field(None, min_length=1, max_length=120)
    avatar_url: Optional[str] = Field(None, max_length=500)
