# CLAUDE.md — Sat2Soil

> **Durum: v0.9 · 2026-11-15** — Faz 0–9 tamam (MVP). Kararlar D-001…D-029, `docs/DECISIONS.md`.
> Kararların tamamı `docs/DECISIONS.md` içinde; bu dosya onların kısa özetidir.

**Sat2Soil** — NASA Space Apps Challenge 2026.
*From Satellite to Soil, From Data to Decisions.* · *Uydudan tarlana, veriden karara.*

NASA Dünya gözlem verilerini tarla ölçeğinde **açıklanabilir** karar desteğine çevirir: su yönetimi, ürün rotasyonu,
iklim uyumu, toprak sağlığı, dijital ikiz senaryoları ve AgriSpray (simüle) ilaçlama analizi.
Öncelik: **canlı web uygulaması**. Mobil = şimdilik kapsam dışı (D-016). Fiziksel cihaz = mekatronik ekibin konsepti (yazılım yok).
Demo tarlası: **Konya Ovası** (D-013). Arayüz dili: **İngilizce varsayılan + Türkçe** (D-014).

---

## 1. Bilgi kaynakları

Öncelik sırası (çelişkide üstteki geçerli): `docs/DECISIONS.md` → bu dosya → aşağıdaki belgeler.

| Dosya | Ne için |
|---|---|
| `TASK_MASTER.md` | G0–G7 P0 kapıları, sprint izleme |
| `docs/PRODUCT_SCOPE.md` | Kapsam, P0/P1/P2, 3 dk jüri akışı |
| `docs/UI_UX_DESIGN.md` | Sayfa sayfa tasarım, palet, motion tokenları |
| `docs/ARCHITECTURE.md` | Bileşenler, veri sözleşmeleri, API taslağı, güvenlik |
| `docs/NASA_DATA.md` | POWER (P0), GPM/Landsat (P1), SMAP/ECOSTRESS/SRTM (P2) |
| `docs/ANALYSIS_AI.md` | Su, rotasyon, dijital ikiz, AgriSpray motorları; kaynak enum'u |
| `docs/QA_DEPLOY_DEMO.md` | Canlıya alma checklist'i, dürüst beyan kuralları |
| `apps/web/task.md` | Web fazları W00–W06 + Definition of Done |
| `services/api/task.md` | Backend B01–B17 |
| `supabase/task.md` | Şema D01–D14 |
| `apps/mobile/task.md` | Mobil tasarım M0–M3 (ertelendi) |
| `docs/DECISIONS.md` | Belgeler arası çelişkilerin çözümü (ADR kayıtları) |
| `docs/STITCH_PROMPTS.md` | Google Stitch sayfa tasarımı promptları (D-018) |
| `docs/design/stitch/` | Kullanıcının yüklediği Stitch ekranları — görsel referans, kopyalanacak kod değil |

## 2. Değişmez kurallar

1. **Veri dürüstlüğü.** Gerçek, önbellek, örnek, simüle, türetilmiş ve senaryo verisi hiçbir ekranda karışmaz. Her veri
   kartında kaynak rozeti + künye (kaynak, parametre, birim, dönem, çözünürlük, getirilme zamanı) bulunur.
2. **Kanıtsız "canlı" yok.** Bir NASA kaynağı yalnız production'da çalıştığı doğrulanınca "canlı" etiketlenir.
   POWER `PRECTOTCORR` asla GPM/IMERG diye gösterilmez. Sahte NDVI katmanı üretilmez.
3. **Sahte kesinlik yok.** Litre bazlı sulama reçetesi, verim tahmini, ilaç etkinliği %, hastalık teşhisi üretilmez.
   POWER değeri bir grid hücresini temsil eder, tarla içi ölçüm değildir — UI bunu söyler.
4. **AgriSpray her yerde `Konsept cihaz · Simüle veri`.** `source_type=simulated_device`, `computation_kind=mock`.
5. **Secret yok.** Gerçek anahtar/parola/URL commit edilmez, uydurulmaz. `.env.example` yalnız değişken adlarını içerir.
   `SUPABASE_SERVICE_ROLE_KEY` yalnız backend'de yaşar; tarayıcı Supabase'e doğrudan bağlanmaz.
6. **NASA logosu/insignia kullanılmaz.** "NASA estetiği" = tipografi, düzen, renk disiplini. Veri kaynakları
   metinle atıflanır (`NASA • POWER`).
