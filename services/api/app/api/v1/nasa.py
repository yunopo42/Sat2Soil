from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.adapters.nasa_power import EARLIEST_DATE, PARAMETERS
from app.core.config import Settings, get_settings
from app.models.nasa import PowerDailyResponse, build_power_daily_response
from app.services.nasa_power import PowerDailyService

router = APIRouter(prefix="/nasa", tags=["nasa"])


def get_power_service(request: Request) -> PowerDailyService:
    return request.app.state.power_service


@router.get(
    "/power/daily",
    response_model=PowerDailyResponse,
    summary="NASA POWER daily series for a point",
    description=(
        "Daily NASA POWER (community AG) values for the grid cell containing the point. "
        "Values describe a ~0.5° × 0.625° cell, not a measurement at the point. "
        "Missing or not-yet-published days are null. Phase 3 adds field-scoped access "
        "(/v1/fields/{id}/observations) with demo-session limits."
    ),
)
async def power_daily(
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    lat: Annotated[float, Query(ge=-90, le=90, description="Latitude, WGS84")],
    lon: Annotated[float, Query(ge=-180, le=180, description="Longitude, WGS84")],
    start: Annotated[date, Query(description="First day, YYYY-MM-DD")],
    end: Annotated[date, Query(description="Last day, YYYY-MM-DD")],
    parameters: Annotated[
        str | None,
        Query(description=f"Comma-separated subset of {', '.join(PARAMETERS)}. Default: all."),
    ] = None,
) -> PowerDailyResponse:
    requested = _parse_parameters(parameters)
    today = datetime.now(UTC).date()

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

    served = await service.get_daily(
        latitude=lat, longitude=lon, start=start, end=end, parameters=requested
    )
    return build_power_daily_response(served, latitude=lat, longitude=lon, parameters=requested)


def _parse_parameters(raw: str | None) -> tuple[str, ...]:
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
