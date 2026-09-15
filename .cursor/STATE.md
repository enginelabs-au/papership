# STATE.md

## Current Objective

- Live Papership web UI is `docs/ui-blueprint/blueprint-2` exactly (D-21 / D-22) at **`/papership`** (D-32). At `max-width: 767px` the live chrome is the R4 compressed layout from `OrgOS Mobile.dc.html`. Prism-head mark is app/tab icon only, not in-app.

## Current Status

- Initial development closed. Phases 0–7 complete. Final checklist written. Project blueprints now live under `docs/blueprints/`.

## Project Phase

- Closure. Active plan: `docs/plans/final_implementation_checklist.md`. No Phase 8.

## Active Plan

- `docs/plans/final_implementation_checklist.md` (status: open — owner walk)

## Active Workstream

- `docs/workstreams/20260910-engine-labs-company-os/manifest.md` (Tier 3; G11 PASS)

## Active Role and Gate

- G11 PASS (2026-09-12). Checklist residuals parked: CA-10, D-25 (OT-10 later), ERA-15 (OT-13 later). OQ-G2 recorded locally.

## Predecessor Handoff

- Phase 7 G11: `project-lead-subagent/phase-7-handoff.md`
- Security Phase 7: `security-engineer-subagent/phase-7-handoff.md` (PASS with residuals)

## Pending Remediation

