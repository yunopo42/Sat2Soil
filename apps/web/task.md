# Sat2Soil — Web TASK.md | CANLI MVP (birinci öncelik)

**Yayın hedefi:** Vercel frontend + Render API + Supabase/PostGIS. **Giriş yok.** **Motion:** animasyonlu sayfa geçişleri ve mikro etkileşimler; detay `docs/UI_UX_DESIGN.md`.

## Faz 0 — Temel kurulum [P0]
- [ ] W00.1 Next.js App Router/TS/Tailwind kur, ESLint/format, `.env.example`, uygun App directory route yapısı. **Kabul:** local `build`, `lint`, `typecheck` geçer.
- [ ] W00.2 Bileşen/token sistemi: buttons, header, cards, badges, chart, modal, drawer, toast, skeleton, source/provenance. **Kabul:** responsive story/demo, klavye focus görünür.
- [ ] W00.3 API client: tek merkezi base URL, Zod/TS sözleşmeleri, typed error, timeout, retry/backoff, query caching. **Kabul:** API ve ağ hataları kontrollü.
- [ ] W00.4 UI data durumları: `live_nasa`, `cached_nasa`, `simulated_device`, `manual`, `not_available`. **Kabul:** kaynak etiketi her ilgili kartta doğru.

## Faz 1 — Tasarım ve hareket [P0]
- [ ] W01.1 `docs/UI_UX_DESIGN.md` sayfa tasarımlarını gerçek UI'a uygula; 1440/768/390 breakpoint. **Kabul:** yatay taşma yok.
- [ ] W01.2 Motion for React ile landing reveal, route transition, side panel, card stagger, tap/hover, graph update; animasyon tokenlarını tek dosyadan yönet. **Kabul:** `prefers-reduced-motion`, keyboard ve motion-off testleri.
- [ ] W01.3 Landing `/`: hero + tek CTA `Demoyu Başlat`, `Nasıl çalışır` anchor; yeni kayıt/giriş yok. **Kabul:** max iki aksiyonla örnek tarlaya ulaş.
- [ ] W01.4 `/demo`: örnek tarla / yeni çizim seçenekleri; ilk kullanım açıklaması. **Kabul:** örnek veri gerçek NASA diye etiketlenmez.

## Faz 2 — Harita ve alan kayıt [P0]
- [ ] W02.1 MapLibre + uygun tile sağlayıcısı; açıkça atıf/terms ve geocode kullanımı; map empty/loading states. **Kabul:** prod domaininde tile yüklenir.
- [ ] W02.2 Polygon çiz/düzenle/sil, kendi kendini kesen polygonu engelle, EPSG:4326 GeoJSON, alan hektar/dönüm doğrula. **Kabul:** test parsel alanı toleranslı doğrulanır.
- [ ] W02.3 Tarla adı, ürün, yıl, geçmiş rotasyon, sulama tipi; alan bilgisi sağ drawer. **Kabul:** hatalı girdiye anlaşılır uyarı.
- [ ] W02.4 `GET/POST/PATCH /fields` API; taslak polygon kaydet/yeniden yükle; misafir demo workspace. **Kabul:** reload sonrası kaybolmaz, bir ziyaretçi diğerinin verisini değiştiremez.
- [ ] W02.5 Harita pinleri: yerel ölçüm / uydu katmanı ayrımı. **Kabul:** katman toggle çalışır, kaynak gösterilir.

## Faz 3 — Gerçek NASA verisi [P0]
- [ ] W03.1 `sync NASA` düğmesi/otomatik eşleşme; bekleme, başarı, cache, API hatası. **Kabul:** request sonucu ve kaynak zamanı görünür.
- [ ] W03.2 POWER sıcaklık ve yağış grafiklerini (günlük/aylık) doğru birim ve eksenle çiz; ikinci parametrelerle meteoroloji. **Kabul:** API payload ile değerleri karşılaştır.
- [ ] W03.3 Bilgi açıklaması: temsil edilen grid hücresi; tarih kapsamı, ürün/çözünürlük, `-999` eksik veri. **Kabul:** sahte field-level kesinlik yok.
- [ ] W03.4 Cache/fallback: son geçerli sonuç gösterilebilir; `Önbellek • tarih` etiketi açık. **Kabul:** NASA servisi kesilince yalan canlı durum yok.

