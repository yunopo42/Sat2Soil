from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app import __version__
from app.core.config import Settings, get_settings

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    database: Literal["ok", "unavailable", "not_configured"]


@router.get("/health", response_model=HealthResponse)
async def health(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> HealthResponse:
    """Liveness probe for Render (always 200) with the database status for diagnostics."""
    pool = getattr(request.app.state, "db_pool", None)
    database: Literal["ok", "unavailable", "not_configured"] = "not_configured"
    if pool is not None:
        try:
            async with pool.connection(timeout=3) as conn:
                await conn.execute("select 1")
            database = "ok"
        except Exception:
            database = "unavailable"
    return HealthResponse(
        status="ok",
        service="sat2soil-api",
        version=__version__,
        environment=settings.environment,
        database=database,
    )