- OQ-G2 recorded on local store 2026-09-12T15:20Z. Local API is up at `127.0.0.1:8000` after the overlay segfault (OT-24). Vercel still cannot hold this flag.
- Gmail/Slack OAuth start/callback shipped. Host secrets are loaded. Local Gmail (OT-25) and Slack (OT-26) are both connected with sealed tokens. Hermes env was not copied.
- OT-16 done: live Hermes `GET /health` on `:8642` is 200 (~1ms); HEAD 405. Units were active. HEAD-first probe stays.
- OT-29: droplet `active_provider` is OpenRouter; OpenRouter pool exhaustion cleared; free fallbacks restored. Local `~/.hermes/config.yaml` `model.provider` is `openrouter`.
- OT-30: serve now has the OpenRouter key in its EnvironmentFile; `setup.runtime_check` should show ready. Desktop may need one reconnect after the serve restart.
- OT-31: OpenRouter Settings picker now uses the live tool-capable catalog (377). Cap is 999 / uncapped, not None. Serve restarted.
- OT-32: chat OpenRouter featured shortlist is curated (~48) plus current (`openai/gpt-5.6-luna-pro` in featured). Cheap capabilities skip per-model lookups on the long tail. Serve restarted again — Desktop needs one reconnect.
- OT-33: Desktop model pickers type-to-filter. Chat menu focuses search on open. Settings/cron/bots/fallback Selects are `searchable`.
- OT-34: Local `Papership.app` rebuilt from current web dist and opened. Leftover `OrgOS.app` removed. Use rustup Cargo (`~/.cargo/bin`) — Homebrew 1.84.1 fails `edition2024`.
- OT-36: Desktop/OS icons are full-bleed so the system squircle fills the well. Web/tab mark stays the pre-cut plate.
- OT-35: Hermes updates are in NousResearch PR https://github.com/NousResearch/hermes-agent/pull/109304 (`cam-douglas:fix/openrouter-picker-and-search`).
- OT-37: Settings type-to-search no longer steals picker keystrokes. Branch head `9fd6983c20`. Local `Hermes.app` rebuilt unsigned (duplicate Apple Development identities).
- OT-38: Desktop chrome overlay kernel — live `overlay.css`, last-known-good rollback, `model-pill` slot with bundled fallback. Composer/settings stay in the kernel.
- OT-39: `claude-design` v1.2.0 emits `::preview` on Desktop. Installed locally and on the droplet.
- OT-40: droplet was reachable (SSH, Tailscale, serve `:9119`). Desktop SSH to `root@` timed out under load ~66; gateway restarted after watchdog; `auth.json` was root-owned again. Ownership restored to `hermes`. Reconnect Desktop as `hermes`.
- OT-41: Desktop now SSH as `hermes@hermes-droplet-campbell`. Root isolated serve gone. `droplet-campbell` stays root for admin.
- OT-42: Cursor + Terminal.app new sessions start at `/Users/camdouglas`, not the papership workspace.
- OT-43: cmux starts at home; inherit-from-last-workspace is off; Ghostty `working-directory = home`.
- OT-44: Desktop session-reserve failure was root-owned `active_sessions.json`. Ownership restored. Retry the turn.
- OT-45: Mac + droplet Hermes caps are all 100 (`agent.max_turns`, `code_execution.max_tool_calls`, `goals.max_turns`, `delegation.max_iterations`). Infinite not set. New Desktop chat required to bind.
- OT-46: Max-iteration wrap-up 400 was `ultra` leaked on the summary path. Droplet + local helpers now clamp to `max`. Isolated serve restarted.
- OT-47: Enabled Desktop/droplet tool-loop hard-stop. Compaction+todo replay was the token burn; stop that chat.
- OT-48: Droplet SMTP is DigitalOcean-blocked. Local 2525 relay + Gmail API send. Email adapter stays off.
- OT-49: Re-enabling Email caused SMTP timeouts + watchdog gateway restarts. Keep Email disabled.
- OT-50: Wheel now handled inside cursor-agent Ink `U()` (VPS 1931.index.js). New `agent` pane required. No Hermes PTY key inject; vps-ui-sync untouched.
- OT-51: Droplet Cursor CLI defaults to Run Everything via `~/bin/agent` `--yolo` wrapper. Existing pane unchanged until a new `agent`.
- OT-52: Desktop plays a Mac chime + toast when the VPS Cursor stop script rings BEL. Packaged app installed; reopen required.
- OT-53: Desktop remote terminals persist via named tmux; launch remounts tabs and resumes Cursor (`agent --resume` / `--continue`). Unsigned app installed; same quit+reopen.
- OT-54: Gateway dropouts are 2 vCPU / 4 GB starvation (load ~55, 83 MiB free). Upgrade in DO; 4/8 floor, 8/16 if two Cursor panes stay.
- OT-55: Parked extra Cursor/WhatsApp Chrome so one pane can finish. Load 50→6; 1.8 GiB free. Extras exit while one is interactive; resume on attach. Gateway/serve stay up.
- OT-56: Messaging no longer needs `hermes-msg` to wake. Gateway + Gmail watcher stay up. Email stays off.
- OT-57: Chrome is on-demand. `chromium-cdp` disabled on login; 1-min idle parks it unless a live browse is using CPU. Leftover wwa/puppeteer always killed. Gateway stays up.
- OT-58: Mac spend-tracker plugin refreshed from VPS (8920 B, DropdownMenu + self-pull). Palette reload sent. No named profiles.
- OT-59: `vps-ui-sync` plugin + `pull_vps_desktop_plugins.sh` on the Mac. Countdown/window-reload attempt reverted; the pull script owns sync.
- OT-60: Hermes at-risk patches snapshotted to `~/.hermes/preserve/` (Mac + VPS). Apply scripts installed. Live `hermes-agent` left in place.
- OT-61: Auto-apply after `hermes update` (zsh wrapper, VPS `~/bin/hermes`, git post-merge). Idempotent.
- OT-05 done: live Hermes user systemd has no `Environment=EMAIL_*`. OT-06…OT-14 parked in `docs/handover/future-tasks.md`. OT-15 JWT is sessionStorage + memory. OT-16 GET `/health` is 200.
- Leftover feature branches are gone from git (`main` + `origin/main` only). Cursor may still show closed-PR names. Local and origin `main` are `551bf31`. Vercel will pick up the Git push.

## Owner Decision

- 2026-09-13: trial competitor-average rate card (D-35) Free/Pro/Max/Enterprise. Charges stay off. Desktop must load current web chrome. Extra git branches are deleted in git. Hermes env must not be reused for Papership OAuth. Destroy-infra is not recommended.

