"""AgriSpray concept (docs/ANALYSIS_AI.md "AgriSpray", D-027). Everything here is simulated.

- The device does not exist yet: its readings are a fixed, documented sample plus a generated
  7-day history (`simulated_device`, `computation_kind=mock`).
- Spray cards are **synthetic** water-sensitive papers: stains are generated from a seed, then
  rasterised and measured the way a scanned card would be (coverage = stain pixels / card pixels,
  stains = connected regions, so touching stains merge exactly as on real paper).
- Spray conditions use general published guidance (Delta T, air temperature). They are indicative,
  never a go/no-go decision, never a dose, and never a pesticide efficacy figure.
"""

from __future__ import annotations

import base64
import math
import random
import struct
import zlib
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from functools import lru_cache

# ---------------------------------------------------------------- device (simulated)

DEVICE_ID = "SAT2SOIL_CONCEPT_01"
SAMPLE_TIME = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)  # docs/ANALYSIS_AI.md sample JSON
SAMPLE = {
    "soil_moisture_pct": 31.4,
    "soil_temp_c": 20.7,
    "soil_ec_ds_m": 0.82,
    "air_temp_c": 24.0,
    "air_rh_pct": 48.0,
    "wind_ms": None,  # the concept has no anemometer
}


@dataclass(frozen=True)
class DeviceReading:
    at: datetime
    soil_moisture_pct: float
    soil_temp_c: float


def device_history(seed: str, days: int = 7, step_h: int = 3) -> list[DeviceReading]:
    """Generated readings that end exactly at the documented sample. Smooth drying plus a daily
    temperature cycle; deterministic per field so the page does not change between visits."""
    rng = random.Random(seed)
    steps = days * 24 // step_h
    out: list[DeviceReading] = []
    for i in range(steps + 1):
        back = steps - i
        at = SAMPLE_TIME - timedelta(hours=back * step_h)
        hour = at.hour + at.minute / 60
        drying = 0.022 * back * step_h / 3  # wetter in the past
        moisture = SAMPLE["soil_moisture_pct"] + drying + rng.uniform(-0.15, 0.15)  # type: ignore[operator]
        daily = 2.6 * math.sin((hour - 9) / 24 * 2 * math.pi)
        noon = 2.6 * math.sin((12 - 9) / 24 * 2 * math.pi)
        temp = SAMPLE["soil_temp_c"] + daily - noon + rng.uniform(-0.2, 0.2)  # type: ignore[operator]
        if back == 0:
            moisture, temp = SAMPLE["soil_moisture_pct"], SAMPLE["soil_temp_c"]
        out.append(DeviceReading(at, round(moisture, 1), round(temp, 1)))  # type: ignore[arg-type]
    return out


# ---------------------------------------------------------------- spray conditions


def wet_bulb_stull(temp_c: float, rh_pct: float) -> float:
    """Wet-bulb temperature (Stull 2011), valid for RH 5–99 % and −20…50 °C, error < 1 °C."""
    t, rh = temp_c, rh_pct
    return (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * math.atan(0.023101 * rh)
        - 4.686035
    )


def delta_t(temp_c: float, rh_pct: float) -> float:
    return temp_c - wet_bulb_stull(temp_c, rh_pct)


@dataclass(frozen=True)
class Check:
    code: str
    status: str  # within | caution | outside | unknown
    value: float | None
    unit: str


def spray_checks(
    air_temp_c: float | None, air_rh_pct: float | None, wind_ms: float | None
) -> list[Check]:
    """Indicative checks from general guidance (e.g. GRDC Delta T chart: 2–8 preferred,
    8–10 marginal, > 10 high evaporation; < 2 risk of fine droplets hanging / inversions)."""
    checks: list[Check] = []
    if air_temp_c is None or air_rh_pct is None:
        checks.append(Check("delta_t", "unknown", None, "°C"))
    else:
        dt = delta_t(air_temp_c, air_rh_pct)
        status = "within" if 2 <= dt <= 8 else "caution" if dt <= 10 else "outside"
        checks.append(Check("delta_t", status, round(dt, 1), "°C"))
    if air_temp_c is None:
        checks.append(Check("air_temp", "unknown", None, "°C"))
    else:
        status = "within" if air_temp_c <= 28 else "caution" if air_temp_c <= 32 else "outside"
        checks.append(Check("air_temp", status, air_temp_c, "°C"))
    if wind_ms is None:
        checks.append(Check("wind", "unknown", None, "m/s"))
    else:
        status = "caution" if wind_ms < 0.8 else "within" if wind_ms <= 4 else "outside"
        checks.append(Check("wind", status, wind_ms, "m/s"))
    return checks


