"""Demo session tokens (D-009, services/api/task.md B03).

There are no user accounts. A visitor gets a short-lived signed token that names one demo
workspace; every write is scoped to that workspace. The token travels as `Authorization: Bearer`
because the web app and the API live on different sites (third-party cookies are blocked).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings

ALGORITHM = "HS256"
ISSUER = "sat2soil-api"
AUDIENCE = "sat2soil-demo"

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class DemoSession:
    workspace_id: UUID
    expires_at: datetime


def _secret(settings: Settings) -> str:
    if settings.demo_session_secret is None:
        raise RuntimeError("DEMO_SESSION_SECRET is not configured")
    return settings.demo_session_secret.get_secret_value()


def session_expiry(settings: Settings, now: datetime | None = None) -> datetime:
    return (now or datetime.now(UTC)) + timedelta(hours=settings.demo_session_ttl_hours)


def encode_token(session: DemoSession, settings: Settings) -> str:
    payload = {
        "sub": str(session.workspace_id),
        "exp": session.expires_at,
        "iat": datetime.now(UTC),
        "iss": ISSUER,
        "aud": AUDIENCE,
    }
    return jwt.encode(payload, _secret(settings), algorithm=ALGORITHM)


def decode_token(token: str, settings: Settings) -> DemoSession:
    payload = jwt.decode(
        token,
        _secret(settings),
        algorithms=[ALGORITHM],
        audience=AUDIENCE,
        issuer=ISSUER,
        options={"require": ["sub", "exp", "iss", "aud"]},
    )
    return DemoSession(
        workspace_id=UUID(payload["sub"]),
        expires_at=datetime.fromtimestamp(payload["exp"], UTC),
    )


def optional_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DemoSession | None:
    if credentials is None:
        return None
    try:
        return decode_token(credentials.credentials, settings)
    except (jwt.InvalidTokenError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your demo session expired or is invalid. Start a new demo session.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


def require_session(
    session: Annotated[DemoSession | None, Depends(optional_session)],
) -> DemoSession:
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A demo session is required. Call POST /v1/demo/session first.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return session
