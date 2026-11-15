"""AgriSpray concept contract (docs/ARCHITECTURE.md DeviceSample / SprayCardAnalysis, D-027).
Every device and card value is `simulated_device` with `computation_kind = mock`."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.models.agronomy import DataSourceRef
from app.models.data_source import DataSource

ComputationKind = Literal["mock"]


class DeviceReadings(BaseModel):
    soil_moisture_pct: float | None
    soil_temp_c: float | None
    soil_ec_ds_m: float | None
    air_temp_c: float | None
    air_rh_pct: float | None
    wind_ms: float | None


class DeviceHistoryPoint(BaseModel):
    at: datetime
    soil_moisture_pct: float
    soil_temp_c: float


class DeviceOut(BaseModel):
    device_id: str
    # A physical prototype exists but sends no data yet (D-030).
    status: Literal["prototype"] = "prototype"
    connected: bool = False
    source_type: DataSource = DataSource.SIMULATED_DEVICE
    computation_kind: ComputationKind = "mock"
    recorded_at: datetime
    readings: DeviceReadings
    previous: DeviceReadings
    previous_at: datetime
    history: list[DeviceHistoryPoint]
    quality_note: str = "sample_not_measurement"


class CheckOut(BaseModel):
    code: str
    status: Literal["within", "caution", "outside", "unknown"]
    value: float | None
    unit: str
    source_type: DataSource


class RegionalDay(BaseModel):
    date: date
    wind_ms: float | None
    tmax_c: float | None
    rh_pct: float | None
    precip_mm: float | None


class RegionalOut(BaseModel):
    source_type: DataSource
    start: date
    end: date
    mean_wind_ms: float | None
    max_wind_ms: float | None
    windy_days: int
    windy_threshold_ms: float
    days: list[RegionalDay]


class MeasurementPointOut(BaseModel):
    code: str
    lat: float
    lon: float
    soil_moisture_pct: float
    soil_temp_c: float
    soil_ec_ds_m: float
    source_type: DataSource = DataSource.SIMULATED_DEVICE


class PlantObservation(BaseModel):
    date: date
    stage: Literal["before", "after"]
    plant_tag: str
    leaves_checked: int
    leaves_with_spots: int


class AgriSprayOut(BaseModel):
    field_id: str
    source_type: DataSource = DataSource.SIMULATED_DEVICE
    computation_kind: ComputationKind = "mock"
    device: DeviceOut
    points: list[MeasurementPointOut]
    checks: list[CheckOut]
    regional: RegionalOut | None
    plant_log: list[PlantObservation]
    data_sources: list[DataSourceRef]
    assumptions: list[str]
    uncertainty_note: str


class StainOut(BaseModel):
    x: float
    y: float
    d: float


class HistogramBin(BaseModel):
    from_um: int
    to_um: int | None
    count: int


class SprayCardOut(BaseModel):
    variant: Literal["even", "uneven", "sparse"]
    source_type: DataSource = DataSource.SIMULATED_DEVICE
    computation_kind: ComputationKind = "mock"
    image_kind: Literal["synthetic"] = "synthetic"
    method: str = (
        "Synthetic card: generated stains rasterised at 0.05 mm; coverage = stain pixels / card "
        "pixels; stains = 4-connected regions; uniformity = CV of coverage over 6 x 2 zones"
    )
    card_mm: tuple[float, float]
    resolution_mm: float
    generated_stains: int
    stains: list[StainOut]
    coverage_pct: float
    regions: int
    regions_per_cm2: float
    zone_coverage: list[list[float]]
    uniformity_cv_pct: float
    uniformity: Literal["even", "moderate", "uneven"]
    denser_side: Literal["left", "right"] | None
    left_coverage_pct: float
    right_coverage_pct: float
    histogram: list[HistogramBin]
    mask_png: str
    assumptions: list[str]