# ---------------------------------------------------------------- synthetic spray card

CARD_W_MM, CARD_H_MM = 76.0, 26.0  # common water-sensitive paper size, shown landscape
RES_MM = 0.05  # raster cell
DISPLAY_RES_MM = 0.1  # mask image resolution
ZONES = (6, 2)  # columns × rows for uniformity
HIST_EDGES_UM = (0, 300, 600, 900, 1200)  # stain (not droplet) diameter


@dataclass(frozen=True)
class Variant:
    seed: int
    stains_per_cm2: float  # generated, before touching stains merge
    left_bias: float  # 0 = even; 0.8 = left edge ≈ 9× the right edge
    median_um: float


VARIANTS: dict[str, Variant] = {
    "even": Variant(seed=11, stains_per_cm2=48, left_bias=0.0, median_um=560),
    "uneven": Variant(seed=7, stains_per_cm2=46, left_bias=0.8, median_um=560),
    "sparse": Variant(seed=3, stains_per_cm2=15, left_bias=0.1, median_um=480),
}


@dataclass(frozen=True)
class Stain:
    x_mm: float
    y_mm: float
    d_um: float


@dataclass
class CardAnalysis:
    variant: str
    stains: list[Stain]
    coverage_pct: float
    regions: int
    regions_per_cm2: float
    zone_coverage: list[list[float]]  # rows × columns
    uniformity_cv_pct: float
    uniformity: str  # even | moderate | uneven
    denser_side: str | None  # left | right
    left_coverage_pct: float
    right_coverage_pct: float
    histogram: list[tuple[int, int | None, int]] = field(
        default_factory=list
    )  # (from µm, to µm, count)
    mask_png: str = ""  # data URL


def generate_stains(variant: Variant) -> list[Stain]:
    rng = random.Random(variant.seed)
    area_cm2 = CARD_W_MM * CARD_H_MM / 100
    count = round(variant.stains_per_cm2 * area_cm2)
    stains: list[Stain] = []
    while len(stains) < count:
        x = rng.uniform(0, CARD_W_MM)
        # Density falls linearly from left to right edge (rejection sampling).
        weight = 1 + variant.left_bias * (1 - 2 * x / CARD_W_MM)
        if rng.uniform(0, 1 + variant.left_bias) > weight:
            continue
        y = rng.uniform(0, CARD_H_MM)
        d = min(1600.0, max(120.0, variant.median_um * math.exp(rng.gauss(0, 0.45))))
        stains.append(Stain(round(x, 2), round(y, 2), round(d)))
    return stains


def rasterise(stains: list[Stain], res_mm: float = RES_MM) -> tuple[bytearray, int, int]:
    w, h = round(CARD_W_MM / res_mm), round(CARD_H_MM / res_mm)
    grid = bytearray(w * h)
    for s in stains:
        r = s.d_um / 1000 / 2 / res_mm
        cx, cy = s.x_mm / res_mm, s.y_mm / res_mm
        for py in range(max(0, int(cy - r)), min(h, int(cy + r) + 1)):
            dy = py + 0.5 - cy
            span = r * r - dy * dy
            if span < 0:
                continue
            half = math.sqrt(span)
            x0, x1 = max(0, int(cx - half + 0.5)), min(w - 1, int(cx + half - 0.5))
            row = py * w
            for px in range(x0, x1 + 1):
                grid[row + px] = 1
    return grid, w, h


