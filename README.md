# RA Engineering AI

RA Endüstri'nin mühendislik, CNC router iş analizi, üretim kayıtları ve işletme çalışma alanı projesi.

## Canlı uygulama

[RA Engineering AI (ChatGPT Sites)](https://ra-engineering-ai.orangetoad4.chatgpt.site)

> **Önemli:** Canlı uygulama bir ChatGPT Sites projesidir. Bu GitHub deposu henüz canlı Site'ın **tam kaynak kodunu** içermez. Buraya commit yapmak tek başına canlı Site'ı güncellemez.

## API kullanım ve bakiye paneli

Yeni modülün kaynakları [`api-panel/`](api-panel/) klasöründedir:

- OpenAI Organization Usage ve Costs raporları
- Giriş/çıkış tokenleri, önbellekte kullanılan tokenler ve istekler
- Günlük kullanım grafiği
- Son doğrulanan API kredisi (USD) — manuel, zaman damgalı
- Telefon ve PC'de aynı sunucudan paylaşılan veri
- Sunucu tarafında tutulan API yönetici anahtarı, oturum kontrolü

Kurulum: [`api-panel/README_TR.md`](api-panel/README_TR.md)

Mevcut Sites uygulamasına güvenli entegre etme: [`api-panel/INTEGRATION_SITES.md`](api-panel/INTEGRATION_SITES.md)

**Durum:** Modül hazır ve yerel testlerden geçti. ChatGPT Sites projesine kaynak erişimi sağlanıp yeniden yayımlanmadan canlı uygulamaya eklenmiş sayılmaz. Gerçek kullanıcı API bakiyesi/kullanımı bu depoda bulunmaz.

## Diğer belgeler

Mevcut `docs/` mühendislik rehberleri ve `cases/` iş örnekleri korunmuştur.


## Üretim ve işletme MVP — 2026-11-15
- [Mobil/PC ortak kayıt ve API maliyet paneli](api-panel/README_TR.md) (`/operations`)
- [MVP mimarisi, güvenlik ve yol haritası](docs/08_MVP_Implementation_Plan.md)
- Başlangıç: `cd api-panel` → `.env.example` dosyasını `.env` kopyalayın → `DASHBOARD_PASSWORD` belirleyin → `npm test` → `npm start`.
- Not: Canlı ChatGPT Sites uygulaması ile aynı deploy değildir. Canlı sürüm henüz güncellenmedi.


## İlk gelişim paketi: merkezi iş kayıtları ve teklif önizleme

Ana dalda zaten bulunan `api-panel/operations-db.mjs` ortak SQLite kayıtları, `/api/ops/*` API'si ve `/operations` ekranı **tek veri kaynağı** olarak korunur. Yeni taslak değişiklikler teklifin **kaydedilmeden hesaplanmasını** ve buna ilişkin HTTP testlerini ekler.

[Altı önceliğin uygulama planı](docs/09_Development_Roadmap_v1.md). Bu GitHub modülü canlı ChatGPT Sites'ın otomatik dağıtımı değildir.
