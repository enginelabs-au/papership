---
document: final_implementation_checklist
status: open
created: 2026-09-11
updated: 2026-09-12
release: R1–R4 structure closeout
---

# Final Implementation Checklist

This closes the **initial development stage** (Phases 0–7). There is no Phase 8. Verification phases 13–18 re-run when you ship, they are not extra build phases.

R1 owner `APPROVE` is already recorded (2026-09-11). This file replaces the old R1-only leftover list.

**Defaults I locked so you do not have to decide them:** no Phase 8; pack execution stays off; D-25 stays (no write/external Hermes); D-30 stays (no public build-log); D-35 trial prices are published and charges stay off; desktop loads the current web app; marketing site `www.enginelabs.com.au` / Vercel `enginelabs-au-site` stay untouched; erasure records intent only and never wipes the org; ERA-15 here is list-only.

## 1. Completion declaration

- [x] All planned agent-executable phases (0–7) are implemented.
- [x] Available automated validation passes (see §9).
- [x] Closeout leftovers I could finish without you are done:
  - Settings → Data: **Record measurement notice** (`POST /settings/oq-g2`).
  - Settings → Data: **Record erasure request** (intent only; destroy stays false).
  - Data traces/KPIs and Today health no longer show fake counts; health overlays live `/health`.
  - Leftover `$0.` demo costs stripped from unused `cc-org-dash` Data screen.
  - ERA-15 list-only dry-run: `node scripts/era15-dry-run.mjs`.
- [ ] Unverified / owner-only items are listed below.

## 2. Outstanding defects or unverified items

| Item | Impact | Status | What you do | Owner |
|---|---|---|---|---|
| Local `main` (Phase 7 closeout) not on GitHub | live web | merge `7b1207e` is local; `git push` rejected GH007 (`shuffle.ops@gmail.com`) | Allow that email at github.com/settings/emails, or push from your machine | you |
| Production `/papership` on current `origin/main` | live web | READY `dpl_7LVo1LmNzzTztmQ4G5cFAdYsLRqR` (`20b7fc8`, `@papership/web`) at `https://orgos-ivory.vercel.app/papership` | After the push, confirm a new production deploy | you |
| OQ-G2 on the **live** store | second human / guest | API + button exist; store flag still false until you click | Settings → Data → Record measurement notice | you |
| Live Gmail / Slack | real mail/chat | names wired; apps not created | Google/Slack dashboards, then set the three names | you |
| Hermes GET `/health` hang | readiness | HEAD-first probe already used | optional Hermes ops fix | you |
| Mailbox creds in systemd `Environment=` | secret hygiene | done 2026-09-13 | live Hermes user units have no `Environment=EMAIL_*` | — |
| PWA token in web storage | mobile residual | fail-closed; no device keychain proof | accept for now, or later keychain work | residual |
| Desktop signed update / axe gallery | V16-1/4 PARTIAL | unsigned | Apple signing when you want a signed desktop | you |
| Compose live + backup restore | V15-5 / V17-4 | config exists, not brought up | provision backup target, then restore drill | you |
| Browser click-through | MCP clicks hook-blocked | owner walk | click Settings / Integrations yourself | you |
| Today decorative rows | honesty | health/Data are live or `not captured`; priorities/runs/decisions can still show blueprint demo rows | ignore as chrome, or ask for a later honesty pass | residual |
| Org-wide erase / ERA-15 real destroy | PRD-F.8 / ERA-15 | record + dry-run only | do **not** destroy until you mean it | you |

## 3. Role and stage-gate closure

| Role | Required | Final verdict | Evidence |
|---|---|---|---|
| software-engineer-subagent | required | PASS | phase-7 SE handoff |
| security-engineer-subagent | required | PASS with residuals | `.../security-engineer-subagent/phase-7-handoff.md` |
| ui-ux-developer-subagent | required | PASS | phase-7 UI handoff |
| product-manager-subagent | required | PASS | phase-7 PM handoff |
| growth-marketing-subagent | required | PASS | phase-7 Growth handoff |
| project-lead-subagent | required | G11 PASS with residuals | `.../project-lead-subagent/phase-7-handoff.md` |

Earlier gates: G0–G3 (R1), G5 (R2), G7 (R3), G9 (R4 commercial structure), G11 (R4 ecosystem/mobile). No `BLOCKED` verdicts. Owner R1 `APPROVE`: `docs/workstreams/20260910-engine-labs-company-os/delivery/owner-handoff.md`.

- [x] No outstanding `BLOCKED` role verdicts.
- [ ] Owner accepts this closeout handoff (tick §8).

## 4. Environment variables and secrets still required

Never put values in git, chat, or agent files.

