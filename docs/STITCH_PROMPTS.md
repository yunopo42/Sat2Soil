# Sat2Soil — Google Stitch sayfa tasarımı promptları

Bu dosya, web arayüzü sayfa tasarımlarını Google Stitch ile üretmek içindir (D-018).
Promptlar İngilizcedir: arayüzün varsayılan dili İngilizce (D-014) ve Stitch İngilizce promptlarla daha tutarlı sonuç verir.
Her prompt kendi başına yeterlidir; stil ve uygulama iskeleti blokları her birinin içinde tekrar edilir.

## Başlamadan önce

1. Stitch'te **tek bir proje** aç ve bütün ekranları onun içinde üret; görsel tutarlılık için önemli.
2. Cihaz türü olarak **Web / Desktop** seç. Mobil web varyantları en sondaki isteğe bağlı prompttadır.
3. Varsa en yüksek kaliteli üretim modunu kullan.
4. Tema ayarı varsa: **Light**, ana renk `#2D7A53`, font Geist (yoksa Inter), köşe yuvarlaklığı orta.
5. Ekranları aşağıdaki ID'lerle adlandır (`P03 Field map` gibi). Zip'i bu adlarla hazırlarsan eşleştirmek kolaylaşır.

**Önerilen üretim sırası:** P03 → P04 → P05 → P06 → P07 → P08 → P09 → P02 → P01.
Uygulama iskeletini (üst bar + sol menü) ilk ekranda oturtmak, sonraki ekranları tutarlı kılar.
Landing (P01) farklı bir görsel katman olduğu için en sona kalır.

## Önemli: tasarımdaki sayılar

Promptlardaki değerler (312 mm, 42.6 ha, %26.2 vb.) **yalnız tasarım örneğidir**, gerçek NASA verisi değildir.
Bu ekran görüntülerini jüri sunumunda gerçek sonuç gibi kullanma. Canlı uygulamada bu alanlar gerçek API verisiyle dolacak.

---

## P03 · Field map dashboard (ilk bunu üret)

```text
Design the main field dashboard of "Sat2Soil", a web app that turns NASA Earth observation data into explainable farm decisions. Desktop, 1440 px wide.

STYLE: Premium, calm, scientific agri-tech product in the spirit of NASA Earth science websites, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53 for field data, decisions and primary buttons; light green #A9D7A9. Navy #0E2240 and #2B4C7E only for NASA- and satellite-sourced data. Amber #B66A28 only for simulated data and warnings. Font: Geist (or Inter) for UI, Geist Mono for numbers, coordinates and data captions. 8 px grid, generous whitespace, 12–16 px corner radius, 1 px borders instead of shadows, thin line icons. Data source badges: "NASA • POWER" (navy dot), "Cached" (hollow dot), "Sample", "Simulated device" (amber with diagonal hatch), "Scenario estimate" (dashed outline), "No data". No dark mode, neon, glassmorphism, card gradients, purple, emoji or stock illustrations.

APP SHELL: Top bar 56 px: "Sat2Soil" wordmark; field selector "Çumra sample field · Konya Plain" with a "Sample" badge; status pill "NASA POWER · synced 14:02" with a navy dot; "Summary" button; EN/TR toggle. Left navigation rail 224 px with line icons: Field, NASA data, Planning (sub-items Water, Rotation), Digital twin, AgriSpray. Active item: "Field".

SCREEN CONTENT:
- Center: a large satellite map of farmland in the Konya Plain, Turkey (patchwork of rectangular fields and a few center-pivot circles). The selected field is a polygon with a 2 px green #2D7A53 outline, 20% green fill and small white vertex handles.
- Floating drawing toolbar at the top-left of the map: Draw polygon, Edit, Delete, Measure (icon buttons with tooltips).
- Collapsible "Layers" panel at the top-right of the map with toggles: "NASA GIBS true colour · HLS · 9 Nov 2026" (navy NASA badge), "High-resolution imagery (non-NASA)", "Field boundary", "Measurement pins", "NASA POWER grid cell".
- Bottom-left of the map: coordinate readout in mono "37.5812° N, 32.7934° E", scale bar, zoom buttons. Bottom-right: small map attribution text.
- Two small amber measurement pins on the field, labelled "Simulated device".
- Right panel 340 px wide: field name "Çumra sample field" with "Sample" badge; Area "42.6 ha · 426 dönüm" (mono); Crop "Winter wheat"; Season "2025–2026"; Irrigation type segmented control (Rainfed, Drip, Sprinkler, Center pivot); "Rotation history" strip with small chips 2022 Wheat, 2023 Sugar beet, 2024 Wheat, 2025 Chickpea; a "NASA data" block saying "NASA POWER · last synced 14 Nov 2026 14:02" with a secondary button "Sync NASA data"; primary button "Save field" at the bottom.
- A small success toast at the bottom of the map: "Field saved".
```