def connected_regions(grid: bytearray, w: int, h: int) -> list[int]:
    """Pixel areas of 4-connected regions (iterative flood fill)."""
    seen = bytearray(len(grid))
    areas: list[int] = []
    for start in range(len(grid)):
        if not grid[start] or seen[start]:
            continue
        seen[start] = 1
        stack = [start]
        area = 0
        while stack:
            i = stack.pop()
            area += 1
            x = i % w
            for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < len(grid) and grid[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        areas.append(area)
    return areas


def png_1bit(grid: bytearray, w: int, h: int, factor: int, on: bytes, off: bytes) -> str:
    """Downsampled two-colour PNG as a data URL (a cell is 'on' if any source pixel is)."""
    ow, oh = w // factor, h // factor
    raw = bytearray()
    for oy in range(oh):
        raw.append(0)  # filter: none
        byte = bits = 0
        for ox in range(ow):
            hit = 0
            for dy in range(factor):
                row = (oy * factor + dy) * w + ox * factor
                if any(grid[row : row + factor]):
                    hit = 1
                    break
            byte = (byte << 1) | hit
            bits += 1
            if bits == 8:
                raw.append(byte)
                byte = bits = 0
        if bits:
            raw.append(byte << (8 - bits))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", ow, oh, 1, 3, 0, 0, 0))
        + chunk(b"PLTE", off + on)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    return "data:image/png;base64," + base64.b64encode(png).decode()


def _coverage(grid: bytearray, w: int, x0: int, x1: int, y0: int, y1: int) -> float:
    total = (x1 - x0) * (y1 - y0)
    on = sum(sum(grid[y * w + x0 : y * w + x1]) for y in range(y0, y1))
    return 100 * on / total if total else 0.0


@lru_cache(maxsize=8)
def analyse_example(name: str) -> CardAnalysis:
    variant = VARIANTS[name]
    stains = generate_stains(variant)
    grid, w, h = rasterise(stains)
    areas = connected_regions(grid, w, h)
    area_cm2 = CARD_W_MM * CARD_H_MM / 100
    coverage = 100 * sum(grid) / len(grid)

    cols, rows = ZONES
    zones = [
        [
            round(
                _coverage(
                    grid, w, c * w // cols, (c + 1) * w // cols, r * h // rows, (r + 1) * h // rows
                ),
                1,
            )
            for c in range(cols)
        ]
        for r in range(rows)
    ]
    flat = [v for row in zones for v in row]
    mean = sum(flat) / len(flat)
    cv = 100 * math.sqrt(sum((v - mean) ** 2 for v in flat) / len(flat)) / mean if mean else 0.0
    left = _coverage(grid, w, 0, w // 2, 0, h)
    right = _coverage(grid, w, w // 2, w, 0, h)
    side = "left" if left > 1.3 * right else "right" if right > 1.3 * left else None

    cell_um2 = (RES_MM * 1000) ** 2
    diameters = [2 * math.sqrt(a * cell_um2 / math.pi) for a in areas]
    histogram = []
    for i, low in enumerate(HIST_EDGES_UM):
        high = HIST_EDGES_UM[i + 1] if i + 1 < len(HIST_EDGES_UM) else None
        n = sum(1 for d in diameters if d >= low and (high is None or d < high))
        histogram.append((low, high, n))

    return CardAnalysis(
        variant=name,
        stains=stains,
        coverage_pct=round(coverage, 1),
        regions=len(areas),
        regions_per_cm2=round(len(areas) / area_cm2, 1),
        zone_coverage=zones,
        uniformity_cv_pct=round(cv, 1),
        uniformity="even" if cv < 15 else "moderate" if cv < 30 else "uneven",
        denser_side=side,
        left_coverage_pct=round(left, 1),
        right_coverage_pct=round(right, 1),
        histogram=histogram,
        mask_png=png_1bit(
            grid, w, h, round(DISPLAY_RES_MM / RES_MM), on=b"\xd9\xf9\x9d", off=b"\x0b\x1f\x3a"
        ),
    )