| Variable name | Source | Where it goes | Why | Value supplied? | After you set it |
|---|---|---|---|---|---|
| `GMAIL_OAUTH_CLIENT_ID` | Google Cloud OAuth client | API host | live Gmail wizard | no | Integrations → Gmail leaves “planned” |
| `GMAIL_OAUTH_REDIRECT_URL` | same client | API host | OAuth return | no | same |
| `SLACK_CLIENT_ID` | Slack app | API host | live Slack wizard | no | Integrations → Slack leaves “planned” |
| `STRIPE_TEST_*` (three names in `.env.example`) | Stripe test mode | local/API only | future test checkout | optional | charges stay **off** even if set |
| `MODEL_PROVIDER_API_KEY` | model vendor | worker only | live model calls | local if you already use Hermes | `/health` hermes reachable |
| `APPLE_*` / `TAURI_SIGNING_*` / `ANDROID_KEYSTORE_*` | Apple / Google / signing | CI or local signing | store/desktop binaries | no | signed build exists |
| `BACKUP_TARGET_URL` / `BACKUP_ENCRYPTION_KEY_PATH` | your off-VPS backup | infra | DRR / restore drill | no | restore drill receipt |
| `DIGITALOCEAN_API_TOKEN` | DigitalOcean | owner/CI only | droplet automation | no | never paste here |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | @BotFather bot; secret is a long random string you choose | API host (`~/.config/papership/connectors.env`) | Telegram inbound and approved send (D-37) | no | Integrations → Telegram shows configured; Register webhook |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Meta WhatsApp Cloud API app; verify token is a string you choose | API host (`~/.config/papership/connectors.env`) | WhatsApp inbound and approved send (D-37) | no | Integrations → WhatsApp shows configured; set the callback URL in Meta |
| `HERMES_API_SERVER_KEY` | Hermes gateway | **worker/VPS only** | `/v1/*` transport | yes on VPS | do not copy onto the API or desktop |
| `GITHUB_APP_*` | App `papership-dev` | local API | bound repo | yes locally | `/health` github reachable |

Already wired and default-safe: `ENGINE_BILLING_CHARGES_ENABLED=0`, `ENGINE_PACK_EXECUTION_ENABLED=0`, `ENGINE_USAGE_EMIT`, JWT/store names, `HERMES_API_BASE_URL`, `HERMES_VERSION_PIN`, `ENGINE_API_PUBLIC_URL`. Do **not** add `STRIPE_LIVE_*`.

## 5. Super-critical decisions only you can make

I will not pick these. There is no safe default.

1. **Publish prices** (CA-10 part 1). Until you do, UI stays labels and bands only.
2. **Turn charges on** (CA-10 part 2). Separate from publishing prices. Until you do, `/billing/charge` stays 403.
3. **Lift D-25** — allow live write or external Hermes tools. Needs a **new** Security PASS. Current pass is catalogued **read** only.
4. **Ship a production release** (`execute_release` / merge to `main` + Vercel production).
5. **Pay for Apple Developer / Google Play / signing / notarization** and submit store listings.
6. **Create live Google / Slack OAuth apps** and put real users’ mail/chat through Papership.
7. **Spend on / destroy production infra** (Compose/VPS/DNS/DigitalOcean, real ERA-15 decommission, real org-wide wipe).

Everything else below is a **step**, not a new product decision.

## 6. Your closeout walk

Do these in order. Skip a section if you do not want that capability yet.

### A. Put this tree on production (needed for a real second seat)

1. Review the branch `cursor/phase-6-planning-cc89` (or whatever you merge).
2. Merge to `main`. Do not force-push.
3. Confirm Vercel project `papership` (`prj_S74JOIky7KugVTrfu652NhJYOL8l`) builds `@papership/web` and the production URL serves `/papership`.
4. Open the production app, sign in, and walk Today → Work → Inbox → People → Data → Integrations → Settings. Confirm no leftover prices and Data KPIs say `not captured` until events exist.

### B. Unlock a second human (legal already accepted — D-23)

1. On the **live** store, go to Settings → Data & retention.
2. Read the measurement notice.
3. Click **Record measurement notice**.
4. Confirm the row says Recorded. A guest or second seat will stay refused until this is true on that store.
5. Invite the second person from People. Mail is not sent by Papership; you still hand them access.

### C. Optional: live Gmail or Slack

1. Create a Google OAuth client. Set `GMAIL_OAUTH_CLIENT_ID` and `GMAIL_OAUTH_REDIRECT_URL` on the API host only.
2. Create a Slack app. Set `SLACK_CLIENT_ID` on the API host only.
3. Restart the API. Open Integrations and finish the wizard **in the provider’s browser**, never by pasting a provider password into Papership.
4. Send still means: approval, then a receipt. Telegram and WhatsApp stay planned until you register those apps later.

