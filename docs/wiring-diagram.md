# SMART HOME CONTROL — 12 V şerit LED bağlantısı

Bu şema Arduino Nano, L298N çift kanallı motor sürücüsü ve 12 V şerit LED’ler içindir. Şerit LED’leri motor sürücüsünün çıkış çiftlerine bağlayın. Harici direnç gerekmez; kullandığınız şerit LED 12 V olmalı ve kendi akım sınırlama elemanlarını içermelidir.

```text
              12 V GÜÇ KAYNAĞI
              +12 V ───────────────────────── L298N  +12V / Vs

  Arduino Nano                         L298N MOTOR SÜRÜCÜSÜ
  ────────────                         ────────────────────
  D5  ──────────────────────────────── ENA   (jumper'ı çıkar)
  D6  ──────────────────────────────── ENB   (jumper'ı çıkar)
  D7  ──────────────────────────────── IN1
  D8  ──────────────────────────────── IN2
  D9  ──────────────────────────────── IN3
  D10 ──────────────────────────────── IN4
  GND ──────────────────────────────── GND ─────── 12 V güç kaynağı −

  L298N OUT1 ────────────────────────── Şerit LED 1 (+)
  L298N OUT2 ────────────────────────── Şerit LED 1 (−)

  L298N OUT3 ────────────────────────── Şerit LED 2 (+)
  L298N OUT4 ────────────────────────── Şerit LED 2 (−)
```

## Bağlantı tablosu

| Arduino Nano | L298N | Görevi |
|---|---|---|
| D5 | ENA | LED 1 parlaklık PWM |
| D6 | ENB | LED 2 parlaklık PWM |
| D7 | IN1 | LED 1 yön girişi 1 |
| D8 | IN2 | LED 1 yön girişi 2 |
| D9 | IN3 | LED 2 yön girişi 1 |
| D10 | IN4 | LED 2 yön girişi 2 |
| GND | GND | Ortak toprak |
| — | OUT1, OUT2 | Şerit LED 1’in + ve − uçları |
| — | OUT3, OUT4 | Şerit LED 2’nin + ve − uçları |
| 12 V kaynak + | +12V / Vs | Sürücü ve şeritlerin beslemesi |
| 12 V kaynak − | GND | Ortak toprak |

## Kurulum

1. L298N üzerindeki **ENA** ve **ENB** jumper’larını çıkarın; bu girişlere Nano D5 ve D6 bağlanacak. Kartta bulunan **5V-EN** jumper’ı farklı bir işlev görür; 12 V kullanırken kartınızın üzerindeki işaretlere/kılavuza göre bırakın.
2. LED 1 şeridinin + ucunu OUT1’e, − ucunu OUT2’ye bağlayın. LED 2 şeridini aynı şekilde OUT3 (+) ve OUT4 (−) uçlarına bağlayın.
3. 12 V güç kaynağını L298N’in +12V/Vs ve GND girişlerine bağlayın.
4. Nano GND, L298N GND ve güç kaynağının eksi ucunu ortaklayın. Nano’yu USB’den besleyin; Nano’nun 5 V pinini 12 V girişine bağlamayın.
5. L298N üzerindeki OUT çıkışlarında PWM sırasında yaklaşık 12 V’tan daha düşük gerilim görülebilir ve sürücü ısınabilir. Şerit akımı kullandığınız L298N kartının sürekli akım sınırını aşmamalı; havalandırma/soğutucu gereksinimini gözetin.

Bu bağlantı 12 V şerit LED’ler içindir. Tek başına çıplak LED’i dirençsiz bağlamayın. Bağlantıdan önce güç kaynağını kapatın.

