import type { PowerDaily } from "@sat2soil/contracts";
import type { BandPoint, Point } from "@/components/charts/chart-utils";

type Series = PowerDaily["parameters"][number];

export function seriesOf(data: PowerDaily, parameter: string): Series | undefined {
  return data.parameters.find((p) => p.parameter === parameter);
}

export function toPoints(series: Series | undefined): Point[] {
  return (series?.values ?? []).map((v) => ({ t: new Date(`${v.observed_at}T12:00:00Z`), v: v.value }));
}

export function toBand(lo: Series | undefined, hi: Series | undefined): BandPoint[] {
  const high = new Map((hi?.values ?? []).map((v) => [v.observed_at, v.value]));
  return (lo?.values ?? []).map((v) => ({
    t: new Date(`${v.observed_at}T12:00:00Z`),
    lo: v.value,
    hi: high.get(v.observed_at) ?? null,
  }));
}

export type WindowStat = {
  value: number | null;
  previous: number | null;
  days: number;
  /** Days without a value inside the current window. */
  missing: number;
  from: string;
  to: string;
};

/**
 * Aggregates the last `days` days that NASA has published (ending at latest_available) and the
 * window before it. Missing days are skipped: never counted as zero, never filled in (a sum covers
 * only published days; the UI shows how many are missing). A window with fewer than 80 % of its
 * days present returns null.
 */
export function windowStat(series: Series | undefined, mode: "sum" | "mean", days = 30): WindowStat {
  const empty = { value: null, previous: null, days, missing: 0, from: "", to: "" };
  if (!series?.latest_available) return empty;
  const values = series.values;
  const end = values.findIndex((v) => v.observed_at === series.latest_available);
  if (end < 0) return empty;

  const aggregate = (slice: typeof values) => {
    const present = slice.map((v) => v.value).filter((v): v is number => v !== null);
    if (slice.length < days || present.length < days * 0.8) return null;
    const total = present.reduce((s, v) => s + v, 0);
    return mode === "sum" ? total : total / present.length;
  };

  const current = values.slice(Math.max(0, end - days + 1), end + 1);
  const before = values.slice(Math.max(0, end - 2 * days + 1), Math.max(0, end - days + 1));
  return {
    value: aggregate(current),
    previous: aggregate(before),
    days,
    missing: current.filter((v) => v.value === null).length,
    from: current[0]?.observed_at ?? "",
    to: series.latest_available,
  };
}

/**
 * Relative change in percent, or null when it would be meaningless. Only for ratio-scale
 * quantities such as precipitation; temperature (°C) and humidity (%) use absolute differences.
 */
export function relativeChange(value: number | null, previous: number | null): number | null {
  if (value === null || previous === null || Math.abs(previous) < 1e-9) return null;
  return ((value - previous) / Math.abs(previous)) * 100;
}
