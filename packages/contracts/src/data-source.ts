import { z } from "zod";

/**
 * Canonical provenance of every value shown in Sat2Soil (docs/DECISIONS.md D-001).
 *
 * Mirrored by `services/api/app/models/data_source.py`; a pytest keeps both lists identical.
 * UI labels live in `apps/web/messages/{en,tr}.json` under `dataSource.<value>`.
 */
export const DATA_SOURCES = [
  "live_nasa",
  "cached_nasa",
  "demo_sample",
  "manual_user",
  "simulated_device",
  "derived_indicator",
  "scenario_estimate",
  "unavailable",
] as const;

export const DataSourceSchema = z.enum(DATA_SOURCES);

export type DataSource = z.infer<typeof DataSourceSchema>;

/** Sources that originate from a NASA product (live request or our cache of one). */
export const NASA_DATA_SOURCES = ["live_nasa", "cached_nasa"] as const satisfies readonly DataSource[];

/**
 * Reserved for readings from a real AgriSpray device. Not part of the MVP contract:
 * it must never be emitted or rendered until real device integration exists.
 */
export const RESERVED_DATA_SOURCES = ["actual_device_future"] as const;
