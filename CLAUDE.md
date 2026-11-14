# CLAUDE.md — Sat2Soil

> **Durum: v0.2 · 2026-11-14** — D-013…D-017 kullanıcı tarafından kararlaştırıldı; D-001…D-012 öneri durumunda.
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
| Web | Next.js (App Router) · TypeScript · Tailwind CSS v4 · Vercel |
| Motion | Motion for React (`motion/react`); basit hover/focus CSS |
| Landing 3D | three.js + @react-three/fiber + drei — yalnız `/`, lazy-load, kademeli kalite |
| Harita | MapLibre GL JS + react-map-gl · çizim: terra-draw · önizleme alanı: turf |
| Uydu altlık | Önce NASA GIBS (tarihli, etiketli); gerekirse çizim için yüksek çözünürlüklü ikinci altlık (D-015) |
| i18n | next-intl · EN varsayılan, TR (D-014) |
| Grafik | visx (bilimsel figür stili, motion ile tam kontrol) |
| Veri | TanStack Query · Zod · `packages/contracts` (OpenAPI'den üretilen tipler) |
| UI primitive | Radix Primitives + kendi tokenlarımız (hazır tema yok) · ikon: Phosphor |
| API | FastAPI · Pydantic v2 · httpx + tenacity · psycopg 3 · PyJWT · slowapi · uv · Render |
| DB | Supabase PostgreSQL + PostGIS · Supabase Storage · migration: `supabase/migrations` (tek kaynak) |
| Test | Vitest · Playwright + axe · pytest + respx |
| Monorepo | pnpm workspaces (Turborepo yok) |

## 5. Repo yapısı (hedef)

```
/                     CLAUDE.md · README.md · TASK_MASTER.md · .env.example · pnpm-workspace.yaml
docs/                 ürün/tasarım/veri belgeleri · DECISIONS.md · MOTION_STORYBOARD.md · assets/
apps/web/             Next.js — src/app/(marketing) ve src/app/(app) route grupları
apps/mobile/          yalnız task.md — mobil ertelendi (D-016)
services/api/         FastAPI — app/{core,api/v1,adapters,engines,repositories,models} · tests/
supabase/             migrations/ · seed.sql
packages/contracts/   OpenAPI → TS tipleri + Zod · DataSource enum
```

Rotalar: `/` → `/demo` → `/fields/[id]` (harita) → `/climate` → `/planning/water` · `/planning/rotation`
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

_Faz 0 sonrasında doldurulacak (dev, build, lint, typecheck, test, contracts:gen)._

## 10. Güncel durum

- **Faz:** Planlama tamam, Faz 0 onayı bekleniyor. Uygulama kodu yok. GitHub'da yalnız planlama belgeleri var.
  Supabase/Vercel/Render bağlı değil. Hiçbir P0 kapısı tamamlanmadı.
- **Faz sırası:** 0 iskelet → 1 tasarım sistemi (G0) → 2 API + NASA POWER → 3 demo + harita + ilk canlı yayın
  → 4 NASA veri merkezi → 5 su + rotasyon → 6 dijital ikiz → 7 AgriSpray → 8 sinematik landing → 9 özet + QA. Mobil ertelendi.
