import asyncio
from datetime import date

import pytest

from app.adapters.nasa_power import PowerDaily, PowerUnavailableError
from app.models.data_source import DataSource
from app.services.nasa_power import PowerDailyService

START, END = date(2026, 11, 1), date(2026, 11, 13)
PARAMS = ("T2M", "PRECTOTCORR")


class FakeClient:
    def __init__(self, data: PowerDaily) -> None:
        self.data = data
        self.calls = 0
        self.down = False

    async def fetch_daily(self, **_: object) -> PowerDaily:
        self.calls += 1
        await asyncio.sleep(0)  # let concurrent callers interleave
        if self.down:
            raise PowerUnavailableError("down")
        return self.data


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def make_service(power_daily: PowerDaily, ttl: float = 100.0):
    client, clock = FakeClient(power_daily), Clock()
    return PowerDailyService(client, ttl_s=ttl, clock=clock), client, clock  # type: ignore[arg-type]


async def get(service: PowerDailyService, lat: float = 37.58, lon: float = 32.79):
    return await service.get_daily(
        latitude=lat, longitude=lon, start=START, end=END, parameters=PARAMS
    )


@pytest.mark.anyio
async def test_first_answer_is_live_then_cached(power_daily: PowerDaily) -> None:
    service, client, _ = make_service(power_daily)

    first = await get(service)
    second = await get(service)

    assert first.source_type is DataSource.LIVE_NASA
    assert second.source_type is DataSource.CACHED_NASA
    assert second.data.fetched_at == first.data.fetched_at
    assert client.calls == 1


@pytest.mark.anyio
async def test_points_in_the_same_grid_cell_share_one_request(power_daily: PowerDaily) -> None:
    service, client, _ = make_service(power_daily)

    await get(service, 37.58, 32.79)
    await get(service, 37.30, 32.25)  # same 0.5° × 0.625° cell
    assert client.calls == 1

    await get(service, 37.58, 32.86)  # next cell east
    assert client.calls == 2


@pytest.mark.anyio
async def test_expired_entries_are_refetched(power_daily: PowerDaily) -> None:
    service, client, clock = make_service(power_daily, ttl=100)

    await get(service)
    clock.now = 101
    refreshed = await get(service)

    assert refreshed.source_type is DataSource.LIVE_NASA
    assert client.calls == 2


@pytest.mark.anyio
async def test_stale_copy_is_served_when_nasa_is_down(power_daily: PowerDaily) -> None:
    service, client, clock = make_service(power_daily, ttl=100)

    await get(service)
    clock.now = 500
    client.down = True
    served = await get(service)

    assert served.source_type is DataSource.CACHED_NASA
    assert served.stale is True


@pytest.mark.anyio
async def test_failure_without_cache_propagates(power_daily: PowerDaily) -> None:
    service, client, _ = make_service(power_daily)
    client.down = True

    with pytest.raises(PowerUnavailableError):
        await get(service)


@pytest.mark.anyio
async def test_concurrent_identical_requests_call_nasa_once(power_daily: PowerDaily) -> None:
    service, client, _ = make_service(power_daily)

    results = await asyncio.gather(*(get(service) for _ in range(5)))

    assert client.calls == 1
    assert sum(r.source_type is DataSource.LIVE_NASA for r in results) == 1
