# Sat2Soil — Motion storyboard

G0 teslimi (D-005, D-018). Her animasyon bir **değişikliği açıklar**: yeni veri geldi, bir seçim değişti, bir panel açıldı.
Süsleme için animasyon yok. Bütün süre ve eğriler tek dosyadan gelir: `apps/web/src/lib/motion/tokens.ts`.

## Tokenlar

| Token | Değer | Ne için |
|---|---|---|
| `fast` | 150 ms | Hover, focus, ok işaretleri, renk geçişleri |
| `normal` | 250 ms | İçerik girişi, çapraz geçişler |
| `panel` | 220 ms | Çekmece, sağ panel, "Nasıl hesaplandı?" açılır alanı |
| `emphasis` | 450 ms | Kart girişleri, senaryo kartı değişimi |
| `slow` | 700 ms | Grafik çizimi, poligon sınırının çizilmesi |
| `ease.out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Giren ve yerine oturan her şey |
| `ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | İki konum arasında hareket |
| `indicator` | yay: stiffness 520, damping 42 | Sekme, segment ve menü göstergeleri |
| Mesafe | 8 px (kart, metin) · 16 px (panel) | Yer değiştirme |
| Ölçek | 0.98 → 1 | Basılan buton |
| Kademe | 60 ms | Kart grupları |

## Uygulama içi hareketler

| # | Eleman | Tetik | Hareket | Süre / eğri | Azaltılmış hareket (reduced motion) | Durum |
|---|---|---|---|---|---|---|
| M01 | Buton | Basma | scale 0.98 | 150 ms ease.out | Kapalı | ✅ Faz 1 |
| M02 | Segment (Su · Rotasyon, Kuru · Normal · Islak) | Seçim | Seçili zemin kayar | yay `indicator` | Anında yer değiştirir | ✅ Faz 1 |
| M03 | Sekme çizgisi (AgriSpray) | Seçim | Alt çizgi kayar, içerik çapraz geçer | 180 ms + 150 ms | Anında | ✅ Faz 1 |
| M04 | Sol menü göstergesi | Sayfa değişimi | Aktif zemin yeni öğeye kayar | yay `indicator` | Anında | ✅ Faz 1 |
| M05 | "Nasıl hesaplandı?" | Tıklama | Yükseklik + opaklık açılır, ok döner | 220 ms ease.out | Yalnız opaklık | ✅ Faz 1 |
| M06 | Kart grubu | Görünür alana girme (bir kez) | opaklık 0→1, y 8→0, 60 ms kademe | 450 ms ease.out | Yalnız opaklık | ✅ Faz 1 |
| M07 | Sayısal değer | Değer değişimi (senaryo, ürün) | Eski değerden yeniye sayar | 300 ms ease.out | Anında yeni değer | ✅ Faz 1 |
| M08 | Grafik çizgisi ve çubuklar | Veri ilk geldiğinde | Soldan sağa açılır (zaman ilerliyormuş gibi) | 700 ms ease.out | Hareket yok, grafik hazır gelir | ✅ Faz 1 |
| M09 | İskelet → veri | Veri geldi | İskelet nabız atar, veri çapraz geçişle gelir | 250 ms | Nabız yok | ✅ iskelet / Faz 4 geçiş |
| M10 | Grafik okuma imleci | İmleç / ← → | Dikey çizgi ve noktalar değeri izler | Anında | Aynı | ✅ Faz 1 |
| M11 | Sağ panel / çekmece | Tarla seçimi, dar ekran | x 16→0 + opaklık | 220 ms ease.out | Yalnız opaklık | Faz 3 |
| M12 | Harita odağı | Sayfa değişimi | Harita geniş ↔ kompakt; bitince `map.resize()` | 450 ms ease.inOut | Anında | Faz 3 |
| M13 | Poligon sınırı | Tarla seçildi / kaydedildi | Sınır bir kez çizilir | 400–650 ms | Hazır çizili | Faz 3 |
| M14 | Bildirim (toast) | Kaydet, hata | Alttan 8 px yükselir, 4 sn sonra söner | 250 ms | Yalnız opaklık | Faz 3 |
| M15 | Senaryo kartı değişimi | Ürün / senaryo değişti | Düzen animasyonu, sıçrama yok | 180–250 ms | Anında | Faz 5 |
| M16 | Zaman çizelgesi kaydırma (dijital ikiz) | Sürükleme | Harita rengi ve grafik imleci izler | 150–250 ms | Anında | Faz 6 |
| M17 | Kart tarama (AgriSpray) | "Örnek analizi çalıştır" | İnce tarama çizgisi kartın üzerinden geçer, ≤1.2 sn | 1.2 sn | Tarama yok, sonuç gelir | Faz 7 |
| M18 | Yönlendirmeli demo adımı | İleri / geri | İlgili kart vurgulanır, sayfa kayar | 450 ms | Vurgu kalır, kayma yok | Faz 9 |

## Landing (Faz 8)

Sinematik sahne, D-004'teki kurallara bağlıdır. Faz 8'de three.js yerine videodan kare dizisi kullanıldı (D-028);
bölüm 460vh, içerik sticky; ilerleme `useScroll` ile 0–1, kare = ilerleme × 102.

| Perde | Tetik | Ne olur | Azaltılmış hareket / zayıf cihaz |
|---|---|---|---|
| 1 · Yörünge | Sayfa açılışı (ilerleme 0–0,2) | Dünya + uydular (kare 0); başlık, CTA, Space Apps rozeti; 0,12–0,2'de kaybolur | Statik poster + aynı metin |
| 2 · Atmosfer | Kaydırma (0,24–0,54) | Bulutların içinden tarlalara iniş; "NASA Dünya gözlemi" kartı | Yok (poster) |
| 3 · Toprak | Kaydırma (0,58–0,84) | Toprağa inen konsept cihaz; "Konsept cihaz" etiketi | Yok (poster) |
| 4 · Karar | Kaydırma (0,86–1) | Lacivert örtü, gerçek uygulama ekranı yukarı kayarak belirir; tarla sınırı 700 ms'de bir kez çizilir | Yok (poster) |
| CTA | "Demoyu Başlat" | Doğrudan `/demo` (iniş animasyonu yok: kaydırma zaten aynı yolu anlatıyor) | Doğrudan `/demo` |

## Yasaklar

- Sürekli hareket eden arka plan (landing hero hariç, D-004), sonsuz döngüler, zıplayan öğeler.
- Aşırı parallax, kaydırmayı ele geçirme (scroll hijack).
- Verinin anlamını bozan hareket: değerleri olduğundan büyük gösteren, eğriyi yumuşatıp olmayan değer uyduran animasyon.
  Grafikler bu yüzden düz segmentlerle çizilir.
- Yalnız hover'la ortaya çıkan bilgi: tooltip'ler klavye odağında da açılır, grafik okuma klavyeyle de çalışır.
- Harita geometrisini DOM'da kare kare canlandırmak. Harita hareketini MapLibre yönetir.

## Uygulama notları

- Global `MotionConfig reducedMotion="user"`: transform ve layout animasyonları kapanır, opaklık kalır.
- Transform olmayan animasyonlar (grafik çizimi, sayı sayma) ayrıca `useReducedMotion()` ile kapatılır.
- Yalnız `transform`, `opacity` ve SVG clip genişliği anime edilir; yerleşim (layout) kaymasına yol açan özellikler canlandırılmaz.
- Sayfa ilk açıldığında sayılar "saymaz"; sunucu HTML'i zaten doğru değeri taşır. Sayma yalnız değer değişince olur.
