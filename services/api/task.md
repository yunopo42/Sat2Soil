# Sat2Soil — Backend TASK.md (FastAPI / Render)

## API temeli [P0]
- [ ] B01 FastAPI projesi, env configuration, OpenAPI docs, `/health` readiness.
- [ ] B02 Versioned `/v1`, Pydantic request/response modelleri, global exception handler, logging, CORS allowlist.
- [ ] B03 Demo session: kısa ömürlü imzalı token, demo workspace sınırları, rate limiting ve güvenli shared demo seed.
- [ ] B04 Supabase PostGIS repository, migration çalıştırma, bağlantı pooling, birim testleri.

## NASA adapter [P0]
- [ ] B05 `NASA_POWER_BASE_URL` ile daily point; tarih aralığı, centroid koordinatı, parametre allowlist, API timeout.
- [ ] B06 JSON parse, parametre birim/timestamp, `-999` missing, semantik validasyon; `observed_at` ve `fetched_at` ayrımı.
- [ ] B07 Kaynak metadatası, geospatial çözünürlük uyarısı, TTL/cache (aynı grid gereksiz istek yok), stale fallback.
- [ ] B08 API testi gerçek NASA POWER başarılı/boş/429/5xx/network down senaryoları; prod erişimini doğrula.

## Tarla / analiz [P0]
- [ ] B09 `/fields` CRUD; geçerli Polygon/MultiPolygon, lon/lat sırası, alan ha hesabı PostGIS ile; invalid reject.
- [x] B10 Su koşulları hesaplama endpoint'i: günlük yağış ve seçilen ürün varsayımları; hesap yöntemi açıklama.
- [x] B11 Rotasyon 2+ senaryo, ürün kısıtları, dayanak veriler ve belirsizlik notu.
- [x] B12 Dijital ikiz snapshot ve comparison JSON; gerçek gözlem ile türetilmiş/varsayımsal ayrımı.
- [x] B13 Simüle cihaz seed API; `source_type=simulated_device` ve `computation_kind=mock` zorunlu.
- [x] B14 AgriSpray raporu: püskürtme/çevresel/bitki görseli ayrı; kesin biyolojik etkinlik iddiası yok.

## QA & deploy [P0]
- [ ] B15 pytest: geometri, NASA parser, missing data, senaryolar, scope izolasyonu.
- [ ] B16 Render start command (`uvicorn ... --host 0.0.0.0 --port $PORT`) proje yapısına göre test et, health probe, logs.
- [ ] B17 Prod CORS env, secret/SSL, NASA erişim sınırları, cache policy, API smoke test.

## P1 / P2
- [ ] GPM/IMERG adapter: Earthdata auth / erişim koşulları doğrulanınca; Landsat/AppEEARS bulut maskesi ve gerçek NDVI; P1 doğrulanmış OpenCV kart görüntü analizi.
- [ ] İhtiyaç olursa model inference endpoint'i; yalnız doğrulanmış model + veri seti/test sonucu varsa. P0'da model eğitimi yok.
