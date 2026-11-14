import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.adapters.nasa_power import PARAMETERS, PowerDaily, parse_daily

FIXTURES = Path(__file__).parent / "fixtures"
ALL_PARAMETERS = tuple(PARAMETERS)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def power_payload() -> dict:
    """Real NASA POWER response for 37.58 N, 32.79 E, 1–13 Nov 2026 (captured 2026-11-14)."""
    path = FIXTURES / "power_daily_konya_20261101_20261113.json"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def power_daily(power_payload: dict) -> PowerDaily:
    return PowerDaily(
        **parse_daily(power_payload, ALL_PARAMETERS),  # type: ignore[arg-type]
        request_url="https://power.larc.nasa.gov/api/temporal/daily/point?test",
        fetched_at=datetime(2026, 11, 14, 11, 2, tzinfo=UTC),
    )
