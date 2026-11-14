# Sat2Soil — Karar kayıtları (ADR)

Belgeler arası çelişki, tekrar ve boşlukların çözümü. Durumlar: `ÖNERİ` (onay bekliyor) · `KABUL` · `AÇIK` (kullanıcı kararı gerekli) · `ERTELENDİ` · `RED`.
Bir karar `KABUL` olunca `CLAUDE.md` güncellenir.

---

## A. Çelişkiler

### D-001 · Kaynak tipi enum'u tekleştirilir — `KABUL`
- **Çelişki:** `ANALYSIS_AI.md`: `live_nasa | cached_nasa | manual_user | simulated_device | actual_device_future | derived_indicator | scenario_estimate | unavailable`.
  `apps/web/task.md` W00.4: `manual`, `not_available`. `NASA_DATA.md`: `demo_sample`. `UI_UX_DESIGN.md`: `Örnek` etiketi.
- **Karar:** `live_nasa · cached_nasa · demo_sample · manual_user · simulated_device · derived_indicator · scenario_estimate · unavailable`
  (+ `actual_device_future` rezerve). `packages/contracts` tek kaynak; UI etiketleri bu enum'dan türetilir.

### D-002 · Alan adları tekleştirilir — `KABUL`
- **Çelişki:** zaman: `observed_at/fetched_at` (ARCHITECTURE, B06) vs `valid_time/retrieved_at` (D05, NASA_DATA).
  Workspace: `demo_workspace_id` vs `workspace_id`. AgriSpray: `computation_kind` vs cihaz JSON'da `analysis_kind`.
  Kaynak alanı: `source_type` vs `data_status`.
- **Karar:** `observed_at`, `fetched_at`, `workspace_id`, `computation_kind`, `source_type` her katmanda aynı.
  API sözleşmesi (`Field.rotation_history[]`) ile DB (`crop_seasons` tablosu) farklı şekilde olabilir; eşleme repository katmanında.

### D-003 · Su ve rotasyon: tek "Planlama" bölümü, iki alt rota — `KABUL`
- **Çelişki:** Kullanıcı brifi su yönetimi ve ürün rotasyonunu ayrı bölüm sayar; `UI_UX_DESIGN.md` tek `/planning` sayfası
  ve sol rail'de **en fazla 5** başlık ister.
- **Karar:** `/fields/[id]/planning/water` ve `/fields/[id]/planning/rotation` — ayrı, linklenebilir sayfalar; rail'de tek
  "Planlama" başlığı altında sekme. Rail: Tarla · NASA Verisi · Planlama · Dijital İkiz · AgriSpray. Özet üst barda.

### D-004 · Sinematik 3D landing — `KABUL`
- **Çelişki:** Yeni brif: Dünya + iki uydu + kameranın tarlaya inişi. `UI_UX_DESIGN.md` S-01: sağda gerçek UI önizlemesi,
  "dekoratif ve düşük yoğunlukta" animasyon; motion yasakları: sürekli hareketli arka plan, aşırı parallax.
- **Karar:** Landing hero bu yasaklardan **tek istisna**, şu kurallarla:
  1. Başlık + `Demoyu Başlat` ilk karede görünür (S-01: "5 saniyede anlaşılır").
  2. Kamera hareketi kullanıcı scroll'una bağlı (scroll hijack yok, native scroll + sticky bölüm) veya CTA tıklamasıyla tetiklenir.
  3. Boşta yalnız yavaş dönüş + uydu yörüngesi; hero görünmüyorsa veya sekme gizliyse render durur.
  4. `prefers-reduced-motion` / WebGL yok / düşük cihaz → statik poster + opacity geçişleri.
  5. İnişin son karesi S-01'in istediği gerçek UI önizlemesine dönüşür (poligon çizgisi 700ms bir kez çizilir).

