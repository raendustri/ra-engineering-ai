# ChatGPT Sites üzerinde çalışan RA Engineering AI ile entegrasyon

## Mevcut durum

Canlı RA Engineering AI, bir **ChatGPT Sites** projesidir. Bu GitHub deposundaki `api-panel/` klasörü bağımsız Node.js tabanlı, güvenlik kontrolleri olan API ölçüm servisinin kaynak kodunu içerir. GitHub'a dosya eklemek, ChatGPT Sites'e otomatik olarak dağıtım yapmaz. Mevcut Site'ın kodunu görmeden canlı Site'ın yerine bu modülü yayımlamayın; günlük işler, hesaplamalar, iş analizleri ve üretim kayıtlarını kaybedebilirsiniz.

## Güvenli entegrasyon sırası

1. ChatGPT > **Sites** > RA Engineering AI > **Edit site** ile mevcut Site'ın düzenleme oturumunu açın; **önce sürümü kaydedin**.
2. Editör/Codex üzerinden Site'ın mevcut kaynak kodunu dışa aktarın veya mevcut siteyi düzenleme oturumunda açın. Bu depodaki `api-panel/` kaynaklarını **referans olarak** kullanın.
3. Üst navigasyona `API Kullanımı` ekleyin. Frontend'i mevcut oturum sistemini kullanacak biçimde mevcut Site'a yerleştirin; eğer ayrı alan adına servis olarak kurarsanız iframe yerine açık yönlendirme kullanın (bu örnek güvenli cookie/same-origin ve CSP sebebiyle iframe'e uygun değildir).
4. Sunucu tarafında `/api/summary`, `/api/status`, `/api/balance` (yalnızca yetkili yönetici) veri işlemlerini Site'ın mevcut backend/router yapısına uyarlayın. Normal kullanıcıya bir organisation admin API key sunmayın. `.env` veya sırlar kod tabanına veya tarayıcıya konulmamalıdır.
5. ChatGPT Sites'in **Settings > Secrets/Environment Variables** bölümüne gereken sırları yalnızca **Site sahibi** tanımlar. `OPENAI_ADMIN_KEY` yalnızca güvenli sunucu ortamında saklanmalıdır. `OPENAI_PROJECT_ID` ilgili projeyi filtreler. Yönetici anahtarı vermiyorsanız token/harcama rakamları `bağlı değil` görünmelidir.
6. Kalan kredi, OpenAI tarafından belgelenmiş canlı kredi API'si olmadığından **manuel son doğrulama** olarak görünür. `balance.verifiedAt` zorunlu kalmalı; tek sunucu veritabanında saklanmalı ve cihazlar arasında paylaşılan kayıttan okunmalı. Hiçbir zaman otomatik, anlık bakiye olarak etiketlemeyin.
7. Mobil ve PC görünümünü, API bağlantı hatasını, yetkisiz kullanıcıyı, yanlış anahtarı ve eksik bakiyeyi test edin. Test ortamında API yönetici anahtarını çıkış/görsel/network loglarında göstermediğinizi doğrulayın.
8. Önizlemeyi onaylayıp **mevcut Site projesindeki** sürümü yeniden dağıtın. Başka bir URL'de sıfırdan bağımsız bir site açmak mevcut uygulamanın güncellendiği anlamına gelmez.

## Hesapla ilgili önemli notlar

- ChatGPT Plus bakiyesi OpenAI Platform API kredisi değildir.
- Kullanım için ayrı bir OpenAI organizasyon yönetici anahtarı gerekebilir. Mevcut `OPENAI_API_KEY`, `OPENAI_ADMIN_KEY` ile aynı değildir.
- Ölçüm paneli **harcamayı sınırlamaz**, yalnızca raporlar.
- Bu depoda kimlik bilgisi, müşteri verisi veya gerçek bakiye bulunmamalıdır.

## Operasyon

Yerel testler: `cd api-panel && npm test`.
Yerel çalıştırma: `cd api-panel`, `.env.example` dosyasından `.env` oluşturun, güçlü `DASHBOARD_PASSWORD` belirleyin, `npm start` komutunu çalıştırın, sonra http://127.0.0.1:4848 adresine bağlanın.
Telefon erişimi için internete açık port yönlendirmesi yapmayın. Güvenli özel ağ üzerinden HTTPS ile sunun.

## Resmî belgeler

- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization