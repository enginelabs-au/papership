# Repository audit

Date: 2026-10-06. Method: read-only inspection of `apps/web`, `apps/desktop`, `apps/mobile`, `services/api`, `services/worker`, `packages/contracts`, `packages/ui`, `infra`, `scripts`, `.github`, `docs/policies`, and the live schema in `services/api/app/store.py`. No files in those trees were modified for this audit.

Verdicts:

| Verdict | Meaning |
|---|---|
| KEEP | Use as-is for the Knowledge Layer |
| ADAPT | Extend in a named later phase. Do not rewrite first |
| DEPRECATE_LATER | Not on the live path. Remove only when a phase owns the cleanup |
| UNRELATED | Stays for the Company OS. Not a Knowledge Layer building block |
| UNKNOWN | Needs a decision. Listed as KL-O items in [DECISION_LOG.md](DECISION_LOG.md) |

## The existing Workspace

The primitive Papership Workspace is the blueprint-2 shell:

- UI: `apps/web/src/blueprint2/App.jsx`, `screens.jsx`, `blueprint2.css`
- Route: `/papership` (`apps/web/src/App.jsx`). `/`, `/cc-org-dash`, and older dashboard paths redirect there
- Data: `apps/web/src/api/papership.js` (`API_BASE`, session JWT, `loadPapershipOverlay`)
- Hosts: browser; Tauri desktop and the mobile spike both load `apps/web/dist`

It already supports the mission in pieces: live memory with provenance, a 43-domain catalogue, connection and pack trust labels, a founder job loop that writes stage artifacts and memory rows, grant and approval APIs, receipts, audit, and usage-event rules. Much of the chrome (issues, board, files, traces, assistant transcript, decision cards) is still fixture data.

Generic Company OS behaviour that remains operational context, not the moat: people, teams, inbox, rate card, erasure intent, field evidence, payment proposals (intent only), adaptive view shells.

Elements that should become context-aware, in order: agents (no profile yet), work items and runs, memory items, loop artifacts, connections, and approvals.

## Frontend

| Path | Verdict | Why |
|---|---|---|
| `apps/web/src/blueprint2/` shell, hash nav, theme | KEEP | Live product. Shared by web and Tauri |
| `apps/web/src/api/papership.js` | ADAPT | Add agent, approval, audit, and knowledge reads. Split the overlay when KL-P1 touches it |
| `MemoryView` and `GET /memory` | ADAPT | Closest knowledge UI. Promote into the Knowledge section in KL-P1 |
| Today Registry, Integrations catalogue | ADAPT | Live catalogue and connectors. Keep the capability-registry name (KL-D9) |
| Today decisions, Hey approval card | ADAPT | Right shape, fixture data. Wire to `POST /approvals` in KL-P1 |
| Run detail, work item detail | ADAPT | Receipts and stages become impact and trust once fed by the API |
| Settings permissions, AI and agents | ADAPT | Local toggles should become grants. Hermes host box is the runtime status |
| Work workflows (founder loop) | KEEP | Live job and artifact path |
| Settings plan, measurement, erasure | KEEP | Commercial and privacy controls. Charges stay off |
| Issues, board, roadmap, files, data traces, notification drawer, fixture audit bar | DEPRECATE_LATER | Shape only, until live ledger and audit views exist |
| `components/cc-org-dash/`, `pages/Dashboard*.jsx`, `components/ui/`, `lib/*`, Tailwind entry | DEPRECATE_LATER | Unreferenced. One web test still reads `cc-org-dash/DataScreen.jsx` |
| `packages/ui` | UNKNOWN | Only the unused desktop `src` shell imports it (KL-O4) |
| `apps/web/tests/static-scan.test.mjs` | KEEP | Route, token storage, and brand guards |

## API and worker

