from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.adapters.nasa_power import EARLIEST_DATE, PARAMETERS
from app.core.config import Settings, get_settings
from app.core.rate_limit import NASA_LIMIT, limiter
from app.models.nasa import PowerDailyResponse, build_power_daily_response
from app.services.nasa_power import PowerDailyService

router = APIRouter(prefix="/nasa", tags=["nasa"])

ParametersQuery = Annotated[
    str | None,
    Query(description=f"Comma-separated subset of {', '.join(PARAMETERS)}. Default: all."),
]


def get_power_service(request: Request) -> PowerDailyService:
    return request.app.state.power_service


def resolve_period(start: date | None, end: date | None, settings: Settings) -> tuple[date, date]:
    """Defaults to the last 365 days. Rejects reversed, future, too early or too long periods."""
    today = datetime.now(UTC).date()
    end = end or today
    start = start or end - timedelta(days=364)
    problems: list[str] = []
    if start > end:
        problems.append("start must be on or before end")
    if end > today:
        problems.append("end cannot be in the future")
    if start < EARLIEST_DATE:
        problems.append(f"start cannot be before {EARLIEST_DATE.isoformat()}")
    if (end - start).days + 1 > settings.nasa_power_max_days:
        problems.append(f"period cannot exceed {settings.nasa_power_max_days} days")
    if problems:
        raise HTTPException(status_code=422, detail=problems)
    return start, end


def parse_parameters(raw: str | None) -> tuple[str, ...]:
    if raw is None or not raw.strip():
        return tuple(PARAMETERS)
    names = tuple(dict.fromkeys(p.strip().upper() for p in raw.split(",") if p.strip()))
    unknown = [n for n in names if n not in PARAMETERS]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=[
                f"unknown parameter(s): {', '.join(unknown)}; allowed: {', '.join(PARAMETERS)}"
            ],
        )
    return names


@router.get(
    "/power/daily",
    response_model=PowerDailyResponse,
    summary="NASA POWER daily series for a point",
    description=(
        "Daily NASA POWER (community AG) values for the grid cell containing the point. "
        "Values describe a ~0.5° × 0.625° cell, not a measurement at the point. "
        "Missing or not-yet-published days are null. Prefer /v1/fields/{id}/nasa/power/daily."
    ),
)
@limiter.limit(NASA_LIMIT)
async def power_daily(
    request: Request,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    lat: Annotated[float, Query(ge=-90, le=90, description="Latitude, WGS84")],
    lon: Annotated[float, Query(ge=-180, le=180, description="Longitude, WGS84")],
    start: Annotated[date, Query(description="First day, YYYY-MM-DD")],
    end: Annotated[date, Query(description="Last day, YYYY-MM-DD")],
    parameters: ParametersQuery = None,
) -> PowerDailyResponse:
    requested = parse_parameters(parameters)
    start, end = resolve_period(start, end, settings)
    served = await service.get_daily(
        latitude=lat, longitude=lon, start=start, end=end, parameters=requested
    )
    return build_power_daily_response(served, latitude=lat, longitude=lon, parameters=requested)
