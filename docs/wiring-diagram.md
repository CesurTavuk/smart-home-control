# SMART HOME CONTROL — Nano wiring

This diagram uses two logic-level N-channel MOSFETs as low-side switches for two DC LED loads. The Nano pins only drive the MOSFET gates; LED current comes from a separate supply sized for the LEDs.

```text
                         +------------------ Arduino Nano ------------------+
                         |                                                   |
USB OTG from tablet/PC ->| USB                                          D5  |---[100 Ω]--- Gate Q1
                         |                                              D6  |---[100 Ω]--- Gate Q2
                         |                                              GND |------. 
                         +--------------------------------------------------+      |
                                                                                 |
External regulated supply (choose voltage to match LED loads)                    |
   +V  --------------------+----------------------+                              |
                           |                      |                              |
                      LED 1 +               LED 2 +                             |
                      LED 1 -               LED 2 -                             |
                           |                      |                              |
                           D                      D                              |
                      Q1 N-MOSFET            Q2 N-MOSFET                         |
                           S                      S                              |
                           |                      |                              |
   Supply 0V --------------+----------------------+------------------------------'
                           |                      |
                        [10 kΩ]                [10 kΩ]
                           |                      |
                         GND                    GND
```

## Parts and pin mapping

| Connection | Where it goes |
|---|---|
| LED channel 1 PWM | Nano D5 → 100 Ω resistor → Q1 gate |
| LED channel 2 PWM | Nano D6 → 100 Ω resistor → Q2 gate |
| Gate pull-downs | 10 kΩ from each MOSFET gate to GND |
| MOSFET sources | Common GND |
| MOSFET drains | LED channel negative terminals |
| LED positive terminals | External supply +V, through any required current limiting |
| Ground reference | External supply 0V and Nano GND connected together |

Choose logic-level MOSFETs that are specified for low on-resistance at a 4.5 V gate drive (for example, AO3400A for modest currents; choose a suitably rated package for higher current). For bare LEDs, include a correctly sized series resistor or constant-current driver. LED strips normally have built-in resistors, but check the strip voltage and current rating. Do not power LED strips from Nano D5/D6 or the Nano 5 V pin. If a separate supply is used, connect grounds as shown. USB can power the Nano while the external supply powers the LED loads.

The code uses D5 and D6 PWM outputs, `115200` baud, 8-N-1. Connect the Nano through USB OTG to Android or directly through USB to a computer. On a computer, close any serial monitor that has the Nano's port open before connecting the web panel.