### D-005 · G0 kapısı: Figma yerine kod-öncelikli tasarım sistemi — `KABUL`
- **Çelişki:** `TASK_MASTER.md` G0 ve `UI_UX_DESIGN.md` teslimleri Figma frame'leri ister; yeni brif doğrudan web geliştirmesini önceliklendirir.
- **Karar:** G0 = canlı `/styleguide` sayfası (token, bileşen, rozet, grafik, boş/yükleniyor/hata durumları) +
  `docs/MOTION_STORYBOARD.md` (eleman · tetik · süre · easing · reduced-motion alternatifi). Kullanıcı bunları onaylayınca G0 kapanır.
- **Güncelleme (D-018):** Sayfa tasarımları artık Google Stitch ile üretiliyor; G0'a Stitch ekranlarının onayı da eklendi.

### D-006 · Lacivert token ve renk semantiği — `KABUL`
- **Boşluk:** Belge paletinde lacivert yok; brif "kontrollü lacivert/uzay referansı" ister.
- **Karar:** `navy-900 #0E2240`, `navy-600 #2B4C7E` eklenir. Lacivert = uydudan gelen veri, yeşil = tarla/karar, amber = simüle/uyarı.
- **Kontrast notu:** belgedeki `#B66A28` beyaz zeminde ≈4.1:1 → küçük metinde WCAG AA'yı geçmez. Dolgu/kenarlık için kalır;
  metin için `amber-700 #8F5119` (≈6.2:1).

## B. Boşluklar / teknik netleştirmeler

### D-007 · POWER parametre listesi genişletilir — `KABUL` (N01'de doğrulanacak)
- `NASA_DATA.md` şablonu FAO-56 Penman-Monteith ET0 için yetersiz: `T2M_MAX`, `T2M_MIN` eksik; rakım yanıt geometrisinden alınır.
- **Karar:** `T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN`, `community=AG`. Parametre ve birimler
  geliştirme öncesi gerçek yanıtla doğrulanır; doğrulanamazsa su analizi "basitleştirilmiş yağış/iklim göstergesi" olarak kalır.

### D-008 · Tarayıcı Supabase'e bağlanmaz — `KABUL`
- `ARCHITECTURE.md` + D11: RLS default-deny, tüm erişim API'den. Sonuç: Vercel'de Supabase anahtarı **yok**;
  web yalnız `NEXT_PUBLIC_API_BASE_URL` bilir. Görseller API'nin ürettiği süreli URL ile servis edilir.

### D-009 · Demo oturumu Bearer token ile — `KABUL`
- Web (`*.vercel.app`) ile API (`*.onrender.com`) farklı site → API'nin çerezi üçüncü taraf çerez olur, Safari engeller.
- **Karar:** `POST /v1/demo/session` kısa ömürlü imzalı token döner; web `Authorization: Bearer` ile gönderir. Token yalnız kendi demo workspace'ine yazabilir.

### D-010 · Migration tek kaynak: `supabase/migrations` — `KABUL`
- Alembic kullanılmaz. Backend şemayı SQL migration'lardan okur; seed `supabase/seed.sql`.

### D-011 · Grid hücresi haritada gösterilir — `KABUL`
- NASA veri ekranında tarlanın etrafına POWER grid hücresinin sınırı çizilir: "Bu veri şu alanı temsil eder, tarlan burada."
  `NASA_DATA.md`'deki "saha içi ölçüm değildir" uyarısının görsel karşılığı. Önbellek anahtarı da bu hücredir.

### D-012 · Render/Supabase ücretsiz katman riskleri — `KABUL`
- Render free servis boşta uyur (ilk istek ~30–60 sn). Supabase free proje uzun süre kullanılmazsa durdurulur.
- **Karar:** UI'da "API uyanıyor" durumu + açık etiketli önbellek/örnek fallback (Q13); jüri öncesi ısıtma isteği;
  ücretli plan kararı kullanıcıda.

## C. Kullanıcı kararları (2026-11-14)

