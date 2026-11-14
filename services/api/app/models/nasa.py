"""Response contract for NASA POWER data (D-001, D-002 field names)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.adapters.nasa_power import (
    MET_GRID_LAT_DEG,
    MET_GRID_LON_DEG,
    SOLAR_GRID_DEG,
    SOLAR_PARAMETERS,
)
from app.models.data_source import DataSource
from app.services.nasa_power import ServedPowerDaily

# Display units: proper symbols for the UI. The unit exactly as POWER returned it is kept too.
DISPLAY_UNITS = {"C": "°C", "MJ/m^2/day": "MJ/m²/day"}


class DailyValue(BaseModel):
    observed_at: date
    value: float | None = Field(description="null when POWER reported the fill value (-999)")


class ParameterSeries(BaseModel):
    parameter: str
    long_name: str
    unit: str
    unit_source: str = Field(description="Unit string exactly as returned by POWER")
    spatial_resolution: str
    missing_days: int
    latest_available: date | None = Field(
        description="Last day with a value; later days are not published by POWER yet"
    )
    values: list[DailyValue]


class GridCellOut(BaseModel):
    center_lat: float
    center_lon: float
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    resolution: str


class Provenance(BaseModel):
    source_name: Literal["NASA POWER"] = "NASA POWER"
    product: str
    community: Literal["AG"] = "AG"
    upstream_sources: list[str]
    temporal_resolution: Literal["daily"] = "daily"
    time_standard: str
    elevation_m: float
    fetched_at: datetime
    stale: bool = Field(
        description="True when NASA was unreachable and an expired cached copy is served"
    )
    provenance_url: str


class PowerDailyResponse(BaseModel):
    source_type: DataSource
    latitude: float
    longitude: float
    start: date
    end: date
    grid_cell: GridCellOut
    provenance: Provenance
    parameters: list[ParameterSeries]


def build_power_daily_response(
    served: ServedPowerDaily,
    *,
    latitude: float,
    longitude: float,
    parameters: tuple[str, ...],
) -> PowerDailyResponse:
    """Only the requested parameters, in the order they were requested."""
    data = served.data
    cell = served.grid_cell
    met_resolution = f"{MET_GRID_LAT_DEG}° × {MET_GRID_LON_DEG}°"
    return PowerDailyResponse(
        source_type=served.source_type,
        latitude=latitude,
        longitude=longitude,
        start=data.start,
        end=data.end,
        grid_cell=GridCellOut(
            center_lat=cell.center_lat,
            center_lon=cell.center_lon,
            lat_min=cell.lat_min,
            lat_max=cell.lat_max,
            lon_min=cell.lon_min,
            lon_max=cell.lon_max,
            resolution=met_resolution,
        ),
        provenance=Provenance(
            product=f"POWER Daily API {data.api_version}",
            upstream_sources=data.upstream_sources,
            time_standard=data.time_standard,
            elevation_m=data.elevation_m,
            fetched_at=data.fetched_at,
            stale=served.stale,
            provenance_url=data.request_url,
        ),
        parameters=[
            ParameterSeries(
                parameter=series.parameter,
                long_name=series.long_name,
                unit=DISPLAY_UNITS.get(series.unit, series.unit),
                unit_source=series.unit,
                spatial_resolution=(
                    f"{SOLAR_GRID_DEG}° × {SOLAR_GRID_DEG}°"
                    if series.parameter in SOLAR_PARAMETERS
                    else met_resolution
                ),
                missing_days=series.missing_days,
                latest_available=series.latest_available,
                values=[DailyValue(observed_at=day, value=value) for day, value in series.values],
            )
            for series in (data.series[name] for name in parameters)
        ],
    )
