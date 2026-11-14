import { describe, expect, it } from "vitest";
import type { Polygon } from "@sat2soil/contracts";
import { parseCoordinates, polygonCentroid, polygonStats, powerGridCell } from "./geo";

const square: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [32.8, 37.6],
      [32.81, 37.6],
      [32.81, 37.61],
      [32.8, 37.61],
      [32.8, 37.6],
    ],
  ],
};

describe("powerGridCell (mirrors services/api met_grid_cell)", () => {
  it.each([
    [37.58, 32.79, 37.5, 32.5],
    [37.58, 32.86, 37.5, 33.125],
    [37.8, 32.79, 38.0, 32.5],
  ])("%f, %f → centre %f, %f", (lat, lon, cLat, cLon) => {
    const cell = powerGridCell(lat, lon);
    expect([cell.centerLat, cell.centerLon]).toEqual([cLat, cLon]);
  });

  it("returns the cell bounds", () => {
    expect(powerGridCell(37.58, 32.79)).toMatchObject({ south: 37.25, north: 37.75, west: 32.1875, east: 32.8125 });
  });
});

describe("polygonStats", () => {
  it("is close to the PostGIS geodesic area (98.0 ha for this square)", () => {
    const stats = polygonStats(square);
    expect(stats.areaHa).toBeGreaterThan(97);
    expect(stats.areaHa).toBeLessThan(99);
    expect(stats.areaDonum).toBeCloseTo(stats.areaHa * 10);
    expect(stats.perimeterM).toBeGreaterThan(3900);
    expect(stats.perimeterM).toBeLessThan(4050);
  });

  it("finds the centre", () => {
    const c = polygonCentroid(square);
    expect(c.lat).toBeCloseTo(37.605, 6);
    expect(c.lon).toBeCloseTo(32.805, 6);
  });
});

describe("parseCoordinates", () => {
  it.each([
    ["37.62, 32.85", { lat: 37.62, lon: 32.85 }],
    ["37,62; 32,85", { lat: 37.62, lon: 32.85 }],
    ["-12.5 130.1", { lat: -12.5, lon: 130.1 }],
  ])("parses %s", (input, expected) => {
    expect(parseCoordinates(input)).toEqual(expected);
  });

  it.each(["Konya", "95, 30", "37.6"])("rejects %s", (input) => {
    expect(parseCoordinates(input)).toBeNull();
  });
});