### D-013 · Demo tarla konumu — `KABUL`
- **Konya Ovası.** Faz 3'te uydu görüntüsü üzerinde gerçek bir parsel sınırı çizilip `supabase/seed.sql`'e eklenir
  (aday bölgeler: Çumra, Karapınar). Seed tarla her ekranda `Örnek` / `Sample` etiketlidir.

### D-014 · Arayüz dili — `KABUL` (belgelerden farklı)
- **İngilizce varsayılan, Türkçe ikinci dil**, ikisi de P0. Belgelerdeki "Türkçe, EN P1" kararının yerine geçer.
- Uygulama: `next-intl`; metinler yalnız `apps/web/messages/en.json` ve `tr.json` içinde, bileşende sabit metin yok.
  Rota: EN öneksiz, TR `/tr` önekli (Faz 0'da kesinleşir). Üst barda dil seçici.
- Kaynak etiketleri iki dilde: `NASA • POWER`, `Cached / Önbellek`, `Sample / Örnek`, `Simulated device / Simüle cihaz`,
  `Scenario estimate / Senaryo tahmini`, `No data / Veri yok`. Slogan: *From Satellite to Soil, From Data to Decisions.*

### D-015 · Uydu altlık harita — `KABUL` (Faz 3'te doğrulanacak)
- **Önce NASA:** NASA GIBS (WMTS) gerçek renk katmanları, tarih ve kaynak etiketiyle (`NASA GIBS • HLS • tarih`).
  Aday katmanlar: HLS (Landsat/Sentinel-2 uyumlu, ~30 m), MODIS/VIIRS (~250 m). Katman adları ve zoom sınırları Faz 3'te doğrulanır.
- **Sınır:** ~30 m çözünürlük tarla sınırını hassas çizmeye yetmeyebilir. Gerekirse çizim için ikinci, yüksek çözünürlüklü altlık
  (Esri World Imagery veya MapTiler) açılıp kapanabilir katman olarak eklenir ve "NASA değil" diye ayrı etiketlenir.
  Etiket/yol katmanı için anahtarsız OpenFreeMap.

### D-016 · Mobil — `ERTELENDİ`
- Mobil şu an kapsam dışı. `apps/mobile/task.md` ve TASK_MASTER G6 beklemede; web bitince yeniden değerlendirilir.

### D-017 · Landing'in faz sırası — `KABUL`
- Önce kritik akış; sinematik landing Faz 8. Kalite çıtası yüksek: landing jürinin ilk izlenimi, "profesyonel" olmalı.
  Faz 0–7 boyunca sade, statik bir yer tutucu landing kullanılır.

### D-018 · Sayfa tasarımları Google Stitch ile — `KABUL`
- Kullanıcı, `docs/STITCH_PROMPTS.md` içindeki promptlarla ekranları Stitch'te üretir ve zip olarak yükler
  (her ekran için PNG + varsa HTML). Dosyalar `docs/design/stitch/` altında saklanır.
- Stitch çıktısı **görsel referanstır, üretim kodu değildir.** Sayfalar kendi token ve bileşenlerimizle, EN/TR metin
  dosyalarıyla ve erişilebilirlik kurallarıyla yeniden yazılır. Stitch'in HTML/Tailwind kodu doğrudan kopyalanmaz.
- Tasarım ile bu kayıttaki kurallar çelişirse (veri etiketleri, kontrast, simüle/gerçek ayrımı) kurallar geçerlidir;
  sapmalar kullanıcıya listelenir.
- Tasarımlardaki sayılar örnektir; gerçek veri gibi sunumda kullanılmaz.
- G0 = Stitch ekranlarının onayı + bunlardan türetilen `/styleguide` + `docs/MOTION_STORYBOARD.md`.

### D-019 · NASA POWER davranışı canlı API'de doğrulandı (N01–N03) — `KABUL`
Doğrulama: 2026-11-14, POWER Daily API v2.10.3, nokta 37.58 K / 32.79 D.
- D-007 parametreleri `community=AG` ile birimleriyle geliyor: °C, mm/day, %, m/s, MJ/m²/day. Rakım yanıt geometrisinde.
- Eksik değer `-999.0`. Son günler henüz yayımlanmamış olarak gelir: meteoroloji ~2 gün, güneş ışınımı ~4 gün gecikmeli.
  API bunları `null` döndürür ve `latest_available` alanıyla bildirir; UI bunları "henüz yayımlanmadı" diye gösterir, sıfır değil.
- Meteoroloji 0.5° × 0.625° hücre içinde her noktada **aynı**; komşu hücrede farklı (5 nokta ile test edildi). Güneş 1° ızgarada.
  Önbellek anahtarı bu hücredir (D-011) ve haritadaki "veri bu hücreyi temsil eder" kutusu bu sınırlarla çizilir.
  Örnek nokta 32.79° D, hücrenin doğu sınırına (32.8125°) çok yakın.
- Alt kaynaklar döneme göre değişiyor (MERRA2, GEOSIT, SYN1DEG, FLASHFLUX); sabit yazılmaz, yanıttan aktarılır.
- Hatalı parametre → NASA 422 döner. Biz girdiyi önceden doğruladığımız için bu bizde hata sayılır (502 `nasa_rejected`).
- **Dikkat:** Bu hücre için son 12 ayın `PRECTOTCORR` toplamı ≈ 705 mm. Konya Ovası'nın uzun yıllar ortalaması (~320 mm)
  bunun çok altında. Model/uydu tabanlı ızgara tahmini istasyon ölçümünden sapabilir. Sunumdan önce MGM istasyon verisiyle
  karşılaştırılmalı; UI bu değeri "ızgara hücresi tahmini" olarak etiketler.

### D-020 · Onaylanan görsel dil ve tasarımlardan bilinçli sapmalar — `KABUL`
Kullanıcının 6 tasarımı (`docs/design/stitch/`) ve logosu (`docs/design/brand/`) temel alındı: krem zemin, lacivert ana buton,
yeşil italik vurgu kelimeleri, "SAT2SOIL ——" etiketi, yumuşak gölgeli beyaz kartlar, yeşil hap aktif menü, uydu görselli sayfa
başlıkları, düz menü listesi (Genel Bakış, NASA Verileri, Su Yönetimi, Ürün Rotasyonu, Dijital İkiz, Zirai İlaçlama, Özet).
Yazı tipi Plus Jakarta Sans (italik dahil) + sayılar için Geist Mono. D-003'teki "en fazla 5 menü" kuralı bu tasarımla değişti
(rotalar aynı kaldı). Tasarımlarda olup kurallarımızla çeliştiği için **uygulanmayanlar**:
- NASA logosu (rozetlerde, uydularda): kullanılmaz; uydulardaki logolar görselden silindi. Kaynak metinle yazılır.
- Bağlanmamış veriler canlıymış gibi (SMAP toprak nemi, GPM, Landsat NDVI, ECOSTRESS, SRTM haritaları, tarla içi NDVI renkleri):
  "Planlı" etiketiyle gösterilir, sahte harita/sayı yok.
- Verim tahmini (t/ha), "%20 daha yüksek verim", m³/ha su reçetesi, "3–5 gün içinde sulayın": üretilmez.
- AgriSpray'de "Canlı (Gerçek Zamanlı)", etkinlik %92, hastalık şiddeti, yapay zekâ ölçümü, "Sentinel-2 NASA verisi" (Sentinel-2
  ESA/Copernicus'tur): Faz 7'de "Konsept cihaz · Simüle" olarak yapılacak.
- Bildirim, kullanıcı avatarı, "Çalışmalarım" gibi giriş gerektiren öğeler: login olmadığı için yok.
- Sıcaklık ve nem değişimi yüzde olarak değil mutlak fark (°C, puan) olarak gösterilir; trend çipleri "iyi/kötü" renklendirmez.

### D-021 · Supabase bağlantısı ve şema — `KABUL`
- Proje `eu-west-3` (Paris). Doğrudan `db.<ref>.supabase.co` adresi yalnız IPv6; yerel ağ ve Render'dan erişilemiyor.
  API **session pooler** (`aws-0-eu-west-3.pooler.supabase.com:5432`, IPv4) kullanır.
- Migration'lar `supabase/migrations` → `pnpm db:migrate [--seed]` (Supabase CLI ile aynı kayıt tablosu). PostGIS 3.3.7.
- Örnek tarla: Konya Ovası'nda gerçek bir parsel (≈5 ha, 37.6208 K / 32.8546 D), EOX Sentinel-2 görüntüsünden renk
  bölütlemesiyle çıkarıldı, NASA GIBS HLS ile hizası kontrol edildi. Ürün geçmişi ve sulama tipi örnek değerdir.
- **Güvenlik notu:** Veritabanı parolası sohbette paylaşıldı. Jüri öncesi Supabase → Database → Reset password ile
  değiştirilmeli; yeni değer yalnız `services/api/.env` ve Render ortam değişkenine yazılır.

### D-022 · Harita kaynakları ve lisanslar — `KABUL`
- Varsayılan: NASA GIBS Blue Marble + HLS S30 gerçek renk (2026-10-24, bulutsuz gün döşemeler incelenerek seçildi; günlük
  ürün olduğu için tarih sabit ve etikette yazılı). 30 m; yakın zoomda bulanık, bu dürüst bir sınır.
- Alternatif: EOX Sentinel-2 cloudless 2024 (10 m, CC BY-NC-SA 4.0, ticari olmayan kullanım), "NASA değil" etiketli.
- Konum arama: OpenStreetMap Nominatim, yalnız kullanıcı "Ara"ya basınca (otomatik tamamlama yok, kullanım politikası).
- MapLibre GL 6 worker dosyası `public/vendor/` altına kopyalanır (`scripts/copy-maplibre-worker.mjs`).

### D-023 · Yayın düzeni — `ÖNERİ` (kullanıcı bağlar)
- API: Render Blueprint (`render.yaml`), Frankfurt, `/health` sağlık kontrolü, `--proxy-headers` ile gerçek IP'ye göre rate limit.
- Web: Vercel, Root Directory `apps/web`, ortam değişkeni `NEXT_PUBLIC_API_BASE_URL` = Render adresi.
- Render'da `CORS_ORIGINS` = Vercel production adresi (tam adres, joker yok).

### D-024 · Space Apps Konya logosu evet, NASA insignia hayır — `KABUL` (kullanıcı kararı, 2026-11-15)
- Proje NASA Space Apps Challenge Konya etkinliğinde geliştirildi: Space Apps Konya logosu landing'de ("... Konya'da
  geliştirildi" rozeti) ve footer'da kullanılır (`docs/design/brand/space-apps-konya.jpg`).
- NASA "meatball" logosu kullanılmaz (14 CFR 1221, onay izlenimi). NASA kaynakları metinle yazılır; footer'da
  "NASA ile bağlantılı değildir" notu kalır.

### D-025 · Su dengesi ve rotasyon motorları — `KABUL` (Faz 5, 2026-11-15)
- **Su:** FAO-56 Penman–Monteith ET₀ (Örnek 8 ve 18 ile test edildi) → ETc = Kc × ET₀ (tek Kc eğrisi, 4 dönem) →
  denge = ETc − yağış, ekimden hasada. Girdisi eksik gün iki taraftan da çıkarılır; `covered_until` yalnız tam girdili son gün.
  Ekim tarihleri Orta Anadolu tipik tarihleri (varsayım olarak gösterilir). Toprak depolama, etkili yağış modellenmez.
  Çıktı `derived_indicator`; **litre/sulama reçetesi yok** (CLAUDE.md §2.3).
- **Rotasyon:** Puan = %50 su uyumu (her yıl ürünün son tamamlanan sezon ETc/yağış oranı) + %50 kural
  (`no_repeat`, `cereal_limit`, `legume_break`, `beet_interval`, `rainfed_water` — yalnız kuru tarımda). Öneri,
  katalogdaki önerilebilir ürünlerin 3 yıllık tüm kombinasyonlarından en yüksek puan. Mevcut plan = son iki sezon döngüsünün
  devamı. Puan verim tahmini değildir; UI bunu söyler.
- Uçlar: `GET /v1/crops` · `GET /v1/fields/{id}/water-balance?crop=&season=last|current` · `GET /v1/fields/{id}/rotation` ·
  `POST /v1/fields/{id}/rotation/compare {plans}`. Örnek tarla geçmişi buğday/pancar döngüsü (seed).

### D-026 · Dijital ikiz = gözlenen sezon + geçmiş sezonların yeniden oynatılması — `KABUL` (Faz 6, 2026-11-15)
- Ürünün tarladaki (ya da sıradaki) sezonu son yayımlanmış NASA POWER gününde ikiye ayrılır: öncesi **gözlem**
  (`cached_nasa`/`live_nasa`), sonrası **senaryo** (`scenario_estimate`). Sezonun kalanı, aynı ızgara hücresinin geçmiş
  20 sezonunun havasıyla sırayla doldurulur ("analog yıllar", ensemble yöntemi). Hava tahmini **değildir**.
- Kurak / normal / yağışlı = sezon sonu su dengesinde P10 / P50 / P90'daki geçmiş sezon (tablodaki toplamlar tutarlı
  olsun diye tek bir gerçek sezon seçilir, hangi sezon olduğu yazılır). Grafik bandı her gün için P10–P90.
