# SMART HOME CONTROL — Android APK

Android 10+ (API 29+) için yerel Android uygulaması.

## Özellikler
- Mevcut Cloudflare Worker üzerindeki `/api/state` endpoint'i ile giriş doğrulaması.
- İki tek renk LED kanalı, yarım daire göstergeler ve 0–100 parlaklık.
- USB OTG: Android USB Host API + usb-serial-for-android.
- HC-05: eşleştirilmiş Bluetooth Classic SPP cihazlarına bağlantı.
- 115200 baud, 8-N-1 seri haberleşme.
- Android AudioPlaybackCapture API ile medya oynatma sesini analiz etme.
- Mikrofon kaydı, kamera veya ekran görüntüsü işleme yoktur.

## Android sistem ses yakalama hakkında
Android 10+ sistem medya sesini yakalamak için MediaProjection kullanıcı onayı ve `RECORD_AUDIO` runtime izni ister. Android izin ekranında mikrofon izni adı görülebilir; uygulama mikrofon girişini açmaz. Ses, `AudioPlaybackCaptureConfiguration` ile yalnızca `USAGE_MEDIA`, `USAGE_GAME` ve `USAGE_UNKNOWN` oynatma akışlarından alınır. Uygulama ekran görüntüsü veya video kareleri işlemez. Bazı medya uygulamaları DRM veya yakalama politikası nedeniyle seslerini paylaşmaz.

## Donanım protokolü
Firmware'den doğrulanan komutlar:
- `SET <1|2> <0..100> <fade_ms>`
- `STATUS`
- `FADE <fade_ms>`
- `ON <1|2>`
- `OFF <1|2>`

Seri hız: **115200 baud, 8-N-1**. Uygulama müzik modunda iki ayrı SET komutunu gönderir. USB ve Bluetooth aynı anda kullanılmaz.

## HC-05 hazırlığı
1. HC-05'i Android'in Bluetooth ayarlarından önce eşleştir.
2. Modülün SPP (Serial Port Profile) desteklediğinden emin ol.
3. Uygulamada bağlantı türünü HC-05 Bluetooth seç ve listeden modülü seç.
4. Bluetooth seri bağlantısında da Arduino tarafı 115200 baud olmalıdır. HC-05 UART hızının Arduino seri protokolüyle eşleştiğini doğrula.

## USB OTG
Arduino Nano'yu OTG adaptörüyle bağla. Android USB aygıt erişim izni sorarsa izin ver. USB ve Bluetooth bağlantıları aynı anda açılmaz.

## Bulut derlemesi
Depodaki `.github/workflows/android-apk.yml` workflow'u `android-app/` klasörünü derleyip `smart-home-control-debug-apk` adlı Actions artifact'i olarak yükler. Derleme başarılı olduğunda GitHub Actions run sayfasındaki Artifacts bölümünden APK alınabilir.
