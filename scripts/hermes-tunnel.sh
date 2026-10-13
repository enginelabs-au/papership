#!/usr/bin/env bash
# Background SSH tunnels to Hermes on the VPS.
# :9119 = desktop serve UI (login). :8642 = HTTP API server.
# :3100 -> VPS :3000 = Hermes WhatsApp bridge (send-only use by Papership; never poll /messages).
# Uses ~/.ssh/config Host hermes-vps. No .env required.
set -euo pipefail
exec ssh -N -o BatchMode=yes -o RequestTTY=no \
  -o ServerAliveInterval=25 -o ServerAliveCountMax=6 \
  -L 127.0.0.1:9119:127.0.0.1:9119 \
  -L 127.0.0.1:8642:127.0.0.1:8642 \
  -L 127.0.0.1:3100:127.0.0.1:3000 \
  hermes-vps
