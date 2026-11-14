// MapLibre GL 6 loads its web worker from a URL next to its own module file. Bundlers (Turbopack)
// do not emit that file, so we serve the installed version's worker from /vendor and point
// MapLibre at it with setWorkerUrl() (see src/components/map/field-map.tsx).
// Runs before `next dev` and `next build`, so the copy always matches node_modules.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const source = join(dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
const target = join(root, "public", "vendor", "maplibre-gl-worker.mjs");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("maplibre worker → public/vendor/maplibre-gl-worker.mjs");