## P04 · NASA data center

```text
Design the "NASA data" page of "Sat2Soil". Desktop, 1440 px wide. Keep the same style and app shell as the field dashboard.

STYLE: Premium, calm, scientific agri-tech product in the spirit of NASA Earth science websites, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53; light green #A9D7A9. Navy #0E2240 and #2B4C7E only for NASA- and satellite-sourced data. Amber #B66A28 only for simulated data and warnings. Font: Geist (or Inter) for UI, Geist Mono for numbers and data captions. 8 px grid, generous whitespace, 12–16 px radius, 1 px borders instead of shadows, thin line icons. Charts look like scientific figures: thin lines, units on both axes, direct labels instead of legends. Every data card ends with a one-line monospace provenance footer in 11 px grey (source · parameter · unit · resolution · period · fetched time). No dark mode, neon, glassmorphism, gradients, purple or emoji.

APP SHELL: Top bar 56 px (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" with "Sample" badge, status pill "NASA POWER · synced 14:02", "Summary" button, EN/TR toggle). Left rail 224 px: Field, NASA data, Planning (Water, Rotation), Digital twin, AgriSpray. Active item: "NASA data".

SCREEN CONTENT:
- Page title "NASA data", subtitle "Climate series for the grid cell that contains your field".
- Filter bar: date range "1 Nov 2025 – 13 Nov 2026"; source select "NASA POWER · Daily"; status pill "Live · fetched 14 Nov 2026 14:02" with a navy dot; "Refresh" button.
- Three metric cards, each with a "NASA • POWER" badge and a provenance footer: Total precipitation "312 mm" (PRECTOTCORR); Mean air temperature "12.1 °C" (T2M); Mean relative humidity "58 %" (RH2M).
- Large chart card: daily air temperature, navy mean line with a light navy min–max band (T2M_MIN / T2M_MAX); x-axis months Nov–Nov, y-axis °C. Footer: "NASA POWER · T2M · °C · daily · grid ≈0.5° × 0.625° · fetched 14:02".
- Second chart card: daily precipitation as thin navy bars (mm/day) with a cumulative precipitation line on a secondary axis (mm).
- Right column: a small map showing the green field polygon inside a much larger navy dashed rectangle labelled "NASA POWER grid cell (≈ 0.5° × 0.625°)", with the caption "Values describe this grid cell, not a point inside your field."
- "About this data" panel: Source NASA POWER (Langley Research Center); Community: Agroclimatology; Parameters T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN; Temporal resolution: daily; Grid centre 37.75° N, 32.81° E; Period; Fetched at; Missing values (−999): 0 days. A text link "How is this data produced?".
```

## P04-S · NASA data states (boş / yükleniyor / önbellek / hata)

