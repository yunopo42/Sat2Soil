"""Caching in front of the NASA POWER client (services/api/task.md B07).

- Cache key = meteorological grid cell + period + parameters. Every point inside a cell gets
  identical values (verified against the live API), so neighbouring fields share one request.
- Within the TTL a cached answer is served as ``cached_nasa`` with its original fetch time.
- If NASA is unavailable and an expired entry exists, that entry is served as stale ``cached_nasa``
  instead of failing. With nothing cached, the failure propagates (the UI shows its error state).
- Concurrent identical requests wait for one upstream call instead of sending several.
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

from app.adapters.nasa_power import (
    GridCell,
    NasaPowerClient,
    PowerDaily,
    PowerUnavailableError,
    met_grid_cell,
)
from app.models.data_source import DataSource

CacheKey = tuple[str, date, date, tuple[str, ...]]


@dataclass(frozen=True)
class ServedPowerDaily:
    data: PowerDaily
    source_type: DataSource
    stale: bool
    grid_cell: GridCell


@dataclass
class _Entry:
    data: PowerDaily
    stored_at: float


class PowerDailyService:
    def __init__(
        self,
        client: NasaPowerClient,
        *,
        ttl_s: float,
        max_entries: int = 512,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = client
        self._ttl_s = ttl_s
        self._max_entries = max_entries
        self._clock = clock
        self._cache: OrderedDict[CacheKey, _Entry] = OrderedDict()
        self._locks: dict[CacheKey, asyncio.Lock] = {}

    async def get_daily(
        self,
        *,
        latitude: float,
        longitude: float,
        start: date,
        end: date,
        parameters: tuple[str, ...],
    ) -> ServedPowerDaily:
        cell = met_grid_cell(latitude, longitude)
        key: CacheKey = (cell.key, start, end, tuple(sorted(parameters)))

        fresh = self._fresh(key)
        if fresh is not None:
            return ServedPowerDaily(fresh, DataSource.CACHED_NASA, stale=False, grid_cell=cell)

        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            fresh = self._fresh(key)  # another request may have filled it while we waited
            if fresh is not None:
                return ServedPowerDaily(fresh, DataSource.CACHED_NASA, stale=False, grid_cell=cell)
            try:
                data = await self._client.fetch_daily(
                    latitude=latitude,
                    longitude=longitude,
                    start=start,
                    end=end,
                    parameters=key[3],
                )
            except PowerUnavailableError:
                stale = self._cache.get(key)
                if stale is None:
                    raise
                return ServedPowerDaily(
                    stale.data, DataSource.CACHED_NASA, stale=True, grid_cell=cell
                )

            self._store(key, data)
            return ServedPowerDaily(data, DataSource.LIVE_NASA, stale=False, grid_cell=cell)

    def _fresh(self, key: CacheKey) -> PowerDaily | None:
        entry = self._cache.get(key)
        if entry is None or self._clock() - entry.stored_at > self._ttl_s:
            return None
        self._cache.move_to_end(key)
        return entry.data

    def _store(self, key: CacheKey, data: PowerDaily) -> None:
        self._cache[key] = _Entry(data=data, stored_at=self._clock())
        self._cache.move_to_end(key)
        while len(self._cache) > self._max_entries:
            evicted, _ = self._cache.popitem(last=False)
            self._locks.pop(evicted, None)
