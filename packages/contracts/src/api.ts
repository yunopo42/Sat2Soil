import { z } from "zod";
import { DataSourceSchema } from "./data-source";

/**
 * Runtime schemas for the Sat2Soil API responses (services/api/app/models). The web app parses
 * every response with these, so a contract drift fails loudly instead of rendering wrong numbers.
 */

export const IRRIGATION_TYPES = ["rainfed", "drip", "sprinkler", "center_pivot", "furrow"] as const;
export const IrrigationTypeSchema = z.enum(IRRIGATION_TYPES);
export type IrrigationType = z.infer<typeof IrrigationTypeSchema>;

/** Crop catalogue codes. Labels live in apps/web/messages (crops.*). */
export const CROP_CODES = [
  "winter_wheat",
  "barley",
  "sugar_beet",
  "maize",
  "sunflower",
  "chickpea",
  "lentil",
  "alfalfa",
  "dry_bean",
  "fallow",
] as const;
export type CropCode = (typeof CROP_CODES)[number];

const Position = z.tuple([z.number(), z.number()]);

export const PolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(Position)),
});
export type Polygon = z.infer<typeof PolygonSchema>;

export const FieldSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  boundary: PolygonSchema,
  centroid: z.object({ lat: z.number(), lon: z.number() }),
  area_ha: z.number(),
  area_donum: z.number(),
  perimeter_m: z.number(),
  crop: z.string().nullable(),
  irrigation_type: IrrigationTypeSchema.nullable(),
  rotation_history: z.array(z.object({ season_year: z.number().int(), crop: z.string() })),
  is_sample: z.boolean(),
  source_type: DataSourceSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Field = z.infer<typeof FieldSchema>;

export const DemoSessionSchema = z.object({
  token: z.string(),
  workspace_id: z.string().uuid(),
  expires_at: z.string(),
});
export type DemoSession = z.infer<typeof DemoSessionSchema>;

export const PowerDailySchema = z.object({
  source_type: DataSourceSchema,
  latitude: z.number(),
  longitude: z.number(),
  start: z.string(),
  end: z.string(),
  grid_cell: z.object({
    center_lat: z.number(),
    center_lon: z.number(),
    lat_min: z.number(),
    lat_max: z.number(),
    lon_min: z.number(),
    lon_max: z.number(),
    resolution: z.string(),
  }),
  provenance: z.object({
    source_name: z.literal("NASA POWER"),
    product: z.string(),
    community: z.string(),
    upstream_sources: z.array(z.string()),
    temporal_resolution: z.string(),
    time_standard: z.string(),
    elevation_m: z.number(),
    fetched_at: z.string(),
    stale: z.boolean(),
    provenance_url: z.string(),
  }),
  parameters: z.array(
    z.object({
      parameter: z.string(),
      long_name: z.string(),
      unit: z.string(),
      unit_source: z.string(),
      spatial_resolution: z.string(),
      missing_days: z.number().int(),
      latest_available: z.string().nullable(),
      values: z.array(z.object({ observed_at: z.string(), value: z.number().nullable() })),
    }),
  ),
});
export type PowerDaily = z.infer<typeof PowerDailySchema>;

/** Error body for upstream failures: { error: { code, message } }. Validation errors use { detail }. */
export const ApiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