```text
In the same Sat2Soil project and style, design a component sheet showing the states of a NASA data chart card, laid out in a 2×2 grid on #F7F9F5, desktop 1440 px:
1) Loading: skeleton card with grey placeholder bars for the title, the chart area and the provenance footer.
2) Cached: the full chart card with a navy-outline banner on top "Showing cached NASA data from 14 Nov 2026 14:02 — the live service is unavailable" and a "Cached · 14:02" badge (hollow navy dot) instead of "NASA • POWER".
3) Error: an empty card with a thin line icon, the text "NASA POWER did not respond. Your field data is safe." and a "Try again" button. No red alarm styling, calm tone.
4) Empty: "No NASA data for this period yet. Choose a date range or sync your field." with a "Sync NASA data" button.
Keep the badge styles: "NASA • POWER" (navy dot), "Cached" (hollow dot), "No data" (grey slashed circle).
```

## P05 · Planning — Water

```text
Design the "Planning — Water" page of "Sat2Soil". Desktop, 1440 px. Same style and app shell as the previous screens.

STYLE: Premium, calm, scientific agri-tech product, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53; light green #A9D7A9. Navy #0E2240 / #2B4C7E only for NASA-sourced data. Amber #B66A28 only for simulated data, deficits and warnings. Geist (or Inter) for UI, Geist Mono for numbers. 8 px grid, generous whitespace, 12–16 px radius, 1 px borders, no shadows, thin line icons. Scientific charts: thin lines, units on axes, direct labels. Observed data = solid navy line; derived values = green; scenario = dashed line with light band. Monospace provenance footer on every data card. No dark mode, neon, gradients, purple or emoji.

APP SHELL: Top bar (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" + "Sample" badge, "NASA POWER · synced 14:02" pill, "Summary" button, EN/TR). Left rail 224 px: Field, NASA data, Planning (Water, Rotation), Digital twin, AgriSpray. Active: Planning > Water. At the top of the content area a segmented control "Water | Rotation" with "Water" selected.

SCREEN CONTENT:
- Header "Water balance — winter wheat" with a season switch "Last complete season (Oct 2024 – Jul 2025)" | "Current season (to date)".
- Plain-language result card at the top: "Last season, rainfall covered about 41% of winter wheat's estimated water demand." Badge "Derived indicator" and a small note "This is not an irrigation prescription."
- Main chart (wide): cumulative rainfall (solid navy, from NASA POWER) versus cumulative crop water demand ETc (green line) from October to July; the gap between them shaded light amber and directly labelled "Climatic water deficit". Axis in mm.
- Four small metric cards in mono: Rainfall "212 mm" (NASA • POWER badge); Reference evapotranspiration ET₀ "470 mm" (Derived badge, "FAO-56 Penman–Monteith"); Crop water demand ETc "517 mm" (Derived); Deficit "−305 mm" (amber).
- A small step chart of the crop coefficient Kc over the season: initial 0.70, mid-season 1.15, late season 0.25.
- "Inputs" card with editable fields: Crop (Winter wheat), Sowing date (15 Oct 2024), Irrigation type (Rainfed).
- Collapsible "How was this calculated?" panel showing 4 numbered steps (NASA POWER daily data → ET₀ with FAO-56 → ETc = Kc × ET₀ → Rainfall − ETc) and an "Assumptions" list.
- Uncertainty note in a quiet grey box: "Climate values describe a ~50 km grid cell. Soil water holding capacity and groundwater are not measured."
- Data quality line: "2 missing days were interpolated."
```

## P06 · Planning — Crop rotation

