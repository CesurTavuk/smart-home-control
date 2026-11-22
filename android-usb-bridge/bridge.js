"use strict";

// Local-only bridge: Web page <-> WebSocket <-> TCPUART TCP server <-> USB serial.
// Configure TCPUART to listen on 127.0.0.1:7000 (or set SERIAL_PORT).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const WebSocket = require("ws");
const { WebSocketServer } = WebSocket;

const HOST = "127.0.0.1";
const WEB_PORT = Number(process.env.WEB_PORT || 8765);
const SERIAL_HOST = "127.0.0.1";
const SERIAL_PORT = Number(process.env.SERIAL_PORT || 7000);
const CONTROL_API_ORIGIN = new URL(process.env.CONTROL_API_ORIGIN || "https://smart-home-control.cesurtavuk1905.workers.dev").origin;
const INDEX_FILE = path.resolve(__dirname, "..", "index.html");

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/state") {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" });
      return res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    }
    const authorization = req.headers.authorization || "";
    if (!/^Bearer [^\r\n]+$/.test(authorization)) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ ok: false, error: "Giriş bilgileri gerekli" }));
    }
    try {
      const upstream = await fetch(`${CONTROL_API_ORIGIN}/api/state`, {
        method: "GET", headers: { Authorization: authorization, Accept: "application/json" }, redirect: "error"
      });
      const body = await upstream.arrayBuffer();
      res.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      return res.end(Buffer.from(body));
    } catch (err) {
      console.error(`Control API request failed: ${err.message}`);
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ ok: false, error: "Cloudflare doğrulama sunucusuna ulaşılamadı" }));
    }
  }
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
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:8765",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(html);
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 256 });
server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/serial" || req.headers.origin !== `http://${HOST}:${WEB_PORT}`) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

wss.on("connection", ws => {
  const serial = net.createConnection({ host: SERIAL_HOST, port: SERIAL_PORT });
  serial.setNoDelay(true);
  serial.on("connect", () => console.log(`WebSocket connected to USB serial TCP ${SERIAL_HOST}:${SERIAL_PORT}`));
  serial.on("data", data => { if (ws.readyState === WebSocket.OPEN) ws.send(data.toString("utf8")); });
  serial.on("error", err => {
    console.error(`Serial TCP error: ${err.message}`);
    if (ws.readyState === WebSocket.OPEN) ws.close(1011, "USB serial bridge unavailable");
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