## Faz 4 — NASA challenge karar desteği [P0]
- [x] W04.1 Su analizi: yağış ve koşul göstergeleri, yöntem/varsayım paneli, görsel grafik. **Kabul:** eksik veri varsa hesaplama yapılmaz veya açıkça yaklaşık gösterilir.
- [x] W04.2 Ürün kataloğu + mevcut plan/alternatif plan. **Kabul:** kullanıcı ürün tercihlerini değiştirince tahmini kıyas güncellenir, yöntem açıklanır.
- [x] W04.3 Dijital ikiz senaryo `/fields/[id]/twin`: senaryo toggle, zaman çizgisi, harita + ölçülen/tahmin edilen ayrımı. **Kabul:** alternatif senaryo canlı NASA verisiymiş gibi gösterilmez.
- [x] W04.4 Su / rotasyon / dijital ikiz ana sayfalarda 1-2 cümleyle çiftçiye anlaşılır sonuç. **Kabul:** yalnız grafik bırakılmaz.

## Faz 5 — AgriSpray gösterimi [P0]
- [x] W05.1 `Konsept Cihaz • Simülasyon` başlığı ve mekatronik çizim yeri; sensör örnekleri toprak nemi, sıcaklığı, EC, ortam hava koşulu. **Kabul:** cihaz bağlıymış gibi davranmaz.
- [x] W05.2 Püskürtme kartı örnek fotoğraf + örnek maske; kaplama, leke/cm², homojenlik; `örnek sonuç` etiketi. **Kabul:** yanlış etkinlik yüzdesi yok.
- [x] W05.3 Öncesi/sonrası bitki fotoğrafı karşılaştırma görseli; hastalık teşhisi yoksa açıkça `Görsel karşılaştırma`. **Kabul:** AI eğitilmediyse AI tahmini sunulmaz.
- [x] W05.4 3 ayrı rapor bloğu: püskürtme kalitesi / çevresel uygunluk / bitki takip. **Kabul:** kaynak ve güven düzeyi yazılı.
- [ ] W05.5 Opsiyonel P1 OpenCV gerçek kart yükle/analiz akışı; analiz yoksa yükleme `prototip konsepti` olarak sınırlandırılır.

## Faz 6 — QA, performans ve canlıya alma [P0]
- [x] W06.1 Playwright uçtan uca: landing→tarla→NASA→rotasyon→ikiz→AgriSpray; Cypress gerekmez. **Kabul:** kritik akış geçer.
- [x] W06.2 Responsive, axe/WCAG AA uygunluk taraması, reduced-motion, klavye, ekran okuyucu etiketleri. **Kabul:** kritik erişilebilirlik hatası yok.
- [ ] W06.3 Core Web Vitals, lazy map/chart, image optimizasyonu, rate-limit ve yük testi. **Kabul:** ölçülen sonuçları kaydet.
- [ ] W06.4 Vercel Preview ve Production; env'leri ayır, backend CORS, HTTPS, rollback; domain testi. **Kabul:** yeni tarayıcıda URL üzerinden demo baştan sona çalışır.
- [ ] W06.5 Jüri fallback: API kesilirse açık etiketli cache veya örnek veriye geç; slayt/video/screenshot yedeği. **Kabul:** internet kesintisi simüle ederek doğrula.

## P1 sonra
- [ ] GPM/IMERG gerçek entegrasyon ve kendi kaynak etiketi; Landsat veya uygun yüksek çözünürlük veri katmanı; OpenCV doğrulanmış kart analizi; rapor export; İngilizce yerelleştirme.

## Definition of Done
İş `tamamlandı` = (1) kod merge edildi, (2) localhost ve production'da kontrol edildi, (3) test veya ekran kanıtı mevcut, (4) veri kaynak etiketi doğru, (5) kullanıcı akışı çalışıyor. Görsel mockup, çalışan NASA API yerine geçmez.
