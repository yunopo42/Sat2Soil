# Sat2Soil — Analiz motorları, AI kararı, prototip veri tanımı

## P0 modeli eğitmeden yapılabilir
1. **Su koşulları**: POWER yağış/sıcaklık serisi, geçmiş trendler, varsayım ve belirsizlik. Bitki Kc/evapotranspirasyon fiziksel denklemi kullanılacaksa FAO-56 girdilerini doğrula; eksikse `basitleştirilmiş yağış/iklim göstergesi` yaz, kesin sulama litre önerme.
2. **Rotasyon**: Kullanıcı ürün geçmişi + iklim/yağış + örnek ürün katalog kısıtları; açıklanabilir skorlama ve senaryo kıyası. Skor = ürün verim tahmini değildir. Local agronomi doğrulaması olmadan gübre/pestisit tavsiyesi üretme.
3. **Dijital ikiz**: field snapshot (gözlem, tarla çizimi, ürün geçmişi) + koşul ve rotasyon senaryoları; `observed` ve `simulated` veri ayrı.
4. **AgriSpray P0**: Test kartı fotoğrafı ve simüle sensör JSON'ı; örnek sonuçlara `computation_kind=mock` etiketi. Bu data bilimsel ölçüm gibi pazarlanmaz.

## AgriSpray üç değerlendirme hattı
**Püskürtme kartı**: hedeflenen gelecekteki pipeline: LED sabit ışık → kart tespiti → perspektif düzeltme → mavi iz segmentasyon → kart yüzeyinde coverage % = mask alanı / kart geçerli alanı *100 → iz/cm² (birleşen lekeler hata) → bölge bazlı homojenlik. P1'de gerçek OpenCV denemesi yapılabilir.
**Çevre**: yerel ölçüm gelecekte prototipten; NASA POWER geçmiş/bölgesel trend ve yağış bilgisiyle destek. Anlık rüzgâr için NASA gridi yerel sensör yerine geçmez. Ürün etiketi, hedef ürün ve kalibrasyon olmadan otomatik püskürtme komutu/dosaj önerisi yok.
**Biyolojik gözlem**: önce/sonra görsellerini karşılaştır; kontrol grubu/etiketli saha gözlemi olmadan ilaç etkinliği yüzde sayısı çıkarma. Model eğitilmediyse 'hastalık teşhisi' yazma.

## Data source tipleri (enum)
`live_nasa | cached_nasa | manual_user | simulated_device | actual_device_future | derived_indicator | scenario_estimate | unavailable`.
`actual_device_future` gelecek için rezerve, MVP'de kullanılmayacak.

## Örnek cihaz JSON (tamamen simüle)
```json
{
  "device_id": "SAT2SOIL_CONCEPT_01",
  "field_id": "demo-field-01",
  "source_type": "simulated_device",
  "recorded_at": "2026-11-14T12:00:00Z",
  "soil": {"moisture_pct": 31.4, "temperature_c": 20.7, "ec_ms_cm": 0.82},
  "ambient": {"temperature_c": 24.0, "relative_humidity_pct": 48.0},
  "spray": {"card_coverage_pct": 26.2, "analysis_kind": "mock", "image_uri": "demo/spray-card-01.jpg"},
  "quality_note": "Örnek veri; gerçek cihaz ölçümü değildir"
}
```

## Model eğitimi gerekirse P2 planı
- Tek ürün ve tek hedef hastalık seç, hedef sınıflar ve izinli veri seti belirle.
- Aynı tarla/fotoğraf serisinden train ve test sızıntısını önle; zaman ve arazi bazlı ayrım yap.
- Etiket doğrulaması (ziraat uzmanı), sınıf dengesi, augmentasyon, bağımsız test, precision/recall/F1 ve kalibrasyon.
- Segmentasyon için mIoU/Dice; güven eşiği altında abstain; model version/metadata/limitleri raporla.
- İlaç biyolojik etkinliği için kontrollü deney, ilaç/zaman/ürün/hastalık kaydı ve karşılaştırma grubu gerekir. MVP'ye zorunlu tutma.

## Analiz kabul kriterleri
- [ ] Her sonuç `method`, `data_sources[]`, `assumptions[]`, `uncertainty_note`, `status` içeriyor.
- [ ] Girdi değişince çıktı deterministik açıklanabilir değişiyor; testlerle doğrulanıyor.
- [ ] Simüle veya eksik ölçüm için sahte kesinlik/teşhis/etkinlik yok.
