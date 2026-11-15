# RA Engineering AI — API Kullanımı ve Bakiye Paneli

Bu teslimat, **mevcut RA Engineering AI uygulamasına entegre edilebilecek bağımsız bir modüldür.** Kullanıcının mevcut chatgpt.site uygulamasının kaynaklarına bu oturumda yazma erişimi olmadığından, **canlı siteye henüz dağıtılmamıştır.**

## Neler hazır?
- Mobil ve masaüstünde çalışan duyarlı web arayüzü; aynı sunucudan ortak veri.
- Güvenli oturum açma ve çıkış.
- **OpenAI Organization Costs API** üzerinden bu ayın toplam API maliyeti ($).
- **OpenAI Organization Usage Completions API** üzerinden bu ayın giriş/çıkış/cached token ve istek adedi.
- Son 14 günlük token grafiği.
- OpenAI Billing panelinde görülen **doğrulanmış bakiye** değerini manuel girip bütün cihazlarda ortak görüntüleme. Son doğrulama tarihi açıkça gösterilir.
- 5 dakika rapor önbelleği ve başarısız bağlantıda açık hata mesajı.
- API anahtarının tarayıcıya hiçbir zaman gönderilmemesi.
- Node.js yerleşik modülleri haricinde paket bağımlılığı yoktur.

## Önemli teknik gerçek
**OpenAI'nin belgelenmiş, API anahtarıyla çağrılabilen bir "anlık kalan ön ödemeli kredi bakiyesi" uç noktası yok.** Bu yüzden bakiye otomatik canlı veriye dönüştürülmedi. OpenAI Billing sayfasında görülen bakiye girildiğinde, telefon/PC ekranlarında aynı değer görünür; gerçek zamanlı bakiye olduğu iddia edilmez. Hesapta "kalan token" adlı sabit kota da yok: kalan kredi USD olarak tutulur, token tüketimi modele göre ücretlendirilir.

## Kurulum — Windows PC
1. Node.js 20.12 veya daha yeni bir sürümü kurun.
2. `.env.example` dosyasını `.env` adıyla kopyalayın.
3. `.env` içinde `DASHBOARD_PASSWORD` değerine **en az 14 karakterlik güçlü bir parola** yazın.
4. Otomatik kullanım raporu istiyorsanız, **OpenAI Platform organizasyon yöneticisinin** oluşturduğu `OPENAI_ADMIN_KEY` değerini **yalnızca sunucudaki `.env` içine** girin. Bu yönetici anahtarı güçlü yetkilere sahiptir: istemci uygulamasına, telefona, GitHub'a veya sohbete yapıştırmayın. Anahtar verilmeden bakiye girişi/görüntüleme yine çalışır.
5. Uygulamayı `start-windows.cmd` ile başlatın; ya da terminalde `npm start` kullanın.
6. Bilgisayarda `http://127.0.0.1:4848` adresini açın ve giriş yapın.
7. OpenAI resmi fatura panelinden kalan USD tutarını bakıp **Bakiyeyi güncelle** ile kaydedin: https://platform.openai.com/settings/organization/billing/overview

## Telefon erişimi
- İki cihaz **aynı çalışan sunucuya** erişmeli. İki farklı cihazda iki farklı kopya kurmayın; ortak bilgi server'daki `.data/verified-balance.json` dosyasında saklanır.
- Telefon erişimi için `HOST=0.0.0.0` ayarlamak bağlantıyı ağa açar. Bunu **doğrudan internete port açarak yapmayın.** Özel ağ / Tailscale + tercihen HTTPS ters vekil gibi güvenli erişim kullanın; oturum şifresinin düz HTTP üzerinden uzaktaki ağa taşınmamasına dikkat edin.
- Sunucu PC kapalıysa telefon erişimi de kapanır. 7/24 erişim için güvenli bir sunucuya taşımak gerekir.
- Destekleyen tarayıcılarda web uygulamasını Ana Ekran'a ekleyebilirsiniz; bu bağımsız yerel mobil uygulama değil, PWA uyumlu web arayüzüdür.

