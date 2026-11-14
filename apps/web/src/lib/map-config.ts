import type { StyleSpecification } from "maplibre-gl";

/**
 * Basemaps (D-015). NASA first: GIBS Blue Marble for context under a dated HLS true-colour scene.
 * HLS is a daily product, so a cloud-free day over the Konya Plain was picked by inspecting tiles
 * (S30, 2026-10-24). Sentinel-2 cloudless (EOX, 10 m, not NASA) is offered for precise drawing.
 */
export const GIBS_HLS_DATE = "2026-10-24";
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const SAMPLE_VIEW = { center: [32.8546, 37.6208] as [number, number], zoom: 14.2 };

export type Basemap = "nasa" | "s2";

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    bluemarble: {
      type: "raster",
      tiles: [`${GIBS}/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`],
      tileSize: 256,
      maxzoom: 8,
      attribution: "NASA Blue Marble · GIBS",
    },
    hls: {
      type: "raster",
      tiles: [
        `${GIBS}/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${GIBS_HLS_DATE}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,
      ],
      tileSize: 256,
      maxzoom: 12,
      attribution: `NASA GIBS · HLS S30 · ${GIBS_HLS_DATE}`,
    },
    s2: {
      type: "raster",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 15,
      attribution:
        'Sentinel-2 cloudless 2024 by <a href="https://s2maps.eu" target="_blank" rel="noreferrer">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data 2024)',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0b1f3a" } },
    { id: "bluemarble", type: "raster", source: "bluemarble" },
    { id: "hls", type: "raster", source: "hls" },
    { id: "s2", type: "raster", source: "s2", layout: { visibility: "none" } },
  ],
};

export const BASEMAP_LAYERS: Record<Basemap, string[]> = {
  nasa: ["bluemarble", "hls"],
  s2: ["s2"],
};
