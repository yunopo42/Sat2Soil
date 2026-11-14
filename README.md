# Sat2Soil — NASA Space Apps 2026 | MVP dosya seti

**Durum:** Plan; hiçbir geliştirme veya canlı NASA bağlantısı tamamlanmış kabul edilmez. **Öncelik:** canlı, işlevsel web uygulaması. **Mobil:** yalnızca yüksek kaliteli, tıklanabilir görsel tasarım. **Donanım:** mekatronik ekibinden konsept/exploded-view çizimleri; yazılım/bağlantı yok.

## Belgeler ve okuma sırası
1. `docs/PRODUCT_SCOPE.md` — ürün hedefi, jüri demosu ve kapsam
2. `docs/UI_UX_DESIGN.md` — sayfa sayfa web görsel tasarım brifi, responsive, motion
3. `apps/web/task.md` — uçtan uca canlı web geliştirme görevleri / kabul kriterleri
4. `docs/ARCHITECTURE.md` — frontend/backend/DB/API/veri sözleşmeleri
5. `services/api/task.md` — FastAPI, NASA veri işleme, analiz servisleri
6. `supabase/task.md` — PostGIS şema ve demo güvenliği
7. `docs/NASA_DATA.md` — veri kaynakları, entegrasyon/fallback, doğrulama
8. `docs/ANALYSIS_AI.md` — su bütçesi, ürün rotasyonu, dijital ikiz, AgriSpray, model kararı
9. `apps/mobile/task.md` — Figma/Expo şart olmaksızın mobil ekran ve prototip tasarımı
10. `docs/QA_DEPLOY_DEMO.md` — Vercel/Render/Supabase canlıya çıkış, QA, jüri senaryosu

## Tek cümlelik ürün
Sat2Soil, çiftçinin haritada belirlediği tarlaya uygun gerçek NASA iklim/gözlem verilerini şeffaf bir karar motoruyla ilişkilendirerek su yönetimi ve ürün rotasyonu senaryoları sunar; gelecekteki taşınabilir cihazın verilerini ise açıkça simüle edilen bir AgriSpray ekranında gösterir.

## Kesin kararlar
- Login/register YOK; `Demoyu Başlat` → örnek tarla veya yeni tarla.
- Web: Next.js + TypeScript + Tailwind + MapLibre + Motion for React; Vercel.
- API: FastAPI + Python, Render; DB: Supabase PostgreSQL/PostGIS; Storage: Supabase Storage.
- NASA POWER gerçek API bağlantısı P0; GPM/IMERG, Landsat/AppEEARS, SMAP P1/P2; yalnız çalışan kaynak canlı etiketlenir.
- Mobil: web tasarımıyla uyumlu **mockup/tıklanabilir prototip**, canlı backend zorunlu değil.
- Model eğitimi P0 zorunlu değil. Gerektiğinde doğrulanmış verilerle P2.
- Motion = **hareketli, animasyonlu sayfa tasarımları**; kısa ve amaçlı geçişler, reduced-motion desteği.

## Uygulama önerilen repo ağacı
```
apps/web/         Next.js
apps/mobile/      görsel tasarım dosyaları, varsa Expo demo
services/api/     FastAPI
supabase/         SQL migrations + policies
docs/             tasarım, veri, test, sunum
packages/contracts/  JSON schemas / TS tipleri
```

## Dikkat
Bu paket bir *uygulama ve tasarım planıdır*, çalışan kod değildir. Web deployment, API veya modelin çalıştığını iddia etmeyin. Her canlı özelliğe kabul/test kanıtı ekleyin.
