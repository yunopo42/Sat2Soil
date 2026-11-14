# Sat2Soil — QA, canlı yayın, sunum ve operasyon

## Ön koşullar
- Vercel web projesi; Render FastAPI service; Supabase Postgres+PostGIS; repo + migration + environment örnekleri.
- `NEXT_PUBLIC_API_BASE_URL` web için, backend secrets Render için; gizli anahtarlar Vercel client bundle'a konmaz.
- OpenStreetMap/harita tile sağlayıcısı prod trafik koşulları ve attribution doğrulanır.

## Canlıya alma checklist
- [ ] Q01 `main` production, PR preview, Git version/tag.
- [ ] Q02 API Render URL üzerinde HTTPS `/health` 200, DB connect, request logs, startup/soğuk başlatma test.
- [ ] Q03 Supabase migration, GIS indexes, RLS default-deny, demo-session workspace isolation.
- [ ] Q04 Vercel env production/preview ayır, CORS exact domain, secret audit.
- [ ] Q05 `next build`, eslint/typecheck, Python pytest ve API schema testleri temiz.
- [ ] Q06 NASA POWER gerçek ağ testleri: başarı, 429/500, timeout, eksik değer, yenileme ve cache.
- [ ] Q07 Tarla çiz → kaydet → sayfa yenile → veri eşleşti; NASA grafik ve değer doğrula.
- [ ] Q08 Rotasyon/ikiz: varsayım ve belirsizlik; kontrolsüz sonuç/yanlış etiket yok.
- [ ] Q09 AgriSpray: `Konsept cihaz · Simüle` ibaresi, % etkinlik diye yanıltma yok.
- [ ] Q10 Masaüstü 1440, tablet 768, mobil-web 390; klavye, screenreader, reduced-motion; kritik accessibility issue yok.
- [ ] Q11 Görsel performans: map/chart lazy load, img optimizasyonu, font, ölçülen Web Vitals.
- [ ] Q12 Preview ve prod end-to-end Playwright smoke; loglarda hassas veri yok.
- [ ] Q13 API erişilemezse görünür `Önbellek` / `Örnek demo` fallback; hatada boş beyaz ekran yok.
- [ ] Q14 3 dakikalık sunum provasını canlı URL üzerinden yap; ekran görüntüsü ve kısa yedek video al.

## Tek akışlı sunum
Landing → örnek tarla / poligon çizimi → gerçek POWER grafik/künye → su & rotasyon kıyas → dijital ikiz senaryo → AgriSpray `simüle cihaz` ve kart analizi → etki/gelecek.

## Teknik sunumda dürüst beyan
- "NASA POWER'dan canlı veri aldık" yalnız endpoint production'da doğrulandığında.
- "Dijital ikiz" güncel snapshot + açıklanabilir senaryo sistemi; tam fiziksel validasyon değil.
- "Zirai ilaç verimi" yerine **püskürtme dağılımı ve çevresel risk analizi**; biyolojik etki için gözlem ve doğrulama gerekir.
- Fiziksel cihaz: mekatronik takımın konsept/exploded-view çizimi; bağlantı ve cihazdan canlı veri yok.

## Resmî dokümantasyon
- NASA POWER https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Vercel deploy https://vercel.com/docs/deployments/environments
- Next.js env https://nextjs.org/docs/app/guides/environment-variables
- Render FastAPI https://render.com/docs/deploy-fastapi
- Supabase GIS https://supabase.com/docs/guides/database/extensions/postgis
