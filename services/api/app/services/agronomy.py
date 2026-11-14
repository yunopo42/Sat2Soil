"""Feeds NASA POWER data for a field into the water and rotation engines."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.engines.crops import CROPS
from app.engines.rotation import CropClimate
from app.engines.water import (
    DayInput,
    SeasonBalance,
    current_sowing_year,
    last_complete_sowing_year,
    season_balance,
)
from app.repositories.fields import FieldRecord
from app.services.nasa_power import PowerDailyService, ServedPowerDaily

INPUT_PARAMETERS = ("T2M_MAX", "T2M_MIN", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "PRECTOTCORR", "T2M")
# Long enough to hold the last complete season of every crop in the catalogue.
HISTORY_DAYS = 760


@dataclass(frozen=True)
class FieldClimate:
    inputs: dict[date, DayInput]
    served: ServedPowerDaily
    latest: date  # last day where every ET0 input is published
    elevation: float


async def load_climate(service: PowerDailyService, record: FieldRecord) -> FieldClimate:
    end = datetime.now(UTC).date()
    start = end - timedelta(days=HISTORY_DAYS - 1)
    served = await service.get_daily(
        latitude=record.centroid_lat,
        longitude=record.centroid_lon,
        start=start,
        end=end,
        parameters=INPUT_PARAMETERS,
    )
    s = served.data.series
    values = {name: dict(s[name].values) for name in INPUT_PARAMETERS}
    inputs: dict[date, DayInput] = {}
    complete: list[date] = []
    for day in values["T2M_MAX"]:
        x = DayInput(
            day=day,
            tmax=values["T2M_MAX"].get(day),
            tmin=values["T2M_MIN"].get(day),
            rh=values["RH2M"].get(day),
            u2=values["WS2M"].get(day),
            rs=values["ALLSKY_SFC_SW_DWN"].get(day),
            precip=values["PRECTOTCORR"].get(day),
        )
        inputs[day] = x
        if None not in (x.tmax, x.tmin, x.rh, x.u2, x.rs, x.precip):
            complete.append(day)
    return FieldClimate(
        inputs=inputs,
        served=served,
        latest=max(complete) if complete else start,
        elevation=served.data.elevation_m,
    )


def balance_for(
    climate: FieldClimate, record: FieldRecord, crop_code: str, season: str
) -> SeasonBalance | None:
    crop = CROPS[crop_code]
    year = (
        current_sowing_year(crop, climate.latest)
        if season == "current"
        else last_complete_sowing_year(crop, climate.latest)
    )
    if year is None:
        return None
    return season_balance(
        crop,
        crop.sowing_date(year),
        climate.inputs,
        latitude=record.centroid_lat,
        elevation=climate.elevation,
    )


def crop_climates(
    climate: FieldClimate, record: FieldRecord
) -> dict[str, tuple[CropClimate, SeasonBalance]]:
    """Each crop's demand and rainfall in its most recent complete season in this grid cell."""
    result: dict[str, tuple[CropClimate, SeasonBalance]] = {}
    for code, crop in CROPS.items():
        if crop.family == "fallow":
            continue
        balance = balance_for(climate, record, code, "last")
        if balance is None or balance.sowing < min(climate.inputs, default=balance.sowing):
            continue
        result[code] = (CropClimate(code, balance.etc_mm, balance.precip_mm), balance)
    return result


@dataclass(frozen=True)
class Conditions:
    annual_precip_mm: float | None
    mean_temp_c: float | None
    frost_days: int
    start: date
    end: date


def field_conditions(climate: FieldClimate) -> Conditions:
    end = climate.latest
    start = end - timedelta(days=364)
    t2m = dict(climate.served.data.series["T2M"].values)
    days = [d for d in climate.inputs if start <= d <= end]
    rain = [climate.inputs[d].precip for d in days if climate.inputs[d].precip is not None]
    temps = [t2m[d] for d in days if t2m.get(d) is not None]
    frost = sum(1 for d in days if (climate.inputs[d].tmin or 1) < 0)
    return Conditions(
        annual_precip_mm=sum(rain) if rain else None,  # type: ignore[arg-type]
        mean_temp_c=sum(temps) / len(temps) if temps else None,  # type: ignore[arg-type]
        frost_days=frost,
        start=start,
        end=end,
    )


def default_plan(record: FieldRecord) -> list[str]:
    """'Keep doing what you did': continue the field's last two-season cycle for three years
    (e.g. wheat, sugar beet, wheat → sugar beet, wheat, sugar beet)."""
    history = [s["crop"] for s in sorted(record.rotation_history, key=lambda s: s["season_year"])]
    history = [c for c in history if c in CROPS]
    if len(history) >= 2:
        a, b = history[-2], history[-1]
        return [a, b, a]
    base = record.crop if record.crop in CROPS else "winter_wheat"
    return [base] * 3
