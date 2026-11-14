/** Pure helpers for the chart components. No React, no DOM: unit-tested in chart-utils.test.ts. */

export type Point = { t: Date; v: number | null };
export type BandPoint = { t: Date; lo: number | null; hi: number | null };

/**
 * How a series is drawn. The visual grammar is fixed across the app:
 * observed = solid sky blue (came from NASA) · temperature = solid orange · derived = solid green (calculated by us)
 * · scenario = dashed green with a light band (what-if) · scenario-alt = dotted grey (a second what-if
 * to compare against) · reference = thin grey.
 */
export type SeriesTone = "observed" | "temperature" | "derived" | "scenario" | "scenario-alt" | "reference";

export type LineSeries = {
  id: string;
  label: string;
  tone: SeriesTone;
  points: Point[];
  /** Optional range drawn under the line (min–max, or P10–P90 for scenarios). */
  band?: BandPoint[];
};

/** Min and max over all defined values (lines and bands). `null` when there is nothing to draw. */
export function valueExtent(series: LineSeries[]): [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const visit = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return;
    if (value < min) min = value;
    if (value > max) max = value;
  };
  for (const s of series) {
    for (const p of s.points) visit(p.v);
    for (const b of s.band ?? []) {
      visit(b.lo);
      visit(b.hi);
    }
  }
  return min === Number.POSITIVE_INFINITY ? null : [min, max];
}

/** Adds breathing room above and below; a flat series gets a ±1 window so it is not drawn on an edge. */
export function paddedDomain([min, max]: [number, number], ratio = 0.08): [number, number] {
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * ratio;
  return [min - pad, max + pad];
}

export function timeExtent(series: LineSeries[]): [Date, Date] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of series) {
    for (const p of s.points) {
      const time = p.t.getTime();
      if (time < min) min = time;
      if (time > max) max = time;
    }
  }
  return min === Number.POSITIVE_INFINITY ? null : [new Date(min), new Date(max)];
}

/** Index of the time closest to `target` in an ascending list. */
export function nearestIndex(times: number[], target: number): number {
  if (times.length === 0) return -1;
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < target) lo = mid;
    else hi = mid;
  }
  return Math.abs(times[lo] - target) <= Math.abs(times[hi] - target) ? lo : hi;
}

/**
 * Vertical positions for direct labels at line ends: keeps the input order by y and pushes
 * neighbours apart by at least `gap` px while staying inside [top, bottom].
 */
export function spreadLabels(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);
  const placed = order.map((item) => item.y);
  for (let i = 1; i < placed.length; i += 1) {
    placed[i] = Math.max(placed[i], placed[i - 1] + gap);
  }
  const overflow = placed.length ? placed[placed.length - 1] - bottom : 0;
  if (overflow > 0) {
    for (let i = placed.length - 1; i >= 0; i -= 1) {
      placed[i] -= overflow;
      if (i > 0) placed[i - 1] = Math.min(placed[i - 1], placed[i] - gap);
    }
  }
  const result = new Array<number>(ys.length);
  order.forEach((item, i) => {
    result[item.index] = Math.max(top, placed[i]);
  });
  return result;
}

/** Running total that skips missing days; a missing day keeps the previous total but stays flagged. */
export function cumulative(points: Point[]): Point[] {
  let total = 0;
  return points.map((p) => {
    if (p.v !== null) total += p.v;
    return { t: p.t, v: total };
  });
}

/** Last point with a value, used to anchor a direct label. */
export function lastDefined(points: Point[]): Point | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].v !== null) return points[i];
  }
  return null;
}
