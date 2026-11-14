# CLAUDE.md — Sat2Soil

> **Durum: v0.3 · 2026-11-14** — D-001…D-015 ve D-017 kabul edildi, D-016 (mobil) ertelendi. Faz 0 tamamlandı.
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
- Repo: `origin` → `https://github.com/yunopo42/-Sat2Soil.git`, dal `main`. Faz sonunda commit önerilir; push kullanıcı onayıyla.
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
| Landing 3D | three.js + @react-three/fiber + drei — yalnız `/`, lazy-load, kademeli kalite |
| Harita | MapLibre GL JS + react-map-gl · çizim: terra-draw · önizleme alanı: turf |
| Uydu altlık | Önce NASA GIBS (tarihli, etiketli); gerekirse çizim için yüksek çözünürlüklü ikinci altlık (D-015) |
| i18n | next-intl · EN varsayılan, TR (D-014) |
| Grafik | d3-scale + d3-shape ile kendi SVG bileşenlerimiz (`components/charts`); visx yerine — tam kontrol, az bağımlılık |
| Veri | TanStack Query · Zod · `packages/contracts` (OpenAPI'den üretilen tipler) |
| UI primitive | Radix Primitives + kendi tokenlarımız (hazır tema yok) · ikon: Phosphor |
| API | Python 3.13 · FastAPI · Pydantic v2 + pydantic-settings · uv · Render (sonraki fazlarda: httpx/tenacity, psycopg 3, PyJWT, slowapi) |
| DB | Supabase PostgreSQL + PostGIS · Supabase Storage · migration: `supabase/migrations` (tek kaynak) |
| Test | Vitest · pytest (+ httpx2 TestClient) · sonra Playwright + axe |
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
  `components/shell` (TopBar, NavRail, FieldSelector, NasaStatusPill), `components/motion` (MotionProvider, Reveal).
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
services/api/         FastAPI — app/{core,api,models} (+ adapters, engines, repositories fazlarla) · tests/ · .env.example
supabase/             migrations/ · seed.sql
packages/contracts/   OpenAPI → TS tipleri + Zod · DataSource enum
```

Rotalar (TR'de `/tr` önekiyle): `/` → `/demo` → `/fields/[id]` (harita) → `/climate` → `/planning/water` · `/planning/rotation`
→ `/twin` → `/spray` → `/summary`. Harita `fields/[id]/layout.tsx` içinde kalıcıdır, sayfalar arasında yeniden yüklenmez.

## 6. Veri kaynağı tipleri (tek enum — D-001)

`live_nasa · cached_nasa · demo_sample · manual_user · simulated_device · derived_indicator · scenario_estimate · unavailable`
(+ `actual_device_future` rezerve, MVP'de kullanılmaz). Zaman alanları: `observed_at` (verinin geçerli olduğu an),
`fetched_at` (API'den alındığı an). Workspace alanı: `workspace_id`.

## 7. Tasarım sistemi özeti

- **Landing:** sinematik, lacivert uzaydan kırık beyaz yüzeye inen tek anlatı. Neon/cyberpunk yok.
- **Uygulama:** açık tema, ferah, harita odaklı. Dark theme ana tema değil.
- **Renk semantiği:** lacivert = uydudan gelen (NASA kaynaklı) · yeşil = tarla ve çiftçinin kararı · amber = simüle/uyarı.
- Tokenlar: `bg #F7F9F5` · `surface #FFFFFF` · `surface-2 #EFF2EE` · `border #E6ECE8` · `ink #173B32` · `ink-muted #5A6B64`
  · `green-600 #2D7A53` · `green-200 #A9D7A9` · `navy-900 #0E2240` · `navy-600 #2B4C7E` · `amber-600 #B66A28` (yalnız dolgu/kenar)
  · `amber-700 #8F5119` (metin).
- Tipografi: Geist Sans (UI) + Geist Mono (sayılar, koordinat, künye). Ölçek 12/14/16/20/28/44 (+ landing display).
- 8px spacing · radius 12/16/20 · gölge minimum, ayrımı kenarlık yapar.
- Kaynak ayrımı yalnız renkle değil: ikon + desen (simüle = tarama deseni, senaryo = kesikli çizgi) + metin.

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

Deploy ayarları (kullanıcı bağlar): Vercel root `apps/web`. Render root `services/api`, start komutu
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, sağlık kontrolü `/health`. Env adları `*.env.example` dosyalarında.

## 10. Güncel durum

- **Faz:** Faz 0 (iskelet) ve Faz 1 (tasarım sistemi: tokenlar, bileşenler, grafikler, kabuk, `/styleguide`,
  `docs/MOTION_STORYBOARD.md`) tamam. G0 kullanıcı onayı bekliyor; kullanıcı Stitch ekranları üretiyor (D-018), zip
  gelince görsel yön bunlara göre güncellenecek. Supabase/Vercel/Render bağlı değil.
- **Faz sırası:** 0 iskelet → 1 tasarım sistemi (G0) → 2 API + NASA POWER → 3 demo + harita + ilk canlı yayın
  → 4 NASA veri merkezi → 5 su + rotasyon → 6 dijital ikiz → 7 AgriSpray → 8 sinematik landing → 9 özet + QA. Mobil ertelendi.
