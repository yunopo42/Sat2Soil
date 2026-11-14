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

const DataSourceRefSchema = z.object({
  name: z.string(),
  product: z.string(),
  parameters: z.array(z.string()),
  grid_cell: z.string(),
  fetched_at: z.string(),
  source_type: DataSourceSchema,
});

export const CropParamsSchema = z.object({
  code: z.string(),
  family: z.string(),
  kc_ini: z.number(),
  kc_mid: z.number(),
  kc_end: z.number(),
  stages: z.array(z.number()),
  sowing_month: z.number(),
  sowing_day: z.number(),
  season_days: z.number(),
  suggestible: z.boolean(),
});
export type CropParams = z.infer<typeof CropParamsSchema>;

export const WaterBalanceSchema = z.object({
  field_id: z.string(),
  crop: z.string(),
  season: z.enum(["last", "current"]),
  status: z.enum(["ok", "season_not_active"]),
  source_type: DataSourceSchema,
  method: z.string(),
  sowing: z.string().nullable(),
  harvest: z.string().nullable(),
  covered_until: z.string().nullable(),
  missing_days: z.number(),
  totals: z
    .object({
      precip_mm: z.number(),
      et0_mm: z.number(),
      etc_mm: z.number(),
      deficit_mm: z.number(),
      coverage_pct: z.number().nullable(),
    })
    .nullable(),
  days: z.array(
    z.object({
      date: z.string(),
      kc: z.number(),
      et0: z.number().nullable(),
      etc: z.number().nullable(),
      precip: z.number().nullable(),
    }),
  ),
  crop_params: CropParamsSchema,
  data_sources: z.array(DataSourceRefSchema),
  assumptions: z.array(z.string()),
  uncertainty_note: z.string(),
});
export type WaterBalance = z.infer<typeof WaterBalanceSchema>;

const PlanSchema = z.object({
  label: z.enum(["current", "suggested", "custom"]),
  crops: z.array(z.string()),
  years: z.array(
    z.object({
      year: z.number(),
      crop: z.string(),
      etc_mm: z.number().nullable(),
      precip_mm: z.number().nullable(),
      coverage_pct: z.number().nullable(),
    }),
  ),
  total_etc_mm: z.number(),
  total_precip_mm: z.number(),
  water_score: z.number(),
  rules_score: z.number(),
  score: z.number(),
  rules: z.array(z.object({ code: z.string(), passed: z.boolean(), years: z.array(z.number()) })),
});
export type Plan = z.infer<typeof PlanSchema>;

export const RotationSchema = z.object({
  field_id: z.string(),
  source_type: DataSourceSchema,
  method: z.string(),
  weights: z.record(z.string(), z.number()),
  history: z.array(z.object({ season_year: z.number(), crop: z.string() })),
  conditions: z.object({
    annual_precip_mm: z.number().nullable(),
    mean_temp_c: z.number().nullable(),
    frost_days: z.number(),
    start: z.string(),
    end: z.string(),
    source_type: DataSourceSchema,
  }),
  crops: z.array(
    z.object({
      code: z.string(),
      family: z.string(),
      season_start: z.string(),
      season_end: z.string(),
      etc_mm: z.number(),
      precip_mm: z.number(),
      coverage_pct: z.number().nullable(),
    }),
  ),
  plans: z.array(PlanSchema),
  data_sources: z.array(DataSourceRefSchema),
  assumptions: z.array(z.string()),
  uncertainty_note: z.string(),
});
export type Rotation = z.infer<typeof RotationSchema>;

/** One past season replayed for the rest of this season (D-026). */
const TwinOutcomeSchema = z.object({
  sowing_year: z.number(),
  precip_mm: z.number(),
  etc_mm: z.number(),
  deficit_mm: z.number(),
  coverage_pct: z.number().nullable(),
});
export type TwinOutcome = z.infer<typeof TwinOutcomeSchema>;

export const TWIN_RAIN_SCENARIOS = ["dry", "normal", "wet"] as const;
export type TwinRainScenario = (typeof TWIN_RAIN_SCENARIOS)[number];

const TwinScenarioSchema = z.object({
  key: z.enum(["a", "b"]),
  plan: z.enum(["current", "suggested", "custom"]),
  crop: z.string(),
  status: z.enum(["ok", "no_history"]),
  sowing: z.string().nullable(),
  harvest: z.string().nullable(),
  in_season: z.boolean(),
  observed_until: z.string().nullable(),
  observed_precip_mm: z.number().nullable(),
  observed_etc_mm: z.number().nullable(),
  observed_missing_days: z.number(),
  analog_count: z.number(),
  outcomes: z.partialRecord(z.enum(TWIN_RAIN_SCENARIOS), TwinOutcomeSchema),
  days: z.array(
    z.object({
      date: z.string(),
      kc: z.number(),
      observed: z.boolean(),
      balance_mm: z.number().nullable(),
      p10: z.number().nullable(),
      p50: z.number().nullable(),
      p90: z.number().nullable(),
      etc_cum_mm: z.number(),
    }),
  ),
});
export type TwinScenario = z.infer<typeof TwinScenarioSchema>;

