/*
  SMART HOME CONTROL - Arduino Nano
  Two PWM LED channels, USB serial at 115200 baud.

  Commands (newline terminated):
    SET <channel 1|2> <percent 0..100> <fade milliseconds>
    ON <channel>
    OFF <channel>
    FADE <milliseconds>
    STATUS

  Responses:
    SMART_HOME_READY
    STATE <channel> <percent>
    OK <message>
    ERR <message>
*/

const byte LED_PIN[2] = {5, 6}; // Nano PWM pins D5, D6
const byte CHANNELS = 2;
const unsigned long MAX_FADE_MS = 10000UL;

struct Channel {
  int currentPwm;
  int startPwm;
  int targetPwm;
  unsigned long fadeStarted;
  unsigned long fadeDuration;
};

Channel channel[CHANNELS];
unsigned long defaultFadeMs = 1500UL;
String inputLine;

int percentToPwm(int percent) {
  percent = constrain(percent, 0, 100);
  return (percent * 255 + 50) / 100;
}

int pwmToPercent(int pwm) {
  return (pwm * 100 + 127) / 255;
}

void reportState(byte index) {
  Serial.print(F("STATE "));
  Serial.print(index + 1);
  Serial.print(' ');
  Serial.println(pwmToPercent(channel[index].currentPwm));
}

void setTarget(byte index, int percent, unsigned long duration) {
  Channel &c = channel[index];
  c.startPwm = c.currentPwm;
  c.targetPwm = percentToPwm(percent);
  c.fadeStarted = millis();
  c.fadeDuration = duration;
  if (duration == 0 || c.startPwm == c.targetPwm) {
    c.currentPwm = c.targetPwm;
    analogWrite(LED_PIN[index], c.currentPwm);
    reportState(index);
  }
}

void error(const __FlashStringHelper *message) {
  Serial.print(F("ERR "));
  Serial.println(message);
}

void handleCommand(String line) {
  line.trim();
  if (!line.length()) return;

  char command[12] = {0};
  int a = 0, b = 0, c = 0;
  unsigned long duration = defaultFadeMs;

  if (line.equalsIgnoreCase(F("STATUS"))) {
    reportState(0);
    reportState(1);
    return;
  }

  if (sscanf(line.c_str(), "%11s %d %d %d", command, &a, &b, &c) >= 1) {
    if (!strcmp(command, "FADE") || !strcmp(command, "fade")) {
      // This command only changes the default used for ON/OFF.
      if (sscanf(line.c_str(), "%11s %d", command, &a) != 2 || a < 0 || a > MAX_FADE_MS) {
        error(F("FADE expects 0..10000 milliseconds"));
        return;
      }
      defaultFadeMs = (unsigned long)a;
      Serial.print(F("OK FADE "));
      Serial.println(defaultFadeMs);
      return;
    }

    if (!strcmp(command, "SET") || !strcmp(command, "set")) {
      int fields = sscanf(line.c_str(), "%11s %d %d %d", command, &a, &b, &c);
      if (fields < 3 || a < 1 || a > CHANNELS || b < 0 || b > 100) {
        error(F("SET expects channel 1|2, percent 0..100, optional fade ms"));
        return;
      }
      duration = fields >= 4 ? (unsigned long)constrain(c, 0, (int)MAX_FADE_MS) : defaultFadeMs;
      setTarget(a - 1, b, duration);
      Serial.print(F("OK SET "));
      Serial.print(a);
      Serial.print(' ');
      Serial.println(b);
      return;
    }

    if (!strcmp(command, "ON") || !strcmp(command, "on") ||
        !strcmp(command, "OFF") || !strcmp(command, "off")) {
      int fields = sscanf(line.c_str(), "%11s %d", command, &a);
      if (fields != 2 || a < 1 || a > CHANNELS) {
        error(F("ON/OFF expects channel 1|2"));
        return;
      }
      bool turnOn = command[1] == 'N' || command[1] == 'n';
      setTarget(a - 1, turnOn ? 100 : 0, defaultFadeMs);
      Serial.print(F("OK "));
      Serial.print(turnOn ? F("ON ") : F("OFF "));
      Serial.println(a);
      return;
    }
  }
  error(F("Unknown command"));
}

void updateOutputs() {
  const unsigned long now = millis();
  for (byte i = 0; i < CHANNELS; ++i) {
    Channel &ch = channel[i];
    if (ch.currentPwm == ch.targetPwm) continue;
    unsigned long elapsed = now - ch.fadeStarted;
    int nextPwm;
    if (ch.fadeDuration == 0 || elapsed >= ch.fadeDuration) {
      nextPwm = ch.targetPwm;
    } else {
      long delta = (long)ch.targetPwm - ch.startPwm;
      nextPwm = ch.startPwm + (long)(delta * elapsed / ch.fadeDuration);
    }
    if (nextPwm != ch.currentPwm) {
      ch.currentPwm = nextPwm;
      analogWrite(LED_PIN[i], ch.currentPwm);
      reportState(i);
    }
  }
}

void setup() {
  for (byte i = 0; i < CHANNELS; ++i) {
    pinMode(LED_PIN[i], OUTPUT);
    analogWrite(LED_PIN[i], 0);
    channel[i] = {0, 0, 0, 0, 0};
  }
  Serial.begin(115200);
  inputLine.reserve(64);
  Serial.println(F("SMART_HOME_READY"));
  reportState(0);
  reportState(1);
}

void loop() {
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (inputLine.length()) {
        handleCommand(inputLine);
        inputLine = "";
      }
    } else if (inputLine.length() < 80) {
      inputLine += ch;
    } else {
      inputLine = "";
      error(F("Command too long"));
    }
  }
  updateOutputs();
}