## Active Instructions

- `/instructions/LAUCH.md`, `/instructions/PROJECT_PLANNING.md`, `/instructions/SUBAGENTS.md`, `/instructions/ROLES.md`.

## Active Items

- Live outstanding list: `docs/handover/outstanding-tasks.md` (repeat every turn).
- Owner follows `docs/plans/final_implementation_checklist.md` §6.

## Files in Active Use

- `/STATE.md`
- `docs/handover/outstanding-tasks.md`
- `docs/handover/future-tasks.md`
- `docs/workstreams/20260913-d25-repass/security-engineer-subagent/handoff.md`
- `docs/plans/final_implementation_checklist.md`
- `apps/web/src/api/papership.js`
- `apps/web/src/blueprint2/App.jsx`
- `scripts/generate-papership-icons.py`

## Open Blockers

- None in `/memory/blockers/`.

## Attempts Performed

- 2026-09-12: moved intake + UI spec into `docs/blueprints/` (`company_agent_system_blueprint.md`, `ui-blueprint.md`). Capture folder `docs/ui-blueprint/` stayed put.

## Decisions and Assumptions

- D-25 lift review 2026-09-12 CONDITIONAL; re-pass 2026-09-13 CONDITIONAL — write/external Hermes `accepted` unauthorized (`20260913-d25-repass`).
- D-35 trial rate card published; charges stay off.
- Erasure records intent only; destroy stays false.
- ERA-15 script is list-only.
- No Phase 8. Desktop Tauri loads `@papership/web` at `/papership`. Marketing site untouched.
- Do not copy Hermes VPS env into Papership Gmail/Slack.
- Same Hermes Google Cloud *project* may host a new Papership OAuth client. Same Hermes Slack *app* / tokens must not be reused.

## Current Working State

- Branch `main` @ `551bf31` (pushed). No leftover local or remote feature refs. Closed PRs 1–5 still exist as GitHub history.
- GitHub App `papership-dev` is local. VPS is Hermes only.
- Local API sources `~/.config/papership/connectors.env`. OT-25 Gmail and OT-26 Slack are both `configured` with `has_token` on the local store. Send stays approval-then-receipt. Vercel still cannot hold these tokens.

## Next Actions

1. Repeat `docs/handover/outstanding-tasks.md` open rows every turn. OT-50 and OT-68 done.
2. Do not treat write/external Hermes tools as `accepted`.
3. Charges stay off until a later owner flip (OT-08, parked).
4. Live Hermes is HostHatch `hermes@100.82.91.60`. Tailscale MagicDNS is `hermes-droplet-campbell` (no `-1`). DigitalOcean Tailscale is logged out; `*-do` SSH is public IPv4 only. Do not start a second gateway there.
5. Hermes git backups stay on **`main`** for Hatch (`hermes-agent` fork + private `.hermes` `fabf5d9`). Do not park the live VPS tree on a side branch. `hermes update` still pulls Nous; preserve wrappers restore local patches. **Auto-preserve:** every `hermes-agent` commit runs `preserve/githooks/post-commit` (snapshot + named `agent-commit` patch); every `hermes update` / post-merge still snapshot→apply→extras. Owner does not need to ask per patch.
6. HostHatch Cursor CLI is installed. Portable control plane is `/home/hermes/agent-instructions/.cursor` plus user rules under the hermes home Cursor directory. New projects: `~/bin/init-cursor-project`.
7. Hatch Cursor always starts in tmux (`~/bin/agent` / `~/bin/cursor-agent`) with Run Everything persisted (`approvalMode=unrestricted`). Owner off-switch: `~/.cursor/tmux.off` / `~/.cursor/run-everything.off` or `CURSOR_VPS_TMUX=0` / `CURSOR_VPS_RUN_EVERYTHING=0`.

## Last Updated

