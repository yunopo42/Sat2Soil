"""Water balance and crop rotation endpoints (services/api/task.md B10–B11)."""

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.rate_limit import NASA_LIMIT, limiter
from app.core.security import DemoSession, optional_session
from app.engines.crops import CROPS, Crop
from app.engines.rotation import (
    RAINFED_MIN_COVERAGE,
    RULES_WEIGHT,
    WATER_WEIGHT,
    PlanResult,
    evaluate_plan,
    suggest_plan,
)
from app.engines.scenario import TwinSeason, daily_climate, twin_season
from app.models.agronomy import (
    CompareIn,
    Conditions,
    CropOut,
    CropWater,
    DataSourceRef,
    PlanOut,
    RotationOut,
    RuleOut,
    TwinDayOut,
    TwinOut,
    TwinOutcome,
    TwinScenarioOut,
    WaterBalanceOut,
    WaterDay,
    WaterTotals,
    YearOut,
)
from app.repositories.fields import FieldRecord
from app.services.agronomy import (
    INPUT_PARAMETERS,
    TWIN_HISTORY_YEARS,
    FieldClimate,
    balance_for,
    crop_climates,
    default_plan,
    field_conditions,
    load_climate,
)
from app.services.nasa_power import PowerDailyService

from .fields import Repo, _readable
from .nasa import get_power_service

router = APIRouter(tags=["analysis"])

WATER_ASSUMPTIONS = [
    "grid_cell_climate",
    "fao56_typical_kc",
    "sowing_date_assumed",
    "no_soil_storage",
    "rain_not_effective",
    "not_prescription",
]
TWIN_ASSUMPTIONS = [
    "grid_cell_climate",
    "analog_years",
    "fao56_typical_kc",
    "sowing_date_assumed",
    "no_soil_storage",
    "rainfed_only",
    "not_forecast",
]
ROTATION_ASSUMPTIONS = [
    "grid_cell_climate",
    "same_climate_each_year",
    "fao56_typical_kc",
    "rules_simplified",
    "not_yield",
]


def crop_out(crop: Crop) -> CropOut:
    return CropOut(
        code=crop.code,
        family=crop.family,
        kc_ini=crop.kc_ini,
        kc_mid=crop.kc_mid,
        kc_end=crop.kc_end,
        stages=list(crop.stages),
        sowing_month=crop.sowing[0],
        sowing_day=crop.sowing[1],
        season_days=crop.season_days,
        suggestible=crop.suggestible,
    )


def source_ref(climate: FieldClimate) -> list[DataSourceRef]:
    data = climate.served.data
    cell = climate.served.grid_cell
    return [
        DataSourceRef(
            name="NASA POWER",
            product=f"POWER Daily API {data.api_version}",
            parameters=list(INPUT_PARAMETERS),
            grid_cell=f"{cell.center_lat}, {cell.center_lon}",
            fetched_at=data.fetched_at,
            source_type=climate.served.source_type,
        )
    ]


@router.get("/crops", response_model=list[CropOut], summary="Crop catalogue (FAO-56 typical Kc)")
async def list_crops() -> list[CropOut]:
    return [crop_out(c) for c in CROPS.values()]


@router.get(
    "/fields/{field_id}/water-balance",
    response_model=WaterBalanceOut,
    summary="Seasonal climatic water balance: rainfall vs FAO-56 crop water demand",
)
@limiter.limit(NASA_LIMIT)
async def water_balance(
    request: Request,
    field_id: UUID,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
    crop: Annotated[str | None, Query(description="Crop code; default: the field's crop")] = None,
    season: Annotated[Literal["last", "current"], Query()] = "last",
) -> WaterBalanceOut:
    record = await _readable(repo, field_id, session)
    code = crop or (record.crop if record.crop in CROPS else "winter_wheat")
    if code not in CROPS or CROPS[code].family == "fallow":
        raise HTTPException(status_code=422, detail=[f"No water balance for crop '{code}'."])
    climate = await load_climate(service, record)
    balance = balance_for(climate, record, code, season)
    common = {
        "field_id": str(field_id),
        "crop": code,
        "season": season,
        "crop_params": crop_out(CROPS[code]),
        "data_sources": source_ref(climate),
        "assumptions": WATER_ASSUMPTIONS,
        "uncertainty_note": "grid_cell_not_field",
    }
    if balance is None:
        return WaterBalanceOut(status="season_not_active", **common)
    return WaterBalanceOut(
        status="ok",
        sowing=balance.sowing,
        harvest=balance.harvest,
        covered_until=balance.covered_until,
        missing_days=balance.missing_days,
        totals=WaterTotals(
            precip_mm=round(balance.precip_mm, 1),
            et0_mm=round(balance.et0_mm, 1),
            etc_mm=round(balance.etc_mm, 1),
            deficit_mm=round(balance.deficit_mm, 1),
            coverage_pct=None if balance.coverage_pct is None else round(balance.coverage_pct, 1),
        ),
        days=[
            WaterDay(
                date=d.day,
                kc=round(d.kc, 3),
                et0=None if d.et0 is None else round(d.et0, 2),
                etc=None if d.etc is None else round(d.etc, 2),
                precip=d.precip,
            )
            for d in balance.days
        ],
        **common,
    )


