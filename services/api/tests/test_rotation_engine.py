from app.engines.rotation import CropClimate, evaluate_plan, suggest_plan

CLIMATE = {
    "winter_wheat": CropClimate("winter_wheat", 450, 300),
    "barley": CropClimate("barley", 420, 290),
    "sugar_beet": CropClimate("sugar_beet", 800, 120),
    "chickpea": CropClimate("chickpea", 320, 140),
    "maize": CropClimate("maize", 650, 60),
    "sunflower": CropClimate("sunflower", 500, 90),
    "lentil": CropClimate("lentil", 380, 170),
    "dry_bean": CropClimate("dry_bean", 420, 40),
}
HISTORY = [(2023, "winter_wheat"), (2024, "sugar_beet"), (2025, "winter_wheat")]


def rules(result):
    return {r.code: r for r in result.rules}


def test_beet_wheat_loop_breaks_rules_and_costs_water() -> None:
    plan = evaluate_plan(
        ["sugar_beet", "winter_wheat", "sugar_beet"],
        start_year=2026,
        history=HISTORY,
        climate=CLIMATE,
        rainfed=False,
    )
    r = rules(plan)
    assert r["beet_interval"].passed is False  # beet 2024 and 2026 are 2 years apart
    assert r["legume_break"].passed is False
    assert r["no_repeat"].passed is True
    assert plan.total_etc_mm == 800 + 450 + 800
    assert plan.water_score == 100 * (120 + 300 + 120) / (800 + 450 + 800)


def test_repeats_are_caught_across_the_history_boundary() -> None:
    plan = evaluate_plan(
        ["winter_wheat", "chickpea", "barley"],
        start_year=2026,
        history=HISTORY,
        climate=CLIMATE,
        rainfed=False,
    )
    assert rules(plan)["no_repeat"].passed is False
    assert rules(plan)["no_repeat"].years == [2026]


def test_three_cereals_in_a_row_fail() -> None:
    plan = evaluate_plan(
        ["barley", "winter_wheat", "chickpea"],
        start_year=2026,
        history=HISTORY,
        climate=CLIMATE,
        rainfed=False,
    )
    assert rules(plan)["cereal_limit"].passed is False


def test_rainfed_flag_marks_dry_years() -> None:
    plan = evaluate_plan(
        ["chickpea", "maize", "winter_wheat"],
        start_year=2026,
        history=HISTORY,
        climate=CLIMATE,
        rainfed=True,
    )
    assert rules(plan)["rainfed_water"].years == [2026, 2027]


def test_score_blends_water_and_rules_equally() -> None:
    plan = evaluate_plan(
        ["chickpea", "barley", "lentil"],
        start_year=2026,
        history=HISTORY,
        climate=CLIMATE,
        rainfed=False,
    )
    assert plan.score == 0.5 * plan.water_score + 0.5 * plan.rules_score


def test_suggestion_differs_from_current_and_scores_at_least_as_well() -> None:
    current = ["winter_wheat", "sugar_beet", "winter_wheat"]
    base = evaluate_plan(current, start_year=2026, history=HISTORY, climate=CLIMATE, rainfed=False)
    best = suggest_plan(
        current=current, start_year=2026, history=HISTORY, climate=CLIMATE, rainfed=False
    )

    assert best.crops != current
    assert best.score >= base.score
    assert all(r.passed for r in best.rules)