## Mevcut RA Engineering AI'ya bağlama
1. Kaynak kodu olan sunucu projesiyle aynı erişim/güvenlik sınırında `server.mjs`'in API uç noktalarını birleştirin veya ayrı hizmet olarak kurun.
2. Mevcut üst menüye **API Kullanımı** bağlantısı ekleyin.
3. Mevcut kullanıcı oturumu varsa buradaki örnek şifreli giriş mekanizması yerine mevcut oturum ve rol kontrolleriyle entegre edin.
4. Token ve maliyet verileri için **API projesi** bazında filtre isteniyorsa `.env` `OPENAI_PROJECT_ID` ekleyin; aksi takdirde organizasyon genelini gösterir.
5. Kesin bakiye canlı otomatik çekilemeyeceği için bunu "doğrulanan bakiye" olarak isimlendirin.
6. API geri dönüşlerine ait tokenler yalnızca completions/response benzeri metin modelleri içindir. Toplam maliyet hesaplarında diğer araçların maliyetleri olabilir.

## Harcama güvenliği
- API Costs, Usage raporlarını görmek için yönetici API anahtarı gereklidir; normal uygulama anahtarını değiştirmek zorunda değilsiniz.
- Anahtarı yalnızca sunucu tarafında tutun. `.env` ve `.data` Git'e eklenmemeli.
- Bu panel harcamayı **gösterir**, kendisi OpenAI faturalandırma limitlerini değiştirmez veya durdurmaz.
- OpenAI raporları gecikmeli gelebilir; gerçek zamanlı kesin ücret sayacı değildir.

## Kaynaklar
- OpenAI Costs: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- OpenAI Usage: https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization
- Kullanım ve Billing ayrımı: https://help.openai.com/en/articles/10478918-reviewing-api-usage-and-costs
- Resmi Billing: https://platform.openai.com/settings/organization/billing/overview


## Üretim ve işletme MVP modülleri (15.11.2026)
Bu sürümde mevcut API paneli korunmuş, **`/operations`** yoluna ortak üretim ve işletme ekranı eklenmiştir.

- Makine, freze, malzeme: ekle / listele / düzenle; kayıt doğrulama seçeneği.
- Denemeler: makine, malzeme ve takım ilişkisi; devir, ilerleme, paso, sonuç ve onay.
- Müşteri, sipariş: bağlantılı kayıtlar, teslim tarihi ve iş durumu.
- CNC teklif hesaplayıcı: malzeme hacmi × yoğunluk, malzeme TL/kg, fire, CNC dakika × EUR/saat × kullanıcının girdiği EUR/TRY, hazırlık ve maliyet üzeri ekleme oranı. KDV/lojistik/diğer giderler **dahil değil**.
- Ortak veritabanı: `RA_DB_PATH` ile belirtilen SQLite dosyası, aksi hâlde `.data/ra-operations.sqlite`. Telefon ve PC aynı sunucuya bağlanırsa aynı bilgileri görür.

**Yeni asgari Node.js:** 22.16; 24.15+ önerilir. `node:sqlite` eski sürümlerde deneysel uyarı gösterebilir.

**Önemli:** Mevcut ChatGPT Sites uygulamasının kaynak kodu bu depoda olmadığından yeni modüller o canlı siteye henüz eklenmedi. Bunları ayrı API paneli sunucusunda çalıştırabiliriz. Canlı siteyle birleştirmek için kaynak kod / yayımlama erişimi gereklidir.

**Yedekleme ve KVKK:** `.env` ve `.data` dizinlerini hiçbir zaman GitHub'a göndermeyin. Müşteri bilgileri için şifreli disk, HTTPS, erişim kontrolü, düzenli SQLite yedeği ve kurtarma testi planlayın.

Geliştirme ve test planı: [`docs/08_MVP_Implementation_Plan.md`](../docs/08_MVP_Implementation_Plan.md).