7. **Özellik şişmesi yok.** P1/P2 maddeleri kullanıcı onayı olmadan başlamaz. Login/register yok.

## 3. Çalışma protokolü

- Kullanıcıyla **Türkçe** iletişim. Kod, değişken ve commit mesajları İngilizce.
- UI metinleri yalnız `apps/web/messages/{en,tr}.json` içinde (next-intl). **EN varsayılan**, TR ikinci dil; bileşende sabit metin yok.
- Adım adım ilerle. Her büyük faz sonunda: **ne yapıldı · hangi dosyalar · ne çalışıyor · ne eksik → onay iste.**
- Repo: `origin` → `https://github.com/yunopo42/Sat2Soil.git`, dal `main`.
- **Her faz sonunda (kullanıcı kararı, 2026-11-15):** `pnpm check` + `pnpm build` geçince commit **ve push** yap,
  `docs/HANDOFF.md`'yi güncelle ve kullanıcıya başka bir Claude hesabından devam edebileceği hazır promptu ver.
- Başka bir hesaptan/oturumdan başlıyorsan önce `docs/HANDOFF.md`, sonra bu dosya ve `docs/DECISIONS.md`'yi oku.
- Supabase, Vercel, Render bağlantılarını ve tüm env değerlerini **kullanıcı yapar.**
  Claude gereken değişkenleri ve adımları yazar, bağlantıyı kendisi kurmaya çalışmaz.
- Mevcut dosya yapısını sebepsiz değiştirme. Alan `task.md` dosyaları kendi klasörlerinde kalır.
- "Tamamlandı" = `apps/web/task.md` Definition of Done (merge + local & prod kontrol + kanıt + doğru etiket + akış çalışır).
  Görsel mockup çalışan NASA API'sinin yerine geçmez.

## 4. Teknoloji

| Katman | Seçim |
|---|---|
| Web | Next.js 16.4 (App Router, Turbopack, `cacheComponents`) · React 19.3 · TypeScript 5.9 · Tailwind CSS 4.3 · Vercel |
| Motion | Motion for React (`motion/react`); basit hover/focus CSS |
| Landing | Videodan kaydırmayla oynatılan WebP kare dizisi (canvas) — yalnız `/` (D-028); three.js kullanılmadı |
| Harita | MapLibre GL JS + react-map-gl · çizim: terra-draw · önizleme alanı: turf |
| Uydu altlık | Önce NASA GIBS (tarihli, etiketli); gerekirse çizim için yüksek çözünürlüklü ikinci altlık (D-015) |
| i18n | next-intl · EN varsayılan, TR (D-014) |
| Grafik | d3-scale + d3-shape ile kendi SVG bileşenlerimiz (`components/charts`); visx yerine — tam kontrol, az bağımlılık |
| Veri | TanStack Query · Zod · `packages/contracts` (OpenAPI'den üretilen tipler) |
| UI primitive | Radix Primitives + kendi tokenlarımız (hazır tema yok) · ikon: Phosphor |
| API | Python 3.13 · FastAPI · Pydantic v2 + pydantic-settings · uv · Render (sonraki fazlarda: httpx/tenacity, psycopg 3, PyJWT, slowapi) |
| DB | Supabase PostgreSQL + PostGIS · Supabase Storage · migration: `supabase/migrations` (tek kaynak) |
| Test | Vitest · pytest (+ httpx2 TestClient) · uçtan uca: Python Playwright + axe-core (`e2e/`, D-029) |
| Monorepo | pnpm 12 workspaces (Turborepo yok) · Node ≥ 24 |

### Next.js 16 kuralları (eğitim verisinden farklı!)

- Next kodu yazmadan önce ilgili rehberi `apps/web/node_modules/next/dist/docs/` içinden oku.
- `middleware.ts` yok → **`src/proxy.ts`**. Tailwind, PostCSS ile değil `@tailwindcss/turbopack` loader'ıyla yüklenir.
- `cacheComponents: true`: kök layout `src/app/[locale]/layout.tsx`; `generateStaticParams` zorunlu; `app/layout.tsx` ekleme
  (ikinci kök layout olur).
- Locale **`next/root-params`** ile okunur (`src/i18n/request.ts`). `setRequestLocale` ve `params.locale` kullanma;
  sunucuda `getLocale()` / `getTranslations()`, istemcide `useLocale()` / `useTranslations()`.
- Link ve yönlendirme yalnız `@/i18n/navigation`'dan. `/` = EN (öneksiz), `/tr` = TR; tarayıcı dili algılanmaz.
- Tailwind varsayılan paleti ve yazı ölçeği kapalı (`--color-*`, `--text-*: initial`); yalnız `src/styles/globals.css`
  tokenları var. Yazı: `text-2xs` 11 · `xs` 12 · `sm` 14 · `base` 16 · `lg` 20 · `xl` 28 · `2xl` 44 · `3xl` 60.
- Phosphor ikonları her yerde `@phosphor-icons/react/ssr`'den (server ve client'ta çalışır); `Icon` tipi kök paketten.
- Bileşen haritası: `components/ui` (Button, Card, Banner, StatePanel/Skeleton, SegmentedControl, Tabs, Tooltip, Field),
  `components/data` (SourceBadge, ProvenanceFooter, MetricCard, AnimatedNumber), `components/charts` (LineChart, BarChart),
  `components/shell` (TopBar, AppSidebar/AppTabs, FieldSelector, NasaStatusPill, ComingSoon), `components/map`
  (FieldMap: MapLibre + terra-draw, MapSearch, DrawToolbar, LayerMenu), `components/motion` (MotionProvider, Reveal),
  `components/ui/page-header` (Eyebrow, PageHeader). API istemcisi `src/lib/api.ts`, şemalar `packages/contracts/src/api.ts`.
