from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.adapters.nasa_power import PowerDaily
from app.api.v1.fields import get_fields_repo
from app.api.v1.nasa import get_power_service
from app.core.config import Settings, get_settings
from app.core.security import DemoSession, encode_token
from app.main import create_app
from app.models.fields import FieldCreate, FieldUpdate, GeoJSONPolygon
from app.repositories.fields import FieldRecord, GeometryCheck
from app.services.nasa_power import PowerDailyService

SETTINGS = Settings(
    _env_file=None,
    demo_session_secret="test-secret-test-secret-test-secret",
    rate_limit_enabled=False,
)
SAMPLE_ID = UUID("00000000-0000-4000-8000-000000000101")
SEED_WS = UUID("00000000-0000-4000-8000-000000000001")
NOW = datetime(2026, 11, 14, 12, tzinfo=UTC)
BOUNDARY = {
    "type": "Polygon",
    "coordinates": [[[32.8, 37.6], [32.81, 37.6], [32.81, 37.61], [32.8, 37.61], [32.8, 37.6]]],
}


def record(**overrides: object) -> FieldRecord:
    base = FieldRecord(
        id=SAMPLE_ID,
        workspace_id=SEED_WS,
        name="Çumra · Konya Ovası",
        boundary=BOUNDARY,
        centroid_lat=37.605,
        centroid_lon=32.805,
        area_ha=42.6,
        perimeter_m=2650.0,
        crop="Winter wheat",
        irrigation_type="rainfed",
        is_sample=True,
        rotation_history=[{"season_year": 2025, "crop": "Chickpea"}],
        created_at=NOW,
        updated_at=NOW,
    )
    return replace(base, **overrides)


class FakeRepo:
    def __init__(self) -> None:
        self.fields: dict[UUID, FieldRecord] = {SAMPLE_ID: record()}
        self.check = GeometryCheck(valid=True, reason="Valid Geometry", area_ha=12.5)

    async def create_workspace(self, expires_at: datetime) -> UUID:
        return uuid4()

    async def purge_expired_workspaces(self) -> int:
        return 0

    async def list_sample_fields(self) -> list[FieldRecord]:
        return [r for r in self.fields.values() if r.is_sample]

    async def list_workspace_fields(self, workspace_id: UUID) -> list[FieldRecord]:
        return [r for r in self.fields.values() if r.workspace_id == workspace_id]

    async def get_field(self, field_id: UUID) -> FieldRecord | None:
        return self.fields.get(field_id)

    async def check_geometry(self, boundary: GeoJSONPolygon) -> GeometryCheck:
        return self.check

    async def create_field(self, workspace_id: UUID, data: FieldCreate) -> FieldRecord:
        new = record(
            id=uuid4(),
            workspace_id=workspace_id,
            name=data.name,
            is_sample=False,
            area_ha=self.check.area_ha,
            rotation_history=[s.model_dump() for s in data.rotation_history],
        )
        self.fields[new.id] = new
        return new

    async def update_field(self, field_id: UUID, data: FieldUpdate) -> FieldRecord:
        changes = data.model_dump(exclude_unset=True, exclude={"boundary", "rotation_history"})
        self.fields[field_id] = replace(self.fields[field_id], **changes)
        return self.fields[field_id]

    async def delete_field(self, field_id: UUID) -> None:
        del self.fields[field_id]


class StaticPowerClient:
    def __init__(self, data: PowerDaily) -> None:
        self.data = data
        self.calls: list[dict] = []

    async def fetch_daily(self, **kwargs: object) -> PowerDaily:
        self.calls.append(kwargs)
        return self.data


@pytest.fixture
def repo() -> FakeRepo:
    return FakeRepo()


@pytest.fixture
def client(repo: FakeRepo) -> TestClient:
    app = create_app(SETTINGS)
    app.dependency_overrides[get_fields_repo] = lambda: repo
    app.dependency_overrides[get_settings] = lambda: SETTINGS
    return TestClient(app)


def auth(workspace_id: UUID | None = None, expires_in: timedelta = timedelta(hours=1)) -> dict:
    session = DemoSession(
        workspace_id=workspace_id or uuid4(), expires_at=datetime.now(UTC) + expires_in
    )
    return {"Authorization": f"Bearer {encode_token(session, SETTINGS)}"}


