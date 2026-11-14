"""AgriSpray concept engine (D-027): synthetic card measurement, Delta T, simulated device."""

import base64
import math

import pytest

from app.engines.spray import (
    CARD_H_MM,
    CARD_W_MM,
    SAMPLE,
    SAMPLE_TIME,
    Stain,
    analyse_example,
    connected_regions,
    delta_t,
    device_history,
    rasterise,
    spray_checks,
    wet_bulb_stull,
)


def test_wet_bulb_matches_stull_reference():
    # Stull (2011): T = 20 °C, RH = 50 % → Tw ≈ 13.7 °C.
    assert wet_bulb_stull(20, 50) == pytest.approx(13.7, abs=0.1)
    assert delta_t(24, 48) == pytest.approx(7.2, abs=0.2)


def test_spray_checks_follow_delta_t_bands_and_never_invent_wind():
    codes = {c.code: c for c in spray_checks(24, 48, None)}
    assert codes["delta_t"].status == "within"
    assert codes["wind"].status == "unknown" and codes["wind"].value is None
    hot_dry = {c.code: c for c in spray_checks(34, 15, 6)}
    assert hot_dry["delta_t"].status == "outside"
    assert hot_dry["air_temp"].status == "outside"
    assert hot_dry["wind"].status == "outside"
    assert {c.status for c in spray_checks(None, None, None)} == {"unknown"}


def test_raster_coverage_of_one_stain_matches_its_area():
    grid, w, h = rasterise([Stain(38.0, 13.0, 2000)])  # one 2 mm stain
    expected = math.pi * 1.0**2 / (CARD_W_MM * CARD_H_MM)
    assert sum(grid) / (w * h) == pytest.approx(expected, rel=0.03)


def test_touching_stains_merge_into_one_region_like_on_paper():
    apart = rasterise([Stain(10, 10, 500), Stain(20, 10, 500)])
    touching = rasterise([Stain(10, 10, 500), Stain(10.3, 10, 500)])
    assert len(connected_regions(*apart)) == 2
    assert len(connected_regions(*touching)) == 1


def test_example_cards_are_deterministic_and_distinguishable():
    even, uneven, sparse = (analyse_example(v) for v in ("even", "uneven", "sparse"))
    assert analyse_example("even") is even  # cached, identical every call
    assert even.uniformity == "even" and even.denser_side is None
    assert uneven.denser_side == "left" and uneven.uniformity_cv_pct > even.uniformity_cv_pct
    assert sparse.coverage_pct < even.coverage_pct / 2
    # Merging means fewer regions than generated stains.
    assert even.regions < len(even.stains)
    assert sum(n for _, _, n in even.histogram) == even.regions


def test_mask_is_a_valid_png():
    mask = analyse_example("even").mask_png
    assert mask.startswith("data:image/png;base64,")
    assert base64.b64decode(mask.split(",", 1)[1])[:8] == b"\x89PNG\r\n\x1a\n"


def test_device_history_is_deterministic_and_ends_at_the_documented_sample():
    a, b = device_history("field-1"), device_history("field-1")
    assert a == b
    assert a[-1].at == SAMPLE_TIME
    assert a[-1].soil_moisture_pct == SAMPLE["soil_moisture_pct"]
    assert a[-1].soil_temp_c == SAMPLE["soil_temp_c"]
    assert len(a) == 7 * 24 // 3 + 1
