"""Digital twin scenarios (docs/ANALYSIS_AI.md §3, D-026).

A crop season is split at the last day with published NASA POWER data:
- before it, the season is **observed** (the field's grid cell, real daily weather);
- after it, the rest of the season is **replayed** from each of the past seasons in the record
  ("analog years"), so every past season gives one possible ending.

Dry / normal / wet are the analog seasons at the 10th / 50th / 90th percentile of the
season-end water balance, and the chart band is the P10–P90 spread across all analogs per day.
Nothing here is a forecast: it shows the range of outcomes this grid cell has already seen.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta

from app.engines.crops import Crop
from app.engines.water import DayInput, current_sowing_year, et0_penman_monteith

# A past season is used only if almost all of its days have complete inputs.
MIN_ANALOG_COMPLETENESS = 0.9
PERCENTILES = {"dry": 0.1, "normal": 0.5, "wet": 0.9}


def daily_climate(
    inputs: dict[date, DayInput], *, latitude: float, elevation: float
) -> dict[date, tuple[float, float]]:
    """(ET0 mm, rainfall mm) for every day whose inputs are all published."""
    out: dict[date, tuple[float, float]] = {}
    for day, x in inputs.items():
        if None in (x.tmax, x.tmin, x.rh, x.u2, x.rs, x.precip):
            continue
        et0 = et0_penman_monteith(
            tmax=x.tmax,  # type: ignore[arg-type]
            tmin=x.tmin,  # type: ignore[arg-type]
            rs=x.rs,  # type: ignore[arg-type]
            u2=x.u2,  # type: ignore[arg-type]
            rh_mean=x.rh,
            elevation=elevation,
            latitude=latitude,
            day_of_year=day.timetuple().tm_yday,
        )
        out[day] = (et0, x.precip)  # type: ignore[assignment]
    return out


def quantile(values: list[float], q: float) -> float:
    """Linear-interpolation quantile (same as numpy's default)."""
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    low, high = math.floor(position), math.ceil(position)
    return ordered[low] + (ordered[high] - ordered[low]) * (position - low)


def target_sowing(crop: Crop, latest: date) -> tuple[date, bool]:
    """The season in the ground on `latest`, else the next one to be sown: (sowing, in_season)."""
    year = current_sowing_year(crop, latest)
    if year is not None:
        return crop.sowing_date(year), True
    year = latest.year if crop.sowing_date(latest.year) > latest else latest.year + 1
    return crop.sowing_date(year), False


@dataclass(frozen=True)
class Outcome:
    """One analog season's complete ending (observed part + replayed rest)."""

    sowing_year: int
    precip_mm: float
    etc_mm: float

    @property
    def balance_mm(self) -> float:
        return self.precip_mm - self.etc_mm

    @property
    def deficit_mm(self) -> float:
        return self.etc_mm - self.precip_mm

    @property
    def coverage_pct(self) -> float | None:
        return None if self.etc_mm <= 0 else 100 * self.precip_mm / self.etc_mm


@dataclass(frozen=True)
class TwinDay:
    day: date
    kc: float
    observed: bool
    balance_mm: float | None  # observed cumulative rain − ETc (observed days only)
    p10: float | None  # replayed cumulative balance, from the last observed day on
    p50: float | None
    p90: float | None
    etc_cum_mm: float  # observed, then median across analogs


@dataclass(frozen=True)
class TwinSeason:
    crop: str
    sowing: date
    harvest: date
    in_season: bool
    observed_until: date | None
    observed_precip_mm: float
    observed_etc_mm: float
    observed_missing_days: int
    days: list[TwinDay]
    analogs: list[Outcome]  # sorted driest → wettest by season-end balance
    outcomes: dict[str, Outcome]  # dry / normal / wet


def twin_season(
    crop: Crop,
    climate: dict[date, tuple[float, float]],
    latest: date,
    *,
    max_analogs: int = 20,
) -> TwinSeason | None:
    """Observed-so-far + replayed-rest scenarios for the crop's current or next season.

    `climate` is the output of `daily_climate`; `latest` is the last day with complete inputs.
    Returns None when the record holds no usable past season.
    """
    sowing, in_season = target_sowing(crop, latest)
    length = crop.season_days
    harvest = sowing + timedelta(days=length - 1)
    observed_len = (min(latest, harvest) - sowing).days + 1 if in_season else 0

    # Observed part: cumulative per day; a missing day adds nothing to either side.
    obs_rain: list[float] = []
    obs_etc: list[float] = []
    rain = etc = 0.0
    missing = 0
    for offset in range(observed_len):
        value = climate.get(sowing + timedelta(days=offset))
        if value is None:
            missing += 1
        else:
            rain += value[1]
            etc += crop.kc(offset) * value[0]
        obs_rain.append(rain)
        obs_etc.append(etc)

    # Analog seasons: complete, entirely in the record, most recent first.
    analog_years: list[int] = []
    year = sowing.year - 1
    first_day = min(climate, default=latest)
    while len(analog_years) < max_analogs and crop.sowing_date(year) >= first_day:
        start, end = crop.season(year)
        if end <= latest:
            present = sum(1 for o in range(length) if start + timedelta(days=o) in climate)
            if present >= MIN_ANALOG_COMPLETENESS * length:
                analog_years.append(year)
        year -= 1
    if not analog_years:
        return None

    # Each analog: observed days as they happened, then that past season's weather for the rest.
    traj_balance: list[list[float]] = []
    traj_etc: list[list[float]] = []
    outcomes: list[Outcome] = []
    for y in analog_years:
        start = crop.sowing_date(y)
        rain = obs_rain[-1] if obs_rain else 0.0
        etc = obs_etc[-1] if obs_etc else 0.0
        balance_row: list[float] = []
        etc_row: list[float] = []
        for offset in range(length):
            if offset < observed_len:
                balance_row.append(obs_rain[offset] - obs_etc[offset])
                etc_row.append(obs_etc[offset])
                continue
            value = climate.get(start + timedelta(days=offset))
            if value is not None:
                rain += value[1]
                etc += crop.kc(offset) * value[0]
            balance_row.append(rain - etc)
            etc_row.append(etc)
        traj_balance.append(balance_row)
        traj_etc.append(etc_row)
        outcomes.append(Outcome(sowing_year=y, precip_mm=rain, etc_mm=etc))

    days: list[TwinDay] = []
    for offset in range(length):
        observed = offset < observed_len
        column = [row[offset] for row in traj_balance]
        # The band starts on the last observed day so the two lines meet.
        banded = offset >= observed_len - 1
        days.append(
            TwinDay(
                day=sowing + timedelta(days=offset),
                kc=crop.kc(offset),
                observed=observed,
                balance_mm=column[0] if observed else None,
                p10=quantile(column, 0.1) if banded else None,
                p50=quantile(column, 0.5) if banded else None,
                p90=quantile(column, 0.9) if banded else None,
                etc_cum_mm=quantile([row[offset] for row in traj_etc], 0.5),
            )
        )

    ranked = sorted(outcomes, key=lambda o: o.balance_mm)
    picked = {name: ranked[round(q * (len(ranked) - 1))] for name, q in PERCENTILES.items()}
    return TwinSeason(
        crop=crop.code,
        sowing=sowing,
        harvest=harvest,
        in_season=in_season,
        observed_until=sowing + timedelta(days=observed_len - 1) if observed_len else None,
        observed_precip_mm=obs_rain[-1] if obs_rain else 0.0,
        observed_etc_mm=obs_etc[-1] if obs_etc else 0.0,
        observed_missing_days=missing,
        days=days,
        analogs=ranked,
        outcomes=picked,
    )
