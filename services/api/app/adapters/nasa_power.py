"""NASA POWER Daily API adapter (docs/NASA_DATA.md, P0).

Behaviour verified against the live API on 2026-11-14 (POWER Daily API v2.10.3, sources GEOSIT,
FLASHFLUX):

- values live in ``properties.parameter.<NAME>`` keyed by ``YYYYMMDD``; units and long names in
  ``parameters.<NAME>``; ``header.fill_value`` is ``-999.0``
- the most recent days are not published yet: about 2 days for meteorology, 4 for solar radiation,
  and they arrive as the fill value
- ``geometry.coordinates`` is ``[lon, lat, elevation_m]``; the elevation belongs to the grid cell
- meteorological values are identical everywhere inside a 0.5° lat × 0.625° lon cell (GEOS-IT
  native grid, centres on multiples of the step); solar radiation is on a 1° grid
- invalid parameters come back as HTTP 422 with ``{"header": ..., "messages": [...]}``
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, date, datetime

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential

FILL_VALUE = -999.0
COMMUNITY = "AG"
DAILY_PATH = "/temporal/daily/point"
EARLIEST_DATE = date(1981, 1, 1)

MET_GRID_LAT_DEG = 0.5
MET_GRID_LON_DEG = 0.625
SOLAR_GRID_DEG = 1.0

# Allowlist (services/api/task.md B05) with the units POWER returns for community=AG.
# A different unit means our formulas would be wrong, so it is treated as a bad response.
PARAMETERS: dict[str, str] = {
    "T2M": "C",
    "T2M_MAX": "C",
    "T2M_MIN": "C",
    "PRECTOTCORR": "mm/day",
    "RH2M": "%",
    "WS2M": "m/s",
    "ALLSKY_SFC_SW_DWN": "MJ/m^2/day",
}
SOLAR_PARAMETERS = frozenset({"ALLSKY_SFC_SW_DWN"})


class PowerError(Exception):
    """Base class for NASA POWER failures."""


class PowerUnavailableError(PowerError):
    """Network failure, timeout, 429 or 5xx that persisted after retries."""


class PowerUpstreamError(PowerError):
    """POWER rejected the request (4xx other than 429). Indicates a bug on our side."""

    def __init__(self, status_code: int, messages: list[str]) -> None:
        super().__init__(f"POWER rejected the request ({status_code}): {'; '.join(messages)}")
        self.status_code = status_code
        self.messages = messages


class PowerResponseError(PowerError):
    """The response did not have the documented structure or units."""


class _TransientError(Exception):
    pass


@dataclass(frozen=True)
class GridCell:
    """Meteorological grid cell that a coordinate falls into."""

    center_lat: float
    center_lon: float

    @property
    def lat_min(self) -> float:
        return self.center_lat - MET_GRID_LAT_DEG / 2

    @property
    def lat_max(self) -> float:
        return self.center_lat + MET_GRID_LAT_DEG / 2

    @property
    def lon_min(self) -> float:
        return self.center_lon - MET_GRID_LON_DEG / 2

    @property
    def lon_max(self) -> float:
        return self.center_lon + MET_GRID_LON_DEG / 2

    @property
    def key(self) -> str:
        return f"{self.center_lat:.3f},{self.center_lon:.4f}"


def met_grid_cell(latitude: float, longitude: float) -> GridCell:
    center_lat = math.floor(latitude / MET_GRID_LAT_DEG + 0.5) * MET_GRID_LAT_DEG
    center_lon = math.floor(longitude / MET_GRID_LON_DEG + 0.5) * MET_GRID_LON_DEG
    return GridCell(center_lat=max(-90.0, min(90.0, center_lat)), center_lon=center_lon)


@dataclass(frozen=True)
class DailySeries:
    parameter: str
    long_name: str
    unit: str
    values: list[tuple[date, float | None]]

    @property
    def missing_days(self) -> int:
        return sum(1 for _, value in self.values if value is None)

    @property
    def latest_available(self) -> date | None:
        for day, value in reversed(self.values):
            if value is not None:
                return day
        return None


@dataclass(frozen=True)
class PowerDaily:
    """One POWER daily response, parsed and validated."""

    latitude: float
    longitude: float
    elevation_m: float
    start: date
    end: date
    api_version: str
    upstream_sources: list[str]
    time_standard: str
    series: dict[str, DailySeries]
    request_url: str
    fetched_at: datetime


def parse_daily(payload: object, parameters: tuple[str, ...]) -> dict[str, object]:
    """Validates a POWER daily payload. Returns the fields of PowerDaily except request metadata."""
    try:
        assert isinstance(payload, dict)
        header = payload["header"]
        meta = payload["parameters"]
        data = payload["properties"]["parameter"]
        lon, lat, elevation = payload["geometry"]["coordinates"][:3]
        fill_value = float(header.get("fill_value", FILL_VALUE))
        api_version = str(header["api"]["version"])
        start = datetime.strptime(str(header["start"]), "%Y%m%d").date()
        end = datetime.strptime(str(header["end"]), "%Y%m%d").date()
    except (AssertionError, KeyError, TypeError, ValueError) as error:
        raise PowerResponseError(f"Unexpected POWER response structure: {error!r}") from error

    series: dict[str, DailySeries] = {}
    for name in parameters:
        raw = data.get(name)
        info = meta.get(name)
        if not isinstance(raw, dict) or not isinstance(info, dict):
            raise PowerResponseError(f"Parameter {name} missing from POWER response")
        unit = str(info.get("units"))
        if unit != PARAMETERS[name]:
            raise PowerResponseError(
                f"Unexpected unit for {name}: {unit!r} (expected {PARAMETERS[name]!r})"
            )
        values: list[tuple[date, float | None]] = []
        try:
            for key in sorted(raw):
                day = datetime.strptime(key, "%Y%m%d").date()
                value = raw[key]
                missing = value is None or float(value) == fill_value
                values.append((day, None if missing else float(value)))
        except (TypeError, ValueError) as error:
            raise PowerResponseError(f"Invalid value in {name}: {error!r}") from error
        series[name] = DailySeries(
            parameter=name, long_name=str(info.get("longname", name)), unit=unit, values=values
        )

    return {
        "latitude": float(lat),
        "longitude": float(lon),
        "elevation_m": float(elevation),
        "start": start,
        "end": end,
        "api_version": api_version,
        "upstream_sources": [str(s) for s in header.get("sources", [])],
        "time_standard": str(header.get("time_standard", "LST")),
        "series": series,
    }


class NasaPowerClient:
    """Thin async client: request building, retries with backoff, error mapping, parsing."""

    def __init__(
        self,
        http: httpx.AsyncClient,
        base_url: str,
        *,
        attempts: int = 3,
        backoff_s: float = 0.5,
    ) -> None:
        self._http = http
        self._base_url = base_url.rstrip("/")
        self._attempts = attempts
        self._backoff_s = backoff_s

    async def fetch_daily(
        self,
        *,
        latitude: float,
        longitude: float,
        start: date,
        end: date,
        parameters: tuple[str, ...],
    ) -> PowerDaily:
        unknown = set(parameters) - PARAMETERS.keys()
        if unknown:
            raise ValueError(f"Parameters not in allowlist: {sorted(unknown)}")

        url = f"{self._base_url}{DAILY_PATH}"
        query = {
            "parameters": ",".join(parameters),
            "community": COMMUNITY,
            "longitude": f"{longitude:.4f}",
            "latitude": f"{latitude:.4f}",
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        }

        response: httpx.Response | None = None
        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(self._attempts),
                wait=wait_exponential(multiplier=self._backoff_s, max=8),
                retry=retry_if_exception_type(_TransientError),
                reraise=True,
            ):
                with attempt:
                    try:
                        response = await self._http.get(url, params=query)
                    except httpx.TransportError as error:  # includes timeouts
                        raise _TransientError(repr(error)) from error
                    if response.status_code == 429 or response.status_code >= 500:
                        raise _TransientError(f"HTTP {response.status_code}")
        except _TransientError as error:
            raise PowerUnavailableError(f"NASA POWER unavailable: {error}") from error

        assert response is not None
        if response.status_code >= 400:
            raise PowerUpstreamError(response.status_code, _error_messages(response))

        try:
            payload = response.json()
        except ValueError as error:
            raise PowerResponseError("POWER response is not valid JSON") from error

        parsed = parse_daily(payload, parameters)
        return PowerDaily(
            **parsed,  # type: ignore[arg-type]
            request_url=str(response.request.url),
            fetched_at=datetime.now(UTC),
        )


def _error_messages(response: httpx.Response) -> list[str]:
    try:
        body = response.json()
    except ValueError:
        return [response.text[:200]]
    if isinstance(body, dict) and isinstance(body.get("messages"), list):
        return [str(m) for m in body["messages"]]
    return [str(body)[:200]]
