from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
from app.services.nasa_power import PowerDailyService

USER_AGENT = f"Sat2Soil-API/{__version__} (NASA Space Apps Challenge 2026)"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(
            timeout=settings.nasa_power_timeout_s, headers={"User-Agent": USER_AGENT}
        ) as http:
            client = NasaPowerClient(http, settings.nasa_power_base_url)
            app.state.power_service = PowerDailyService(
                client, ttl_s=settings.nasa_power_cache_ttl_s
            )
            yield

    app = FastAPI(
        title="Sat2Soil API",
        version=__version__,
        summary="NASA Earth observation data turned into explainable field-scale decisions.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
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
