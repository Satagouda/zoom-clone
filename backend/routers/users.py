"""
routers/users.py — User profile endpoints.

Provides /me (GET) and /me/update (PUT) for the authenticated user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


# ---------------------------------------------------------------------------
#  GET /users/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile of the currently authenticated user.",
)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
#  PUT /users/me
# ---------------------------------------------------------------------------

@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    description="Updates the name and/or avatar URL for the authenticated user.",
)
def update_my_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
