#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
python3 -m venv .venv
"$ROOT/.venv/bin/pip" install --upgrade pip
"$ROOT/.venv/bin/pip" install -r requirements-pardus.txt
sudo tee /etc/systemd/system/smart-home-control.service >/dev/null <<EOF
[Unit]
Description=SMART HOME CONTROL Pardus USB Serial Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$ROOT/.venv/bin/python $ROOT/pardus_server.py --host 0.0.0.0 --ws-host 0.0.0.0 --port auto
Restart=on-failure
RestartSec=3
User=$USER
SupplementaryGroups=dialout

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now smart-home-control.service
echo "Kurulum tamamlandı. Panel: http://127.0.0.1:8080"
echo "Durum: sudo systemctl status smart-home-control"