```text
Design the "Planning — Rotation" page of "Sat2Soil". Desktop, 1440 px. Same style and app shell as the previous screens.

STYLE: Premium, calm, scientific agri-tech product, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53; light green #A9D7A9. Navy #0E2240 / #2B4C7E only for NASA-sourced data. Amber #B66A28 only for warnings. Geist (or Inter) for UI, Geist Mono for numbers. 8 px grid, generous whitespace, 12–16 px radius, 1 px borders, no shadows, thin line icons. No dark mode, neon, gradients, purple or emoji.

APP SHELL: Top bar (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" + "Sample" badge, "NASA POWER · synced 14:02" pill, "Summary" button, EN/TR). Left rail 224 px: Field, NASA data, Planning (Water, Rotation), Digital twin, AgriSpray. Active: Planning > Rotation. Segmented control "Water | Rotation" at the top with "Rotation" selected.

SCREEN CONTENT:
- Left column (about 40%):
  - "Field history" horizontal timeline 2021–2025 with crop chips: Wheat, Sugar beet, Wheat, Chickpea, Wheat; chips use a quiet colour per crop family (cereal, root crop, legume) plus a small text label.
  - "Field conditions" card with three rows, each with a "NASA • POWER" badge: Mean annual rainfall "318 mm"; Growing degree days "2,140 °C·d"; Frost days per year "64".
  - "Your priorities" as selectable chips: "Save water" (selected), "Keep sugar beet", "Market demand".
- Right column (about 60%): two comparison cards side by side, equal height.
  - "Current plan · 2026–2028": Wheat → Sugar beet → Wheat.
  - "Alternative plan · 2026–2028": Wheat → Chickpea → Barley, with a small green "Suggested" tag. Each year slot is a dropdown so the farmer can change the crop.
  - Inside each card: small bars of estimated seasonal water demand per year (mm) and a total in mono ("1,650 mm" vs "1,180 mm"); a "Climate fit" score in mono ("72 / 100" vs "84 / 100") with three thin breakdown bars (Water fit, Heat and frost fit, Rotation rules); a rule checklist with check and cross line icons: "Legume break", "No repeated cereal", "High-water crop in a dry basin".
- Below the cards: "Why this alternative?" panel with three short plain-language reasons and an "Assumptions" link.
- A quiet disclaimer line: "Scores compare plans side by side. They are not yield predictions."
```

## P07 · Digital twin

```text
Design the "Digital twin" page of "Sat2Soil". Desktop, 1440 px. Same style and app shell as the previous screens. The page compares observed field conditions with scenario estimates, and the two must never look alike.

STYLE: Premium, calm, scientific agri-tech product, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53; light green #A9D7A9. Navy #0E2240 / #2B4C7E only for NASA-sourced data. Amber #B66A28 only for warnings. Geist (or Inter) for UI, Geist Mono for numbers. Observed data = solid navy line with the label "Observed · NASA POWER". Scenario = dashed green line with a light green P10–P90 band and the label "Scenario estimate". No dark mode, neon, gradients, purple or emoji.

APP SHELL: Top bar (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" + "Sample" badge, "NASA POWER · synced 14:02" pill, "Summary" button, EN/TR). Left rail 224 px: Field, NASA data, Planning (Water, Rotation), Digital twin, AgriSpray. Active: Digital twin.

SCREEN CONTENT:
- Top: segmented toggle "Current field | Planned scenario" ("Planned scenario" selected).
- Scenario controls row: Crop plan (Current / Alternative); Rainfall scenario chips "Dry year (P10)", "Normal (P50)" selected, "Wet year (P90)" with the caption "Derived from NASA POWER history 2001–2025"; Irrigation (Rainfed / Drip).
- Center: a map of the field. The field polygon is tinted uniformly by the selected month's water balance with a small legend in mm and the label "Field-average estimate — no within-field variation is modelled".
- Under the map: a horizontal timeline scrubber from Oct 2025 to Sep 2026 with a draggable handle on March 2026 and a "Today · 14 Nov" marker. Left of today is labelled "Observed", right of today "Scenario".
- Bottom: two chart cards. (1) "Soil water balance (mm)": solid navy observed line up to today, then a dashed green scenario line with a P10–P90 band. (2) "Cumulative crop water demand": Current plan vs Alternative plan as two lines with direct labels.
- Right column: "Assumptions" panel (sowing dates, Kc values, rainfall scenario source, groundwater not modelled) and a "Snapshot" card (field, crop, area, last NASA sync, "Sample" badge).
```

## P08 · AgriSpray

