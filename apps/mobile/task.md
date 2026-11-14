# Sat2Soil — Mobil TASARIM task.md (kod/mağaza yayını yok)

**Bu sprint:** sadece yüksek çözünürlüklü mobil arayüz, web tasarım sistemiyle uyumlu ekranlar ve tıklanabilir prototype. React Native/Expo geliştirmesi, gerçek BLE, backend ve App Store/Play Store dağıtımı **şu an kapsam dışı**.

## M0 Tasarım sistemi
- [ ] Web renkleri, tipografi, kartlar, ikonlar, badges ve grafik stillerini 390×844 tasarıma uyarla.
- [ ] Dokunma hedefleri ≥44×44; tek elde erişim; alt 4-sekme navigasyon: Tarlalar, NASA, Planlama, AgriSpray; dijital ikiz Planlama içinde.
- [ ] İkon+metin navigasyon, kısa Türkçe ifadeler, beyaz/yeşil açık tema; uzun değerlerde taşma yok.

## M1 Ekranlar — hi-fi mockup ve clickable
- [ ] M01 Splash: Sat2Soil marka; `Demoyu Başlat`; login/register yok.
- [ ] M02 Örnek tarla listesi + haritada poligon / tarla detay sheet.
- [ ] M03 NASA analizi: sıcaklık/yağış kartları, veri kaynağı ve tarih; `gerçek NASA` / `örnek` ayrımı.
- [ ] M04 Su ve rotasyon: mevcut / alternatif senaryo, sade kıyas grafiği.
- [ ] M05 Dijital ikiz: iki senaryo toggle ve önemli sonuçlar.
- [ ] M06 AgriSpray: konsept cihaz görseli, simüle sensör kartları, kart görüntüsü ve analiz sonuçları.
- [ ] M07 Bitki görsel takip: önce/sonra karşılaştırma; gerçek AI yoksa yalnız görsel.
- [ ] M08 Uyarı/rapor özeti: gösterim amaçlı durumlar etiketli.

## M2 Animasyonlu tasarım / etkileşim
- [ ] Splash → map fade/slide 250–450ms; sheet swipe/slide 220ms; tab indicator ~180ms.
- [ ] Kartı açma, grafik reveal, işlem simülasyonunu başlatma akışları; tüm animasyonlar kullanıcı eylemiyle anlamlı ilişki kursun.
- [ ] Reduced motion statik alternatif tasarla; sonsuz animasyon yok.

## M3 Teslim
- [ ] Figma frame listesi, web ile ortak component checklist, 8 ekran hi-fi tasarım.
- [ ] En az 2 tıklanabilir akış: Splash→NASA→Rotasyon; Tarlalar→AgriSpray→Rapor.
- [ ] Jüri slaytları için 3-4 mobil mockup PNG export.
- [ ] Bütün sensör verileri `Simüle cihaz` etiketli, cihaz bağlı göstergesi yok.
- [ ] **Kabul:** herhangi biri 30 saniyede mobilde tarla ve NASA analizini bulabilsin; görsel web ile tutarlı.
