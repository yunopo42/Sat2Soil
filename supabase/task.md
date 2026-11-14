# Sat2Soil — Supabase / PostGIS TASK.md

- [ ] D01 Proje/DB oluştur, prod ve demo/preview ortamlarını ayır; extension PostGIS kur.
- [ ] D02 `demo_workspaces` (id, expires_at, created_at); seed workspace read-only, ziyaretçiler için scoped kopya.
- [ ] D03 `fields`: id, workspace_id, name, boundary geometry(Polygon,4326), centroid, area_ha derived, crop, irrigation_type.
- [ ] D04 `crop_seasons`: field_id, season_year, crop_code, notes.
- [ ] D05 `nasa_observations`: field_id, source, product, parameter, unit, value, valid_time, retrieved_at, spatial_resolution, provenance URL, data_status.
- [ ] D06 `scenario_runs`: field_id, inputs JSONB, method, result JSONB, uncertainty, created_at.
- [ ] D07 `device_samples`: field_id, timestamp, source_type, moisture/temp/EC/air fields, location point, data_quality; başlangıçta yalnız `simulated_device`.
- [ ] D08 `spray_sessions`, `spray_card_images`, `plant_images`, `spray_reports` (metadata ve source_type).
- [ ] D09 Storage bucket: demo kart/yaprak görselleri; boyut ve MIME sınırlaması; public/temporary URL politikası.
- [ ] D10 Index: fields geometry GIST, observation(field_id, source, valid_time), workspace owner; foreign keys, on-delete.
- [ ] D11 RLS default-deny; bütün DB erişimi API scope kontrolünden geçsin; service_role asla frontend'e açılmasın.
- [ ] D12 Geospatial test: EPSG4326 lon-lat, hektar ST_Area(geography), polygon validity/area tolerans.
- [ ] D13 Migration + seed scripts versiyonlanmış; temiz ortamda sıfırdan tekrar kurulabilmeli.
- [ ] D14 Demo verisini silme/bozma koruması, backup/restore planı, secrets review.
