from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from app.adapters.nasa_power import PowerDaily, PowerUnavailableError
from app.api.v1.nasa import get_power_service
from app.core.config import Settings
from app.main import create_app
from app.services.nasa_power import PowerDailyService

URL = "/v1/nasa/power/daily"
BASE = {"lat": 37.58, "lon": 32.79, "start": "2026-11-01", "end": "2026-11-13"}


class StaticClient:
    def __init__(self, data: PowerDaily | None) -> None:
        self.data = data

    async def fetch_daily(self, **_: object) -> PowerDaily:
        if self.data is None:
            raise PowerUnavailableError("down")
        return self.data


def make_client(data: PowerDaily | None) -> TestClient:
    app = create_app(Settings(_env_file=None))
    service = PowerDailyService(StaticClient(data), ttl_s=60)  # type: ignore[arg-type]
    app.dependency_overrides[get_power_service] = lambda: service
    return TestClient(app)


def series(body: dict, name: str) -> dict:
    return next(p for p in body["parameters"] if p["parameter"] == name)


def test_daily_series_with_provenance(power_daily: PowerDaily) -> None:
    response = make_client(power_daily).get(URL, params=BASE)

    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "live_nasa"
    assert body["provenance"]["product"] == "POWER Daily API v2.10.3"
    assert body["provenance"]["elevation_m"] == 1197.55
    assert body["provenance"]["stale"] is False
    assert body["grid_cell"] == {
        "center_lat": 37.5,
        "center_lon": 32.5,
        "lat_min": 37.25,
        "lat_max": 37.75,
        "lon_min": 32.1875,
        "lon_max": 32.8125,
        "resolution": "0.5° × 0.625°",
    }

    t2m = series(body, "T2M")
    assert (t2m["unit"], t2m["unit_source"]) == ("°C", "C")
    assert t2m["values"][0] == {"observed_at": "2026-11-01", "value": 12.13}
    assert t2m["values"][-1] == {"observed_at": "2026-11-13", "value": None}
    assert t2m["latest_available"] == "2026-11-11"
    assert series(body, "ALLSKY_SFC_SW_DWN")["spatial_resolution"] == "1.0° × 1.0°"


def test_second_request_is_labelled_cached(power_daily: PowerDaily) -> None:
    client = make_client(power_daily)
    client.get(URL, params=BASE)

    assert client.get(URL, params=BASE).json()["source_type"] == "cached_nasa"


def test_parameter_subset(power_daily: PowerDaily) -> None:
    body = (
        make_client(power_daily).get(URL, params={**BASE, "parameters": "precTOTcorr, T2M"}).json()
    )
    assert [p["parameter"] for p in body["parameters"]] == ["PRECTOTCORR", "T2M"]


def test_invalid_requests_are_rejected(power_daily: PowerDaily) -> None:
    client = make_client(power_daily)
    future = (datetime.now(UTC).date() + timedelta(days=3)).isoformat()

    cases = [
        {**BASE, "lat": 95},
        {**BASE, "start": "2026-11-13", "end": "2026-11-01"},
        {**BASE, "end": future},
        {**BASE, "start": "1970-01-01"},
        {**BASE, "start": "2020-01-01", "end": date(2026, 1, 1).isoformat()},
        {**BASE, "parameters": "T2M,CO2"},
    ]
    for params in cases:
        assert client.get(URL, params=params).status_code == 422, params


def test_nasa_outage_without_cache_is_a_calm_503() -> None:
    response = make_client(None).get(URL, params=BASE)

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "nasa_unavailable",
            "message": "NASA POWER did not respond. Try again in a moment.",
        }
    }