```text
Design the "AgriSpray" page of "Sat2Soil". Desktop, 1440 px. Same style and app shell as the previous screens. AgriSpray is a future portable field device; today everything here is simulated and must be obviously labelled as such.

STYLE: Premium, calm, scientific agri-tech product, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, secondary surfaces #EFF2EE, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53. Navy #2B4C7E only for NASA-sourced data. Amber #B66A28 with a subtle diagonal hatch pattern marks simulated data. Geist (or Inter) for UI, Geist Mono for numbers. 1 px borders, no shadows, thin line icons. No dark mode, neon, gradients, purple or emoji.

APP SHELL: Top bar (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" + "Sample" badge, "NASA POWER · synced 14:02" pill, "Summary" button, EN/TR). Left rail 224 px: Field, NASA data, Planning (Water, Rotation), Digital twin, AgriSpray. Active: AgriSpray.

SCREEN CONTENT:
- Full-width status banner at the top with an amber outline and a light hatch pattern: "Concept device · Simulated data — no physical device is connected."
- Left column (40%): a large light-grey line-drawing placeholder of a compact handheld field device in exploded view, captioned "Concept by the Sat2Soil mechatronics team". Under it a simple connection diagram "Device → Phone (Bluetooth) → Sat2Soil API" where each link has a "Planned" chip.
- Right column (60%): a 3×2 grid of sensor cards, each with a "Simulated device" badge and a mono footer "SAT2SOIL_CONCEPT_01 · 14 Nov 2026 12:00": Soil moisture "31.4 %", Soil temperature "20.7 °C", Soil EC "0.82 mS/cm", Air temperature "24.0 °C", Relative humidity "48 %", Wind with a "No data" badge.
- Tabs: "Soil measurement | Spray card | Plant tracking" with "Spray card" active and a thin green underline indicator.
- Spray card tab: two images side by side — a photo of a yellow water-sensitive paper card with blue droplet stains, and the same card with a segmentation mask overlay. A secondary button "Run example analysis" with a thin scanning progress line. Results in mono: Coverage "26.2 %", Droplets per cm² "41", Uniformity "Moderate — denser on the left half", all with an "Example calculation" badge.
- Bottom: three report blocks side by side: "Spray quality"; "Environmental suitability" (simulated local readings plus a NASA POWER regional wind trend with a navy badge); "Plant observation" ("Visual before/after comparison — not a disease diagnosis").
- Do not show any pesticide efficacy percentage anywhere.
```

## P09 · Summary

```text
Design the "Summary" page of "Sat2Soil" used for the jury presentation. Desktop, 1440 px, and it should also print well on A4 landscape. Same style as the previous screens.

STYLE: Premium, calm, scientific agri-tech product, not a generic SaaS dashboard. Light theme only. Background #F7F9F5, cards #FFFFFF, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53. Navy #0E2240 / #2B4C7E only for NASA-sourced data. Amber #B66A28 only for simulated data. Geist (or Inter) for UI, Geist Mono for numbers. Generous whitespace, 1 px borders, no shadows. No dark mode, neon, gradients, purple or emoji.

APP SHELL: Top bar (Sat2Soil wordmark, field selector "Çumra sample field · Konya Plain" + "Sample" badge, "NASA POWER · synced 14:02" pill, "Summary" button shown as active, EN/TR). Left rail 224 px collapsed to icons only.

SCREEN CONTENT:
- Header: "Çumra sample field · Konya Plain — Summary", date "14 Nov 2026", "Sample field" badge. Buttons: primary "Show demo flow", secondary "Print / PDF".
- A 3-column grid of compact cards:
  1) Field: satellite thumbnail with the green polygon, "42.6 ha · Winter wheat".
  2) Climate (NASA • POWER): two tiny charts (precipitation, temperature) with provenance footers.
  3) Water: "Rainfall covered about 41% of crop water demand last season." with a mini cumulative chart (Derived badge).
  4) Rotation: Current vs Alternative in two rows — water "1,650 mm" vs "1,180 mm", climate fit "72" vs "84".
  5) Digital twin: "In a dry year (P10) the alternative plan keeps the deficit 28% smaller." (Scenario estimate badge).
  6) AgriSpray concept: "Coverage 26.2 %" with "Simulated device" badge.
- Bottom: "Methods and sources" table with columns Value, Source type (badge), Method, Limitation. Rows for NASA POWER climate (NASA • POWER), ET₀ and water balance (Derived), rotation scores (Derived), scenarios (Scenario estimate), AgriSpray readings (Simulated device), field boundary (Sample).
- Overlay at the bottom center: a small floating pill for the guided demo "Step 3 of 6 · Water balance" with previous/next arrows.
```

