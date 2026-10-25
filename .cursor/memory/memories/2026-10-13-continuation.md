- 2026-10-13T12:26Z domain records: the 16 catalogue rows that were `planned` (B04 B05 B08 B09 B10 B11 B13 B15 B16 B17 B18 B22 P01 P04 P12 P14) now store native records, refuse live source writes and invented amounts, and show as `configured` in the catalogue. Tests `test_domain_records.py` plus phase5 and engine-labs job: 25 passed. Web static scan 15 passed. Hermes appendix rows stay planned. Charges stay off. Goal remains open.
- 2026-10-13T12:29Z hermes inventory: `GET /hermes/inventory` covers the 14 appendix areas. Memory, schedules, documents, runs, and health are configured locally. Toolsets, profiles, sessions, skills, delegation, browser, research, code execution, and media stay unavailable. Execute returns 403. Tests 7 passed with command room. Web build succeeded. `docs/capabilities.md` has no remaining planned rows.

## D-37 Hermes + messaging (owner approval 23:35 AEDT)

- Lifted D-25 under D-37. OT-89 done, OT-10 and OT-11 done. New open rows OT-105 (Telegram creds), OT-106 (WhatsApp creds), OT-107 (live Hermes replay and fresh Security pass for `working`).
- Independent security review first returned FAIL/CONDITIONAL (16 findings). Fixed: free-text runs need an approved record before Hermes is called; approved arguments are what Hermes receives; scope and stream failures stop the run; no-run-id fails closed; requester is the sponsor; pending cap; jobs rotate; secret-shaped values refused; sessions owned; grants on `/runs` and `/hermes/runs`; query throttle; API no longer reads the transport key; messaging tenant-scoped, one-send-per-approval claim, drafts, byte-wise compares, body cap, phone-number-id check, credential format check, no redirects.
- Re-review: CONDITIONAL for both, no new medium+ findings.
- Evidence: `cd services/api && PYTHONPATH=. .venv/bin/python -m pytest tests -q` 188 passed; `cd services/worker && python3 -m pytest -q tests` 65 passed; `node --test apps/web/tests/static-scan.test.mjs` 15 passed; `npm run build -w @papership/web` ok.
- Nothing committed, pushed, or deployed. Charges stay off.

## 2026-10-14 credential source request
- Owner asked to reuse the Telegram/WhatsApp creds from the HostHatch Hermes box instead of creating new ones.
- Started Tailscale on the Mac (was stopped). `ssh hermes-vps` works; `hermes-gateway` and `hermes-serve` active. OT-107 reachability is no longer the blocker.
- Listing the messaging env names on the VPS (`.env` paths) was blocked by the repo's fail-closed policy ("Shell access to secret-bearing paths is blocked"). No values were read, copied or printed. OT-105 and OT-106 stay open pending an owner decision on how credentials move.

## 2026-10-14 credentials follow-up
- Owner added a narrow ssh exception to `.cursor/hooks/policy.mjs`. Remote listing worked. VPS has `TELEGRAM_BOT_TOKEN` (valid, bot `@hermes_droplet_campbell_bot`, polling, no webhook) and a Baileys `self-chat` WhatsApp bridge (no Cloud API creds).
- Copied the Telegram token into `~/.config/papership/connectors.env` (600) and generated a local `TELEGRAM_WEBHOOK_SECRET`; no values printed. Live approved send through `messaging.send_approved` returned receipt (message 24) and a replay did not resend.
- Added a takeover confirmation to Telegram webhook registration (one receiver per bot). API 189 passed, web scan 15, build ok.
- Owner should revert the policy exception when done (backup in `~/policy.mjs.bak-*`).

## 2026-10-14 WhatsApp bridge
- Owner chose: WhatsApp over the Hermes bridge, Telegram send-only. Added `WHATSAPP_BRIDGE_URL` mode (loopback-only, send-only), tunnel `-L 3100->3000`, recipient digits validation. Live approved send OK (receipt). API 191 passed.
- Remaining: security pass for bridge adapter and takeover guard; revert owner hook exception when finished.

## 2026-10-14 live replay, security re-review, release
- OT-107 done: live read run and write-class `todo_list` run through the gate against real Hermes; fail-closed stops observed live. Catalogue aligned to live tool names; `tool_call` bridge unwrapped; catalog hash updated.
- Second security re-review: CONDITIONAL PASS (Hermes, messaging). Only blocker: owner's temporary ssh hook exception, kept out of the commit along with the pre-existing `vercel --prod` hook edit. `.cursor/hooks/*` and generated Tauri schemas are not committed.
- Tests: API 191, worker 71, web scan 15, build ok. Released by pushing to main (Vercel git integration builds `@papership/web`; API and worker are not Vercel projects).

## 2026-10-14 D-38: product definition and the knowledge loop
- Owner asked what the platform is for. Decision D-38 (`docs/decisions/2026-10-14-papership-definition.md`): wedge = coding agents on the owner's own stack; moat = the context-to-outcome impact record; company-OS surfaces demoted to an Operations rail section (code kept); kill list recorded; content-index data-policy amendment recorded.
- Built the loop: `services/api/app/knowledge_loop.py` (ingest, FTS5 BM25 resolve with token budget, deliveries, outcomes, lift), routes `/knowledge/ingest|resolve|outcomes|loop`, stdio MCP server `scripts/papership_mcp.py`, web Loop tab `apps/web/src/blueprint2/loop.jsx`, Operations demotion in `App.jsx`.
- Evidence: real repo ingest = 399 documents, 2519 passages in about 1.3 s; five task queries returned on-topic passages (approvals, Vercel deploy, Telegram webhook, Slack connector); weak on abstract queries ("moat"). API 204 passed (13 new), worker 71, web scan 15, build ok. Not committed or deployed. Security review of the new surface still to do.
