# Sat2Soil — NASA veri entegrasyon planı

## P0: NASA POWER gerçek zaman serisi
- Resmî docs: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Örnek endpoint şablonu (geliştirmeden önce parametre uygunluğu doğrula):
  `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN&community=AG&longitude={lon}&latitude={lat}&start={YYYYMMDD}&end={YYYYMMDD}&format=JSON`
- Uygulama tarla polygonunun centroid'ini kullanır; bu **uydu/meteoroloji grid referansıdır, saha içi noktasal ölçüm değildir**.
- JSON response doğrulaması: header parameter units; `properties.parameter`; tarih YYYYMMDD; -999 sentinel; coverage/date; hata kodları.
- Gerçek veri yoksa `unavailable`; önbellekten ise `cached_nasa` ve `retrieved_at`; demo seed ise `demo_sample`. UI'da veri tipleri karışmaz.
- Kaynak metadata ve kullanıcıya açıklama: kaynak/ürün, zamansal çözünürlük, merkez nokta, birim, API getiriliş tarihi, veri dönemi, çevresel ızgara çözünürlüğü.
- Çoklu kullanıcı yükünde token/timeouts/cache; aynı grid için aşırı sorgu NASA servisine yük bindirebilir.

## P1: GPM / IMERG
- https://gpm.nasa.gov/data/imerg
- Gerçek ürünü (Early/Late/Final), gecikmesini ve lisans/erişim mekanizmasını belirle; Earthdata auth ve veri hacmi gereksinimini test et. POWER `PRECTOTCORR` verisini GPM olarak gösterme.

## P1: Landsat + opsiyonel ESA Sentinel-2
- Landsat veri ürünleri ve AppEEARS (`https://appeears.earthdatacloud.nasa.gov/api/`) veya desteklenen erişim yolunu seç; auth/işleme süreci doğrula.
- NDVI: NIR/Red uygun ürün/bant, bulut maskeleme, tarih, çözünürlük ve kapsama şartları. Tarlayı görünürde boyayan sahte NDVI katmanı üretme.

## P2: SMAP / ECOSTRESS / SRTM
- SMAP yüzey toprak nemi geniş alan/çözünürlük; küçük tarla için kesin nem sunma.
- ECOSTRESS zaman/yer kapsamasını ve varsa ET/LST ürünlerini kontrol et.
- SRTM eğim için yükseklik katmanı; eğim ve erozyon yorumunda DEM hata ve çözünürlüğünü belirt.

## NASA → uygulama entegrasyon checklist
- [ ] N01 POWER istek örneğini backend'ten alıp kaydet; status ve JSON parse testi.
- [ ] N02 Tarih/saat, units, sentinel ve koordinat validasyonu.
- [ ] N03 Source metadata, cache/retry, stale UI state.
- [ ] N04 POWER veri grafiğinin canlı veriyle sayısal eşleşmesi.
- [ ] N05 Su/rotasyon hesaplarına giren verinin hangi kaynaktan geldiğinin izlenebilir olması.
- [ ] N06 GPM/Landsat için erişim ve veri işleme spike'ı; başarısızsa P1 ertele, sahte canlı kaynak yazma.