- Senaryo A = mevcut planın 1. yılı, B = önerilen planın 1. yılı; kullanıcı ikisini de değiştirebilir.
  Yalnız yağışla (kuru tarım); sulama, toprak deposu, verim **simüle edilmez**. Tasarımdaki (P07) t/ha verim, m³/ha,
  iklim riski seviyesi ve tarla içi NDVI uygulanmadı (D-020).
- Harita tarlayı **tek renkle** boyar (tarla ortalaması), etiket bunu söyler. Geçmiş için POWER 22 yıl × 7 parametre
  tek istekte (~3 s) alınır, ızgara hücresi önbelleğine girer. Uç: `GET /v1/fields/{id}/twin?crop_a=&crop_b=`.

### D-027 · AgriSpray = konsept cihaz, simüle değerler, sentetik kart ölçümü — `KABUL` (Faz 7, 2026-11-15)
- Sayfanın en üstünde "Konsept cihaz · Simüle veri. Bağlı fiziksel cihaz yok." bandı. Cihaz değerlerinin hepsi
  `simulated_device` + `computation_kind=mock`; örnek değerler `docs/ANALYSIS_AI.md` JSON'undan, 7 günlük geçmiş tarla
  kimliğinden tohumlanarak üretilir (her ziyarette aynı). Zaman damgası sabit (14 Kas 2026 12:00 UTC), "şimdi" değil.
