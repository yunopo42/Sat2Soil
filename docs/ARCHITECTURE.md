# Sat2Soil — Uygulama mimarisi & sözleşmeler

## Bileşenler
- `apps/web`: Next.js App Router, TypeScript, Tailwind, MapLibre, Motion for React, grafik kütüphanesi.
- `services/api`: FastAPI/Python; NASA adaptörleri, tarla domain servisleri, hesap motorları, demo güvenliği; Render.
- `supabase`: PostgreSQL/PostGIS; Supabase Storage görsel örnekleri; migrations.
- `apps/mobile`: şu an yalnız tasarım / tıklanabilir prototype, API kullanımının gelecek sözleşmesi.
- `packages/contracts`: JSON Schema + OpenAPI'den türetilmiş TypeScript tipleri. Tek alan/birim adlandırması.

## Veri akışı
`Next.js UI → FastAPI /v1 → (NASA POWER adaptörü + önbellek) → Supabase/PostGIS → analiz motoru → API → grafik/senaryo kartı`.
AgriSpray `simulated_device` JSON → API → DB → web ekranı. Gelecek gerçek cihazdan veri almak için aynı sözleşmede `device_measured` kaynak türü ayrılabilir; şimdilik kullanma.

## Veri sözleşmesi örnek alanları
`Field {id, demo_workspace_id, name, boundary_geojson, centroid, area_ha, crop_current, rotation_history[]}`
`Observation {id, field_id, source_name, source_type, product, parameter, value, unit, observed_at, fetched_at, lat, lon, spatial_resolution, is_missing, provenance_url}`
`Scenario {id, field_id, title, crop_sequence[], assumptions{}, calculation_method, result{}, uncertainty_note, source_ids[]}`
`DeviceSample {id, field_id, source_type:'simulated_device', recorded_at, soil_moisture_pct?, soil_temp_c?, soil_ec_ms_cm?, air_temp_c?, air_rh_pct?, wind_ms?, image_id?}`
`SprayCardAnalysis {id, sample_id, image_uri, coverage_pct?, marks_per_cm2?, uniformity_note, image_quality, computation_kind:'mock'|'opencv', disclaimer}`

## API taslağı
- `GET /health`, `GET /v1/demo/fields`, `POST /v1/demo/session`
- `GET /v1/fields`, `POST /v1/fields`, `GET /v1/fields/{id}`, `PATCH /v1/fields/{id}`
- `POST /v1/fields/{id}/nasa/sync`, `GET /v1/fields/{id}/observations?source=POWER`
- `GET /v1/fields/{id}/water-summary`, `POST /v1/fields/{id}/scenarios`, `GET /v1/fields/{id}/scenarios`
- `GET /v1/fields/{id}/device-samples`, `GET /v1/fields/{id}/spray-report`
- P1: `POST /v1/spray-cards/analyze` (gerçek görüntü validasyonundan sonra).

## Güvenlik / demo modu
- Gerçek kullanıcı hesabı yok ama **anonim yazmayı açık bırakma**. Sunucu tarafından imzalı, süresi kısa bir demo oturumu; her veri kaydında workspace id; RBAC veya RLS/server-side scope kontrolü, rate limit ve CORS allowlist.
- Supabase `service_role` yalnız backend secret. Browser tarafında asla kullanma. RLS açık/deny by default; demo yazma endpointlerinden yetki denetimi. Seed demo veri setini koru, istersen kullanıcıya kopya çalışma alanı ver.
- API anahtarları, parolalar, service role, ENV üretim değerleri Git'e konmaz; `.env.example` sadece değişken adları.
- Örnek env isimleri: `NEXT_PUBLIC_API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (sunucu), `DATABASE_URL` (sunucu), `DEMO_SESSION_SECRET`, `CORS_ORIGINS`, `NASA_POWER_BASE_URL`.

## Altyapı
- Web → Vercel preview+prod. Backend → Render Web Service; `/health`, runtime logs; DB → Supabase.
- Asenkron NASA request timeout/retry/backoff; TTL cache + son başarılı sonuç. Aynı NASA grid hücresine gereksiz çok istek atma.
- Python hesap motoru ayrı servis/fonksiyon: `water`, `rotation`, `digital_twin`, `spray`.
- Üretim kayıtları: oturum ID (kişisel veri olmadan), request ID, hata kodu; ham hassas verileri loglama.
