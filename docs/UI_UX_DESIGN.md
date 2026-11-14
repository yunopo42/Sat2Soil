# Sat2Soil — WEB UI/UX & MOTION TASARIM BRİFİ

> Bu dosyayı tasarımcıya veya Claude'a tek başına verip **sayfa tasarımlarını** ürettirebilirsin. "Motion", animasyonlu sayfa tasarımı ve mikro etkileşim demektir; cihaz hareketi veya video prodüksiyonu değil.

## Görsel kimlik
- Duygu: bilimsel güven, modern tarım, temiz SaaS, erişilebilir teknoloji. Bilim kurgu dashboard kalabalığından kaçın.
- Örnek palet: `#F7F9F5` arka plan; `#FFFFFF` kart; `#173B32` ana yazı; `#2D7A53` ana yeşil; `#A9D7A9` açık vurgu; `#E6ECE8` kenarlık; veri uyarısı için `#B66A28`. Renkler WCAG kontrastıyla doğrulanacak.
- Font: Inter / Geist (Latin+Türkçe karakter kontrolü); tipografi 12/14/16/20/28/44; 8px spacing sistemi; 12–20px border radius; az gölge.
- Grafik: renk dışında simge, çizgi/desen ve metin etiketi; birim ve eksen mutlaka göster.
- Kaynak etiketleri: `NASA • POWER`, `Önbellek`, `Örnek`, `Simüle cihaz`, `Kullanıcı girdisi`, `Veri yok`. Simüle veri gerçek NASA görünümüne sokulmaz.
- Yazı dili: sade Türkçe, teknik ayrıntılar `Nasıl hesaplandı?` açılır alanlarında.

## Bilgi mimarisi
`/` (landing) → `/demo` (örnek tarla seç) → `/fields/[id]` (harita ve durum) → `/fields/[id]/climate` (NASA) → `/fields/[id]/planning` (Su & rotasyon) → `/fields/[id]/twin` (dijital ikiz) → `/fields/[id]/spray` (AgriSpray) → `/fields/[id]/summary` (özet).
Kalıcı üst bar: Sat2Soil logo, tarla seçici, NASA veri durumu, dil/demoya dönüş. Desktop sol rail en fazla 5 başlık; mobil web alt sekme ve ikincil sayfalar için daha menüsü.

## Sayfa tasarım spesifikasyonları
### S-01 Landing / ilk izlenim
- Hero başlığı: **Uydudan tarlana, veriden karara.** Açıklama bir cümle; primary CTA **Demoyu Başlat**, secondary `Nasıl çalışır?`.
- Sağda gerçek uygulama UI'sından crop edilmiş hareketli tarla haritası/analiz ön izlemesi; uydudan gelen çizgiler gibi soyut animasyonlar *dekoratif* ve düşük yoğunlukta.
- Aşağıda 3 değer önermesi: NASA verileri, su ve ürün rotasyonu, yerel ölçüm konsepti. Sonunda kaynak/güvenilirlik açıklaması.
- Motion: hero metni 300–450ms opacity+y hafif yükselme; kartlar 60ms stagger; harita çizgisi 700ms bir kere çizilsin; scroll'da aşırı parallax yok.
- Kabul: 5 saniyede ne yaptığı anlaşılır, tek ana CTA görünür.

### S-02 Demo seçimi
- İki büyük kart: **Örnek tarlayı incele** / **Kendi tarlanı çiz**; hiç giriş formu yok.
- Örnek tarla kartında lokasyon, ürün, demo niteliği açık. Üç adımlı kısa açıklama.
- Motion: kart hover ~150–180ms; seçilince yumuşak geçiş, sayfa değişiminde skeleton.

### S-03 Tarla haritası / dashboard
- Desktop: solda mini navigasyon ~224px, ortada geniş interaktif harita, sağda ~340px ölçüm/tarla bilgi paneli; breakpoint'te panel drawer olur.
- Araçlar: poligon oluştur/düzenle/sil, otomatik alan, tarla ismi/ürün/sulama, ölçüm pinleri, katman toggles, koordinat göstergesi.
- Haritada aktif çizim düğümleri ve klavye erişilebilir alternatif koordinat girişi; boş alan çizim durumları.
- Motion: seçili poligon sınırı çizilir (400–650ms), panel 220ms slide; harita hareketi kullanıcı kontrolünde, sürekli autoplay pan yok.
- Kaydet → başarı/hata toast; invalid polygon açıklaması.

### S-04 NASA veri merkezi
- Üst filtre: tarih aralığı, kaynak, güncelleme. Üç büyük metrik (yağış, ort. sıcaklık, nem), altında çizgi/bar grafik.
- Her grafikte kaynak, ölçüm birimi, veri dönemi, API yanıt zamanı, örnekleme/coğrafi çözünürlük açıklaması.
- Boş/loading/error/cached durumları tam tasarlanacak. POWER yağışını GPM gibi etiketleme.
- Motion: satır/grafik yüklenmesinde skeleton; yalnız veri geldikten sonra 400–600ms çizgi reveal; sayı animasyonu 300ms, `prefers-reduced-motion` ile kapalı.