def test_demo_session_returns_a_usable_token(client: TestClient) -> None:
    created = client.post("/v1/demo/session")
    assert created.status_code == 201
    token = created.json()["token"]

    listed = client.get("/v1/fields", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    assert listed.json() == []


def test_sample_fields_are_public_and_labelled(client: TestClient) -> None:
    body = client.get("/v1/demo/fields").json()

    assert len(body) == 1
    assert body[0]["source_type"] == "demo_sample"
    assert body[0]["area_donum"] == 426.0
    assert body[0]["rotation_history"] == [{"season_year": 2025, "crop": "Chickpea"}]
    assert client.get(f"/v1/fields/{SAMPLE_ID}").status_code == 200


def test_writes_require_a_session(client: TestClient) -> None:
    response = client.post("/v1/fields", json={"name": "Mine", "boundary": BOUNDARY})
    assert response.status_code == 401


def test_expired_session_is_refused(client: TestClient) -> None:
    response = client.get("/v1/fields", headers=auth(expires_in=timedelta(seconds=-5)))
    assert response.status_code == 401


def test_a_drawn_field_is_private_to_its_session(client: TestClient) -> None:
    mine = auth()
    created = client.post(
        "/v1/fields",
        json={"name": "Mine", "boundary": BOUNDARY, "irrigation_type": "drip"},
        headers=mine,
    )
    assert created.status_code == 201
    field = created.json()
    assert field["source_type"] == "manual_user"

    assert client.get(f"/v1/fields/{field['id']}", headers=mine).status_code == 200
    assert client.get(f"/v1/fields/{field['id']}", headers=auth()).status_code == 404
    assert client.get(f"/v1/fields/{field['id']}").status_code == 404
    assert [f["id"] for f in client.get("/v1/fields", headers=mine).json()] == [field["id"]]


def test_sample_field_is_read_only(client: TestClient) -> None:
    response = client.patch(f"/v1/fields/{SAMPLE_ID}", json={"name": "Hijacked"}, headers=auth())
    assert response.status_code == 403
    assert client.delete(f"/v1/fields/{SAMPLE_ID}", headers=auth()).status_code == 403


def test_owner_can_rename_and_delete(client: TestClient) -> None:
    mine = auth()
    field_id = client.post(
        "/v1/fields", json={"name": "A", "boundary": BOUNDARY}, headers=mine
    ).json()["id"]

    renamed = client.patch(f"/v1/fields/{field_id}", json={"name": "B"}, headers=mine)
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "B"

    assert client.delete(f"/v1/fields/{field_id}", headers=mine).status_code == 204
    assert client.get(f"/v1/fields/{field_id}", headers=mine).status_code == 404


def test_self_intersecting_boundary_is_explained(client: TestClient, repo: FakeRepo) -> None:
    repo.check = GeometryCheck(valid=False, reason="Self-intersection[32.805 37.605]", area_ha=0.0)
    response = client.post(
        "/v1/fields", json={"name": "Bowtie", "boundary": BOUNDARY}, headers=auth()
    )

    assert response.status_code == 422
    assert "crosses itself" in response.json()["detail"][0]


def test_tiny_field_is_rejected(client: TestClient, repo: FakeRepo) -> None:
    repo.check = GeometryCheck(valid=True, reason="Valid Geometry", area_ha=0.01)
    response = client.post(
        "/v1/fields", json={"name": "Tiny", "boundary": BOUNDARY}, headers=auth()
    )

    assert response.status_code == 422
    assert "smaller" in response.json()["detail"][0]


def test_field_climate_uses_the_centroid(client: TestClient, power_daily: PowerDaily) -> None:
    power = StaticPowerClient(power_daily)
    service = PowerDailyService(power, ttl_s=60)  # type: ignore[arg-type]
    client.app.dependency_overrides[get_power_service] = lambda: service  # type: ignore[attr-defined]

    response = client.get(
        f"/v1/fields/{SAMPLE_ID}/nasa/power/daily",
        params={"start": "2026-11-01", "end": "2026-11-13", "parameters": "T2M"},
    )

    assert response.status_code == 200
    assert (response.json()["latitude"], response.json()["longitude"]) == (37.605, 32.805)
    assert power.calls[0]["latitude"] == 37.605
