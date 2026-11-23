# SMART HOME CONTROL

Mevcut iki tek renkli LED kanalını Arduino üzerinden kontrol eden web paneli.

## Yeni özellikler
- Müzik modu: mikrofon tabanlı ritim, nefes, strobe, dalga ve karışık efektler.
- Pardus Linux yerel sunucusu: HTTP paneli ve USB-Serial WebSocket köprüsü.
- Mevcut giriş doğrulaması, `CONTROL_TOKEN`, `SMART_HOME_KV` ve LED komut protokolü korunur.
- LED efektleri renk değiştirmez; yalnızca parlaklık ve yanıp sönme değişir.

## Pardus kurulumu
1. Depoyu Pardus bilgisayarına klonla.
2. Terminalde depo klasörüne gir.
3. `bash install-pardus.sh` komutunu çalıştır ve mevcut `CONTROL_TOKEN` değerini gir.
4. Arduino'yu USB ile bağla.
5. Tarayıcıda `http://127.0.0.1:8080` adresini aç.

Servis yönetimi:
- `sudo systemctl status smart-home-control`
- `sudo systemctl restart smart-home-control`
- `sudo journalctl -u smart-home-control -f`

Arduino portu otomatik bulunamazsa:
` .venv/bin/python pardus_server.py --port /dev/ttyACM0 `

## Müzik modu
Arduino bağlantısını kurduktan sonra mikrofon izni ver ve efekt seç. Müzik modu için HTTPS veya localhost gerekir. Pardus üzerinde paneli `127.0.0.1` adresinden açmak mikrofon erişimini sağlar.

## Seri protokolü
- `SET 1 <0-100> <fade_ms>`
- `SET 2 <0-100> <fade_ms>`
- `STATUS`
- `FADE <fade_ms>`

Arduino seri hızı: 115200 baud.