### D. Optional: production Compose / backup (not required to use the Vercel web app)

1. Provision the Droplet and DNS yourself.
2. Set `POSTGRES_PASSWORD` and JWT names in the host environment, not in git.
3. Bring up `infra/compose/docker-compose.yml` from your process (owner/CI).
4. Choose an **off-VPS** backup location. Set `BACKUP_TARGET_URL` and `BACKUP_ENCRYPTION_KEY_PATH`.
5. Run a restore drill onto a disposable target. Keep the receipt. A local copy on the same VPS is not disaster recovery.

### E. Hygiene and GitHub (do when convenient)

1. Mailbox credentials are off systemd `Environment=` on the live Hermes host (2026-09-13).
2. In GitHub: branch protection on `main`; pin Actions by SHA; turn on Dependabot (protected workflow files — dashboard or a later ask).
3. Set GitHub org / App dashboard avatars if you want them (icons in-repo are already Papership).
4. Optional: rename local folder `~/Papership` if you still have `~/OrgOS` (safe after reopen).
5. Keep D-30: do not publish a public build-log until you later decide to.

### F. Later commercial / stores / agents that change the world

Only after a matching decision in §5:

1. Write the rate card numbers yourself. Then I can wire publication.
2. Flip `ENGINE_BILLING_CHARGES_ENABLED` only after you accept live charges.
3. Paid Apple / Google accounts, then a signed mobile/desktop binary, then store submit.
4. New Security review before any write/external Hermes `accepted`.

### G. Destructive drills (last, and only if you mean it)

1. `node scripts/era15-dry-run.mjs` — lists units. It must never delete.
2. Settings → Data → **Record erasure request** records intent (`erase` / `tenant` / `irreversible` + reauth). Destroy stays false.
3. Real org-wide wipe and real Droplet/volume destroy stay owner-only, on a disposable tenant, with a deletion receipt.

## 7. Production integrations and dashboard actions

### Deployment

Vercel product project `papership` only. Never edit `enginelabs-au-site`. Production Compose/VPS is owner/CI.

### DNS and domains

Owner. Product route is `/papership`. Do not invent a marketing landing at `/` in this repo.

### OAuth and identity

Local web sign-in is the product shell. Live Gmail/Slack are §6C. JWT names: `SUPABASE_JWT_SECRET`, `ENGINE_JWT_ISSUER`, `ENGINE_JWT_AUDIENCE`.

### Database and storage

SQLite store on the API host / Compose `api-store`. Postgres in Compose for system DB. Encrypted backups must be off-box.

### Other providers

GitHub App `papership-dev` is local. Hermes on `hermes-droplet-campbell` is Hermes only — do not copy the App PEM there. Stripe test names may exist; live charges stay off. No analytics SDK.

## 8. Final smoke tests after manual actions

- [ ] Production `/papership` loads; `/` and `/cc-org-dash` redirect there.
- [ ] Sign-in works; sign-out wipes the offline queue.
- [ ] Settings → Data records OQ-G2 on the live store; a second seat can then be invited.
- [ ] Integrations: GitHub configured; Gmail/Slack still planned unless you did §6C.
- [ ] Settings → Plan shows Free / Pro / Max / Enterprise trial prices; Charges still Off.
- [ ] Data KPIs say `not captured` (or real events, never invented counts).
- [ ] `/health` : `db` ok; `github` reachable from the API that owns the App; Hermes may stay unreachable without the tunnel.
- [ ] No currency prices in the live UI.
- [ ] If you deployed Compose: health, a dummy restore, and rollback path recorded.

## 9. Owner decision

- [ ] Owner approved this closeout handoff.
- [ ] Conditions or requested remediation are recorded in `docs/workstreams/20260910-engine-labs-company-os/`.

## 10. Final evidence

- Plans: `docs/plans/phase_0_foundations_plan.md` … `docs/plans/phase_7_ecosystem_mobile_plan.md` (all complete).
- Intake: `docs/blueprints/company_agent_system_blueprint.md`.
- Gates: G3, G5, G7, G9, G11 handoffs under `docs/workstreams/20260910-engine-labs-company-os/`.
- R1 `APPROVE`: `delivery/owner-handoff.md`.
- Residuals log: `docs/handover/outstanding-actions-and-decisions.md`.
- Registry: `docs/capabilities.md` (`0.1.5-phase7`).
- Validation this closeout: `services/api/.venv/bin/python -m pytest services/api/tests/test_phase5.py services/api/tests/test_phase6.py services/api/tests/test_phase7.py services/api/tests/test_env.py` (31 passed); `node --test apps/web/tests/static-scan.test.mjs` (8 passed); `node scripts/era15-dry-run.mjs` (DRY RUN — no destroy).
