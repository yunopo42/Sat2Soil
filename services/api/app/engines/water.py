"""FAO-56 reference evapotranspiration and a climatic water balance (docs/ANALYSIS_AI.md §1).

ET0 follows the FAO Penman-Monteith daily method (FAO-56, Chapter 3, eqs. 6–40) using NASA
POWER daily inputs. Crop demand is ETc = Kc × ET0 (single coefficient, Chapter 6). The balance
compares rainfall with crop demand; it is an indicator, not an irrigation prescription: soil
storage, effective rainfall, runoff and groundwater are not modelled.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta

from app.engines.crops import Crop

SIGMA = 4.903e-9  # Stefan-Boltzmann, MJ K-4 m-2 day-1
GSC = 0.0820  # solar constant, MJ m-2 min-1


def saturation_vapour_pressure(t: float) -> float:
    """e°(T) in kPa (eq. 11)."""
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def extraterrestrial_radiation(latitude: float, day_of_year: int) -> float:
    """Ra in MJ m-2 day-1 (eqs. 21–25)."""
    phi = math.radians(latitude)
    dr = 1 + 0.033 * math.cos(2 * math.pi * day_of_year / 365)
    decl = 0.409 * math.sin(2 * math.pi * day_of_year / 365 - 1.39)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(decl))))
    return (
        24
        * 60
        / math.pi
        * GSC
        * dr
        * (ws * math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.sin(ws))
    )


def et0_penman_monteith(
    *,
    tmax: float,
    tmin: float,
    rs: float,
    u2: float,
    elevation: float,
    latitude: float,
    day_of_year: int,
    rh_mean: float | None = None,
    ea: float | None = None,
) -> float:
    """Daily ET0 in mm. Actual vapour pressure from `ea` if given, else from mean RH (eq. 19)."""
    t = (tmax + tmin) / 2
    pressure = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26  # eq. 7
    gamma = 0.000665 * pressure  # eq. 8
    delta = 4098 * saturation_vapour_pressure(t) / (t + 237.3) ** 2  # eq. 13
    es = (saturation_vapour_pressure(tmax) + saturation_vapour_pressure(tmin)) / 2  # eq. 12
    if ea is None:
        if rh_mean is None:
            raise ValueError("ea or rh_mean is required")
        ea = rh_mean / 100 * es
    ra = extraterrestrial_radiation(latitude, day_of_year)
    rso = (0.75 + 2e-5 * elevation) * ra  # eq. 37
    rns = (1 - 0.23) * rs  # eq. 38
    ratio = min(rs / rso, 1.0) if rso > 0 else 1.0
    rnl = (
        SIGMA
        * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4)
        / 2
        * (0.34 - 0.14 * math.sqrt(max(ea, 0.0)))
        * (1.35 * ratio - 0.35)
    )  # eq. 39
    rn = rns - rnl
    numerator = 0.408 * delta * rn + gamma * 900 / (t + 273) * u2 * (es - ea)
    return max(0.0, numerator / (delta + gamma * (1 + 0.34 * u2)))  # eq. 6, G = 0 for daily steps


@dataclass(frozen=True)
class DayInput:
    day: date
    tmax: float | None
    tmin: float | None
    rh: float | None
    u2: float | None
    rs: float | None
    precip: float | None


@dataclass(frozen=True)
class DayResult:
    day: date
    kc: float
    et0: float | None
    etc: float | None
    precip: float | None


@dataclass(frozen=True)
class SeasonBalance:
    crop: str
    sowing: date
    harvest: date
    covered_until: date
    days: list[DayResult]
    precip_mm: float
    et0_mm: float
    etc_mm: float
    missing_days: int

    @property
    def deficit_mm(self) -> float:
        return self.etc_mm - self.precip_mm

    @property
    def coverage_pct(self) -> float | None:
        return None if self.etc_mm <= 0 else 100 * self.precip_mm / self.etc_mm


def season_balance(
    crop: Crop,
    sowing: date,
    inputs: dict[date, DayInput],
    *,
    latitude: float,
    elevation: float,
) -> SeasonBalance:
    """Water balance from sowing until harvest or the last day with data, whichever is first.

    A day missing any ET0 input contributes neither demand nor rainfall to the totals (both
    are skipped together, so the comparison stays like-for-like) and is counted as missing.
    """
    harvest = sowing + timedelta(days=crop.season_days - 1)
    available = [
        d
        for d, x in inputs.items()
        if sowing <= d <= harvest and None not in (x.tmax, x.tmin, x.rh, x.u2, x.rs, x.precip)
    ]
    covered_until = max(available) if available else sowing
    days: list[DayResult] = []
    precip = et0_total = etc_total = 0.0
    missing = 0
    for offset in range((covered_until - sowing).days + 1):
        day = sowing + timedelta(days=offset)
        kc = crop.kc(offset)
        x = inputs.get(day)
        values = (x.tmax, x.tmin, x.rh, x.u2, x.rs, x.precip) if x else (None,)
        if x is None or any(v is None for v in values):
            missing += 1
            days.append(DayResult(day, kc, None, None, x.precip if x else None))
            continue
        et0 = et0_penman_monteith(
            tmax=x.tmax,
            tmin=x.tmin,
            rs=x.rs,
            u2=x.u2,
            rh_mean=x.rh,  # type: ignore[arg-type]
            elevation=elevation,
            latitude=latitude,
            day_of_year=day.timetuple().tm_yday,
        )
        etc = kc * et0
        precip += x.precip  # type: ignore[operator]
        et0_total += et0
        etc_total += etc
        days.append(DayResult(day, kc, et0, etc, x.precip))
    return SeasonBalance(
        crop=crop.code,
        sowing=sowing,
        harvest=harvest,
        covered_until=covered_until,
        days=days,
        precip_mm=precip,
        et0_mm=et0_total,
        etc_mm=etc_total,
        missing_days=missing,
    )


def last_complete_sowing_year(crop: Crop, latest: date) -> int:
    year = latest.year
    while crop.season(year)[1] > latest:
        year -= 1
    return year


def current_sowing_year(crop: Crop, latest: date) -> int | None:
    for year in (latest.year, latest.year - 1):
        start, end = crop.season(year)
        if start <= latest <= end:
            return year
    return None
