from datetime import date

import httpx
import pytest

from app.adapters.nasa_power import (
    NasaPowerClient,
    PowerResponseError,
    PowerUnavailableError,
    PowerUpstreamError,
    met_grid_cell,
    parse_daily,
)
from tests.conftest import ALL_PARAMETERS

START, END = date(2026, 11, 1), date(2026, 11, 13)


def make_client(handler, attempts: int = 3) -> NasaPowerClient:
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return NasaPowerClient(http, "https://power.example/api", attempts=attempts, backoff_s=0)


# --- parsing -------------------------------------------------------------------------------


def test_fill_values_become_missing_days(power_payload: dict) -> None:
    parsed = parse_daily(power_payload, ALL_PARAMETERS)
    t2m = parsed["series"]["T2M"]

    assert t2m.values[0] == (date(2026, 11, 1), 12.13)
    assert t2m.values[-1] == (date(2026, 11, 13), None)
    assert t2m.missing_days == 2
    assert t2m.latest_available == date(2026, 11, 11)


def test_solar_radiation_lags_longer_than_meteorology(power_payload: dict) -> None:
    parsed = parse_daily(power_payload, ALL_PARAMETERS)

    assert parsed["series"]["ALLSKY_SFC_SW_DWN"].latest_available == date(2026, 11, 9)
    assert parsed["series"]["ALLSKY_SFC_SW_DWN"].unit == "MJ/m^2/day"


def test_metadata_comes_from_the_response(power_payload: dict) -> None:
    parsed = parse_daily(power_payload, ALL_PARAMETERS)

    assert parsed["elevation_m"] == 1197.55
    assert parsed["api_version"] == "v2.10.3"
    assert parsed["upstream_sources"] == ["GEOSIT", "FLASHFLUX", "POWER"]
    assert parsed["series"]["PRECTOTCORR"].long_name == "Precipitation Corrected"


def test_unexpected_unit_is_rejected(power_payload: dict) -> None:
    power_payload["parameters"]["T2M"]["units"] = "F"
    with pytest.raises(PowerResponseError, match="Unexpected unit"):
        parse_daily(power_payload, ("T2M",))


def test_missing_parameter_is_rejected(power_payload: dict) -> None:
    del power_payload["properties"]["parameter"]["RH2M"]
    with pytest.raises(PowerResponseError, match="RH2M"):
        parse_daily(power_payload, ("RH2M",))


def test_malformed_structure_is_rejected() -> None:
    with pytest.raises(PowerResponseError):
        parse_daily({"header": {}}, ("T2M",))


# --- grid cell -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("point", "center"),
    [
        # Observed on the live API (2026-11-14): the first three return identical values.
        ((37.58, 32.79), (37.5, 32.5)),
        ((37.30, 32.25), (37.5, 32.5)),
        ((37.70, 32.75), (37.5, 32.5)),
        ((37.58, 32.86), (37.5, 33.125)),
        ((37.80, 32.79), (38.0, 32.5)),
    ],
)
def test_grid_cell_matches_live_observation(
    point: tuple[float, float], center: tuple[float, float]
) -> None:
    cell = met_grid_cell(*point)
    assert (cell.center_lat, cell.center_lon) == center


def test_grid_cell_bounds() -> None:
    cell = met_grid_cell(37.58, 32.79)
    assert (cell.lat_min, cell.lat_max, cell.lon_min, cell.lon_max) == (
        37.25,
        37.75,
        32.1875,
        32.8125,
    )


# --- client --------------------------------------------------------------------------------


@pytest.mark.anyio
async def test_fetch_builds_the_documented_request(power_payload: dict) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=power_payload)

    result = await make_client(handler).fetch_daily(
        latitude=37.58, longitude=32.79, start=START, end=END, parameters=ALL_PARAMETERS
    )

    query = seen[0].url.params
    assert seen[0].url.path == "/api/temporal/daily/point"
    assert query["community"] == "AG"
    assert (query["start"], query["end"]) == ("20261101", "20261113")
    assert query["parameters"] == ",".join(ALL_PARAMETERS)
    assert (query["latitude"], query["longitude"]) == ("37.5800", "32.7900")
    assert result.series["PRECTOTCORR"].unit == "mm/day"
    assert result.request_url.startswith("https://power.example/api/temporal/daily/point?")


@pytest.mark.anyio
async def test_transient_errors_are_retried(power_payload: dict) -> None:
    statuses = iter([503, 429, 200])

    def handler(request: httpx.Request) -> httpx.Response:
        status = next(statuses)
        return httpx.Response(status, json=power_payload if status == 200 else {})

    result = await make_client(handler).fetch_daily(
        latitude=37.58, longitude=32.79, start=START, end=END, parameters=("T2M",)
    )
    assert result.series["T2M"].values[0][1] == 12.13


@pytest.mark.anyio
async def test_timeouts_give_up_after_the_last_attempt() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        raise httpx.ConnectTimeout("timed out", request=request)

    with pytest.raises(PowerUnavailableError):
        await make_client(handler, attempts=3).fetch_daily(
            latitude=37.58, longitude=32.79, start=START, end=END, parameters=("T2M",)
        )
    assert calls == 3


@pytest.mark.anyio
async def test_client_errors_are_not_retried() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            422, json={"header": "failed", "messages": ["One of your parameters is incorrect."]}
        )

    with pytest.raises(PowerUpstreamError) as error:
        await make_client(handler).fetch_daily(
            latitude=37.58, longitude=32.79, start=START, end=END, parameters=("T2M",)
        )
    assert calls == 1
    assert error.value.messages == ["One of your parameters is incorrect."]


@pytest.mark.anyio
async def test_invalid_json_is_a_bad_response() -> None:
    client = make_client(lambda request: httpx.Response(200, text="<html>maintenance</html>"))
    with pytest.raises(PowerResponseError):
        await client.fetch_daily(
            latitude=37.58, longitude=32.79, start=START, end=END, parameters=("T2M",)
        )


@pytest.mark.anyio
async def test_parameters_outside_the_allowlist_are_refused() -> None:
    client = make_client(lambda request: httpx.Response(200, json={}))
    with pytest.raises(ValueError, match="allowlist"):
        await client.fetch_daily(
            latitude=37.58, longitude=32.79, start=START, end=END, parameters=("CO2",)
        )