- Konseptte rüzgâr sensörü yok → rüzgâr "Veri yok". Bölgesel bağlam için NASA POWER `WS2M` son 30 gün (günlük ortalama,
  ilaçlama anındaki rüzgâr değil diye etiketli).
- **Sentetik suya duyarlı kart:** lekeler tohumla üretilir (3 örnek: düzgün / düzensiz / seyrek), 0,05 mm ızgarada
  rasterleştirilir ve taranmış kart gibi ölçülür: kaplama = leke pikseli / kart pikseli, leke sayısı = 4-bağlantılı
  bölgeler (değen lekeler birleşir, gerçek kart hatası), homojenlik = 6×2 bölge kaplamasının CV'si. Maske görüntüsü
  ölçülen ızgaradan üretilen PNG'dir. Leke çapı damlacık çapına çevrilmez.
- İlaçlama koşulları genel kılavuz: Delta T (Stull 2011 yaş termometre) 2–8 °C tercih, 8–10 dikkat, >10 dışında;
  hava sıcaklığı ≤28 / 28–32 / >32 °C. "Uygun" kararı, doz, ilaç etkinliği %, hastalık teşhisi, verim **yok**.
- Bitki takibi: fotoğraf yerine "konsept kamera" yuvası + gözlemci sayımı (simüle). Tasarımdaki (P08) "Canlı",
  %92 etkinlik, hastalık şiddeti, NDVI/klorofil iyileşmesi, verim potansiyeli, "Sentinel-2 NASA" uygulanmadı (D-020).