def plan_out(label: str, plan: PlanResult) -> PlanOut:
    return PlanOut(
        label=label,  # type: ignore[arg-type]
        crops=plan.crops,
        years=[
            YearOut(
                year=y.year,
                crop=y.crop,
                etc_mm=None if y.etc_mm is None else round(y.etc_mm, 1),
                precip_mm=None if y.precip_mm is None else round(y.precip_mm, 1),
                coverage_pct=None if y.coverage_pct is None else round(y.coverage_pct, 1),
            )
            for y in plan.years
        ],
        total_etc_mm=round(plan.total_etc_mm, 1),
        total_precip_mm=round(plan.total_precip_mm, 1),
        water_score=round(plan.water_score, 1),
        rules_score=round(plan.rules_score, 1),
        score=round(plan.score, 1),
        rules=[RuleOut(code=r.code, passed=r.passed, years=r.years) for r in plan.rules],
    )


async def _rotation(
    record: FieldRecord, service: PowerDailyService, plans: list[tuple[str, list[str]]] | None
) -> RotationOut:
    climate = await load_climate(service, record)
    per_crop = crop_climates(climate, record)
    climates = {code: c for code, (c, _) in per_crop.items()}
    history = [(s["season_year"], s["crop"]) for s in record.rotation_history]
    start_year = max((y for y, _ in history), default=climate.latest.year - 1) + 1
    rainfed = record.irrigation_type in (None, "rainfed")
    evaluate = lambda crops: evaluate_plan(  # noqa: E731
        crops, start_year=start_year, history=history, climate=climates, rainfed=rainfed
    )

    if plans is None:
        current = default_plan(record)
        out = [plan_out("current", evaluate(current))]
        out.append(
            plan_out(
                "suggested",
                suggest_plan(
                    current=current,
                    start_year=start_year,
                    history=history,
                    climate=climates,
                    rainfed=rainfed,
                ),
            )
        )
    else:
        out = [plan_out(label, evaluate(crops)) for label, crops in plans]

    cond = field_conditions(climate)
    return RotationOut(
        field_id=str(record.id),
        weights={
            "water": WATER_WEIGHT,
            "rules": RULES_WEIGHT,
            "rainfed_min_coverage": RAINFED_MIN_COVERAGE,
        },
        history=[{"season_year": y, "crop": c} for y, c in sorted(history)],
        conditions=Conditions(
            annual_precip_mm=None
            if cond.annual_precip_mm is None
            else round(cond.annual_precip_mm, 1),
            mean_temp_c=None if cond.mean_temp_c is None else round(cond.mean_temp_c, 1),
            frost_days=cond.frost_days,
            start=cond.start,
            end=cond.end,
            source_type=climate.served.source_type,
        ),
        crops=[
            CropWater(
                code=code,
                family=CROPS[code].family,
                season_start=b.sowing,
                season_end=b.covered_until,
                etc_mm=round(c.etc_mm, 1),
                precip_mm=round(c.precip_mm, 1),
                coverage_pct=None if c.coverage_pct is None else round(c.coverage_pct, 1),
            )
            for code, (c, b) in per_crop.items()
        ],
        plans=out,
        data_sources=source_ref(climate),
        assumptions=ROTATION_ASSUMPTIONS,
        uncertainty_note="score_not_yield",
    )


@router.get(
    "/fields/{field_id}/rotation",
    response_model=RotationOut,
    summary="Current plan (last 3 seasons repeated) vs the best-scoring alternative",
)
@limiter.limit(NASA_LIMIT)
async def rotation(
    request: Request,
    field_id: UUID,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
) -> RotationOut:
    record = await _readable(repo, field_id, session)
    return await _rotation(record, service, None)


