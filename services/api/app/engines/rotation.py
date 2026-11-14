"""Explainable crop rotation comparison (docs/ANALYSIS_AI.md §2).

A plan's score is a transparent blend of two parts, both shown to the user:
- water fit (50 %): share of the plan's crop water demand (ETc, FAO-56) that typical rainfall
  covered in the field's grid cell, capped at 100;
- rotation rules (50 %): share of simple agronomic rules the plan passes.
It compares plans side by side. It is not a yield prediction and makes no fertiliser or
pesticide recommendation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from itertools import pairwise, product

from app.engines.crops import CROPS

WATER_WEIGHT = 0.5
RULES_WEIGHT = 0.5
RAINFED_MIN_COVERAGE = 50.0


@dataclass(frozen=True)
class CropClimate:
    code: str
    etc_mm: float
    precip_mm: float

    @property
    def coverage_pct(self) -> float | None:
        return None if self.etc_mm <= 0 else 100 * self.precip_mm / self.etc_mm


@dataclass(frozen=True)
class RuleResult:
    code: str
    passed: bool
    years: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class YearResult:
    year: int
    crop: str
    etc_mm: float | None
    precip_mm: float | None
    coverage_pct: float | None


@dataclass(frozen=True)
class PlanResult:
    crops: list[str]
    years: list[YearResult]
    total_etc_mm: float
    total_precip_mm: float
    water_score: float
    rules_score: float
    score: float
    rules: list[RuleResult]


def family(code: str) -> str:
    crop = CROPS.get(code)
    return crop.family if crop else "unknown"


def evaluate_plan(
    crops: list[str],
    *,
    start_year: int,
    history: list[tuple[int, str]],
    climate: dict[str, CropClimate],
    rainfed: bool,
) -> PlanResult:
    years = list(range(start_year, start_year + len(crops)))
    past = [crop for _, crop in sorted(history)]
    sequence = past[-2:] + crops  # recent history matters for repeat, cereal and beet rules
    offset = len(sequence) - len(crops)

    def plan_years(indices: list[int]) -> list[int]:
        return sorted({years[i - offset] for i in indices if i >= offset})

    rules: list[RuleResult] = []

    repeats = [
        i
        for i in range(1, len(sequence))
        if sequence[i] == sequence[i - 1] and sequence[i] != "fallow"
    ]
    rules.append(
        RuleResult("no_repeat", not any(i >= offset for i in repeats), plan_years(repeats))
    )

    cereal_runs = [
        i
        for i in range(2, len(sequence))
        if all(family(c) == "cereal" for c in sequence[i - 2 : i + 1])
    ]
    rules.append(
        RuleResult(
            "cereal_limit", not any(i >= offset for i in cereal_runs), plan_years(cereal_runs)
        )
    )

    rules.append(RuleResult("legume_break", any(family(c) == "legume" for c in crops)))

    beet = [i for i, c in enumerate(sequence) if c == "sugar_beet"]
    close = [j for a, j in pairwise(beet) if j - a < 3]
    rules.append(
        RuleResult("beet_interval", not any(j >= offset for j in close), plan_years(close))
    )

    results: list[YearResult] = []
    etc_total = precip_total = 0.0
    for year, code in zip(years, crops, strict=True):
        c = climate.get(code)
        if c is None or c.etc_mm <= 0:
            results.append(
                YearResult(year, code, c.etc_mm if c else None, c.precip_mm if c else None, None)
            )
            continue
        etc_total += c.etc_mm
        precip_total += c.precip_mm
        results.append(YearResult(year, code, c.etc_mm, c.precip_mm, c.coverage_pct))

    if rainfed:
        dry = [
            r.year
            for r in results
            if r.coverage_pct is not None and r.coverage_pct < RAINFED_MIN_COVERAGE
        ]
        rules.append(RuleResult("rainfed_water", not dry, dry))

    water_score = 100.0 if etc_total <= 0 else min(100.0, 100 * precip_total / etc_total)
    rules_score = 100 * sum(r.passed for r in rules) / len(rules)
    return PlanResult(
        crops=list(crops),
        years=results,
        total_etc_mm=etc_total,
        total_precip_mm=precip_total,
        water_score=water_score,
        rules_score=rules_score,
        score=WATER_WEIGHT * water_score + RULES_WEIGHT * rules_score,
        rules=rules,
    )


def suggest_plan(
    *,
    current: list[str],
    start_year: int,
    history: list[tuple[int, str]],
    climate: dict[str, CropClimate],
    rainfed: bool,
) -> PlanResult:
    """Best-scoring plan from the catalogue (ties: lower water demand), different from `current`."""
    options = [code for code, crop in CROPS.items() if crop.suggestible and code in climate]
    best: PlanResult | None = None
    for combo in product(options, repeat=len(current)):
        if list(combo) == current:
            continue
        result = evaluate_plan(
            list(combo), start_year=start_year, history=history, climate=climate, rainfed=rainfed
        )
        if best is None or (result.score, -result.total_etc_mm) > (best.score, -best.total_etc_mm):
            best = result
    assert best is not None
    return best
