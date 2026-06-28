"""
dependencies.py — JWT auth helpers and FastAPI dependencies.

Provides:
  - create_access_token / create_refresh_token
  - get_current_user  (FastAPI dependency)
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User

# ── Config ─────────────────────────────────────────────────────────────────────
SECRET_KEY            = os.getenv("SECRET_KEY", "changeme_use_a_long_random_string_in_production")
ALGORITHM             = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE  = 60 * 24 * 7  # 7 days

security_scheme = HTTPBearer(auto_error=False)


# ── Token helpers ──────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str) -> str:
    expire = _now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = _now() + timedelta(minutes=REFRESH_TOKEN_EXPIRE)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ── Dependencies ───────────────────────────────────────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid Bearer token and return the authenticated user."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please sign in.",
        )

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected an access token.",
        )

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated user when a valid token is present, else None."""
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials)
    except HTTPException:
        return None

    if payload.get("type") != "access":
        return None

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None

    return db.get(User, user_id)