| Path | Verdict | Why |
|---|---|---|
| `app/auth.py` | KEEP | JWT, issuer, audience, lifetime, `grant_version` |
| Grants, approvals, receipts, audit in `app/store.py` | KEEP | Authority core the Knowledge API must reuse |
| `app/usage.py`, `app/logging_util.py` | KEEP | Event discipline and request traces |
| `services/worker/policy_hooks/` | KEEP | Catalog, interception, egress, startup fail-closed |
| `app/memory_ops.py`, `memory_items` | ADAPT | ContextObject seed (KL-D5) |
| Loop artifacts and `loop_stage_work.py` | ADAPT | Artifacts should reference context versions instead of being the only copy |
| `work_items`, `jobs`, `runs` | ADAPT | Nullable context references (KL-P1) |
| `registry`, `managed_projects.py` | ADAPT | Capability-registry seed. Not the Papership Registry |
| `connectors.py`, `connections`, `source_grants.py`, `github_grants.py` | ADAPT | Context sources and trust inputs |
| `packages/contracts/src/` | ADAPT | Add context schemas when KL-P2 starts. Mirror the Python models (KL-D3) |
| Hermes client and loop dispatch | ADAPT | Runtime becomes a Knowledge API consumer (KL-D4) |
| `phase5.py` view shells, `view_defs.py` | DEPRECATE_LATER | Adaptive-view leftovers |
| `phase7.py` packs, payments, field, erasure stubs | DEPRECATE_LATER | Intent records. Commerce and erasure stay policy-bound, not this module's shape |
| `auth_stub.py`, `seed.py` | DEPRECATE_LATER | Dev helpers |
| `oauth.py`, GitHub pull-open path, connector send dry-runs | UNRELATED | Plumbing for Company OS connections |
| Allowances, entitlements, `rate_card.py` | UNRELATED | Commercial structure. Charges off |
| `migrations/001_init.sql` and Compose Postgres | UNKNOWN | Unused by the app (KL-O1) |
| `worker.py` poll vs API subprocess | UNKNOWN | Two dispatch paths (KL-O2) |
| `schedules`, `strategy_records` | UNKNOWN | No knowledge consumer (KL-O3) |

Live store: one SQLite file, 47 tables created in `Store._init_schema` and later `_migrate_*` helpers. No version table. Foreign keys are enabled and not declared. A process-wide lock wraps every store method, including a Hermes subprocess of up to 90 seconds. That lock is a seam, not a KL-P0 fix.

## Desktop, mobile, infra, delivery

| Path | Verdict | Why |
|---|---|---|
| `apps/desktop/src-tauri` | KEEP | Tauri 2, OS keychain, least-privilege capabilities. Desktop Bridge host |
| `apps/desktop/tests`, `scripts/generate-papership-icons.py` | KEEP | Icon and static-scan guards |
| `apps/desktop/src` React shell | DEPRECATE_LATER | Not the bundled UI |
| `apps/mobile` | ADAPT | Reuse the config at KL-P9. No crate yet |
| `infra/compose`, compose assertions | KEEP | Local boundary tests |
| `infra/backup`, `infra/digests.lock` | ADAPT | Must name any new knowledge volume before a real backup |
| `scripts/ci.sh`, `dev.sh`, `dev-local.sh`, `port-scan.sh`, `seed.py`, `justfile` | KEEP | Extend, do not replace |
| `scripts/hermes-tunnel.sh` | ADAPT | Operator tunnel. The Bridge must not depend on it |
| `scripts/era15-dry-run.mjs` | UNRELATED | Decommission helper |
| `.github/workflows/product-ci.yml` | ADAPT | Add knowledge tests when code exists. Action SHA pins stay an owner item |
| `.github/workflows/agent-governance.yml` | UNRELATED | Control plane |
| `vercel.json` | KEEP | Web app only |
| `internal/` | UNKNOWN | Empty untracked directory (KL-O5) |

## Policies

| File | Verdict |
|---|---|
| `docs/policies/memory-governance.md` | KEEP. Binding input to context class and retrieval |
| `docs/policies/authority-model.md` | KEEP. Binding input to the ladder |
| `docs/policies/data-residency-and-retention.md` | KEEP. Binding input to ownership |
| `docs/policies/erasure-and-offboarding.md` | ADAPT. Later phases must name knowledge destinations in erasure receipts |
| `docs/policies/licensing.md` | ADAPT. Inventory grows when new dependencies appear |

## Blocking seams (design around; do not fix in KL-P0)

1. Store lock held during Hermes subprocess dispatch.
2. Hard-coded founder tenant, principal, and `proj-engine-labs`.
3. JSON text columns without a server-side model.
4. Inline `has_grant` checks and an unused `scope` column.
5. Memory visibility by seat-template string.
6. Worker imports the API store by filesystem path.
7. Postgres SQL already drifted from SQLite (no `memory_items`, different `work_items`).
8. Contracts are TypeScript-only. The API does not validate with them.

## Environment names touched by this audit

No new variables. Existing names that later phases must keep honouring: `ENGINE_STORE_PATH`, `ENGINE_JWT_ISSUER`, `ENGINE_JWT_AUDIENCE`, `SUPABASE_JWT_SECRET`, `ENGINE_USAGE_EMIT`, `ENGINE_BILLING_CHARGES_ENABLED`, `ENGINE_PACK_EXECUTION_ENABLED`, `ENGINE_TEST_HOOKS`, `HERMES_API_BASE_URL`, `HERMES_API_SERVER_KEY` (worker only), `HERMES_VERSION_PIN`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_PATH`, `GITHUB_APP_OWNER`, `GITHUB_APP_REPO`, `VITE_API_BASE_URL`. Values are not recorded here.