## P02 · Demo start

```text
Design the "Start the demo" page of "Sat2Soil". Desktop, 1440 px. There is no login or sign-up.

STYLE: Premium, calm, scientific agri-tech product in the spirit of NASA Earth science websites. Light theme only. Background #F7F9F5, cards #FFFFFF, 1px borders #E6ECE8, text #173B32, secondary text #5A6B64. Primary green #2D7A53; light green #A9D7A9. Navy #0E2240 used sparingly. Geist (or Inter) for UI, Geist Mono for coordinates and numbers. Generous whitespace, 16 px radius, 1 px borders, no shadows, thin line icons. No dark mode, neon, gradients, purple, emoji or stock illustrations.

SCREEN CONTENT:
- Minimal top bar: "Sat2Soil" wordmark, EN/TR toggle, text link "Back to home".
- Centered heading "How would you like to start?" with the subtitle "Pick the sample field to see everything in two clicks, or draw your own field on satellite imagery."
- Two large selectable cards side by side, equal size:
  - "Explore the sample field": a satellite thumbnail of Konya Plain farmland with one field outlined in green; details in mono "Çumra, Konya Plain · 37.58° N, 32.79° E · 42.6 ha · Winter wheat"; a "Sample" badge; primary button "Open sample field". Show this card in its hover state: green 1 px border and a slight 2 px lift.
  - "Draw your own field": a clean, minimal map with a dashed polygon being drawn and vertex dots; text "Draw a boundary on satellite imagery. The area is calculated automatically."; secondary button "Draw a field".
- Below the cards: a three-step strip with small numbers in mono: "01 Choose a field", "02 See NASA data for its location", "03 Compare water and rotation plans".
- Small footnote: "No account needed. Sample and simulated data are always labelled."
```

## P01 · Landing (en son üret)

Not: Stitch statik ekran üretir. Dünya'nın dönmesi, uyduların yörüngesi ve kameranın tarlaya inişi Faz 8'de kodla (three.js) yapılacak.
Buradan istenen, sahnelerin **görsel yönü ve sayfa düzeni**.

```text
Design the marketing landing page of "Sat2Soil" for the NASA Space Apps Challenge 2026. Desktop, 1440 px, one long scrolling page. Tagline: "From Satellite to Soil, From Data to Decisions."

STYLE: Cinematic but restrained, like a NASA Earth Observatory feature article: premium, editorial, scientific. Absolutely no neon, glow, cyberpunk, purple or sci-fi HUD elements. The page starts in deep navy space and becomes a light, airy off-white page as you scroll. Colors: navy #0E2240 and #13294B for space, off-white #F7F9F5 for the rest, white cards, 1 px borders #E6ECE8, text #173B32, secondary text #5A6B64, primary green #2D7A53 for buttons and the field outline. Font: Geist (or Inter) with large, tight headlines; Geist Mono for small eyebrow labels and coordinates. Generous whitespace.

SECTIONS:
1) Hero, full viewport: deep navy space (not pure black) with a few faint static stars. On the right half, a realistic sunlit Earth seen from orbit (NASA Blue Marble look) with a thin, soft blue atmosphere rim. Two small, precise Earth-observation satellites on thin dotted orbit lines. On the left: small mono eyebrow "NASA Space Apps Challenge 2026"; large headline "From Satellite to Soil, From Data to Decisions."; one-line subhead "Clear, explainable decisions for a single field — water, crop rotation and climate fit — built on NASA Earth observation data."; primary button "Start demo" (green) and a ghost button "How it works". Minimal top navigation: Sat2Soil wordmark, How it works, Data sources, EN/TR.
2) Descent: the background fades from navy through a pale sky blue into off-white. A top-down satellite view of farmland in the Konya Plain with one field outlined in green, with mono coordinates "37.58° N, 32.79° E". A cropped preview of the Sat2Soil app overlaps it: a white map panel with the green field polygon and a small "NASA • POWER" rainfall chart card with a monospace provenance footer.
3) Three value cards on off-white: "NASA data, clearly labelled", "Water and crop rotation", "Field measurement concept" (AgriSpray, marked "Simulated").
4) "How it works": three numbered steps — Choose a field → See NASA data for its location → Compare water and rotation plans.
5) "Data you can trust": a clean list of sources with honest status chips — NASA POWER · Live; GPM IMERG · Planned; Landsat / HLS · Planned; AgriSpray device · Simulated concept — and the note "Satellite and model data describe a grid cell, not a point measurement inside your field."
6) Footer: Sat2Soil, NASA Space Apps Challenge 2026, team, data attribution ("Data: NASA POWER, NASA GIBS"). Do not use the NASA logo or insignia.
```

