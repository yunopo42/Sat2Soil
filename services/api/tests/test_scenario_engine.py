"""Digital twin scenario engine (D-026): observed part + replayed analog seasons."""

from datetime import date, timedelta

import pytest

from app.engines.crops import CROPS
from app.engines.scenario import quantile, target_sowing, twin_season

WHEAT = CROPS["winter_wheat"]
LATEST = date(2026, 11, 11)


def flat_climate(start: date, end: date, et0: float = 2.0, rain: float = 1.0):
    days = (end - start).days + 1
    return {start + timedelta(days=i): (et0, rain) for i in range(days)}


def test_quantile_matches_linear_interpolation():
    values = [5.0, 1.0, 3.0, 2.0, 4.0]
    assert quantile(values, 0.0) == 1.0
    assert quantile(values, 0.5) == 3.0
    assert quantile(values, 1.0) == 5.0
    assert quantile(values, 0.1) == pytest.approx(1.4)


def test_target_season_in_ground_or_next():
    assert target_sowing(WHEAT, LATEST) == (date(2026, 10, 15), True)
    beet = CROPS["sugar_beet"]
    sowing, in_season = target_sowing(beet, LATEST)
    assert not in_season and sowing > LATEST and sowing == beet.sowing_date(2027)


def test_identical_past_seasons_collapse_the_band():
    climate = flat_climate(date(2000, 1, 1), LATEST)
    season = twin_season(WHEAT, climate, LATEST)
    assert season is not None
    assert len(season.days) == WHEAT.season_days
    assert len(season.analogs) == 20
    expected_etc = sum(WHEAT.kc(o) * 2.0 for o in range(WHEAT.season_days))
    expected_rain = 1.0 * WHEAT.season_days
    for outcome in season.outcomes.values():
        assert outcome.etc_mm == pytest.approx(expected_etc)
        assert outcome.precip_mm == pytest.approx(expected_rain)
    last = season.days[-1]
    assert last.p10 == pytest.approx(last.p90)


def test_observed_part_and_band_meet_on_the_last_observed_day():
    climate = flat_climate(date(2000, 1, 1), LATEST)
    season = twin_season(WHEAT, climate, LATEST)
    assert season is not None and season.in_season
    assert season.observed_until == LATEST
    observed = [d for d in season.days if d.observed]
    assert len(observed) == (LATEST - date(2026, 10, 15)).days + 1
    assert all(d.p50 is None for d in observed[:-1])
    assert observed[-1].p50 == pytest.approx(observed[-1].balance_mm)
    future = [d for d in season.days if not d.observed]
    assert all(d.balance_mm is None and d.p10 <= d.p50 <= d.p90 for d in future)


def test_a_wetter_past_season_becomes_the_wet_scenario():
    climate = flat_climate(date(2000, 1, 1), LATEST)
    wet_start, wet_end = WHEAT.season(2012)
    for day in list(climate):
        if wet_start <= day <= wet_end:
            climate[day] = (2.0, 3.0)
    dry_start, dry_end = WHEAT.season(2015)
    for day in list(climate):
        if dry_start <= day <= dry_end:
            climate[day] = (2.0, 0.0)
    season = twin_season(WHEAT, climate, LATEST)
    assert season is not None
    assert season.analogs[-1].sowing_year == 2012
    assert season.analogs[0].sowing_year == 2015
    assert season.outcomes["dry"].balance_mm <= season.outcomes["normal"].balance_mm
    assert season.outcomes["normal"].balance_mm <= season.outcomes["wet"].balance_mm


def test_upcoming_season_is_entirely_replayed():
    climate = flat_climate(date(2000, 1, 1), LATEST)
    season = twin_season(CROPS["sugar_beet"], climate, LATEST)
    assert season is not None and not season.in_season
    assert season.observed_until is None
    assert not any(d.observed for d in season.days)
    assert all(d.p50 is not None for d in season.days)


def test_gappy_past_seasons_are_skipped_and_no_history_gives_none():
    climate = flat_climate(date(2024, 1, 1), LATEST)
    season = twin_season(WHEAT, climate, LATEST)
    assert season is not None
    assert sorted(o.sowing_year for o in season.analogs) == [2024, 2025]

    start, end = WHEAT.season(2025)
    gappy = {d: v for d, v in climate.items() if not (start <= d <= end) or d.day == 1}
    season = twin_season(WHEAT, gappy, LATEST)
    assert season is not None and [o.sowing_year for o in season.analogs] == [2024]

    assert twin_season(WHEAT, flat_climate(date(2026, 10, 1), LATEST), LATEST) is None
