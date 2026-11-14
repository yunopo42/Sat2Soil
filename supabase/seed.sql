-- Sat2Soil · shared sample data (D-013). Idempotent: safe to run again.
-- The boundary traces a real parcel in the Konya Plain (≈37.621 N, 32.854 E), segmented from
-- Sentinel-2 cloudless imagery (EOX, 10 m) and checked against NASA GIBS HLS S30 (2026-10-24).
-- Crop history and irrigation are SAMPLE values for the demo, not the parcel's real history.
-- Crops use catalogue codes; the web app translates them (apps/web/messages → crops.*).

insert into public.demo_workspaces (id, kind)
values ('00000000-0000-4000-8000-000000000001', 'seed')
on conflict (id) do nothing;

insert into public.fields (id, workspace_id, name, boundary, crop, irrigation_type, is_sample)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Konya Ovası · Örnek Parsel',
  extensions.st_setsrid(extensions.st_geomfromgeojson('{
    "type": "Polygon",
    "coordinates": [[
      [32.853842, 37.622118],
      [32.856503, 37.620554],
      [32.855558, 37.619330],
      [32.852554, 37.621030],
      [32.853842, 37.622118]
    ]]
  }'), 4326),
  'winter_wheat',
  'sprinkler',
  true
)
on conflict (id) do update set
  name = excluded.name,
  boundary = excluded.boundary,
  crop = excluded.crop,
  irrigation_type = excluded.irrigation_type,
  is_sample = true;

delete from public.crop_seasons where field_id = '00000000-0000-4000-8000-000000000101';
insert into public.crop_seasons (field_id, season_year, crop) values
  ('00000000-0000-4000-8000-000000000101', 2021, 'winter_wheat'),
  ('00000000-0000-4000-8000-000000000101', 2022, 'sugar_beet'),
  ('00000000-0000-4000-8000-000000000101', 2023, 'winter_wheat'),
  ('00000000-0000-4000-8000-000000000101', 2024, 'sugar_beet'),
  ('00000000-0000-4000-8000-000000000101', 2025, 'winter_wheat');
