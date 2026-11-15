# Space Apps 2026 · Project page text (English)

Copy each block into the matching field of the team's **Project** tab on spaceappschallenge.org
(profile → My Team → Project → Edit). All content must be in English. Deadline: **Sunday 15 November 2026,
23:59 Konya local time** — click **Submit for Judging** before then.

Rules checked on 2026-11-15 (Project Submission Guide):
- Demo = max **7 slides** including title (or ≤ 30 s video), English, public link, no login. Exceeding → not eligible for global judging.
- Slides must show team name, team member names and the challenge.
- SI (AI)-generated images/videos need a visible watermark; generated content may not contain NASA branding.
- No images of people under 18.

---

## Project Name

Sat2Soil

## High-Level Project Summary

Sat2Soil is a decision-support web app for the "Field Shift: Adapting Farms with NASA Data" challenge. A farmer draws
a field on a NASA GIBS satellite basemap; Sat2Soil pulls that location's daily NASA POWER record (2004 → today) and
turns it into explainable choices: the FAO-56 crop water demand of each crop, a side-by-side comparison of the current
rotation with an alternative, and a "digital twin" that replays the rest of the season from 20 past seasons (dry /
normal / wet). On the Konya Plain sample field, the alternative barley–chickpea–barley rotation needs about 47% less
crop water over three years than the current sugar beet–wheat–sugar beet cycle. Because a NASA grid cell is regional,
Sat2Soil adds a handheld field device (physical prototype) that will measure soil moisture, temperature, EC and visible
spray coverage inside the field. Every number carries its source, and simulated device data is always labelled.

## Link to Project Demo

https://github.com/yunopo42/Sat2Soil/blob/main/docs/presentation/sat2soil-demo-en.pdf

## Link to Final Project

https://sat2-soil.vercel.app (live app, English and Turkish) · source: https://github.com/yunopo42/Sat2Soil

## Detailed Project Description

**What it does.** Sat2Soil helps a farmer compare crop-rotation strategies by the water they need and the climate they
will meet, field by field.

1. *Field.* Draw or pick a field on a NASA GIBS basemap (HLS S30 / Blue Marble, dated and labelled).
2. *NASA data center.* Daily NASA POWER parameters for the field's grid cell (T2M, T2M_MIN, T2M_MAX, PRECTOTCORR,
   RH2M, WS2M, ALLSKY_SFC_SW_DWN) for 90 days, 12 months or 3 years, with charts, the grid-cell footprint on the map,
   "about this data" notes and CSV download. Sources that are not connected yet (GPM IMERG, SMAP, Landsat, ECOSTRESS,
   SRTM) are shown as "Planned", never as live.
3. *Water management.* FAO-56 Penman–Monteith reference evapotranspiration (ET₀) from POWER, crop coefficients
   (ETc = Kc × ET₀) and a seasonal water balance (ETc − rainfall) per crop. It is an indicator, not an irrigation
   prescription.
4. *Crop rotation.* The field's current three-year plan next to an alternative; both editable and re-scored by the API
   from open rules (no repeated crop, no three cereals in a row, at least one legume, sugar beet at most once in three
   years) plus each crop's water fit in that grid cell.
5. *Digital twin.* The season observed so far plus the rest of the season replayed from 20 past NASA POWER seasons
   in the same grid cell (2004–2026), giving P10 / P50 / P90 outcomes for two crops side by side on a field map with a
   timeline. Scenario estimate: not a forecast, not a yield estimate.
6. *AgriSpray (prototype).* A handheld device designed by our mechatronics team (ESP32-S3, OV5640 macro camera with a
   12-LED ring, SHT45 air sensor, GNSS, 3-pin soil probe for moisture, temperature and EC, BLE + local Wi-Fi for
   offline use). The physical prototype exists but does not send data yet, so the demo shows simulated readings at 7
   measurement points, a synthetic spray-card analysis (coverage, stains/cm², uniformity) and Delta T spraying
   conditions next to real NASA POWER wind — all labelled "Prototype · simulated data". No dose advice, no efficacy %,
   no diagnosis.
7. *Summary.* One page with every result, a methods-and-sources table and an A4 print view.

**Benefits.** Water-aware rotation choices on a plain with falling groundwater; decisions a farmer can check, because
every number names its source, parameter, unit, period and fetch time; a clear line between satellite context and
field measurement.

**What we hope to achieve.** Add GPM IMERG, SMAP, Landsat NDVI and SRTM; let farmers set priorities (water, income,
soil) as weights; calibrate scores with local agronomists; connect the device and build the offline mobile app.

**Tools.** Next.js 16, React 19, TypeScript, Tailwind CSS, MapLibre GL + terra-draw, d3 (web, Vercel) · Python 3.13,
FastAPI, Pydantic (API, Render) · Supabase PostgreSQL + PostGIS · Playwright + axe-core end-to-end and accessibility
tests · SolidWorks (device CAD), ESP32-S3 hardware.

## Use of Super Intelligence (SI)

- Code: written with the help of an AI coding assistant (Claude); all code was reviewed, tested (unit, end-to-end and
  accessibility tests) and is open source.
- Landing animation: generated with an AI video tool; labelled "Concept animation (AI-generated)" on the page.
- Mobile app screens in the demo: AI-generated design mockups; watermarked "Design concept · AI-generated mockup ·
  sample values", NASA insignia removed.
- No AI model makes the agronomic decisions: water balance (FAO-56), rotation rules and scenarios are transparent
  calculations.

## NASA Data

- **NASA POWER** daily API (power.larc.nasa.gov, community AG): T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS2M,
  ALLSKY_SFC_SW_DWN, 2004 → present, fetched live per field and cached for 6 hours.
- **NASA GIBS** WMTS imagery: HLS S30 (Harmonized Landsat Sentinel-2) and Blue Marble as the dated basemap for drawing
  fields.
- Planned and shown as "Planned" in the app: GPM IMERG, SMAP, Landsat NDVI, ECOSTRESS, SRTM.

## Space Agency Partner Data and Other References

- FAO Irrigation and Drainage Paper 56 (Allen et al., 1998): Penman–Monteith ET₀ and crop coefficients.
- Stull (2011), "Wet-bulb temperature from relative humidity and air temperature" (Delta T for spraying conditions).
- **ESA (Space Agency Partner):** Sentinel-2 cloudless 2024 by EOX (contains modified Copernicus Sentinel data) as the
  optional high-resolution basemap for drawing field boundaries.
- OpenStreetMap Nominatim (place search), MapLibre GL JS, terra-draw.
- Open-source libraries listed in `package.json` and `services/api/pyproject.toml`.
- Device CAD and renders: Sat2Soil team. Landing animation and mobile mockups: AI-generated (see SI section).
