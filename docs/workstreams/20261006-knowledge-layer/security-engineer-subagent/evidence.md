---
schema_version: 1
task_id: 20261006-knowledge-layer
role_id: security-engineer-subagent
revision: 1
---

# Evidence

Environment: local working tree, git HEAD `5636c3b265b22d249df7defc4e3a130c15c00450` on `main` at review time. Method: direct inspection. No secret values were copied. Timestamp for the review: 2026-10-06T12:22:00Z.

| ID | Claim | State | Source | Follow-up |
|---|---|---|---|---|
| E-1 | SECURITY_MODEL extends AUTH and MEM and does not replace them. DATA_OWNERSHIP points at residency policy, D-12, and D-14 | VERIFIED | Both documents' openings; `.cursor/USER.md` | — |
| E-2 | `tenant-founder` and `principal-founder` literals exist. `has_grant` selects `grant_class` only. `proj-engine-labs` is hard-coded. Local session returns the founder principal only when test hooks are on (default `ENGINE_TEST_HOOKS=0`) | VERIFIED | `services/api/app/store.py`, `managed_projects.py`, `main.py`, `config.py` | KL-SEC-01 |
| E-3 | `_visible_to` filters `operator` and `project_lead` by template and kind. Other templates, including founder, see every non-deleted item in the tenant after `memory.read` | VERIFIED | `services/api/app/memory_ops.py` | KL-SEC-01 |
| E-4 | `@_serialize_store` wraps `run_engine_labs_stage_work`, which calls `dispatch_loop_stage` with timeout 90. The worker inserts `services/api` on `sys.path` and constructs `Store` | VERIFIED | `store.py`, `loop_hermes_bridge.py`, `services/worker/worker.py` | KL-SEC-02 |
| E-5 | The API loop bridge reads the Hermes env file in the API process and passes `HERMES_API_SERVER_KEY` to the child. The review found the security model overstated "worker only" | VERIFIED | `services/api/app/loop_hermes_bridge.py` | KL-SEC-03 |
| E-6 | `ENGINE_USAGE_EMIT` and `ENGINE_BILLING_CHARGES_ENABLED` default to `0`. Usage schema rejects prompt and content keys. Side-effecting Hermes registry rows are forced `unavailable`. Audit triggers block update and delete. Egress blocks private and metadata hosts. Enabled toolsets still exist behind interception | VERIFIED | `config.py`, `usage.py`, `store.py`, `egress.py`, `toolsets.yaml` | KL-SEC-06 |
| E-7 | Web token is memory plus `sessionStorage`. Desktop `keychain.ts` targets the OS keychain and forbids `sessionStorage`. Capabilities are `core:default` plus `https://*` shell-open | VERIFIED | `apps/web/src/api/papership.js`, `apps/desktop/src/auth/keychain.ts`, `capabilities/default.json` | KL-SEC-04 |
| E-8 | Ownership doc defers retention to MEM and DRR. `global/public` was ambiguous against MEM-15. Compose Postgres is unused | VERIFIED | `DATA_OWNERSHIP.md`, KL-D3, KL-O1 | KL-SEC-05 |
| E-9 | Knowledge Layer docs name secret variables and do not store secret values | VERIFIED | Pattern scan of `docs/knowledge-layer/` | — |

Lead fold after this evidence: secrets sentence, desktop keychain sentence, in-process lock wording, registry-versus-toolset sentence, and the `global/public` row now cite the limits above. The code seams in E-2, E-3, and E-4 are unchanged.
