"use strict";

// Local-only bridge: Web page <-> WebSocket <-> TCPUART TCP server <-> USB serial.
// Configure TCPUART to listen on 127.0.0.1:7000 (or set SERIAL_PORT).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { WebSocketServer } = require("ws");

const HOST = "127.0.0.1";
const WEB_PORT = Number(process.env.WEB_PORT || 8765);
const SERIAL_HOST = "127.0.0.1";
const SERIAL_PORT = Number(process.env.SERIAL_PORT || 7000);
const INDEX_FILE = path.resolve(__dirname, "..", "index.html");

const server = http.createServer((req, res) => {
  if (req.method !== "GET" || (req.url !== "/" && req.url !== "/index.html")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  fs.readFile(INDEX_FILE, (err, html) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("SMART HOME CONTROL HTML is missing");
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self' ws://127.0.0.1:8765",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(html);
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 256 });
server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/serial") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

wss.on("connection", ws => {
  const serial = net.createConnection({ host: SERIAL_HOST, port: SERIAL_PORT });
  serial.setNoDelay(true);
  serial.on("connect", () => console.log(`WebSocket connected to USB serial TCP ${SERIAL_HOST}:${SERIAL_PORT}`));
  serial.on("data", data => { if (ws.readyState === ws.OPEN) ws.send(data.toString("utf8")); });
  serial.on("error", err => {
    console.error(`Serial TCP error: ${err.message}`);
    if (ws.readyState === ws.OPEN) ws.close(1011, "USB serial bridge unavailable");
  });
  ws.on("message", data => {
    if (serial.writable && !serial.destroyed) serial.write(data);
  });
  ws.on("close", () => serial.destroy());
  ws.on("error", () => serial.destroy());
});

server.listen(WEB_PORT, HOST, () => {
  console.log(`SMART HOME CONTROL: http://${HOST}:${WEB_PORT}/`);
  console.log(`Waiting for TCPUART TCP serial at ${SERIAL_HOST}:${SERIAL_PORT}`);
});

process.on("SIGINT", () => {
  wss.close();
  server.close(() => process.exit(0));
});

