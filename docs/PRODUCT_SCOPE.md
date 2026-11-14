# Sat2Soil — Ürün kapsamı ve yarışma anlatısı

## Problem
İklim belirsizliği ve su kısıtı altında çiftçinin tarlasına yönelik ürün rotasyonu kararı vermesi zor. Bölgesel uydu verisi tek başına tarla içi sensör ölçümü değildir. İlaçlama uygulama kalitesinin sahada değerlendirilmesi de ayrı bir ihtiyaçtır.

## Değer önerisi
1. Kullanıcı harita üzerinde sınır çizer ya da demo tarla açar.
2. Seçilen konum için NASA POWER'ın **gerçek** zaman serisi backend'den alınır; verinin kaynağı, ölçü birimi, tarih/çözünürlük ve yenileme durumu belirtilir.
3. Kullanıcı ürün geçmişi, su/ekim tercihleri girer.
4. Açıklanabilir karar motoru mevcut ürün planını alternatif rotasyonla karşılaştırır; belirsizlikler gösterilir.
5. Dijital ikiz *senaryo temsili* alanı: farklı ürün/su koşullarının karşılaştırılması.
6. AgriSpray: konsept cihazın beklenen toprak/çevre/kart/görsel çıktıları **simülasyon** olarak gösterilir; ileride gerçek akışla değiştirilebilecek sözleşme hazırlanır.

## P0 canlı web uçtan uca demo
- Landing → Demoyu Başlat → örnek parsel + haritadan yeni poligon çizme.
- Poligon validasyonu, alan (hektar/dönüm), kaydetme/yeniden yükleme.
- POWER gerçek veri: en az sıcaklık ve yağış zaman serisi; eksik veriler, birimler, tarih, kaynak ve cache gösterilir.
- Su koşulları değerlendirmesi: güvenilir ve açıklanmış basit gösterge; tam ET0 yalnız veri/formül gereksinimleri karşılanıyorsa.
- Alternatif ürün rotasyonu: en az iki planı açık varsayımla karşılaştırma.
- Dijital ikiz ekranı: mevcut veri + varsayımsal senaryo, asla doğrulanmış verim tahmini gibi sunma.
- AgriSpray: örnek sensör ve ilaçlama kartı sonuçları, görsel karşılaştırma, açık DEMO ibaresi.
- Vercel canlı web + Render API + Supabase, hata/fallback ve erişilebilir responsive UI.

## P1 mümkünse
- GPM IMERG gerçek yağış kaynağı, Landsat/Sentinel-2 NDVI katmanı (uygun yetkilendirme, bulut maskesi, tarih ile).
- Gerçek suya duyarlı kart örnek görsellerini OpenCV ile analiz (kart maskesi/kaplama yüzdesi).
- Paylaşılabilir/yazdırılabilir analiz özeti; i18n EN.

## P2 ertele
- Kullanıcı hesapları, ticari abonelik, gerçek cihaz Bluetooth bağlantısı, tam fiziksel dijital ikiz, otomatik zirai ilaç reçetesi, kanıtlanmamış hastalık teşhisi/yüzde etkinlik, zorunlu model eğitimi.

## 3 dakikalık jüri akışı
00:00 giriş; 00:20 hazır tarlayı aç; 00:40 gerçek NASA POWER veri grafiği + kaynak etiketi; 01:15 su koşulu ve mevcut/alternatif rotasyon; 02:00 dijital ikiz; 02:25 AgriSpray konsept cihazın simüle analiz akışı; 02:55 etki/gelecek adımlar.

## Başarı kanıtı
Gerçek API cevabı/network veya kayıtlı test kanıtı; çizilen poligonun DB'de korunması; hesapların varsayımları; demo ile gerçek verinin ayrılması; yayın URL ve test raporu.
