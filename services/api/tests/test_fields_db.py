"""Integration test against the real Supabase database (supabase/task.md D12).

Skipped by default. Run with:  SAT2SOIL_DB_TESTS=1 uv run pytest -m db
Creates one visitor workspace with one field and deletes it again.
"""

import os
from datetime import UTC, datetime, timedelta

import pytest
from psycopg_pool import AsyncConnectionPool

from app.core.config import get_settings
from app.models.fields import FieldCreate, FieldUpdate
from app.repositories.fields import PostgresFieldsRepository

pytestmark = [
    pytest.mark.db,
    pytest.mark.skipif(os.getenv("SAT2SOIL_DB_TESTS") != "1", reason="set SAT2SOIL_DB_TESTS=1"),
]

# 0.01° × 0.01° near Çumra: geodesic area ≈ 97.7 ha.
SQUARE = {
    "type": "Polygon",
    "coordinates": [
        [[32.80, 37.60], [32.81, 37.60], [32.81, 37.61], [32.80, 37.61], [32.80, 37.60]]
    ],
}
BOWTIE = {
    "type": "Polygon",
    "coordinates": [
        [[32.80, 37.60], [32.81, 37.61], [32.81, 37.60], [32.80, 37.61], [32.80, 37.60]]
    ],
}


@pytest.mark.anyio
async def test_field_lifecycle_in_postgis() -> None:
    dsn = get_settings().database_url
    assert dsn is not None, "DATABASE_URL missing"
    async with AsyncConnectionPool(
        dsn.get_secret_value(),
        min_size=1,
        max_size=2,
        kwargs={"autocommit": True, "prepare_threshold": None},
    ) as pool:
        repo = PostgresFieldsRepository(pool)
        workspace = await repo.create_workspace(datetime.now(UTC) + timedelta(minutes=5))
        try:
            data = FieldCreate.model_validate(
                {
                    "name": "Integration test",
                    "boundary": SQUARE,
                    "crop": "Winter wheat",
                    "rotation_history": [{"season_year": 2025, "crop": "Chickpea"}],
                }
            )
            check = await repo.check_geometry(data.boundary)
            assert check.valid
            assert 97 < check.area_ha < 99

            created = await repo.create_field(workspace, data)
            assert 97 < created.area_ha < 99
            assert abs(created.centroid_lat - 37.605) < 1e-6
            assert created.rotation_history == [{"season_year": 2025, "crop": "Chickpea"}]
            assert created.boundary["type"] == "Polygon"

            updated = await repo.update_field(
                created.id, FieldUpdate.model_validate({"name": "Renamed", "rotation_history": []})
            )
            assert updated.name == "Renamed"
            assert updated.rotation_history == []
            assert updated.updated_at >= created.updated_at

            invalid = await repo.check_geometry(
                FieldCreate.model_validate({"name": "x", "boundary": BOWTIE}).boundary
            )
            assert not invalid.valid
            assert "Self-intersection" in invalid.reason
        finally:
            async with pool.connection() as conn:
                await conn.execute("delete from public.demo_workspaces where id = %s", (workspace,))
