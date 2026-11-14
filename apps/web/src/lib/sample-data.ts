import type { BandPoint, Point } from "@/components/charts/chart-utils";

/**
 * SYNTHETIC series for the style guide only. Shapes loosely follow a semi-arid inland climate so the
 * charts look realistic, but these are NOT NASA data and must always be shown with a "Sample" badge.
 * Deterministic (seeded) so server and client renders match.
 */

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 3600 * 1000;
export const SAMPLE_START = Date.UTC(2025, 10, 1);
export const SAMPLE_TODAY = new Date(Date.UTC(2026, 2, 15));
const DAYS = 365;

const dayOfYear = (time: number) => {
  const date = new Date(time);
  return (time - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY;
};

export function sampleTemperature() {
  const random = seeded(7);
  const mean: Point[] = [];
  const band: BandPoint[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    const time = SAMPLE_START + i * DAY;
    const seasonal = 11.5 + 12.5 * Math.sin((2 * Math.PI * (dayOfYear(time) - 110)) / 365);
    const value = seasonal + (random() - 0.5) * 5;
    const missing = i === 141 || i === 142;
    mean.push({ t: new Date(time), v: missing ? null : value });
    band.push({
      t: new Date(time),
      lo: missing ? null : value - 5 - random() * 3,
      hi: missing ? null : value + 6 + random() * 3,
    });
  }
  return { mean, band };
}

export function samplePrecipitation(): Point[] {
  const random = seeded(11);
  const points: Point[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    const time = SAMPLE_START + i * DAY;
    const wetSeason = Math.cos((2 * Math.PI * (dayOfYear(time) - 20)) / 365);
    const chance = 0.12 + 0.16 * Math.max(0, wetSeason);
    const rain = random() < chance ? -Math.log(1 - random()) * 4.2 : 0;
    points.push({ t: new Date(time), v: i === 200 ? null : Math.round(rain * 10) / 10 });
  }
  return points;
}

/** Observed soil-water balance up to "today", then P50 scenario with a P10–P90 band. */
export function sampleScenario() {
  const random = seeded(23);
  const observed: Point[] = [];
  const scenario: Point[] = [];
  const band: BandPoint[] = [];
  let value = -10;
  for (let i = 0; i < DAYS; i += 7) {
    const time = SAMPLE_START + i * DAY;
    const date = new Date(time);
    const season = Math.sin((2 * Math.PI * (dayOfYear(time) - 200)) / 365);
    if (time <= SAMPLE_TODAY.getTime()) {
      value += season * 9 + (random() - 0.5) * 6;
      observed.push({ t: date, v: value });
      if (time + 7 * DAY > SAMPLE_TODAY.getTime()) {
        scenario.push({ t: date, v: value });
        band.push({ t: date, lo: value, hi: value });
      }
    } else {
      value += season * 9;
      const spread = ((time - SAMPLE_TODAY.getTime()) / DAY) * 0.32;
      scenario.push({ t: date, v: value });
      band.push({ t: date, lo: value - spread, hi: value + spread * 0.8 });
    }
  }
  return { observed, scenario, band };
}
