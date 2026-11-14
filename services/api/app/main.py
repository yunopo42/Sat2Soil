from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg_pool import AsyncConnectionPool
from slowapi.errors import RateLimitExceeded

from app import __version__
from app.adapters.nasa_power import (
    NasaPowerClient,
    PowerResponseError,
    PowerUnavailableError,
    PowerUpstreamError,
)
from app.api.health import router as health_router
from app.api.v1 import router as v1_router
from app.core.config import Settings, get_settings
from app.core.rate_limit import limiter, rate_limit_handler
from app.repositories.fields import PostgresFieldsRepository
from app.services.nasa_power import PowerDailyService

USER_AGENT = f"Sat2Soil-API/{__version__} (NASA Space Apps Challenge 2026)"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with AsyncExitStack() as stack:
            http = await stack.enter_async_context(
                httpx.AsyncClient(
                    timeout=settings.nasa_power_timeout_s, headers={"User-Agent": USER_AGENT}
                )
            )
            client = NasaPowerClient(http, settings.nasa_power_base_url)
            app.state.power_service = PowerDailyService(
                client, ttl_s=settings.nasa_power_cache_ttl_s
            )

            app.state.db_pool = None
            app.state.fields_repo = None
            if settings.database_url is not None:
                # prepare_threshold=None: safe behind Supabase's pooler (no server-side prepares).
                pool = AsyncConnectionPool(
                    conninfo=settings.database_url.get_secret_value(),
                    min_size=1,
                    max_size=5,
                    open=False,
                    kwargs={"autocommit": True, "prepare_threshold": None},
                )
                await pool.open(wait=False)
                stack.push_async_callback(pool.close)
                app.state.db_pool = pool
                app.state.fields_repo = PostgresFieldsRepository(pool)
            yield

    app = FastAPI(
        title="Sat2Soil API",
        version=__version__,
        summary="NASA Earth observation data turned into explainable field-scale decisions.",
        lifespan=lifespan,
    )
    limiter.enabled = settings.rate_limit_enabled
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)  # type: ignore[arg-type]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    _register_error_handlers(app)
    app.include_router(health_router)
    app.include_router(v1_router)
    return app


def _register_error_handlers(app: FastAPI) -> None:
    """Upstream failures become stable error codes that the web app shows as calm states."""

    def error(status: int, code: str, message: str) -> JSONResponse:
        return JSONResponse(
            status_code=status, content={"error": {"code": code, "message": message}}
        )

    @app.exception_handler(PowerUnavailableError)
    async def _unavailable(_: Request, exc: PowerUnavailableError) -> JSONResponse:
        return error(503, "nasa_unavailable", "NASA POWER did not respond. Try again in a moment.")

    @app.exception_handler(PowerUpstreamError)
    async def _rejected(_: Request, exc: PowerUpstreamError) -> JSONResponse:
        return error(502, "nasa_rejected", "NASA POWER rejected the request.")

    @app.exception_handler(PowerResponseError)
    async def _bad_response(_: Request, exc: PowerResponseError) -> JSONResponse:
        return error(502, "nasa_bad_response", "NASA POWER returned data in an unexpected format.")


app = create_app()