@router.post(
    "/fields/{field_id}/rotation/compare",
    response_model=RotationOut,
    summary="Score user-edited plans with the same rules",
)
@limiter.limit(NASA_LIMIT)
async def compare_rotation(
    request: Request,
    field_id: UUID,
    body: CompareIn,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
) -> RotationOut:
    record = await _readable(repo, field_id, session)
    for plan in body.plans:
        unknown = [c for c in plan if c not in CROPS]
        if unknown or not 1 <= len(plan) <= 5:
            raise HTTPException(status_code=422, detail=[f"Invalid plan: {plan}"])
    labels = ["current", "custom", "custom"]
    return await _rotation(record, service, list(zip(labels, body.plans, strict=False)))


def _r(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(value, digits)


def twin_out(key: str, plan: str, crop: str, season: TwinSeason | None) -> TwinScenarioOut:
    if season is None:
        return TwinScenarioOut(key=key, plan=plan, crop=crop, status="no_history")  # type: ignore[arg-type]
    return TwinScenarioOut(
        key=key,  # type: ignore[arg-type]
        plan=plan,  # type: ignore[arg-type]
        crop=crop,
        status="ok",
        sowing=season.sowing,
        harvest=season.harvest,
        in_season=season.in_season,
        observed_until=season.observed_until,
        observed_precip_mm=round(season.observed_precip_mm, 1) if season.in_season else None,
        observed_etc_mm=round(season.observed_etc_mm, 1) if season.in_season else None,
        observed_missing_days=season.observed_missing_days,
        analog_count=len(season.analogs),
        outcomes={
            name: TwinOutcome(
                sowing_year=o.sowing_year,
                precip_mm=round(o.precip_mm, 1),
                etc_mm=round(o.etc_mm, 1),
                deficit_mm=round(o.deficit_mm, 1),
                coverage_pct=_r(o.coverage_pct),
            )
            for name, o in season.outcomes.items()
        },
        days=[
            TwinDayOut(
                date=d.day,
                kc=round(d.kc, 3),
                observed=d.observed,
                balance_mm=_r(d.balance_mm),
                p10=_r(d.p10),
                p50=_r(d.p50),
                p90=_r(d.p90),
                etc_cum_mm=round(d.etc_cum_mm, 1),
            )
            for d in season.days
        ],
    )


@router.get(
    "/fields/{field_id}/twin",
    response_model=TwinOut,
    summary="Digital twin: observed season so far + past seasons replayed for two crop plans",
)
@limiter.limit(NASA_LIMIT)
async def twin(
    request: Request,
    field_id: UUID,
    repo: Repo,
    service: Annotated[PowerDailyService, Depends(get_power_service)],
    session: Annotated[DemoSession | None, Depends(optional_session)],
    crop_a: Annotated[str | None, Query(description="Default: current plan, year 1")] = None,
    crop_b: Annotated[str | None, Query(description="Default: suggested plan, year 1")] = None,
) -> TwinOut:
    record = await _readable(repo, field_id, session)
    for code in (crop_a, crop_b):
        if code is not None and (code not in CROPS or CROPS[code].family == "fallow"):
            raise HTTPException(status_code=422, detail=[f"No scenario for crop '{code}'."])
    climate = await load_climate(service, record, years=TWIN_HISTORY_YEARS)

    plan_a = plan_b = "custom"
    if crop_a is None or crop_b is None:
        current = default_plan(record)
        if crop_a is None:
            crop_a, plan_a = current[0], "current"
        if crop_b is None:
            per_crop = crop_climates(climate, record)
            history = [(s["season_year"], s["crop"]) for s in record.rotation_history]
            start_year = max((y for y, _ in history), default=climate.latest.year - 1) + 1
            suggested = suggest_plan(
                current=current,
                start_year=start_year,
                history=history,
                climate={code: c for code, (c, _) in per_crop.items()},
                rainfed=record.irrigation_type in (None, "rainfed"),
            )
            crop_b, plan_b = suggested.crops[0], "suggested"

    daily = daily_climate(climate.inputs, latitude=record.centroid_lat, elevation=climate.elevation)
    scenarios = [
        twin_out(key, plan, code, twin_season(CROPS[code], daily, climate.latest))
        for key, plan, code in (("a", plan_a, crop_a), ("b", plan_b, crop_b))
    ]
    return TwinOut(
        field_id=str(field_id),
        observed_source_type=climate.served.source_type,
        latest_observed=climate.latest,
        history_start=min(climate.inputs),
        history_end=climate.latest,
        scenarios=scenarios,
        data_sources=source_ref(climate),
        assumptions=TWIN_ASSUMPTIONS,
        uncertainty_note="replay_not_forecast",
    )