- Cihaz görseli `public/images/agrispray-concept.webp` tasarım maketinden kırpıldı; altyazı "çalışan cihaz fotoğrafı değil".
- Supabase `device_samples` / `spray_*` tabloları (D07–D08) gerçek cihaz gelene kadar ertelendi: simüle veriyi DB'de
  tutmak bilgi katmıyor. Uçlar: `GET /v1/fields/{id}/agrispray`, `GET /v1/agrispray/spray-cards/example?variant=`.

### D-028 · Sinematik landing = kullanıcının videosundan kaydırmayla oynatılan kare dizisi — `KABUL` (Faz 8, 2026-11-15)
- three.js sahnesi yerine kullanıcının Gemini ile ürettiği 10 sn'lik video kullanılır (kullanıcı kararı). D-004 kuralları
  aynen geçerli: başlık + CTA ilk karede, native scroll + sticky bölüm (scroll hijack yok), boşta döngü yok (kare yalnız
  kaydırma değişince çizilir), `prefers-reduced-motion` / Save-Data → statik poster, son kare gerçek UI önizlemesine döner.
- Kesim **0–6,875 sn**: 7,0 sn'de cihaz ekranında uydurma bir panel (rastgele sayılar) beliriyor; gösterilmez.
  15 fps → 103 kare; `wide` 1280×720 (yatay ekran, 8,1 MB) ve `tall` 405×720 orta kırpım (dikey telefon, 3,0 MB), WebP q85.
  Kare seti pencere yönüne göre canlı seçilir (`orientation` media query; yeniden boyutlandırmada değişir). Kare
  **kırpılmaz**: ekrana sığdırılır (contain), boşluklar aynı karenin bulanık + koyulaştırılmış kopyasıyla dolar.
  Kaynak 720p olduğu için geniş ekranda netlik kaynağın üstüne çıkamaz; 1080p/4K export gelirse aynı betikle değiştirilir.
  Kareler kademeli yüklenir (önce her 16. kare, sonra aradakiler; 4 paralel istek); çizimde en yakın yüklü kare kullanılır.
- Video yenilenirse tek komut: `python apps/web/scripts/extract-landing-frames.py video.mp4 --end <sn>` (kareleri ve
  `src/lib/landing-frames.ts`'yi yeniden üretir; ses atılır).
- Perdeler: 1 başlık/CTA (yörünge) · 2 "NASA Dünya gözlemi" (atmosfer→tarla) · 3 "Toprağına kadar" + "Konsept cihaz ·
  henüz üretilmedi" etiketi · 4 uygulamadan **gerçek ekran görüntüsü** (dijital ikiz, EN/TR ayrı; headless Edge ile alındı)
  + örnek tarlanın gerçek sınırı 700 ms'de bir kez çizilir. Sağ üstte sürekli "Konsept animasyon (yapay zekâ ile üretildi)".
- Videodaki logo ilk ~3,6 sn'de görünür; header sayfayla birlikte kayıp gittiği için çakışmaz (header'da beyaz hap içinde
  wordmark). Videodaki Dünya Kuzey Amerika'yı gösteriyor ve cihaz AgriSpray görselinden farklı: dekoratif giriş olarak
  kabul edildi; Türkiye görünümlü yeni video gelirse kareler aynı komutla değiştirilir.
