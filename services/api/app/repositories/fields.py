"""PostGIS persistence for workspaces and fields (supabase/task.md D02–D04, D12).

Area, perimeter and centroid are computed by PostGIS on the geography type (geodesic), so the
numbers shown in the UI are the database's, not a browser approximation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.models.fields import FieldCreate, FieldUpdate, GeoJSONPolygon, SeasonIn


@dataclass(frozen=True)
class FieldRecord:
    id: UUID
    workspace_id: UUID
    name: str
    boundary: dict
    centroid_lat: float
    centroid_lon: float
    area_ha: float
    perimeter_m: float
    crop: str | None
    irrigation_type: str | None
    is_sample: bool
    rotation_history: list[dict]
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class GeometryCheck:
    valid: bool
    reason: str
    area_ha: float


class FieldsRepository(Protocol):
    async def create_workspace(self, expires_at: datetime) -> UUID: ...
    async def purge_expired_workspaces(self) -> int: ...
    async def list_sample_fields(self) -> list[FieldRecord]: ...
    async def list_workspace_fields(self, workspace_id: UUID) -> list[FieldRecord]: ...
    async def get_field(self, field_id: UUID) -> FieldRecord | None: ...
    async def check_geometry(self, boundary: GeoJSONPolygon) -> GeometryCheck: ...
    async def create_field(self, workspace_id: UUID, data: FieldCreate) -> FieldRecord: ...
    async def update_field(self, field_id: UUID, data: FieldUpdate) -> FieldRecord: ...
    async def delete_field(self, field_id: UUID) -> None: ...


_SELECT = """
select f.id, f.workspace_id, f.name,
       extensions.st_asgeojson(f.boundary, 7)::json as boundary,
       extensions.st_y(f.centroid) as centroid_lat,
       extensions.st_x(f.centroid) as centroid_lon,
       f.area_ha, f.perimeter_m, f.crop, f.irrigation_type, f.is_sample,
       coalesce((
         select json_agg(json_build_object('season_year', s.season_year, 'crop', s.crop)
                         order by s.season_year)
         from public.crop_seasons s where s.field_id = f.id
       ), '[]'::json) as rotation_history,
       f.created_at, f.updated_at
from public.fields f
"""

_GEOMETRY = "extensions.st_setsrid(extensions.st_geomfromgeojson(%s), 4326)"


def _geojson(boundary: GeoJSONPolygon) -> str:
    return json.dumps({"type": "Polygon", "coordinates": boundary.coordinates})


class PostgresFieldsRepository:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def create_workspace(self, expires_at: datetime) -> UUID:
        async with self._pool.connection() as conn:
            row = await (
                await conn.execute(
                    "insert into public.demo_workspaces (kind, expires_at)"
                    " values ('visitor', %s) returning id",
                    (expires_at,),
                )
            ).fetchone()
            return row[0]

    async def purge_expired_workspaces(self) -> int:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                "delete from public.demo_workspaces where kind = 'visitor' and expires_at < now()"
            )
            return cursor.rowcount

    async def list_sample_fields(self) -> list[FieldRecord]:
        return await self._fetch_many(_SELECT + " where f.is_sample order by f.name", ())

    async def list_workspace_fields(self, workspace_id: UUID) -> list[FieldRecord]:
        return await self._fetch_many(
            _SELECT + " where f.workspace_id = %s order by f.created_at desc", (workspace_id,)
        )

    async def get_field(self, field_id: UUID) -> FieldRecord | None:
        rows = await self._fetch_many(_SELECT + " where f.id = %s", (field_id,))
        return rows[0] if rows else None

    async def check_geometry(self, boundary: GeoJSONPolygon) -> GeometryCheck:
        async with self._pool.connection() as conn:
            row = await (
                await conn.execute(
                    f"select extensions.st_isvalid(g), extensions.st_isvalidreason(g),"
                    f" extensions.st_area(g::extensions.geography) / 10000.0"
                    f" from (select {_GEOMETRY} as g) s",
                    (_geojson(boundary),),
                )
            ).fetchone()
            return GeometryCheck(valid=row[0], reason=row[1], area_ha=float(row[2]))

    async def create_field(self, workspace_id: UUID, data: FieldCreate) -> FieldRecord:
        async with self._pool.connection() as conn, conn.transaction():
            row = await (
                await conn.execute(
                    "insert into public.fields"
                    " (workspace_id, name, boundary, crop, irrigation_type)"
                    f" values (%s, %s, {_GEOMETRY}, %s, %s) returning id",
                    (
                        workspace_id,
                        data.name,
                        _geojson(data.boundary),
                        data.crop,
                        data.irrigation_type,
                    ),
                )
            ).fetchone()
            await self._replace_seasons(conn, row[0], data.rotation_history)
        record = await self.get_field(row[0])
        assert record is not None
        return record

    async def update_field(self, field_id: UUID, data: FieldUpdate) -> FieldRecord:
        changes = data.model_dump(exclude_unset=True, exclude={"boundary", "rotation_history"})
        async with self._pool.connection() as conn, conn.transaction():
            assignments = [f"{column} = %s" for column in changes]
            values: list[object] = list(changes.values())
            if data.boundary is not None:
                assignments.append(f"boundary = {_GEOMETRY}")
                values.append(_geojson(data.boundary))
            if assignments:
                await conn.execute(
                    f"update public.fields set {', '.join(assignments)} where id = %s",
                    (*values, field_id),
                )
            if data.rotation_history is not None:
                await self._replace_seasons(conn, field_id, data.rotation_history)
        record = await self.get_field(field_id)
        assert record is not None
        return record

    async def delete_field(self, field_id: UUID) -> None:
        async with self._pool.connection() as conn:
            await conn.execute("delete from public.fields where id = %s", (field_id,))

    async def _replace_seasons(self, conn, field_id: UUID, seasons: list[SeasonIn]) -> None:
        await conn.execute("delete from public.crop_seasons where field_id = %s", (field_id,))
        for season in seasons:
            await conn.execute(
                "insert into public.crop_seasons (field_id, season_year, crop) values (%s, %s, %s)",
                (field_id, season.season_year, season.crop),
            )

    async def _fetch_many(self, sql: str, params: tuple) -> list[FieldRecord]:
        async with self._pool.connection() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            await cursor.execute(sql, params)
            return [FieldRecord(**row) for row in await cursor.fetchall()]