## İsteğe bağlı · Mobil web varyantları (390 px)

```text
In the same Sat2Soil project and style, create mobile web versions (390 px wide) of three screens: Landing hero, Field map dashboard and NASA data. On mobile, the left rail becomes a bottom tab bar with icons and labels (Field, NASA, Planning, AgriSpray, More); the field details panel becomes a draggable bottom sheet over a full-screen map; cards stack in a single column; touch targets are at least 44 px; no horizontal scrolling.
```

---

## Düzeltme promptları (ekran üretildikten sonra)

Sonuç beğenilmezse ekranı silme; Stitch'te aynı ekran üzerinde **tek seferde tek değişiklik** isteyen kısa promptlar daha iyi çalışır:

```text
Remove all shadows and gradients; separate surfaces with 1 px #E6ECE8 borders only.
```
```text
Replace the chart legends with direct labels at the end of each line.
```
```text
Set every number, unit and coordinate in Geist Mono with tabular figures.
```
```text
Make the provenance footer of each data card a single line of 11 px grey monospace text.
```
```text
Use navy only for NASA-sourced data; switch any other navy elements to the neutral text colour.
```
```text
Reduce icon usage: keep icons only in the navigation rail and the map toolbar.
```
```text
Increase the vertical spacing between sections to 48–64 px and reduce the number of visible cards.
```

## Bana nasıl göndereceksin

Her ekran için Stitch'ten şunları dışa aktar:
- **PNG** (tam ekran görüntüsü) — zorunlu
- **Kod (HTML)** — varsa
- **Figma** — isteğe bağlı

Zip yapısı:

```text
sat2soil-stitch.zip
├── P01-landing/        screen.png · code.html
├── P02-demo-start/
├── P03-field-map/
├── P04-nasa-data/
├── P04S-nasa-states/
├── P05-water/
├── P06-rotation/
├── P07-digital-twin/
├── P08-agrispray/
├── P09-summary/
└── notes.txt           (isteğe bağlı: beğendiğin / değişmesini istediğin şeyler)
```

Zip gelince yapacaklarım:
1. Dosyaları `docs/design/stitch/` altına koyacağım.
2. Tasarımları kurallarımıza göre inceleyeceğim: veri etiketleri, renk kontrastı, gerçek veri ile simülenin ayrımı, erişilebilirlik.
   Uyuşmayan yerleri sana liste olarak getireceğim.
3. Renk, tipografi ve boşluk değerlerini çıkarıp tasarım sistemine işleyeceğim.
4. Stitch'in HTML kodunu **doğrudan kopyalamayacağım**. O kod görsel referans olarak kullanılacak; sayfalar bizim bileşenlerimiz,
   EN/TR metin dosyalarımız ve erişilebilirlik kurallarımızla yeniden yazılacak.
