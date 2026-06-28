"""
routers/auth.py — Authentication endpoints.

Provides /register, /login, /logout, and /refresh endpoints
using JWT access + refresh tokens.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.hash import bcrypt
from sqlalchemy.orm import Session

from database import get_db
from dependencies import create_access_token, create_refresh_token, decode_token
from models import User
from schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

FRONTEND_BASE = "http://localhost:3000"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
#  POST /auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Creates a new user account and returns JWT tokens.",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = User(
        id=str(uuid.uuid4()),
        name=payload.name,
        email=payload.email,
        password_hash=bcrypt.hash(payload.password),
        created_at=_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


# ---------------------------------------------------------------------------
#  POST /auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email and password",
    description="Validates credentials and returns JWT token pair.",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account does not have a password set. Contact support.",
        )

    if not bcrypt.verify(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


# ---------------------------------------------------------------------------
#  POST /auth/refresh
# ---------------------------------------------------------------------------

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Accepts a valid refresh token and returns a new token pair.",
)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    payload_data = decode_token(payload.refresh_token)

    if payload_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected a refresh token.",
        )

    user_id = payload_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


# ---------------------------------------------------------------------------
#  POST /auth/logout
# ---------------------------------------------------------------------------

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out",
    description="Client-side logout — invalidates the token on the client. "
                "Returns a success acknowledgment.",
)
def logout():
    return {"message": "Logged out successfully. Discard your tokens on the client side."}
