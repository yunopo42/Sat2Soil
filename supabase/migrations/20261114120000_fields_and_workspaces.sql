-- Sat2Soil · phase 3 · PostGIS, demo workspaces, fields, crop seasons
-- supabase/task.md D01–D04, D10–D12 · docs/DECISIONS.md D-002, D-008, D-009

create extension if not exists postgis with schema extensions;

-- A workspace scopes every write. "seed" = the shared, read-only sample data.
-- "visitor" = one per demo session, so one visitor can never change another's fields.
create table public.demo_workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('seed', 'visitor')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint demo_workspaces_visitor_expires check (kind = 'seed' or expires_at is not null)
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.demo_workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- EPSG:4326, lon/lat order (GeoJSON). Area and perimeter are geodesic (geography), never planar.
  boundary extensions.geometry (polygon, 4326) not null,
  centroid extensions.geometry (point, 4326)
    generated always as (extensions.st_centroid(boundary)) stored,
  area_ha double precision
    generated always as (extensions.st_area(boundary::extensions.geography) / 10000.0) stored,
  perimeter_m double precision
    generated always as (extensions.st_perimeter(boundary::extensions.geography)) stored,
  crop text check (crop is null or char_length(crop) between 1 and 40),
  irrigation_type text check (
    irrigation_type is null
    or irrigation_type in ('rainfed', 'drip', 'sprinkler', 'center_pivot', 'furrow')
  ),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fields_boundary_valid check (extensions.st_isvalid(boundary)),
  constraint fields_boundary_size check (
    extensions.st_npoints(boundary) between 4 and 501
  )
);

create table public.crop_seasons (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields (id) on delete cascade,
  season_year integer not null check (season_year between 1990 and 2100),
  crop text not null check (char_length(crop) between 1 and 40),
  notes text check (notes is null or char_length(notes) <= 280),
  unique (field_id, season_year)
);

create index fields_boundary_gist on public.fields using gist (boundary);
create index fields_workspace_idx on public.fields (workspace_id);
create index crop_seasons_field_idx on public.crop_seasons (field_id, season_year);
create index demo_workspaces_expiry_idx on public.demo_workspaces (expires_at) where kind = 'visitor';

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger fields_touch_updated_at
before update on public.fields
for each row execute function public.touch_updated_at();

-- D11: default deny. No policies on purpose: the browser never talks to the database (D-008).
-- Only the API's server-side connection, which owns these tables, can read and write.
alter table public.demo_workspaces enable row level security;
alter table public.fields enable row level security;
alter table public.crop_seasons enable row level security;

revoke all on public.demo_workspaces, public.fields, public.crop_seasons from anon, authenticated;