export const TwinSchema = z.object({
  field_id: z.string(),
  source_type: DataSourceSchema,
  observed_source_type: DataSourceSchema,
  method: z.string(),
  latest_observed: z.string(),
  history_start: z.string(),
  history_end: z.string(),
  scenarios: z.array(TwinScenarioSchema),
  data_sources: z.array(DataSourceRefSchema),
  assumptions: z.array(z.string()),
  uncertainty_note: z.string(),
});
export type Twin = z.infer<typeof TwinSchema>;

/** AgriSpray concept (D-027): every device and card value is simulated, computation_kind = mock. */
const CheckStatusSchema = z.enum(["within", "caution", "outside", "unknown"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const AgriSpraySchema = z.object({
  field_id: z.string(),
  source_type: DataSourceSchema,
  computation_kind: z.literal("mock"),
  device: z.object({
    device_id: z.string(),
    status: z.literal("concept"),
    connected: z.literal(false),
    source_type: DataSourceSchema,
    computation_kind: z.literal("mock"),
    recorded_at: z.string(),
    readings: z.object({
      soil_moisture_pct: z.number().nullable(),
      soil_temp_c: z.number().nullable(),
      soil_ec_ds_m: z.number().nullable(),
      air_temp_c: z.number().nullable(),
      air_rh_pct: z.number().nullable(),
      wind_ms: z.number().nullable(),
    }),
    history: z.array(z.object({ at: z.string(), soil_moisture_pct: z.number(), soil_temp_c: z.number() })),
    quality_note: z.string(),
  }),
  checks: z.array(
    z.object({
      code: z.string(),
      status: CheckStatusSchema,
      value: z.number().nullable(),
      unit: z.string(),
      source_type: DataSourceSchema,
    }),
  ),
  regional: z
    .object({
      source_type: DataSourceSchema,
      start: z.string(),
      end: z.string(),
      mean_wind_ms: z.number().nullable(),
      max_wind_ms: z.number().nullable(),
      windy_days: z.number(),
      windy_threshold_ms: z.number(),
      days: z.array(
        z.object({
          date: z.string(),
          wind_ms: z.number().nullable(),
          tmax_c: z.number().nullable(),
          rh_pct: z.number().nullable(),
          precip_mm: z.number().nullable(),
        }),
      ),
    })
    .nullable(),
  plant_log: z.array(
    z.object({
      date: z.string(),
      stage: z.enum(["before", "after"]),
      plant_tag: z.string(),
      leaves_checked: z.number(),
      leaves_with_spots: z.number(),
    }),
  ),
  data_sources: z.array(DataSourceRefSchema),
  assumptions: z.array(z.string()),
  uncertainty_note: z.string(),
});
export type AgriSpray = z.infer<typeof AgriSpraySchema>;

export const SPRAY_CARD_VARIANTS = ["even", "uneven", "sparse"] as const;
export type SprayCardVariant = (typeof SPRAY_CARD_VARIANTS)[number];

export const SprayCardSchema = z.object({
  variant: z.enum(SPRAY_CARD_VARIANTS),
  source_type: DataSourceSchema,
  computation_kind: z.literal("mock"),
  image_kind: z.literal("synthetic"),
  method: z.string(),
  card_mm: z.tuple([z.number(), z.number()]),
  resolution_mm: z.number(),
  generated_stains: z.number(),
  stains: z.array(z.object({ x: z.number(), y: z.number(), d: z.number() })),
  coverage_pct: z.number(),
  regions: z.number(),
  regions_per_cm2: z.number(),
  zone_coverage: z.array(z.array(z.number())),
  uniformity_cv_pct: z.number(),
  uniformity: z.enum(["even", "moderate", "uneven"]),
  denser_side: z.enum(["left", "right"]).nullable(),
  left_coverage_pct: z.number(),
  right_coverage_pct: z.number(),
  histogram: z.array(z.object({ from_um: z.number(), to_um: z.number().nullable(), count: z.number() })),
  mask_png: z.string().startsWith("data:image/png;base64,"),
  assumptions: z.array(z.string()),
});
export type SprayCard = z.infer<typeof SprayCardSchema>;
