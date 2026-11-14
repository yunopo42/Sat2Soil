import { describe, expect, it } from "vitest";
import type { PowerDaily } from "@sat2soil/contracts";
import { relativeChange, windowStat } from "./climate";

type Series = PowerDaily["parameters"][number];

function series(values: (number | null)[], latestIndex = values.length - 1): Series {
  const start = Date.UTC(2026, 0, 1);
  return {
    parameter: "PRECTOTCORR",
    long_name: "Precipitation Corrected",
    unit: "mm/day",
    unit_source: "mm/day",
    spatial_resolution: "0.5° × 0.625°",
    missing_days: values.filter((v) => v === null).length,
    latest_available: new Date(start + latestIndex * 86_400_000).toISOString().slice(0, 10),
    values: values.map((value, i) => ({
      observed_at: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
      value,
    })),
  };
}

describe("windowStat", () => {
  it("sums the last 30 published days and the 30 before", () => {
    const data = series([...Array(30).fill(1), ...Array(30).fill(2)]);
    const stat = windowStat(data, "sum");
    expect(stat.value).toBe(60);
    expect(stat.previous).toBe(30);
  });

  it("ignores trailing days that NASA has not published yet", () => {
    const data = series([...Array(30).fill(1), ...Array(30).fill(2), null, null], 59);
    expect(windowStat(data, "sum").value).toBe(60);
  });

  it("does not invent rain for a missing day", () => {
    const values = Array(30).fill(2) as (number | null)[];
    values[10] = null;
    expect(windowStat(series(values), "sum").value).toBe(58);
  });

  it("refuses a window with too many gaps", () => {
    const values = Array(30).fill(null) as (number | null)[];
    values[29] = 5;
    expect(windowStat(series(values), "mean").value).toBeNull();
  });
});

describe("relativeChange", () => {
  it("returns percent change", () => {
    expect(relativeChange(12, 10)).toBeCloseTo(20);
  });

  it("is null when the base is zero or missing", () => {
    expect(relativeChange(5, 0)).toBeNull();
    expect(relativeChange(5, null)).toBeNull();
  });
});
