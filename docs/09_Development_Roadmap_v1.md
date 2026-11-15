# RA Engineering AI — İlk gelişim paketi

15 Kasım 2026 · Uygulanabilir mimari ve canlıya geçiş kontrol listesi.

## Mevcut kaynak ve canlı sistem

- Canlı site: https://ra-engineering-ai.orangetoad4.chatgpt.site — ChatGPT Sites. Var olan CNC iş analizi / hesaplamalar / günlük işler korunmalı.
- GitHub: raendustri/ra-engineering-ai. Canlı ChatGPT Sites'ın tüm kaynaklarını içermez; GitHub'da commit tek başına canlı siteyi güncellemez.
- İşletme modülleri **zaten aynı** Node sunucusu üzerinde: api-panel/operations-db.mjs (SQLite), api-panel/server.mjs (/api/ops), api-panel/public/operations.html.
- Yeni bir paralel müşteri/teklif veritabanı kurmuyoruz; tek doğru kaynak `RA_DB_PATH` ile gösterilen veritabanıdır.

## Altı öncelik: v1 gerçek kapsam

| Öncelik | GitHub'da bulunan işlev | Eksik / sonraki geliştirme |
|---|---|---|
| Ortak telefon ve PC verisi | Sunucu SQLite, /api/ops, ortak HTTPS adresinden erişim mantığı | Kalıcı barındırma, HTTPS, ayrı roller, yedekleme ve Site entegrasyonu |
| API token ve maliyet | /api/summary, /api/balance, grafik ve sunucu admin key | Gerçek OpenAI yönetici anahtarı yetkilendirmesi, kesin kalan bakiyenin manuel doğrulanması |
| Makine / freze / malzeme | İlişkili makineler, tools, materials CRUD; verified işareti | Takım stok ve malzeme hareket defteri; doğrulanmış ana veriler |
| Üretim ve deneme hafızası | orders ile trials ilişkisi, spindle/rpm/feed/depth/stepover, sonuç | Dosya eki, deneme revizyonu, rapor, doğrulama disiplini |
| Teklif ve CNC maliyet | Parça hacmi→kg, malzeme fiyatı, fire, € saatlik CNC, EUR/TRY, süre, markup | **Bu PR: kaydetmeden teklif önizleme**, sonraki: KDV, işçilik, genel gider, nakliye, PDF |
| Müşteri ve sipariş | Customers, orders, durumlar ve ilişkiler | Teslimat/ödeme/fatura detayları, roller ve CRM filtreleri |

## Önerilen geçiş sırası

1. Canlı ChatGPT Sites sürümü ile mevcut tarayıcıda tutulan iş kayıtlarının yedeğini al. Kullanıcı verisi otomatik aktarılamaz.
2. Taslak PR testlerini (Node.js 24 `cd api-panel && npm test`) çalıştır; kod güvenlik kontrolünü yap.
3. Kalıcı sunucu/disk, güçlü ayrı parola, HTTPS veya güvenli özel ağ sağla. `OPENAI_ADMIN_KEY` yalnızca sunucuda. Yönetici anahtarını mobil istemciye verme.
4. Günlük SQLite WAL-uyumlu yedek, başka konuma kopya ve gerçek geri yükleme testi hazırla.
5. Eski ChatGPT Sites kayıtlarını yetkili kullanıcı onayıyla dışa aktar, tekilleştir, SQLite'a kontrollü import et. Önce örnek işlemle teyit et.
6. Canlı Sites editöründe **aynı uygulamaya** menü ve API entegrasyonu yap; farklı domaindeki servise doğrudan cookie paylaşımı varsayma.
7. PC'de müşteri ekle/telefonda gör, deneme kaydet, önizleme hesapla (kayıt sayısı artmamalı), teklif kaydet (bir kayıt oluşmalı), API maliyeti boş/bağlı durumunu dene. Ardından kontrollü yayımla.

## CNC fiyat hesabı

Mevcut hesaplayıcı: `kg = (en × boy × kalınlık mm³ / 1e6) × yoğunluk(g/cm³) × adet`. Malzeme maliyeti kg ve fireye; makine maliyeti adet başına süre, bağlama, EUR saatlik bedel ve **elle girilen** EUR/TRY kuruna bağlı. `markup_pct` maliyete uygulanan **fiyat ekleme oranıdır**; satışa göre brüt marj değildir. KDV, işçilik, genel gider, kargo ve ödeme komisyonu otomatik eklenmez. Her parametre teyit edilmeli.

## Kabul kriterleri ve riskler

- 8 modül (machines, tools, materials, customers, orders, trials, quotes, overview) tek **RA_DB_PATH** veritabanında.
- Yetkisiz /api/ops erişimi 401; farklı origin mutasyon 403.
- Teklif önizleme POST yalnızca hesap yapmalı, teklif kaydı oluşturmamalı. KDV hariç olduğu açık.
- İki cihazın gerçekten aynı sunucuya bağlandığı doğrulanmalı. Sunucu kapalıysa telefon çevrimdışı olur.
- **Henüz canlı uygulamaya aktarılmış değildir.** İkinci müşteri/sipariş veritabanı oluşturulmadı; mevcut GitHub data dosyaları ve canlı site kaydı otomatik birleşmez.
