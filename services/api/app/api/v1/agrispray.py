"""AgriSpray concept endpoints (services/api/task.md B13–B14, D-027). Simulated device only."""

from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.adapters.nasa_power import PowerUnavailableError
from app.core.rate_limit import NASA_LIMIT, limiter
from app.core.security import DemoSession, optional_session
from app.engines.spray import (
    CARD_H_MM,
    CARD_W_MM,
    DEVICE_ID,
    RES_MM,
    SAMPLE,
    SAMPLE_TIME,
    analyse_example,
    device_history,
    measurement_points,
    previous_sample,
    spray_checks,
)
from app.models.agrispray import (
    AgriSprayOut,
    CheckOut,
    DeviceHistoryPoint,
    DeviceOut,
    DeviceReadings,
    HistogramBin,
    MeasurementPointOut,
    PlantObservation,
    RegionalDay,
    RegionalOut,
    SprayCardOut,
    StainOut,
)
from app.models.agronomy import DataSourceRef
from app.models.data_source import DataSource
from app.services.nasa_power import PowerDailyService

from .fields import Repo, _readable
from .nasa import get_power_service

router = APIRouter(tags=["agrispray"])

REGIONAL_PARAMETERS = ("WS2M", "T2M_MAX", "RH2M", "PRECTOTCORR")
REGIONAL_DAYS = 30
WINDY_MS = 4.0  # daily mean at 2 m; such days usually have gusts well above spraying limits

ASSUMPTIONS = [
    "prototype_device",
    "simulated_readings",
    "spray_guidance_general",
    "regional_wind_not_local",
    "no_efficacy",
    "no_diagnosis",
]
CARD_ASSUMPTIONS = ["synthetic_card", "stain_not_droplet", "merging_counts", "no_efficacy"]

# A simulated before/after count by an observer (concept camera flow). Counts, not a diagnosis.
PLANT_LOG = [
    PlantObservation(
        date=date(2026, 11, 7),
        stage="before",
        plant_tag="P-03",
        leaves_checked=20,
        leaves_with_spots=6,
    ),
    PlantObservation(
        date=date(2026, 11, 14),
        stage="after",
        plant_tag="P-03",
        leaves_checked=20,
        leaves_with_spots=5,
    ),
]


async def _regional(
    service: PowerDailyService, lat: float, lon: float
) -> tuple[RegionalOut | None, list[DataSourceRef]]:
    end = datetime.now(UTC).date()
    start = end - timedelta(days=REGIONAL_DAYS + 6)  # extra days: POWER publishes with a lag
    try:
        served = await service.get_daily(
            latitude=lat, longitude=lon, start=start, end=end, parameters=REGIONAL_PARAMETERS
        )
    except PowerUnavailableError:
        return None, []
    s = served.data.series
    values = {p: dict(s[p].values) for p in REGIONAL_PARAMETERS}
    published = sorted(d for d, v in values["WS2M"].items() if v is not None)
    if not published:
        return None, []
    last = published[-1]
    days = [last - timedelta(days=i) for i in range(REGIONAL_DAYS - 1, -1, -1)]
    defined = [w for w in (values["WS2M"].get(d) for d in days) if w is not None]
    regional = RegionalOut(
        source_type=served.source_type,
        start=days[0],
        end=last,
        mean_wind_ms=round(sum(defined) / len(defined), 1) if defined else None,
        max_wind_ms=round(max(defined), 1) if defined else None,
        windy_days=sum(1 for w in defined if w >= WINDY_MS),
        windy_threshold_ms=WINDY_MS,
        days=[
            RegionalDay(
                date=d,
                wind_ms=values["WS2M"].get(d),
                tmax_c=values["T2M_MAX"].get(d),
                rh_pct=values["RH2M"].get(d),
                precip_mm=values["PRECTOTCORR"].get(d),
            )
            for d in days
        ],
    )
    cell = served.grid_cell
    ref = DataSourceRef(
        name="NASA POWER",
        product=f"POWER Daily API {served.data.api_version}",
        parameters=list(REGIONAL_PARAMETERS),
        grid_cell=f"{cell.center_lat}, {cell.center_lon}",
        fetched_at=served.data.fetched_at,
        source_type=served.source_type,
    )
    return regional, [ref]


