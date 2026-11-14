"""Demo session and field endpoints (docs/ARCHITECTURE.md API draft, services/api/task.md B03, B09).

Read rules: the shared sample field is public; a drawn field is visible only to its own session.
Write rules: only fields in the caller's own workspace; the sample is read-only.
Unknown and foreign fields both answer 404 so ids cannot be probed.
"""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.core.config import Settings, get_settings
from app.core.rate_limit import NASA_LIMIT, SESSION_LIMIT, WRITE_LIMIT, limiter
from app.core.security import (
    DemoSession,
    encode_token,
    optional_session,
    require_session,
    session_expiry,
)
from app.models.data_source import DataSource
from app.models.fields import (
    MAX_AREA_HA,
    MIN_AREA_HA,
    Centroid,
    DemoSessionOut,
    FieldCreate,
    FieldOut,
    FieldUpdate,
    GeoJSONPolygon,
    Season,
)
from app.models.nasa import PowerDailyResponse, build_power_daily_response
from app.repositories.fields import FieldRecord, FieldsRepository
from app.services.nasa_power import PowerDailyService

from .nasa import ParametersQuery, get_power_service, parse_parameters, resolve_period

router = APIRouter(tags=["fields"])


def get_fields_repo(request: Request) -> FieldsRepository:
    repo = getattr(request.app.state, "fields_repo", None)
    if repo is None:
        raise HTTPException(status_code=503, detail="The field database is not configured.")
    return repo


Repo = Annotated[FieldsRepository, Depends(get_fields_repo)]


def to_out(record: FieldRecord) -> FieldOut:
    return FieldOut(
        id=record.id,
        name=record.name,
        boundary=record.boundary,
        centroid=Centroid(lat=record.centroid_lat, lon=record.centroid_lon),
        area_ha=round(record.area_ha, 2),
        area_donum=round(record.area_ha * 10, 1),
        perimeter_m=round(record.perimeter_m, 1),
        crop=record.crop,
        irrigation_type=record.irrigation_type,  # type: ignore[arg-type]
        rotation_history=[Season(**season) for season in record.rotation_history],
        is_sample=record.is_sample,
        source_type=DataSource.DEMO_SAMPLE if record.is_sample else DataSource.MANUAL_USER,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _readable(
    repo: FieldsRepository, field_id: UUID, session: DemoSession | None
) -> FieldRecord:
    record = await repo.get_field(field_id)
    if record is None or not (
        record.is_sample or (session is not None and session.workspace_id == record.workspace_id)
    ):
        raise HTTPException(status_code=404, detail="Field not found.")
    return record


async def _writable(repo: FieldsRepository, field_id: UUID, session: DemoSession) -> FieldRecord:
    record = await _readable(repo, field_id, session)
    if record.is_sample or record.workspace_id != session.workspace_id:
        raise HTTPException(
            status_code=403, detail="The sample field is read-only. Draw your own field to edit."
        )
    return record


async def _check_boundary(repo: FieldsRepository, boundary: GeoJSONPolygon) -> None:
    check = await repo.check_geometry(boundary)
    if not check.valid:
        raise HTTPException(
            status_code=422,
            detail=[f"The boundary crosses itself or is not a valid shape ({check.reason})."],
        )
    if check.area_ha < MIN_AREA_HA:
        raise HTTPException(
            status_code=422, detail=[f"The field is smaller than {MIN_AREA_HA} ha."]
        )
    if check.area_ha > MAX_AREA_HA:
        raise HTTPException(
            status_code=422, detail=[f"The field is larger than {MAX_AREA_HA:g} ha."]
        )


@router.post(
    "/demo/session",
    response_model=DemoSessionOut,
    status_code=201,
    summary="Start a demo session (no account): returns a token scoped to a new workspace",
)
@limiter.limit(SESSION_LIMIT)
async def create_demo_session(
    request: Request, repo: Repo, settings: Annotated[Settings, Depends(get_settings)]
) -> DemoSessionOut:
    await repo.purge_expired_workspaces()
    expires_at = session_expiry(settings)
    workspace_id = await repo.create_workspace(expires_at)
    session = DemoSession(workspace_id=workspace_id, expires_at=expires_at)
    return DemoSessionOut(
        token=encode_token(session, settings), workspace_id=workspace_id, expires_at=expires_at
    )


@router.get("/demo/fields", response_model=list[FieldOut], summary="Shared sample fields")
async def list_sample_fields(repo: Repo) -> list[FieldOut]:
    return [to_out(r) for r in await repo.list_sample_fields()]


@router.get("/fields", response_model=list[FieldOut], summary="Fields drawn in this demo session")
async def list_fields(
    repo: Repo, session: Annotated[DemoSession, Depends(require_session)]
) -> list[FieldOut]:
    return [to_out(r) for r in await repo.list_workspace_fields(session.workspace_id)]


@router.post("/fields", response_model=FieldOut, status_code=201, summary="Save a drawn field")
@limiter.limit(WRITE_LIMIT)
async def create_field(
    request: Request,
    data: FieldCreate,
    repo: Repo,
    session: Annotated[DemoSession, Depends(require_session)],
) -> FieldOut:
    await _check_boundary(repo, data.boundary)
    return to_out(await repo.create_field(session.workspace_id, data))


@router.get("/fields/{field_id}", response_model=FieldOut)
async def get_field(
    field_id: UUID,
    repo: Repo,
    session: Annotated[DemoSession | None, Depends(optional_session)],
) -> FieldOut:
    return to_out(await _readable(repo, field_id, session))


@router.patch("/fields/{field_id}", response_model=FieldOut)
@limiter.limit(WRITE_LIMIT)
async def update_field(
    request: Request,
    field_id: UUID,
    data: FieldUpdate,
    repo: Repo,
    session: Annotated[DemoSession, Depends(require_session)],
) -> FieldOut:
    await _writable(repo, field_id, session)
    if data.boundary is not None:
        await _check_boundary(repo, data.boundary)
    return to_out(await repo.update_field(field_id, data))


@router.delete("/fields/{field_id}", status_code=204, response_class=Response)
@limiter.limit(WRITE_LIMIT)
async def delete_field(
    request: Request,
    field_id: UUID,
    repo: Repo,
    session: Annotated[DemoSession, Depends(require_session)],
) -> Response:
    await _writable(repo, field_id, session)
    await repo.delete_field(field_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/fields/{field_id}/nasa/power/daily",
    response_model=PowerDailyResponse,
    summary="NASA POWER daily series for the grid cell containing the field's centroid",
)
@limiter.limit(NASA_LIMIT)
async def field_power_daily(
    request: Request,
    field_id: UUID,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
    start: Annotated[date | None, Query(description="Default: 364 days before end")] = None,
    end: Annotated[date | None, Query(description="Default: today")] = None,
    parameters: ParametersQuery = None,
) -> PowerDailyResponse:
    record = await _readable(repo, field_id, session)
    requested = parse_parameters(parameters)
    start, end = resolve_period(start, end, settings)
    served = await service.get_daily(
        latitude=record.centroid_lat,
        longitude=record.centroid_lon,
        start=start,
        end=end,
        parameters=requested,
    )
    return build_power_daily_response(
        served, latitude=record.centroid_lat, longitude=record.centroid_lon, parameters=requested
    )
