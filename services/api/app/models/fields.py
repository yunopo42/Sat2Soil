"""Field contract (docs/ARCHITECTURE.md Field, D-002). Geometry is GeoJSON in EPSG:4326, lon/lat."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.data_source import DataSource

IrrigationType = Literal["rainfed", "drip", "sprinkler", "center_pivot", "furrow"]

MIN_AREA_HA = 0.05
MAX_AREA_HA = 5000.0
MAX_VERTICES = 500


class GeoJSONPolygon(BaseModel):
    """One outer ring, no holes. Rings are closed automatically; coordinates are [lon, lat]."""

    type: Literal["Polygon"]
    coordinates: list[list[tuple[float, float]]]

    @field_validator("coordinates")
    @classmethod
    def _validate_rings(
        cls, rings: list[list[tuple[float, float]]]
    ) -> list[list[tuple[float, float]]]:
        if len(rings) != 1:
            raise ValueError("draw a single boundary without holes")
        ring = [(round(lon, 7), round(lat, 7)) for lon, lat in rings[0]]
        for lon, lat in ring:
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise ValueError("coordinates must be [longitude, latitude] in degrees")
        if ring and ring[0] != ring[-1]:
            ring.append(ring[0])
        if len(ring) < 4:
            raise ValueError("a field needs at least 3 corners")
        if len(ring) > MAX_VERTICES + 1:
            raise ValueError(f"a field can have at most {MAX_VERTICES} corners")
        return [ring]


class SeasonIn(BaseModel):
    season_year: int = Field(ge=1990, le=2100)
    crop: str = Field(min_length=1, max_length=40)


class FieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    boundary: GeoJSONPolygon
    crop: str | None = Field(default=None, min_length=1, max_length=40)
    irrigation_type: IrrigationType | None = None
    rotation_history: list[SeasonIn] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def _unique_seasons(self) -> FieldCreate:
        years = [s.season_year for s in self.rotation_history]
        if len(years) != len(set(years)):
            raise ValueError("each season year can appear once")
        return self


class FieldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    boundary: GeoJSONPolygon | None = None
    crop: str | None = Field(default=None, min_length=1, max_length=40)
    irrigation_type: IrrigationType | None = None
    rotation_history: list[SeasonIn] | None = Field(default=None, max_length=12)


class Centroid(BaseModel):
    lat: float
    lon: float


class Season(BaseModel):
    season_year: int
    crop: str


class FieldOut(BaseModel):
    id: UUID
    name: str
    boundary: dict
    centroid: Centroid
    area_ha: float
    area_donum: float = Field(description="1 dönüm = 0.1 ha (1000 m²)")
    perimeter_m: float
    crop: str | None
    irrigation_type: IrrigationType | None
    rotation_history: list[Season]
    is_sample: bool
    source_type: DataSource = Field(
        description="demo_sample for the shared sample field, manual_user for a drawn field"
    )
    created_at: datetime
    updated_at: datetime


class DemoSessionOut(BaseModel):
    token: str
    workspace_id: UUID
    expires_at: datetime
