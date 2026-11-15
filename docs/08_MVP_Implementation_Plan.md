# RA Engineering AI — ilk geliştirme paketi (15 Kasım 2026)

## Kapsam ve dosyalar
Bu teslimat, GitHub projesindeki `api-panel` hizmetini genişletir. Daha önceki OpenAI API kullanım/bakiye paneli korunur; yeni **/operations** ekranı eklenir.

- **Telefon/PC ortak veri:** Tek sunucuda SQLite WAL (`api-panel/.data/ra-operations.sqlite`), bağlı kayıtlar için foreign key ve parametrik SQL. Veriler sadece sunucuda; tek başına bu paket bulut barındırma veya telefonun internetten erişimini sağlamaz.
- **API token ve maliyet:** `GET /api/summary` önceki OpenAI Costs/Usage entegrasyonunu kullanır. Yönetici anahtarı yoksa rapor pasif, doğrulanmış bakiye manuel tutulur; otomatik 'kalan token' uydurulmaz.
- **Makine/freze/malzeme:** ekle, görüntüle, düzenle ve insan doğrulaması işareti. Başlangıçta kayıtlar boştur.
- **Üretim/deneme hafızası:** malzeme-takım-makine-sipariş bağlantıları, RPM, mm/dk, paso, stepover, sonuç, insan onayı. Bunlar AI tarafından otomatik doğrulanmaz ve makineyi kontrol etmez.
- **Teklif/maliyet hesabı:** stok ebatları ve yoğunluk üzerinden kg, TL/kg, fire, işleme ve hazırlık dakikaları, EUR/saat bedel, elle girilen EUR/TRY, maliyet üzerine ekleme. KDV/kargo/vergiler/diğer giderler hariç; teklif tutarı kaydedildiği andaki veriyle dondurulur.
- **Müşteri/sipariş:** müşteri ve iletişim, sipariş, adet, durum ve teslim tarihi.

## Kurulum ve kontrol
- Node.js **22.16+** gerekir, **24.15+ önerilir**. `node:sqlite` Node 22 sürümlerinde deneysel uyarı verir.
- `cd api-panel && cp .env.example .env` (Windows'ta dosyayı kopyalayın); `.env` içine güçlü `DASHBOARD_PASSWORD` belirleyin. Yönetici API anahtarı isteğe bağlıdır.
- `npm test` sonra `npm start`.
- PC'de `http://127.0.0.1:4848/operations`, API kullanım panelinde `/`.
- Telefon erişimi için aynı sunucunun özel ağ üzerinden **HTTPS ile** erişilebilir olması gerekir. Şifrenin HTTP ile dış ağda taşınmasından ve router'da doğrudan port açılmasından kaçının.
- Sunucu kapalıysa telefon erişimi yoktur; 7/24 kullanım için kalıcı diskli sunucu gerekir.

## Tasarım ve API
`api-panel/operations-db.mjs` veritabanı ve doğrulama, `server.mjs` güvenli oturumdan sonra `/api/ops/*` rotaları, `public/operations.*` mobil arayüz; `tests/http.test.mjs` ve `tests/operations-db.test.mjs` testleri.

API yolları oturum gerektirir:
- `GET /api/ops/overview` → özet.
- `GET /api/ops/{machines,tools,materials,customers,orders,trials,quotes}` → kayıtlar (son 250).
- `POST /api/ops/{...}` → yeni kayıt; `PATCH /api/ops/{...}/{id}` → güncelle (teklifler tarihsel kayıt olarak değiştirilemez).

## Veri güvenliği / önemli engeller
1. Canlı `ra-engineering-ai.orangetoad4.chatgpt.site` projesinin düzenlenebilir kaynak kodu **GitHub'da bulunmuyor**. Bu paket, canlı siteyi kendiliğinden güncellemez ve oradaki tarayıcı verilerini otomatik taşımaz. Ayrı çalışır; canlı sisteme bağlamak için sitenin kaynak/edit erişimi ve eski kayıtların yedeği gerekir.
2. Bir tek yönetici parolası MVP testleri için kullanılır. Gerçek müşteri verileriyle internetten çok kullanıcılı sunum öncesinde kişi bazlı roller, HTTPS, şifreli kalıcı disk, KVKK incelemesi, oturum yönetimi ve denetlenmiş yedek/geri yükleme zorunlu.
3. `.env` ve `.data` Git'e eklenmez. **Repo public:** müşteri veya API anahtarı kesinlikle gönderilmez.
4. SQLite WAL dosyalarını kopyalamak yerine güvenilir SQLite yedekleme mekanizması ve düzenli geri yükleme testleri kurun. Ephemeral disk kullanmayın.
5. Testler sentetik kayıt kullanır; gerçek API kredisi ve gerçek müşteri verisi bağlanmadı.
6. Üretim parametreleri otomatik CNC komutu değildir. Operatör onayı, CAM simülasyonu, prova ve emniyet prosedürleri gereklidir.

## Kabul kriteri
- [x] Yetkisiz API isteği reddedilir.
- [x] Altı modül için taban veri modeli ve kullanıcı arayüzü oluşturulmuştur.
- [x] Teklif hesabı ve kötü sayısal giriş denetlenir.
- [x] Veritabanı kapanıp açıldıktan sonra kayıtlar kalır.
- [x] HTTP istekleri ve giriş sonrası farklı istemci aynı sunucu verisini alır.
- [x] Origin uyuşmazlığında POST reddedilir.
- [ ] Gerçek iPhone ve Windows tarayıcılarında HTTPS uçtan uca erişim doğrulandı.
- [ ] Mevcut canlı ChatGPT Sites uygulamasına yayınlandı.
- [ ] Eski tarayıcı kayıtları göç edildi.
- [ ] Gerçek OpenAI admin anahtarıyla kullanım/costs doğrulandı.

## Sıradaki adımlar
**S1:** Ayrı test sunucusunda yükle ve DNS/HTTPS/private network hazırla; canlı sitenin dışa aktarılmış kaynakları ve tarayıcı kayıtlarının yedeğini al.  
**S2:** Canlı uygulamanın kimlik doğrulama ve menülerine bağla, tekrar giriş istemeyecek SSO/oturum tasarımı; veri taşıma, staging ve yayın.  
**S3:** Sipariş kalemleri, stok hareketleri, teklif PDF, fatura aktarımı, kayıt sahipliği ve rol bazlı erişim.  
**S4:** Onaylı üretim kayıtlarında AI arama, masraf tahmini, görev akışları ve ikinci model entegrasyonu.
