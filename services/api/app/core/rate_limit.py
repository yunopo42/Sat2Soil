"""Per-IP rate limits (docs/ARCHITECTURE.md "rate limit", CLAUDE.md "required before deploy").

On Render, run uvicorn with --proxy-headers so the client IP comes from X-Forwarded-For.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

SESSION_LIMIT = "20/hour"
WRITE_LIMIT = "60/hour"
NASA_LIMIT = "30/minute"


async def rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "rate_limited",
                "message": "Too many requests from this address. Try again in a moment.",
            }
        },
    )
