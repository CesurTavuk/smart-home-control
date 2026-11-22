# SMART HOME CONTROL

## Dosyalar

- `index.html` — giriş ekranı ve iki yarım daire parlaklık göstergeli panel.
- `smart-home-control.ino` — Arduino Nano ve L298N için USB seri kodu.
- `wiring-diagram.svg` — Türkçe bağlantı şeması.
- `wiring-diagram.md` — pin tablosu ve kurulum adımları.
- `android-usb-bridge/` — Android’de TCPUART TCP bağlantısını yerel WebSocket’e aktaran köprü.

## Giriş

Kullanıcı adı `Smart Home` olarak kalır. Şifre, Cloudflare Worker’daki `CONTROL_TOKEN` ile sunucu üzerinden doğrulanır; şifre HTML’e yazılmaz veya kalıcı olarak saklanmaz. Arayüz giriş sırasında `/api/state` adresine `Authorization: Bearer ...` gönderir.

## Bilgisayar

1. `smart-home-control.ino` dosyasını Nano’ya yükleyin.
2. HTML’i Cloudflare’da yayınlanan HTTPS adresinde masaüstü Chrome/Edge ile açın ve giriş yapın.
3. Arduino IDE Serial Monitor’ü kapatın; aynı USB seri portu aynı anda iki program açamaz.
4. **USB’Yİ SEÇ VE BAĞLAN** düğmesine basıp Nano portunu seçin.

## L298N ve 12 V şerit LED

Nano D5→ENA, D6→ENB, D7→IN1, D8→IN2, D9→IN3, D10→IN4. ENA/ENB jumper’ları çıkarılır. Şerit LED 1 OUT1 (+) ve OUT2 (−), şerit LED 2 OUT3 (+) ve OUT4 (−) arasına bağlanır. L298N +12V/Vs harici 12 V kaynağa, GND ise kaynağın eksisine ve Nano GND’ye bağlanır.

Harici direnç eklenmez. Sadece 12 V akım sınırlaması üzerinde bulunan şerit LED kullanın; çıplak LED’i dirençsiz bağlamayın. L298N ısınabilir ve çıkış gerilimi beslemeden düşük olur; şerit akımı kartın sınırında kalmalı.

## Android USB köprüsü

Serial USB Terminal uygulamasının yayımlanan özelliklerinde web sayfasına USB aktarımı veya WebSocket sunucusu belgelenmiyor. Android Chrome da Web Serial API’yi resmî olarak sunmuyor. Köprü olarak TCPUART transparent Bridge ve Termux kullanılır.

1. TCPUART’ta USB UART’a bağlanıp TCP **server** modunu port `7000` ile başlatın.
2. Termux’ta Node.js kurun; `index.html` ve `android-usb-bridge/` klasörünü aynı ana klasöre koyun.
3. `android-usb-bridge/` içinde `npm install` ardından `node bridge.js` çalıştırın.
4. Tablet tarayıcısında `http://127.0.0.1:8765/` adresini açın. Giriş doğrulaması Cloudflare Worker’a güvenli HTTPS üzerinden iletilir; seri veri yerel köprüden taşınır.

TCPUART portunu değiştirdiyseniz `SERIAL_PORT=<port>` ortam değişkenini verin. TCPUART aynı USB portunu kullandığı için Serial USB Terminal’i aynı anda bağlamayın. TCP portunu internete yönlendirmeyin.

## Seri komutları

`115200` baud, 8-N-1. Panel `SET 1 75 1500`, `ON 2`, `OFF 1`, `FADE 500` ve `STATUS` gönderir. Arduino `STATE <kanal> <yüzde>` ile geri bildirim verir.

