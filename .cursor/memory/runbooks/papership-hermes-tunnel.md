# Runbook: Papership ↔ Hermes on droplet-campbell

SSH Host `hermes-vps` / `hermes-droplet-campbell` is user `hermes` on HostHatch Tailscale `100.82.91.60`. `droplet-campbell` is root on the same box. Old DigitalOcean rollback: `droplet-campbell-do` / `hermes-droplet-campbell-do` (Tailscale `100.126.6.56`) or `*-do-pub` (public `209.38.81.239`). Hop `~/bin/droplet-campbell-do` tries Tailscale then public. Owner may destroy the DigitalOcean droplet (OT-66). After destroy, those aliases are historical only. Do not start a second `hermes-gateway` on any leftover DO box. Do not copy keys into this repo.

## Git backups (2026-09-14)

Do not make Mac `~/.hermes` a clone of the Hatch home. Do not `git pull` Hatch `main` onto the Mac or `mac/preserve` onto Hatch.

| Tree | Remote | Branch | HEAD |
|---|---|---|---|
| Hatch `~/.hermes/hermes-agent` | `cam-douglas` public fork | `main` | `570b31ab98` (0.21.1) |
| Hatch `~/.hermes` | private `cam-douglas/.hermes` | `main` | overlay + preserve |
| Mac `~/.hermes/hermes-agent` | `fork` same public repo | Mac working branch | Desktop/agent patches |

`origin` on both agent trees is NousResearch. `hermes update` / Desktop `--keep-stash` pull that. Wrappers snapshot then `preserve/apply.sh`. Hatch GitHub SSH Host aliases were missing after cutover; deploy keys `hatch-dot-hermes` and `hatch-hermes-agent` restore push/pull.

## What is running on the VPS

- Hermes Agent **v0.21.1** (git `5b1c6b76` on `vps/hosthatch`)
- `hermes-serve.service`: `hermes serve --host 0.0.0.0 --port 9119` — desktop login UI. `/health` is 302 `/login`.
- `hermes-gateway.service`: messaging + **HTTP API** on `127.0.0.1:8642`. Do not start a second gateway.
- API connect can take >30s on this box. User drop-in sets `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT=120`.
- `GET /health` on `:8642` returned 200 in ~1ms on 2026-09-12 (OT-16). `HEAD /health` is 405 Allow: GET. Papership still probes HEAD first.

## Local Papership

1. `bash scripts/hermes-tunnel.sh` (background) → `127.0.0.1:9119` (UI) and `127.0.0.1:8642` (API)
2. `bash scripts/dev-local.sh` — defaults `HERMES_API_BASE_URL=http://127.0.0.1:8642`
3. `curl http://127.0.0.1:8000/health` — `hermes` should be `reachable` (not `serve_ui`)

`HERMES_API_SERVER_KEY` is worker/VPS only. The API and desktop must never read it. Model keys stay on the VPS.

## Live path (2026-09-11)

- Worker env file (not in git): `~/.config/papership/hermes-api-server.env` (`HERMES_API_SERVER_KEY`, `HERMES_API_BASE_URL`). Legacy copy may still exist under `~/.config/orgos/`. Never put the key on the API.
- Hermes authenticates with its **secret-scoped** key. Yaml / systemd `API_SERVER_KEY` copies can diverge; do not assume they match.
- After gateway restarts, recreate the local `-L 127.0.0.1:8642` tunnel. Stale forwards hang and can fill the VPS accept queue (GET `/health` hang).
- Live `accepted` is catalogued **read** `tool=` only. Example run `run_ee41560dd3ee46eb9bef3fcd6615e6ba`.
- OT-16 closed 2026-09-12: `GET /health` on `:8642` is 200; HEAD-first probe stays.

Mailbox `EMAIL_*` is no longer on systemd `Environment=`. Hatch Email uses Gmail SMTP 587 + IMAP 993 (OT-63). The Gmail API watcher is off. Do not print values if they reappear.
