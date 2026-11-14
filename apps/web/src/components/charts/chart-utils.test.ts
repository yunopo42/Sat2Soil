import { describe, expect, it } from "vitest";
import {
  cumulative,
  lastDefined,
  nearestIndex,
  paddedDomain,
  spreadLabels,
  timeExtent,
  valueExtent,
  type LineSeries,
} from "./chart-utils";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

const series: LineSeries[] = [
  {
    id: "obs",
    label: "Observed",
    tone: "observed",
    points: [
      { t: day(1), v: 4 },
      { t: day(2), v: null },
      { t: day(3), v: 10 },
    ],
    band: [{ t: day(1), lo: -2, hi: 12 }],
  },
];

describe("valueExtent", () => {
  it("ignores missing values and includes bands", () => {
    expect(valueExtent(series)).toEqual([-2, 12]);
  });

  it("returns null when nothing is defined", () => {
    expect(valueExtent([{ id: "x", label: "x", tone: "reference", points: [{ t: day(1), v: null }] }])).toBeNull();
  });
});

describe("paddedDomain", () => {
  it("pads both ends", () => {
    expect(paddedDomain([0, 100], 0.1)).toEqual([-10, 110]);
  });

  it("opens a window around a flat series", () => {
    expect(paddedDomain([5, 5])).toEqual([4, 6]);
  });
});

describe("timeExtent", () => {
  it("spans all points", () => {
    expect(timeExtent(series)).toEqual([day(1), day(3)]);
  });
});

describe("nearestIndex", () => {
  const times = [0, 10, 20, 30];
  it.each([
    [-5, 0],
    [4, 0],
    [6, 1],
    [29, 3],
    [99, 3],
  ])("target %i → index %i", (target, expected) => {
    expect(nearestIndex(times, target)).toBe(expected);
  });

  it("handles an empty list", () => {
    expect(nearestIndex([], 3)).toBe(-1);
  });
});

describe("spreadLabels", () => {
  it("keeps labels that are already apart", () => {
    expect(spreadLabels([10, 50], 14, 0, 100)).toEqual([10, 50]);
  });

  it("pushes overlapping labels apart and keeps their order", () => {
    const [a, b] = spreadLabels([40, 42], 14, 0, 100);
    expect(b - a).toBeGreaterThanOrEqual(14);
    expect(a).toBeLessThan(b);
  });

  it("stays inside the bottom bound", () => {
    const placed = spreadLabels([95, 96, 97], 14, 0, 100);
    expect(Math.max(...placed)).toBeLessThanOrEqual(100);
  });
});

describe("cumulative", () => {
  it("skips missing days without resetting", () => {
    expect(cumulative(series[0].points).map((p) => p.v)).toEqual([4, 4, 14]);
  });
});

describe("lastDefined", () => {
  it("finds the last point with a value", () => {
    expect(lastDefined([{ t: day(1), v: 1 }, { t: day(2), v: null }])?.v).toBe(1);
  });
});
