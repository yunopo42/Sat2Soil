import turfArea from "@turf/area";
import turfLength from "@turf/length";
import type { Polygon } from "@sat2soil/contracts";

/** NASA POWER meteorological grid (verified on the live API, docs/DECISIONS.md D-019). */
export const POWER_GRID = { lat: 0.5, lon: 0.625 } as const;

export type Bounds = { west: number; south: number; east: number; north: number };

/** The POWER grid cell that contains a point: same rule as services/api met_grid_cell. */
export function powerGridCell(lat: number, lon: number): Bounds & { centerLat: number; centerLon: number } {
  const centerLat = Math.floor(lat / POWER_GRID.lat + 0.5) * POWER_GRID.lat;
  const centerLon = Math.floor(lon / POWER_GRID.lon + 0.5) * POWER_GRID.lon;
  return {
    centerLat,
    centerLon,
    south: centerLat - POWER_GRID.lat / 2,
    north: centerLat + POWER_GRID.lat / 2,
    west: centerLon - POWER_GRID.lon / 2,
    east: centerLon + POWER_GRID.lon / 2,
  };
}

export function boundsToPolygon(b: Bounds): Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [b.west, b.south],
        [b.east, b.south],
        [b.east, b.north],
        [b.west, b.north],
        [b.west, b.south],
      ],
    ],
  };
}

export function polygonBounds(polygon: Polygon): Bounds {
  const ring = polygon.coordinates[0];
  return ring.reduce<Bounds>(
    (b, [lon, lat]) => ({
      west: Math.min(b.west, lon),
      east: Math.max(b.east, lon),
      south: Math.min(b.south, lat),
      north: Math.max(b.north, lat),
    }),
    { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
  );
}

/** Area-weighted centroid of the outer ring (planar in lon/lat; fine at field scale). */
export function polygonCentroid(polygon: Polygon): { lat: number; lon: number } {
  const ring = polygon.coordinates[0];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-15) {
    const n = ring.length - 1 || 1;
    return {
      lon: ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n,
      lat: ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n,
    };
  }
  return { lon: cx / (3 * area), lat: cy / (3 * area) };
}

/** Browser-side preview of area and perimeter; the saved values come from PostGIS. */
export function polygonStats(polygon: Polygon) {
  const feature = { type: "Feature" as const, properties: {}, geometry: polygon };
  const areaHa = turfArea(feature) / 10_000;
  const perimeterM =
    turfLength(
      { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: polygon.coordinates[0] } },
      { units: "kilometers" },
    ) * 1000;
  return { areaHa, areaDonum: areaHa * 10, perimeterM, centroid: polygonCentroid(polygon) };
}

/** Parses "37.62, 32.85" (lat, lon). Returns null for anything else. */
export function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const match = input.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1].replace(",", "."));
  const lon = Number(match[2].replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
