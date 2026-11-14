"""Response contract for the water and rotation analyses (docs/ANALYSIS_AI.md acceptance:
every result carries method, data_sources, assumptions, uncertainty_note and status).
Assumption and rule texts are codes; the web app translates them."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.data_source import DataSource


class DataSourceRef(BaseModel):
    name: str
    product: str
    parameters: list[str]
    grid_cell: str
    fetched_at: datetime
    source_type: DataSource


class CropOut(BaseModel):
    code: str
    family: str
    kc_ini: float
    kc_mid: float
    kc_end: float
    stages: list[int]
    sowing_month: int
    sowing_day: int
    season_days: int
    suggestible: bool


class WaterDay(BaseModel):
    date: date
    kc: float
    et0: float | None
    etc: float | None
    precip: float | None


class WaterTotals(BaseModel):
    precip_mm: float
    et0_mm: float
    etc_mm: float
    deficit_mm: float
    coverage_pct: float | None


class WaterBalanceOut(BaseModel):
    field_id: str
    crop: str
    season: Literal["last", "current"]
    status: Literal["ok", "season_not_active"]
    source_type: DataSource = DataSource.DERIVED_INDICATOR
    method: str = "FAO-56 Penman-Monteith ET0 · single crop coefficient Kc · ETc = Kc × ET0"
    sowing: date | None = None
    harvest: date | None = None
    covered_until: date | None = None
    missing_days: int = 0
    totals: WaterTotals | None = None
    days: list[WaterDay] = Field(default_factory=list)
    crop_params: CropOut
    data_sources: list[DataSourceRef]
    assumptions: list[str]
    uncertainty_note: str


class Conditions(BaseModel):
    annual_precip_mm: float | None
    mean_temp_c: float | None
    frost_days: int
    start: date
    end: date
    source_type: DataSource = DataSource.LIVE_NASA


class CropWater(BaseModel):
    code: str
    family: str
    season_start: date
    season_end: date
    etc_mm: float
    precip_mm: float
    coverage_pct: float | None


class RuleOut(BaseModel):
    code: str
    passed: bool
    years: list[int]


class YearOut(BaseModel):
    year: int
    crop: str
    etc_mm: float | None
    precip_mm: float | None
    coverage_pct: float | None


class PlanOut(BaseModel):
    label: Literal["current", "suggested", "custom"]
    crops: list[str]
    years: list[YearOut]
    total_etc_mm: float
    total_precip_mm: float
    water_score: float
    rules_score: float
    score: float
    rules: list[RuleOut]


class RotationOut(BaseModel):
    field_id: str
    source_type: DataSource = DataSource.DERIVED_INDICATOR
    method: str = "Explainable scoring: 50 % water fit (rain ÷ FAO-56 ETc) + 50 % rotation rules"
    weights: dict[str, float]
    history: list[dict]
    conditions: Conditions
    crops: list[CropWater]
    plans: list[PlanOut]
    data_sources: list[DataSourceRef]
    assumptions: list[str]
    uncertainty_note: str


class CompareIn(BaseModel):
    plans: list[list[str]] = Field(min_length=1, max_length=3)


class TwinOutcome(BaseModel):
    """One past season's weather replayed for the rest of this season."""

    sowing_year: int
    precip_mm: float
    etc_mm: float
    deficit_mm: float
    coverage_pct: float | None


class TwinDayOut(BaseModel):
    date: date
    kc: float
    observed: bool
    balance_mm: float | None
    p10: float | None
    p50: float | None
    p90: float | None
    etc_cum_mm: float


class TwinScenarioOut(BaseModel):
    key: Literal["a", "b"]
    plan: Literal["current", "suggested", "custom"]
    crop: str
    status: Literal["ok", "no_history"]
    sowing: date | None = None
    harvest: date | None = None
    in_season: bool = False
    observed_until: date | None = None
    observed_precip_mm: float | None = None
    observed_etc_mm: float | None = None
    observed_missing_days: int = 0
    analog_count: int = 0
    outcomes: dict[str, TwinOutcome] = Field(default_factory=dict)
    days: list[TwinDayOut] = Field(default_factory=list)


class TwinOut(BaseModel):
    field_id: str
    source_type: DataSource = DataSource.SCENARIO_ESTIMATE
    observed_source_type: DataSource
    method: str = (
        "Observed NASA POWER season so far + the rest of the season replayed from each of the "
        "past seasons (analog years); dry/normal/wet = P10/P50/P90 of the season-end balance"
    )
    latest_observed: date
    history_start: date
    history_end: date
    scenarios: list[TwinScenarioOut]
    data_sources: list[DataSourceRef]
    assumptions: list[str]
    uncertainty_note: str