### S-05 Su & ürün rotasyonu
- Sol: ürün bilgileri, geçmiş ekim şeridi, iklim/su koşulları. Sağ: **Mevcut plan** vs **Alternatif plan** iki kıyas kartı.
- Kıyas verisi: su ihtiyacı tahmini/iklim uygunluğu/varsayımlar; neden önerildi? paneli; kullanıcı ürün değiştirince reactivity.
- Motion: kart swap 180–250ms; grafik değerleri 300–450ms değişim; ani layout jump önlenir.

### S-06 Dijital ikiz (senaryo ekranı)
- Üst: mevcut tarla + planlanan senaryo toggle; orta: harita + zaman çizgisi, altta karşılaştırma grafikleri ve `Varsayımlar` paneli.
- Görsel olarak *güncel uydu ölçümü* ile *senaryo tahminini* açıkça ayır (farklı çizgi stili ve etiket).
- Motion: zaman çizgisinde kullanıcı scrub ettikçe akıcı harita/plot update, 150–250ms transition; animasyon bilimsel veri anlamını bozmayacak.

### S-07 AgriSpray / cihaz simülasyonu
- Üst satır: **Konsept cihaz · Simüle veri** açık statü.
- Sol 3D çizim veya mekatronik ekibin katmanlı konsept görseli; sağ sensör değerleri (nem/EC/sıcaklık/hava), bağlantı kurgusu.
- Alt sekmeler: **Toprak ölçümü**, **Püskürtme kartı**, **Bitki takip**. Kartın fotoğrafı ve overlay maskesi yan yana. Üç ayrı sonuç: kaplama/homojenlik, çevresel risk, gözlenen belirtiler. `İlaç etkinliği %` yok.
- Motion: sekme indicator 180ms; örnek kart scanning animasyonu ≤1.2s ve kullanıcı tetiklemeli; gerçek AI çalışmıyorsa `örnek hesap` ibaresi.

### S-08 Özet / jüri sunumu
- Tek ekranda tarla haritası, NASA kaynaklı 1–2 grafik, su/rotasyon kıyası, AgriSpray demo ve kaynak yöntemi. Basılabilir layout.
- Motion: sunum için `Demo akışını göster` tıklamasıyla yönlendirilmiş adımlar; kendi kendine yanlış değer üreten sahte canlı akış yok.

## Motion sistemi: ne, ne kadar, nerede?
- Tercih edilen kütüphane: **Motion for React** (`motion/react`); CSS transitions basit hover/focus için; harita animasyonunu MapLibre yönetsin.
- Tokenlar: `fast=150ms`, `normal=250ms`, `emphasis=450ms`, `slow=700ms`; `easeOut` ve ölçülü spring, displacement 8–16px, scale 0.98→1.
- Örnekler: sayfa giriş fade/slide, route geçişi, hover yükselmesi, açılır panel, staggered cards, poligon çizim reveal, seçime bağlı sayısal sayaç, grafik reveal, skeleton → veri.
- Yasaklar: süreklilik arz eden hareketli arka plan, sonsuz bouncing, aşırı parallax, sürekli dönüşen dashboard, ölçümleri olduğundan büyük gösteren animation, düşük kontrast.
- Erişilebilirlik: `prefers-reduced-motion` → bütün büyük hareketleri kapat; klavyeyle tüm kontroller; tooltip sadece hover değil click/focus.
- Performans: dönüşüm ve opacity animasyonları; büyük harita/geometriyi DOM'da frame frame animate etme; lazy load; mobile 60fps hedef (testle doğrula).

## Tasarım teslimleri / kabul
- [ ] Figma frame'leri: desktop 1440, tablet 768, mobile-web 390 (kritik sayfaların tamamı).
- [ ] Tasarım sistemi: palette, type scale, spacing, buttons, charts, badge, map layer, empty/loading/error variants.
- [ ] 8 sayfa için statik hi-fi + ana etkileşimler için tıklanabilir prototip.
- [ ] Motion storyboard: hangi eleman, trigger, duration, easing, reduced-motion alternatifi.
- [ ] En az üç tam akış: demo aç → NASA; parsel çiz → kaydet; cihaz simülasyonu → değerlendirme.
- [ ] Türkçe metinler, ekranlardaki örnek data etiketleri; web accessibility review.

## Tasarımcıya tek cümlelik yönlendirme
"Sat2Soil için NASA verisiyle desteklenen, harita merkezli, temiz yeşil-beyaz premium tarım platformu tasarla; profesyonel ama çiftçi dostu; hareketli animasyonları açıklama ve geri bildirim amaçlı kullan, veri dürüstlüğü ve erişilebilirliği koru."
