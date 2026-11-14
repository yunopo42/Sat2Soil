"""Crop catalogue for the water and rotation engines.

Kc values and stage lengths are typical values from FAO Irrigation and Drainage Paper 56
(Allen et al., 1998), Tables 11 and 12. Sowing dates are assumptions for the Central Anatolian
plateau. Nothing here is calibrated locally; the UI says so next to every result.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

Family = Literal["cereal", "root", "legume", "oilseed", "forage", "fallow"]


@dataclass(frozen=True)
class Crop:
    code: str
    family: Family
    kc_ini: float
    kc_mid: float
    kc_end: float
    # FAO-56 stage lengths in days: initial, development, mid-season, late season
    stages: tuple[int, int, int, int]
    sowing: tuple[int, int]  # (month, day)
    suggestible: bool = True

    @property
    def season_days(self) -> int:
        return sum(self.stages)

    def sowing_date(self, year: int) -> date:
        return date(year, *self.sowing)

    def season(self, sowing_year: int) -> tuple[date, date]:
        start = self.sowing_date(sowing_year)
        return start, start + timedelta(days=self.season_days - 1)

    def kc(self, day_of_season: int) -> float:
        """FAO-56 single crop coefficient curve (Fig. 25): flat, linear rise, flat, linear fall."""
        ini, dev, mid, late = self.stages
        d = day_of_season
        if d < ini:
            return self.kc_ini
        if d < ini + dev:
            return self.kc_ini + (self.kc_mid - self.kc_ini) * (d - ini + 1) / dev
        if d < ini + dev + mid:
            return self.kc_mid
        if d < ini + dev + mid + late:
            return self.kc_mid + (self.kc_end - self.kc_mid) * (d - ini - dev - mid + 1) / late
        return 0.0


CROPS: dict[str, Crop] = {
    c.code: c
    for c in [
        Crop("winter_wheat", "cereal", 0.70, 1.15, 0.25, (30, 140, 40, 30), (10, 15)),
        Crop("barley", "cereal", 0.70, 1.15, 0.25, (30, 130, 40, 25), (10, 20)),
        Crop("maize", "cereal", 0.30, 1.20, 0.60, (30, 40, 50, 30), (5, 1)),
        Crop("sugar_beet", "root", 0.35, 1.20, 0.70, (50, 40, 50, 40), (4, 1)),
        Crop("sunflower", "oilseed", 0.35, 1.00, 0.35, (25, 35, 45, 25), (4, 20)),
        Crop("chickpea", "legume", 0.40, 1.00, 0.35, (20, 30, 40, 20), (3, 15)),
        Crop("lentil", "legume", 0.40, 1.10, 0.30, (20, 30, 60, 40), (3, 1)),
        Crop("dry_bean", "legume", 0.40, 1.15, 0.35, (20, 30, 40, 20), (5, 15)),
        # Perennial forage, modelled as one growing season per year; not suggested automatically.
        Crop("alfalfa", "forage", 0.40, 0.95, 0.90, (10, 30, 150, 20), (4, 1), suggestible=False),
        Crop("fallow", "fallow", 0.0, 0.0, 0.0, (1, 1, 1, 1), (4, 1), suggestible=False),
    ]
}
