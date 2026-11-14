"""Smoke test against the real NASA POWER API (services/api/task.md B08).

Skipped by default. Run with:  SAT2SOIL_LIVE_TESTS=1 uv run pytest -m live
"""

import os
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from app.adapters.nasa_power import PARAMETERS, NasaPowerClient

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(os.getenv("SAT2SOIL_LIVE_TESTS") != "1", reason="set SAT2SOIL_LIVE_TESTS=1"),
]


@pytest.mark.anyio
async def test_live_power_daily_for_the_konya_sample_point() -> None:
    end = datetime.now(UTC).date()
    start = end - timedelta(days=30)

    async with httpx.AsyncClient(timeout=30) as http:
        client = NasaPowerClient(http, "https://power.larc.nasa.gov/api")
        result = await client.fetch_daily(
            latitude=37.58, longitude=32.79, start=start, end=end, parameters=tuple(PARAMETERS)
        )

    assert result.series.keys() == PARAMETERS.keys()
    t2m = result.series["T2M"]
    assert t2m.latest_available is not None
    assert (end - t2m.latest_available).days <= 10, "POWER latency grew unexpectedly"
    assert all(v is None or -40 < v < 50 for _, v in t2m.values)
