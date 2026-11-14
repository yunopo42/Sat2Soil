from datetime import date, timedelta

import pytest

from app.engines.crops import CROPS
from app.engines.water import (
    DayInput,
    current_sowing_year,
    et0_penman_monteith,
    extraterrestrial_radiation,
    last_complete_sowing_year,
    season_balance,
)


def test_extraterrestrial_radiation_matches_fao56_example_8() -> None:
    # FAO-56 Example 8: 20°S, 3 September (J = 246) → Ra = 32.2 MJ m-2 day-1
    assert extraterrestrial_radiation(-20.0, 246) == pytest.approx(32.2, abs=0.1)


def test_et0_matches_fao56_example_18() -> None:
    # FAO-56 Example 18: Uccle (Brussels), 6 July. ET0 = 3.9 mm/day.
    et0 = et0_penman_monteith(
        tmax=21.5,
        tmin=12.3,
        ea=1.409,
        rs=22.07,
        u2=2.078,
        elevation=100,
        latitude=50.8,
        day_of_year=187,
    )
    assert et0 == pytest.approx(3.9, abs=0.1)


def test_kc_curve_follows_the_four_stages() -> None:
    wheat = CROPS["winter_wheat"]  # 30 / 140 / 40 / 30 days
    assert wheat.kc(0) == 0.70
    assert wheat.kc(29) == 0.70
    assert wheat.kc(100) == pytest.approx(0.70 + 0.45 * 71 / 140)
    assert wheat.kc(180) == 1.15
    assert wheat.kc(239) == pytest.approx(0.25)
    assert wheat.kc(240) == 0.0


def constant_inputs(start: date, days: int, precip: float = 1.0) -> dict[date, DayInput]:
    return {
        start + timedelta(days=i): DayInput(start + timedelta(days=i), 25, 10, 50, 2, 20, precip)
        for i in range(days)
    }


def test_balance_totals_and_coverage() -> None:
    chickpea = CROPS["chickpea"]
    sowing = chickpea.sowing_date(2026)
    balance = season_balance(
        chickpea, sowing, constant_inputs(sowing, 200), latitude=37.6, elevation=1000
    )

    assert balance.harvest == sowing + timedelta(days=chickpea.season_days - 1)
    assert balance.precip_mm == pytest.approx(chickpea.season_days)
    assert balance.etc_mm > 0
    assert balance.deficit_mm == pytest.approx(balance.etc_mm - balance.precip_mm)
    assert balance.coverage_pct == pytest.approx(100 * balance.precip_mm / balance.etc_mm)
    assert balance.missing_days == 0


def test_missing_days_are_excluded_from_both_sides() -> None:
    crop = CROPS["chickpea"]
    sowing = crop.sowing_date(2026)
    inputs = constant_inputs(sowing, 200)
    full = season_balance(crop, sowing, inputs, latitude=37.6, elevation=1000)
    gap_day = sowing + timedelta(days=50)
    inputs[gap_day] = DayInput(gap_day, None, 10, 50, 2, 20, 30.0)
    gapped = season_balance(crop, sowing, inputs, latitude=37.6, elevation=1000)

    assert gapped.missing_days == 1
    assert gapped.precip_mm == pytest.approx(full.precip_mm - 1.0)  # its rain is not counted
    assert gapped.etc_mm < full.etc_mm


def test_season_stops_at_the_last_day_with_data() -> None:
    wheat = CROPS["winter_wheat"]
    sowing = wheat.sowing_date(2026)
    balance = season_balance(
        wheat, sowing, constant_inputs(sowing, 20), latitude=37.6, elevation=1000
    )
    assert balance.covered_until == sowing + timedelta(days=19)
    assert len(balance.days) == 20


def test_season_selection() -> None:
    wheat = CROPS["winter_wheat"]  # sown 15 Oct, 240 days
    latest = date(2026, 11, 11)
    assert last_complete_sowing_year(wheat, latest) == 2025
    assert current_sowing_year(wheat, latest) == 2026
    assert current_sowing_year(CROPS["maize"], latest) is None
    assert last_complete_sowing_year(CROPS["maize"], latest) == 2026


def test_days_with_missing_inputs_do_not_extend_the_season() -> None:
    crop = CROPS["chickpea"]
    sowing = crop.sowing_date(2026)
    inputs = constant_inputs(sowing, 10)
    late = sowing + timedelta(days=12)
    inputs[late] = DayInput(late, 25, 10, 50, 2, None, 0.0)  # solar not published yet
    assert season_balance(
        crop, sowing, inputs, latitude=37.6, elevation=1000
    ).covered_until == sowing + timedelta(days=9)
