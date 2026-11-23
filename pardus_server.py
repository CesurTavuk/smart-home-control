#!/usr/bin/env python3
"""Local USB-serial bridge and static web server for SMART HOME CONTROL on Pardus."""
import argparse
import asyncio
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import serial
from serial.tools import list_ports
import websockets

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
serial_port = None
serial_lock = threading.Lock()
music_state = {"mode": "rhythm", "sensitivity": 6, "enabled": False}


def choose_port(requested):
    if requested != "auto":
        return requested
    ports = list(list_ports.comports())
    if not ports:
        raise RuntimeError("Arduino seri portu bulunamadı. USB kablosunu ve izinleri kontrol edin.")
    preferred = next((p.device for p in ports if any(k in (p.description or "").lower() for k in ("arduino", "ch340", "usb serial", "cp210"))), None)
    return preferred or ports[0].device


class PanelHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            self.send_json({"ok": True, "app": "SMART HOME CONTROL", "platform": "Pardus", "status": "online"})
            return
        if path == "/api/state":
            token = os.environ.get("CONTROL_TOKEN", "")
            if not token or self.headers.get("Authorization") != "Bearer " + token:
                self.send_json({"ok": False, "error": "Kontrol şifresi hatalı veya eksik."}, 401)
                return
            self.send_json({
                "ok": True,
                "target": {"led1": {"on": False, "brightness": 100}, "led2": {"on": False, "brightness": 100}},
                "actual": {"led1": {"on": False, "brightness": 0}, "led2": {"on": False, "brightness": 0}},
                "music": music_state.copy()
            })
            return
        return super().do_GET()

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/api/music":
            self.send_json({"ok": False, "error": "Adres bulunamadı."}, 404)
            return
        token = os.environ.get("CONTROL_TOKEN", "")
        if not token or self.headers.get("Authorization") != "Bearer " + token:
            self.send_json({"ok": False, "error": "Kontrol şifresi hatalı veya eksik."}, 401)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length) or b"{}")
            modes = {"rhythm", "breathe", "strobe", "wave", "mixed"}
            mode = str(body.get("mode", music_state["mode"]))
            sensitivity = int(body.get("sensitivity", music_state["sensitivity"]))
            if mode not in modes or not 1 <= sensitivity <= 10:
                self.send_json({"ok": False, "error": "Müzik modu veya hassasiyet geçersiz."}, 400)
                return
            music_state.update({"mode": mode, "sensitivity": sensitivity, "enabled": body.get("enabled") is True})
            self.send_json({"ok": True, "music": music_state.copy()})
        except Exception as exc:
            self.send_json({"ok": False, "error": str(exc)}, 400)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def log_message(self, fmt, *args):
        print("[HTTP] " + (fmt % args))


async def serial_ws(websocket, path=None):
    request_path = path or getattr(websocket, "path", None) or getattr(getattr(websocket, "request", None), "path", "/")
    if request_path.split("?")[0] != "/serial":
        await websocket.close(code=1008, reason="Use /serial")
        return

    async def serial_to_browser():
        while True:
            raw = await asyncio.to_thread(serial_port.readline)
            if raw:
                await websocket.send(raw.decode("utf-8", errors="replace"))

    async def browser_to_serial():
        async for message in websocket:
            data = str(message).replace("\r", "")
            with serial_lock:
                for line in data.split("\n"):
                    if line.strip():
                        serial_port.write((line.strip() + "\n").encode("utf-8"))

    reader = asyncio.create_task(serial_to_browser())
    writer = asyncio.create_task(browser_to_serial())
    done, pending = await asyncio.wait((reader, writer), return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    for task in done:
        error = task.exception()
        if error:
            raise error


async def main(args):
    global serial_port
    device = choose_port(args.port)
    serial_port = serial.Serial(device, args.baud, timeout=0.25, write_timeout=1)
    print(f"[SERIAL] {device} @ {args.baud} baud")
    httpd = ThreadingHTTPServer((args.host, args.http_port), PanelHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"[HTTP] http://127.0.0.1:{args.http_port}")
    print(f"[WS] ws://0.0.0.0:{args.ws_port}/serial")
    async with websockets.serve(serial_ws, args.ws_host, args.ws_port, ping_interval=20, ping_timeout=20, max_size=4096):
        await asyncio.Future()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SMART HOME CONTROL Pardus server")
    parser.add_argument("--port", default="auto", help="Arduino port, e.g. /dev/ttyACM0 or auto")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--host", default="127.0.0.1", help="HTTP bind address; use 0.0.0.0 for LAN")
    parser.add_argument("--http-port", type=int, default=8080)
    parser.add_argument("--ws-host", default="127.0.0.1", help="WebSocket bind address; use 0.0.0.0 for LAN")
    parser.add_argument("--ws-port", type=int, default=8765)
    asyncio.run(main(parser.parse_args()))