- 2026-09-12T18:48Z — OT-38: Hermes Desktop chrome overlay (CSS + rollback + model-pill slot). Unsigned rebuild installed.
- 2026-09-12T18:58Z — OT-39: claude-design skill wired to `::preview` (Desktop live canvas). Droplet + local skill copies updated.
- 2026-09-13T13:45Z — OT-40: droplet not down; Desktop SSH to root timed out under load; auth.json ownership restored.
- 2026-09-13T13:51Z — OT-41: Desktop pointed at hermes@; leftover root isolated serve killed; reconnect verified.
- 2026-09-13T13:53Z — OT-42: terminal default cwd is home, not papership.
- 2026-09-13T13:55Z — OT-43: cmux pointed at home; does not inherit Terminal/Cursor cwd.
- 2026-09-13T13:57Z — OT-44: chowned droplet `runtime/active_sessions.json` so Desktop can lease sessions.
- 2026-09-13T15:05Z — OT-45: Hermes turn/tool caps set to 100 on Mac and droplet. Infinite not applied.
- 2026-09-13T15:20Z — OT-46: clamp iteration-summary `ultra`→`max`; isolated serve restarted.
- 2026-09-13T15:25Z — OT-47: `hard_stop_enabled: true` on Mac + droplet.
- 2026-09-13T15:50Z — OT-48: localhost Gmail-API SMTP relay on :2525; adapter stays disabled.
- 2026-09-13T16:05Z — OT-49: Email platform SMTP timeouts blocked the gateway loop; keep disabled.
- 2026-09-13T18:45Z — OT-50: Desktop terminal TUI jitter patched (fit hysteresis + POSIX convertEol + hidden viewport scrollbar). Unsigned app installed; reopen to load.
- 2026-09-13T18:48Z — OT-51: droplet `~/bin/agent` wraps Cursor CLI with `--yolo` so new sessions are Run Everything.
- 2026-09-13T18:52Z — OT-52: Desktop terminal BEL/OSC 9 → Glass chime + toast. VPS finish script ssh-tty only.
- 2026-09-13T19:05Z — OT-53: Desktop terminal persist via tmux attach + Cursor `--resume` claimer. Unsigned app installed; reopen to load.
- 2026-09-13T19:20Z — OT-50 second pass after reopen still jittered: integer lineHeight, drop 1-cell fits, snap 1px overlay. App reinstalled. Droplet SSH timed out during a hung tmux set-option; Desktop fix does not need it.
- 2026-09-13T19:23Z — OT-54: droplet 2 vCPU / 3.8 GiB, load 54–58, 83 MiB available. Cursor×3 + Hermes + two Chromes. Upgrade recommended.
- 2026-09-13T19:28Z — OT-50 third pass: Cursor wheel loop was xterm viewport vs TUI redraw. Lock viewport on alt/mouse; freeze fit after wheel.
- 2026-09-13T19:40Z — OT-55: killed extra Cursor + WhatsApp Chrome/wwa; cron parks extras while one pane is live. Load 50→6, 1.8 GiB available.
- 2026-09-13T19:47Z — OT-56: `hermes-msg` idle park for gateway messaging; 20 min; wake command only. Email still off.
- 2026-09-13T19:55Z — OT-56 revised: owner rejected manual `hermes-msg` wake and chat NLP. Gateway stays up; Desktop isolated serve is the deterministic keep-alive; idle parks Chrome/wwa only.
- 2026-09-13T19:48Z — OT-50 fourth pass: wheel lock now writes SGR/arrows to the PTY so Cursor can scroll.
- 2026-09-13T20:02Z — OT-57: Chrome on-demand + 1-min idle park; chromium-cdp disabled from login. Gateway stays up. SIGSTOP not used (keeps RAM).
- 2026-09-13T20:04Z — OT-58: spend-tracker Desktop plugin copied VPS → Mac `~/.hermes/desktop-plugins/spend-tracker/`; ⌘K Reload desktop plugins sent. Did not quit Hermes.
- 2026-09-13T20:12Z — OT-58 refresh: Mac plugin replaced with live VPS 8920 B file (DropdownMenu + `desktop.plugin.source` pull). Palette reload sent. Chat paste was the prior 7989 B Popover revision.
- 2026-09-13T20:22Z — OT-59: vps-ui-sync plugin + Mac pull script + HERMES_VPS_SSH. Launchd template filled, not loaded. Palette reload sent.
- 2026-09-13T20:30Z — Reverted the 30s countdown / window-reload plugin draft. Mac `vps-ui-sync` restored from VPS (5315 B, `POLL_MS` 15s, no `location.reload`).
- 2026-09-13T20:44Z — OT-60: snapshotted Mac/VPS dirty hermes-agent trees into `~/.hermes/preserve/` with apply.sh. Did not delete live source.
- 2026-09-13T20:50Z — OT-61: auto-apply preserve patches after hermes update (wrapper + post-merge). Both trees reported already applied.
- 2026-09-13T21:02Z — OT-50 fifth pass: restored native xterm scrollbar/scroll; kept fit anti-jitter. Snapshotted `mac-20260913T2105Z`. Packed and installed without quitting the live app.
- 2026-09-13T21:09Z — OT-50 Ink wheel: patched VPS cursor-agent 1931.index.js to map SGR wheel → `U()`. No Hermes key inject. New agent session needed.
- 2026-09-14T09:05Z — Droplet-style 8/16 GB price canvas: Hetzner CX33/CX43 ~$10/$18.50; Contabo cheaper flat; BinaryLane for Sydney hourly. DO Basic 8/16 is $48/$96.
- 2026-09-14T09:20Z — Hostinger/Hetzner/IONOS/netcup pick: Hetzner CX43. RAM first. Hourly ≠ per-process; gateway 24/7 hits the monthly cap.
- 2026-09-14T09:32Z — A$40 max-compute: Contabo VPS 12, HostHatch 32 GB, Hetzner CX43. No GPU in budget; local models = CPU GGUF 8B–14B.
- 2026-09-14T09:40Z — Single plan under A$50: Contabo Cloud VPS 12.
- 2026-09-14T10:40Z — All-domain under A$50: Contabo Cloud VPS 16 (16/64/500/1G) at €29.60. No dedicated/Performance SKU fits.
- 2026-09-14T10:50Z — Disk size not important; NVMe quality secondary to RAM. Last pick Hetzner CX53. Contabo only if resident 14B+ with 3+ panes.
- 2026-09-14T11:05Z — Owner asked if Contabo 64 GB is worth it at A$50. Yes if promo €29.60: unique 64 GB; CPU/disk worse than CX53; not a Mac.
- 2026-09-14T16:00Z — Owner chose HostHatch NVMe 64GB Sydney / Ubuntu 26.04. DO parked for remaining work. Cutover blocked on HostHatch IPv4 (`.env` fail-closed).
- 2026-09-14T16:20Z — HostHatch 85.155.189.170: hermes user, keys, UFW, copied `.hermes` without disposable venvs, uv venv OK. Tailscale needs owner login URL. Gateway not started.
- 2026-09-14T16:32Z — OT-62 flipped. Hatch gateway 200 / serve 302 / Telegram up. DO units stopped. Aliases retargeted. OT-50/52/53 owner-closed.
- 2026-09-14T17:10Z — OT-63: Hatch WhatsApp Baileys + Chrome 153 CDP; Email uses real Gmail SMTP 587 + IMAP 993; watcher removed. DO SSH aliases + public IPv4 fallback.
- 2026-09-14T17:20Z — Cutover audit: Desktop already on Hatch (`hermes@` + isolated serve). DO leftover Gmail watcher parked.
- 2026-09-14T17:28Z — OT-64: Photon sidecar live; cost-guard timer on; preserve snapshot refreshed.
- 2026-09-14T17:32Z — OT-65: Desktop `.local/bin/hermes` now snapshots + auto-applies preserve. No owner apply step.
- 2026-09-14T17:45Z — Pushed Mac/Hatch hermes-agent + Hatch `.hermes` overlay as Cursor Agent. Mac home is not a git clone. Preserve branches stay split so Nous/Desktop updates cannot wipe the other machine.
- 2026-09-14T17:50Z — Generic `agent-instructions` control plane copied to Hatch `~/agent-instructions`. Cursor CLI already present (`2026.09.10-fd3934a`). User rules installed. Hatch live agent/home trees are on `main` only (`vps/hosthatch` and `mac/preserve` removed).
- 2026-09-14T17:54Z — Hatch `~/bin/agent` and `~/bin/cursor-agent` wrap Cursor in tmux and keep Run Everything on unless the owner disables it.
- 2026-09-14T17:58Z — Paused Hatch cron `gmail-internal-review`. IMAP+SMTP replace the Gmail API watcher/watchdog.
- 2026-09-14T18:20Z — Removed `gmail-internal-review`. DO→Hatch overlay (update-only; live auth/email/WhatsApp kept). Photon pairing + Zapier token copied. Preserve apply OK; snapshots through `vps-20260914T1819Z`. Pushed fork `main` `bc4ddbf10c` and `.hermes` `main` `101f836`. DO droplet can be destroyed.
- 2026-09-14T18:30Z — Hatch Tailscale MagicDNS is `hermes-droplet-campbell` (dropped `-1`). DO Tailscale logged out; `tailscaled` disabled. Offline admin row may remain until deleted in the Tailscale machines page.
- 2026-09-14T18:37Z — Desktop terminal Cursor TUI was a bash prompt after `agent` exited blank. Respawned the live `h-45ca5461-…` pane onto `~/bin/agent`; cursor-agent stayed up (Grok 4.6 High Fast). Login OK.
- 2026-09-14T18:47Z — OT-50: Desktop alt-screen wheel writes SGR 64/65 to the PTY for Cursor Ink `U()`. Unsigned Hermes.app installed; reopen required.
- 2026-09-14T18:50Z — Desktop “gateway disconnected” was Mac-side: `ditto` at 18:45 closed the SSH tunnel; Mac Tailscale was stopped so reconnect timed out. Hatch `hermes-gateway` stayed active, `/health` 200, 60 GiB free, no OOM. Tailscale reopened; Desktop reused isolated serve pid 57793.
- 2026-09-14T19:05Z — OT-50: dropped SGR-to-PTY. Wheel over the terminal overlay now sends Ink C-u / C-d. App installed; reopen required. Did not quit the live app.
- 2026-09-14T19:08Z — Pre-update preserve snapshots: `mac-20260914T1908Z` and `vps-20260914T1908Z` (both reverse-check OK; Hatch copy also on the Mac). Cursor `1931.index.js` in Hatch extras.
- 2026-09-15T08:20Z — Desktop update failed because Mac checkout was on `campbell/local-patches` with dirty wheel files. Stashed, switched to `main`, pulled to `a55c972e09` (v0.21.3). Hatch same tip; uv left `.venv` and units still called `venv/` (203/EXEC). Symlinked `venv`→`.venv`; gateway 200 / serve 302. Preserve 3-way incomplete on Hatch; snapshots kept.
- 2026-09-15T08:55Z — Post-update Cursor wheel still dead: stock `main` has no handler and C-u is ignored while Ink input is disabled. Desktop now writes `ESC[9001~`/`ESC[9002~` + SGR; Hatch `1931` maps to `U()` without `g` or `1000h`. Unsigned app ditto’d; live Hermes not quit. Five `h-*` panes `--resume`d.
- 2026-09-15T08:59Z — 9001 leaked into the Cursor prompt as digits. Replaced with Page Up/Down. Hatch key handler allows page keys while `g`. Removed stdin listener. App ditto’d; reopen required. Did not respawn panes.
- 2026-09-15T09:06Z — Owner asked to revert the terminal pane to stock. Restored `use-terminal-session.ts` from `a55c972e09`, removed wheel files, restored Hatch `1931` from `.pre-hermes-wheel`, patch script restore-only. Clean unsigned app ditto’d (no 9001 in bundle). Live Hermes not quit.
- 2026-09-15T09:30Z — Goal: Cursor transcript wheel. Stock xterm history was the “past messages” scroll. Desktop now steals TUI wheel and sends Page Up/Down only; xterm scrollback 0 on TUI. Hatch page keys call `U()` while `g`. Tests 5 passed. App ditto’d; panes `--resume`d. Reopen required. Goal not complete until reopen verifies transcript moves.
- 2026-09-15T09:40Z — OT-68: Hatch tmux status clock is Sydney (`TZ=Australia/Sydney date`; 19:37 AEST vs 09:37 UTC). Desktop restore remounts tabs, reveals the pane, attaches `h-<tabId>` or `agent --resume`. Unsigned app 09:38Z. Did not quit live Hermes.
- 2026-09-15T09:42Z — OT-50: pixel-wheel carry (48px → one Page Up/Down). Hatch page-key `U()` patch confirmed. Tests 6. App 09:41Z. Reopen still required; transcript movement not yet observed.
- 2026-09-15T09:46Z — OT-50: Page Up/Down call `U()` before `g`/`v`. Hatch live `PageUp` scrolled a conversation pane. Desktop reopen still required for wheel.
- 2026-09-15T09:49Z — Signed `npm run pack` failed (duplicate Apple Development identities). Unsigned pack installed 09:48Z: TUI latch for chat titles, Sydney persist, pane restore. Live Hermes pid 30783 left running.
- 2026-09-15T09:51Z — Latch no longer drops on a leftover `zsh` title during wheel. Hatch pane is `Hermes Desktop Fixes` `alt=0`. Unsigned app ditto’d 09:51Z. Bundle has Page Up/Down, no CSI 9001. Pid 30783 still old.
- 2026-09-15T09:54Z — Overlay wheel hit-test + Hatch-title tests (8). Bundle assert `index-C0CcTvIJ.js` Page Up/Down only. Ditto 09:54Z. Pid 30783 unchanged (started 19:43). Desktop wheel still unverified until reopen.
- 2026-09-15T09:56Z — `planTuiWheelWrite` covers the live Hatch pane (normal buffer + `Hermes Desktop Fixes` → Page Up). Tests 10. Pack `index-xR7pw6mf.js` Page Up/Down only; ditto 09:56Z. Pid 30783 still 19:43.
- 2026-09-15T09:58Z — `createTuiWheelDispatcher` + jsdom `WheelEvent` writes Page Up. Hatch PageUp changed the live pane with a visible prompt. Tests 11. Pack `index-sAXobJWW.js`; ditto 09:58Z. Pid 30783 still 19:43.
- 2026-09-15T10:09Z — Owner: still no scroll, no scrollbar. Cause: TUI zeros xterm scrollback (no native bar) and the custom rail was source-only (not in 09:58 pack). Packed rail + host wheel + 12px page (`index-Bw8wIGGE.js`); ditto + Force Reload. Hatch PageUp works on attached `h-45ab6dfa`.
- 2026-09-15T10:31Z — OT-50/68: scrollbar always PTY PageUp×3; tmux status `%%` Sydney clock (was UTC via format expand).
- 2026-09-15T10:44Z — OT-68 done. OT-50: remote PageUp → tmux copy-mode history scroll (Ink U() had nothing to move).
- 2026-09-15T10:47Z — OT-50 done (owner confirmed Desktop Cursor scroll). Goal complete.
- 2026-09-15T10:53Z — Pushed Desktop scroll/persist to fork + NousResearch PR #111822; papership docs d23cb1e; preserve extras-after-apply wired.
- 2026-09-15T11:02Z — Preserve automation: post-commit snapshot + agent-commit record; host extras in snapshot; Mac synced to Hatch-class apply; private `.hermes` `fabf5d9` pushed.
