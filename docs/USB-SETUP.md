# SMART HOME CONTROL

## Files

- `index.html` — two semicircular brightness gauges and two-channel control UI.
- `smart-home-control.ino` — Arduino Nano firmware; USB serial 115200 baud.
- `wiring-diagram.md` — MOSFET wiring and parts.
- `android-usb-bridge/` — optional local WebSocket-to-TCP adapter for an Android USB/TCP bridge app.

## Computer: Chrome with direct USB

1. Upload `smart-home-control.ino` to the Nano.
2. Open `index.html` in desktop Chrome or Edge. If the browser does not offer a USB port picker, serve the file from a secure HTTPS page or from localhost.
3. Close Arduino IDE Serial Monitor or any other terminal using the Nano port.
4. Press **USB’Yİ SEÇ VE BAĞLAN**, select the Nano, and allow access.

The Web Serial API is supported by desktop Chrome/Edge. The USB terminal program and the browser cannot use the same serial port simultaneously; close the terminal before using the page.

## Android: separate USB bridge required

Kai Morich's **Serial USB Terminal** is a terminal for USB serial devices. Its published features do not provide a browser API or a WebSocket server, so it cannot serve as the page's intermediary while holding the Nano's USB connection.

An alternative is **TCPUART transparent Bridge** (Google Play), which exposes USB serial data through a TCP socket, plus the small local adapter in `android-usb-bridge/`. The adapter makes a localhost WebSocket for the HTML page. This is a separate setup and is not the Serial USB Terminal app.

1. Install TCPUART transparent Bridge and Termux on the Android tablet. Connect Nano over OTG and grant USB access in TCPUART.
2. In TCPUART, choose TCP **server** mode, set port `7000`, then start it. Keep the tablet on a trusted network and do not forward this port from a router; the app may listen on the tablet's network interfaces.
3. In Termux, install Node.js, copy this folder and `index.html` into the same parent layout, then run `npm install` in `android-usb-bridge/`.
4. Start the adapter with `node bridge.js`. It binds only to `127.0.0.1`, serves the panel at `http://127.0.0.1:8765/`, and connects to the TCPUART listener at `127.0.0.1:7000`.
5. Open that local address in the tablet browser. If `navigator.serial` is unavailable, the panel automatically tries its local WebSocket bridge.

If TCPUART uses a different TCP port, start the adapter with `SERIAL_PORT=<port> node bridge.js`. The web page and WebSocket adapter bind only to loopback. A terminal application must not open the Nano at the same time as TCPUART.

## Protocol

Commands are newline-terminated text: `SET 1 75 1500`, `ON 2`, `OFF 1`, `FADE 500`, `STATUS`. The Arduino reports `STATE <channel> <brightness-percent>` and status text at 115200 baud.