@router.get(
    "/fields/{field_id}/agrispray",
    response_model=AgriSprayOut,
    summary="AgriSpray concept: simulated device readings, spray-condition checks, NASA context",
)
@limiter.limit(NASA_LIMIT)
async def agrispray(
    request: Request,
    field_id: UUID,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
) -> AgriSprayOut:
    record = await _readable(repo, field_id, session)
    history = device_history(str(field_id))
    regional, sources = await _regional(service, record.centroid_lat, record.centroid_lon)
    checks = [
        CheckOut(
            code=c.code,
            status=c.status,  # type: ignore[arg-type]
            value=c.value,
            unit=c.unit,
            source_type=(
                DataSource.SIMULATED_DEVICE if c.value is not None else DataSource.UNAVAILABLE
            ),
        )
        for c in spray_checks(SAMPLE["air_temp_c"], SAMPLE["air_rh_pct"], SAMPLE["wind_ms"])
    ]
    return AgriSprayOut(
        field_id=str(field_id),
        device=DeviceOut(
            device_id=DEVICE_ID,
            recorded_at=SAMPLE_TIME,
            readings=DeviceReadings(**SAMPLE),  # type: ignore[arg-type]
            previous=DeviceReadings(**previous_sample(history)),  # type: ignore[arg-type]
            previous_at=SAMPLE_TIME - timedelta(hours=24),
            history=[
                DeviceHistoryPoint(
                    at=r.at, soil_moisture_pct=r.soil_moisture_pct, soil_temp_c=r.soil_temp_c
                )
                for r in history
            ],
        ),
        points=[
            MeasurementPointOut(
                code=p.code,
                lat=p.lat,
                lon=p.lon,
                soil_moisture_pct=p.soil_moisture_pct,
                soil_temp_c=p.soil_temp_c,
                soil_ec_ds_m=p.soil_ec_ds_m,
            )
            for p in measurement_points(record.boundary, str(field_id))
        ],
        checks=checks,
        regional=regional,
        plant_log=PLANT_LOG,
        data_sources=sources,
        assumptions=ASSUMPTIONS,
        uncertainty_note="concept_not_measurement",
    )


@router.get(
    "/agrispray/spray-cards/example",
    response_model=SprayCardOut,
    summary="Measure a synthetic water-sensitive paper card (example calculation)",
)
@limiter.limit(NASA_LIMIT)
async def spray_card_example(
    request: Request,
    variant: Annotated[Literal["even", "uneven", "sparse"], Query()] = "uneven",
) -> SprayCardOut:
    a = analyse_example(variant)
    return SprayCardOut(
        variant=variant,
        card_mm=(CARD_W_MM, CARD_H_MM),
        resolution_mm=RES_MM,
        generated_stains=len(a.stains),
        stains=[StainOut(x=s.x_mm, y=s.y_mm, d=s.d_um) for s in a.stains],
        coverage_pct=a.coverage_pct,
        regions=a.regions,
        regions_per_cm2=a.regions_per_cm2,
        zone_coverage=a.zone_coverage,
        uniformity_cv_pct=a.uniformity_cv_pct,
        uniformity=a.uniformity,  # type: ignore[arg-type]
        denser_side=a.denser_side,  # type: ignore[arg-type]
        left_coverage_pct=a.left_coverage_pct,
        right_coverage_pct=a.right_coverage_pct,
        histogram=[HistogramBin(from_um=lo, to_um=hi, count=n) for lo, hi, n in a.histogram],
        mask_png=a.mask_png,
        assumptions=CARD_ASSUMPTIONS,
    )