- Harita: MapLibre konteynerine `position: relative` ekler; boyutu `h-full w-full` ile ver. Çizimde `change` olayları
  yalnız select modunda işlenir (çizim sırasındaki `update`'ler yarım şekildir).
- Her veri gösterimi `SourceBadge` + `ProvenanceFooter` taşır. Eksik değer `null` → "—" + "Veri yok"; asla 0.
- `/styleguide` iç referans sayfasıdır: İngilizce, `noindex`, sentetik örnek veriler "Sample" etiketli. Ürün sayfalarındaki
  "metin yalnız messages dosyalarında" kuralının tek istisnası.
- Animasyon kuralları ve durumları: `docs/MOTION_STORYBOARD.md`.
- Yol uyarısı: repo yolundaki Türkçe "İ" ESLint ignore desenlerini bozuyor; bu yüzden `lint` yalnız `src/`'yi tarar.

## 5. Repo yapısı (hedef)

```
/                     CLAUDE.md · README.md · TASK_MASTER.md · package.json · pnpm-workspace.yaml
docs/                 ürün/tasarım/veri belgeleri · DECISIONS.md · MOTION_STORYBOARD.md · assets/
apps/web/             Next.js — src/app/[locale]/{(marketing),(app)} · src/i18n · src/components · src/styles
                      messages/{en,tr}.json · .env.example
apps/mobile/          yalnız task.md — mobil ertelendi (D-016)
services/api/         FastAPI — app/{core,api/v1,adapters,services,repositories,models} · scripts/migrate.py · tests/
supabase/             migrations/ · seed.sql (pnpm db:migrate --seed)
render.yaml           Render Blueprint (API)
packages/contracts/   OpenAPI → TS tipleri + Zod · DataSource enum
```

Rotalar (TR'de `/tr` önekiyle): `/` → `/demo` → `/fields/[id]` (harita) → `/climate` → `/planning/water` · `/planning/rotation`
→ `/twin` → `/spray` → `/summary`. `fields/[id]/layout.tsx` = kabuk (üst bar + menü); `params` Suspense içinde okunur (cacheComponents). Tüm sayfalar
hazır; `ComingSoon` artık kullanılmıyor.

## 6. Veri kaynağı tipleri (tek enum — D-001)

`live_nasa · cached_nasa · demo_sample · manual_user · simulated_device · derived_indicator · scenario_estimate · unavailable`
(+ `actual_device_future` rezerve, MVP'de kullanılmaz). Zaman alanları: `observed_at` (verinin geçerli olduğu an),
`fetched_at` (API'den alındığı an). Workspace alanı: `workspace_id`.

## 7. Tasarım sistemi özeti (v2 — kullanıcının tasarımları, D-020)

- **Kaynak:** `docs/design/stitch/*.webp` (6 sayfa) ve `docs/design/brand/` (logo). Görsel yön bunlardır; veri dürüstlüğü
  kurallarıyla çelişen kısımlar uygulanmaz (D-020 listesi).
- **Görünüm:** krem zemin, beyaz kart + yumuşak gölge, lacivert ana buton, yeşil italik vurgu kelimesi, "SAT2SOIL ——"
  etiketi, sayfa başlığında sağda uydu→tarla görseli, renkli çizgi ikonlar. Landing sinematik 3D Faz 8'de.
- Tokenlar (`src/styles/globals.css`): `bg #F7F4EE` · `surface #FFF` · `surface-2 #F3EFE8` · `line #EBE5DA` · `ink #0F1B2D`
  · `ink-muted #545E6B` · `green-100 #E4EDCF` (aktif menü) · `green-600 #4B7A22` · `green-700 #3E6A1C` (italik vurgu)
  · `navy-800 #0A2F57` (ana buton) · `navy-900 #0B1F3A` · `sky-600 #2F6DB5` (yağış/gözlem) · `orange-500 #E07B2E` (sıcaklık)
  · `amber-600/700` (simüle) · `brand-orange #F26B1D` (yalnız logo).
- Tipografi: Plus Jakarta Sans (UI + italik vurgu) + Geist Mono (sayılar, koordinat, künye).
- Logo: `Wordmark` = canlı "Sat" + "2" cihaz görseli (`public/images/logo-device.png`) + "Soil" + toprak şeridi.
- Kaynak ayrımı yalnız renkle değil: ikon + desen (simüle = tarama deseni, senaryo = kesikli çizgi) + metin.
- Grafik dili: gözlem = düz mavi, sıcaklık = düz turuncu + min–maks bandı, senaryo = kesikli yeşil + aralık bandı.
  Sıcaklık/nem değişimi yüzde değil mutlak fark; trend çipleri nötr.

## 8. Motion kuralları

- Tokenlar tek dosyada (`apps/web/src/lib/motion/tokens.ts`): `fast 150` · `normal 250` · `emphasis 450` · `slow 700` ms;
  easeOut + ölçülü spring; yer değiştirme 8–16px; scale 0.98→1.
- Animasyon anlam taşır: geri bildirim, durum değişimi, veri gelişi. Süreklilik arz eden hareketli arka plan, sonsuz döngü,
  aşırı parallax, scroll hijack yok. **Tek istisna:** landing hero sahnesi (D-004 kurallarıyla).
- `prefers-reduced-motion` → global `MotionConfig reducedMotion="user"`; landing statik poster'a düşer.
- Yalnız transform/opacity anime edilir. Harita hareketini MapLibre yönetir; geometri DOM'da kare kare anime edilmez.

## 9. Komutlar

Kökten çalıştır (`pnpm install` ve `uv sync --directory services/api` sonrası):

| Komut | Ne yapar |
|---|---|
| `pnpm dev` | Web, http://localhost:3000 |
| `pnpm api:dev` | API, http://localhost:8000 (`/health`, `/docs`) |
| `pnpm build` | Web production build |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · `next typegen` + tsc · Vitest |
| `pnpm api:lint` · `pnpm api:format` · `pnpm api:test` | ruff check · ruff format · pytest |
| `pnpm check` | Hepsini sırayla (commit öncesi) |
| `pnpm e2e` | Uçtan uca + axe testleri (Python Playwright, kurulu Edge; web :3000 ve API :8000 açık olmalı) |
| `SAT2SOIL_LIVE_TESTS=1 uv run --directory services/api pytest -m live` | Gerçek NASA POWER'a karşı duman testi |
| `pnpm db:migrate` · `pnpm db:migrate --seed` | Supabase migration'ları · + örnek tarla |
| `SAT2SOIL_DB_TESTS=1 uv run --directory services/api pytest -m db` | Gerçek Supabase'e karşı entegrasyon testi |

API uçları (OpenAPI: `/docs`): `GET /health` (db durumu dahil) · `POST /v1/demo/session` · `GET /v1/demo/fields` ·
`GET|POST /v1/fields` · `GET|PATCH|DELETE /v1/fields/{id}` · `GET /v1/fields/{id}/nasa/power/daily` ·
`GET /v1/nasa/power/daily?lat=&lon=&start=&end=` · `GET /v1/crops` · `GET /v1/fields/{id}/water-balance` ·
`GET /v1/fields/{id}/rotation` · `POST /v1/fields/{id}/rotation/compare` (D-025) · `GET /v1/fields/{id}/twin` (D-026) ·
`GET /v1/fields/{id}/agrispray` · `GET /v1/agrispray/spray-cards/example` (D-027). Yazma uçları Bearer demo token ister; IP başına rate limit.
POWER davranışı ve doğrulanmış gerçekler: `docs/DECISIONS.md` D-019.

Deploy (kullanıcı bağlar, D-023): Render → Blueprint → `render.yaml`. Vercel root `apps/web`,
`NEXT_PUBLIC_API_BASE_URL` = Render adresi. Env adları `*.env.example` dosyalarında. Supabase'e IPv4 pooler ile bağlanılır (D-021).
Windows'ta API'yi `--reload` ile çalıştır (psycopg async, Proactor döngüsünde çalışmaz).

## 10. Güncel durum

- **Faz 0–2 tamam:** iskelet, tasarım sistemi, gerçek NASA POWER adaptörü (D-019).
- **Faz 3 tamam (yayın hariç):** Supabase şeması + örnek parsel, demo oturumu, tarla CRUD, rate limit, kullanıcının
  tasarımlarıyla yeni görsel dil, landing (statik), tarla seçimi/çizim haritası (NASA GIBS), tarla paneli (gerçek POWER
  metrikleri + 12 ay grafiği). Vercel/Render bağlantısı kullanıcıda (D-023).
- **Faz 4 tamam:** `/fields/[id]/climate` NASA Veri Merkezi (90 gün/12 ay/3 yıl, POWER canlı, diğer kaynaklar
  "Planlı" + teknik özellik, 5 parametre grafiği, ızgara hücresi haritası, "Bu veri hakkında", CSV indirme).
  Yayın: Render + Vercel kullanıcı tarafından bağlandı.
- **Faz 5 tamam:** `/planning/water` (FAO-56 su dengesi, ürün + sezon seçimi, kümülatif grafik, Kc eğrisi, varsayımlar)
  ve `/planning/rotation` (mevcut vs önerilen 3 yıllık plan, düzenlenebilir, API ile yeniden puanlama, kural listesi) — D-025.
  Motorlar `services/api/app/engines/`.
- **Faz 6 tamam:** `/fields/[id]/twin` dijital ikiz — gözlenen sezon + 20 geçmiş sezonun yeniden oynatılması,
  kurak/normal/yağışlı (P10/P50/P90), A/B ürün kıyası, tek renkli tarla haritası + zaman çizgisi (D-026).
  Motor `services/api/app/engines/scenario.py`.
- **Faz 7 tamam:** `/fields/[id]/spray` AgriSpray — konsept cihaz bandı, simüle sensörler, sentetik suya duyarlı kart
  ölçümü (kaplama, leke/cm², homojenlik, maske), Delta T kontrolleri + NASA bölgesel rüzgâr, bitki gözlemi (D-027).
  Motor `services/api/app/engines/spray.py`.
- **Faz 8 tamam:** sinematik landing — kullanıcının videosundan 103 karelik, kaydırmayla oynatılan dizi; 4 perde,
  son perde gerçek uygulama ekranı + tarla sınırı çizimi; reduced-motion/Save-Data → poster (D-028).
  Kareleri yeniden üretmek: `python apps/web/scripts/extract-landing-frames.py video.mp4 --end 6.875`.
- **Faz 9 tamam:** `/fields/[id]/summary` özet + yöntem/kaynak tablosu + A4 yazdırma, demo akışı hapı
  (`components/shell/demo-tour.tsx`), `e2e/` uçtan uca + axe testleri (21 test, D-029).
- **Kalan (kullanıcı tarafı):** prod duman testi (`SAT2SOIL_E2E_BASE_URL=… SAT2SOIL_E2E_API_URL=… pnpm e2e`),
  3 dk sunum provası + yedek video (Q14), DB parolasını değiştirmek. P1 fikirleri `apps/web/task.md` "P1 sonra".
- **Açık riskler:** DB parolası sohbette paylaşıldı, değiştirilmeli (D-021). POWER yağış toplamı istasyon verisiyle
  karşılaştırılmalı (D-019). Hero/kart görselleri tasarım ekran görüntüsünden kırpıldı; yüksek çözünürlüklü export gelirse değişir.
