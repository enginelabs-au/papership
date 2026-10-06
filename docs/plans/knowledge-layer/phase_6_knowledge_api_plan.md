---
plan: phase_6_knowledge_api
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_5_trust_impact_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p6/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 6: Knowledge API

## 1. Objective

Make the existing Knowledge routes the contract an external agent uses, without a second store or a second copy of the records. A caller with the same grants sees the same objects, materials, plan, and signals whether they use the Workspace or call the API directly.

The owner asked to implement this plan on 2026-10-06. Security review is PASS. The phase is complete. The KL-P7 plan is a draft and is not implemented.

## 2. Relation to project end-state

KL-P6 is ACQUIRE and APPLY for a remote runtime (`docs/knowledge-layer/CONTEXT_LIFECYCLE.md`). The runtime receives a ContextPlan and its signals through HTTP. Private files stay on the machine until KL-P8. The public web origin stays KL-P7. Lifecycle events stay KL-P10. Rankings stay KL-P14.

KL-D4 says clients and runtimes use the API. This phase documents that contract and lets an agent principal read it. It does not replace the worker's path import of the store. That seam stays KL-O2 and KL-SEC-02.

SQLite stays the store (KL-D3). Retrieval still cannot widen grants (KL-D6). Version ids stay immutable (KL-D1).

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P6 on 2026-10-06 after KL-P5 was verified.
- KL-P5 is complete. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p5/security-engineer-subagent/handoff.md`. Project lead accepted it.
- These routes already exist and are tenant-scoped: knowledge objects and detail, materials, plan create and read, trust and impact posts, and plan signals. The Workspace fetches the same paths.
- Trust and impact posts, and the signals read, currently require a human principal. Object, material, and plan reads do not.
- Zod schemas for those payloads already live in `packages/contracts`. They are not registered in `ENTITY_SCHEMAS`.
- KL-O1 and KL-O2 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- `GET /knowledge` returns an index of the knowledge resources: method, path, and whether the writer must be human. It does not embed objects, materials, plans, citations, or signals.
- `docs/knowledge-layer/KNOWLEDGE_API.md` lists those same method and path pairs and points at the existing Zod schemas. A test fails if a documented path is missing from `knowledge_layer.py`.
- `GET /knowledge/plans/{id}/signals` stays grant-gated and drops the human-only check, so an agent principal with `memory.read` or `org.admin` can read signals for a plan in its tenant.
- `POST /knowledge/trust` and `POST /knowledge/impact` stay human-only.
- The Workspace keeps calling the existing paths. It does not gain a local copy of the records.

## 5. Non-goals

- No second database, no JSON document that duplicates a plan, and no client-side store of knowledge.
- No new authentication scheme, API key, or service account. The caller is still a principal JWT.
- No SDK for Cursor, Claude, Codex, OpenCode, or MCP. Those runtimes are later consumers of this HTTP contract.
- No change to citation rules, trust verdicts, impact outcomes, or grants.
- No automatic plan creation on read, and no delivery of the plan into Hermes or the founder-loop worker.
- No worker rewrite and no call to `run_engine_labs_stage_work`. KL-O2 stays open.
- No deploy, no `papership.com.au` cutover, and no Desktop Bridge.
- No usage emission, no charges flip, and no new grant class.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No new Workspace screen.
- KL-P7 is not started.

## 6. Current-state audit

- `register_routes` in `services/api/app/knowledge_layer.py` already serves the knowledge reads and writes the Workspace uses.
- `require_human` rejects any principal whose kind is not `human`. After this phase it stays on trust and impact. Signals no longer call it.
- `apps/web/src/blueprint2/App.jsx` fetches `/knowledge/objects/{id}`, `/knowledge/plans/{id}`, and `/knowledge/plans/{id}/signals`. The overlay fetches `/knowledge/objects` and `/registry/materials`.
- FastAPI may expose its own schema route. This phase does not treat that generated document as a second contract. The checked contract remains the Zod schemas plus the index.
- The worker still imports the API store by path. This phase does not touch that import.

## 7. Assumptions, constraints, risks, and decisions

- KL-P6-N1. One index, no payload. `GET /knowledge` lists resources. Callers who want records use the existing routes.
- KL-P6-N2. An agent principal with `memory.read` or `org.admin` may read objects, materials, a plan, signals, and the index. Writing trust or impact stays limited to a human with `memory.write` or `org.admin`. Plan create stays `memory.write` or `org.admin` and is not given a new human check.
- KL-P6-N3. The documented path list and the route decorators are the same set. The test reads the markdown rather than a hand-maintained duplicate in Python.
- KL-P6-N4. KL-D4's note to replace the worker path import before KL-P4 was not done. This phase does not do it. External agents use HTTP. The worker seam stays open.
- KL-P6-N5. KL-O1 and KL-O2 stay open. Cost stays unavailable. KL-P7 is a later owner-facing domain change.
- Risk: opening signals to agents reveals pack-review verdicts and impact labels for cited versions. Those labels are already visible to any human with `memory.read` in the tenant. The agent does not gain another tenant's rows, and it still cannot write them.
- Risk: a markdown list can drift. The path test is the guard.

## 8. Dependencies

- KL-P5 signals and the existing knowledge routes.
- The same AuthContext tenant and grant checks.
- No new environment variable. No Supabase migration. No Hermes call.

## 9. Architecture and affected systems

The HTTP API remains the only knowledge contract. `GET /knowledge` is a directory. Every other response is the handler the Workspace already calls.

Removing `require_human` from the signals route is the only authorization change. Preference and session versions stay 403 for a non-owner on the trust and impact writes. Signals still return only citation ids and labels, not memory bodies.

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — index route; signals read allows an agent principal.
- `services/api/tests/test_knowledge_api.py` — new. Do not import `tests.conftest`.
- `packages/contracts/src/entities.ts` and `index.ts` — index schema. Do not add it to `ENTITY_SCHEMAS`.
- `packages/contracts/test/knowledge-layer.test.ts`
- `docs/knowledge-layer/KNOWLEDGE_API.md` — the path list.
- Docs listed in section 11, updated when the phase is implemented.
- `apps/web` only if a fetch path must be renamed to match the index. The expected case is no screen change.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p6/manifest.md` (this planning turn).
- On implementation: `docs/knowledge-layer/KNOWLEDGE_API.md`, role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Contract and path list

- Objective: Zod schema for the index, and `KNOWLEDGE_API.md` with one method-plus-path line per resource.
- Dependencies: none.
- Files: `entities.ts`, `index.ts`, `knowledge-layer.test.ts`, `docs/knowledge-layer/KNOWLEDGE_API.md`.
- Notes: each resource is `{ name, method, path, human_writer }`. `human_writer` is true only for trust and impact. No object bodies. `.strict()`.
- Validation: `npm test` in `packages/contracts`.
- Completion state: done. Contracts 16 passed.

### T2 — Index route and agent read

- Objective: `GET /knowledge` returns that index for a caller with `memory.read` or `org.admin`. Signals no longer call `require_human`. Trust and impact posts still do.
- Dependencies: T1.
- Files: `knowledge_layer.py`, `tests/test_knowledge_api.py`.
- Notes: build the index from the same path strings the markdown lists, or assert both against the route source. Do not select memory content. Do not insert rows on GET. A missing plan on the signals route stays 404. Another tenant stays 404.
- Validation: pytest for section 14, plus the existing knowledge-layer tests still green.
- Completion state: done. Knowledge-layer pytest 14 passed.

### T3 — Security review of the authz diff

- Objective: independent read-only review before the phase is called done.
- Dependencies: T2.
- Files: the role handoff. The reviewer does not edit product code.
- Validation: verdict recorded and not BLOCKED.
- Completion state: done. Security verdict PASS. No findings.

### T4 — Workspace regression

- Objective: confirm the Workspace still uses the documented paths and the no-plan agent copy is unchanged.
- Dependencies: T2. T3 must not be BLOCKED before this task is called done.
- Files: `App.jsx` only if a path string must change. `screens.jsx` should stay as it is.
- Notes: browser check at desktop and under 768px. Trust stays "No trust assessment", Impact stays "No impact recorded", Cost stays unavailable, Context stays "No context plan" when no plan is posted.
- Validation: web static scan, plus the browser pass.
- Completion state: done. Web static scan 15 passed. Browser at 1280 and 390 showed the KL-P5 sentences and bottom tabs Today, Work, Inbox.

### T5 — Close the phase

- Objective: security review of the full diff, then project-lead reconciliation.
- Dependencies: T4.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P7 plan in that turn unless the owner asks. Do not commit unless the owner asks.
- Validation: verdict not BLOCKED, handoffs on disk, plan status updated.
- Completion state: done. Project lead accepted PASS. KL-P7 implementation was not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. An agent principal gains read access to signals it could not read in KL-P5. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-36 and KL-D4 already fix one API and no second client truth | — | — | manifest | skipped |
| ui-ux-developer-subagent | skipped | No new screen and no copy change. The browser check is a regression of the KL-P5 sentences | — | — | manifest | skipped |
| software-engineer-subagent | required at implementation | Index, path doc, agent read of signals, regression check | this plan | section 10 | `software-engineer-subagent/handoff.md` | lead-executed |
| security-engineer-subagent | required at implementation | Agent read must stay inside the caller tenant and must not unlock trust writes | T2 diff, then full diff at T5 | read-only on product | `security-engineer-subagent/handoff.md` | complete |
| growth-marketing-subagent | skipped | No event emission and no commercial change | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile gates before any KL-P7 plan | security T5 handoff | `project-lead-subagent/handoff.md` | owner handoff | complete |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p6/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Index lists resources and no records | pytest | methods and paths only; no object title, citation, or score | passed |
| Documented paths exist | pytest | each method and path in `KNOWLEDGE_API.md` is a route in `knowledge_layer.py` | passed |
| Missing grant | pytest | unprivileged `GET /knowledge` is 403 | passed |
| Agent can read signals | pytest | agent with `memory.read` gets 200 for a plan in its tenant | passed |
| Agent cannot write trust or impact | pytest | 403 | passed |
| Other tenant | pytest | 404 for the plan and for signals | passed |
| Workspace paths match | static scan | `App.jsx` fetches paths that the index lists | passed |
| No worker or founder literal | source assertion | no `run_engine_labs_stage_work`, `maybe_emit`, `tenant-founder`, or `principal-founder` | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Browser | desktop and under 768px | no-plan agent copy from KL-P5 is unchanged | passed |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: tenant from the caller. Signals for another organisation stay 404. Trust and impact writes stay human-only. The index contains no memory content, prompt, or chain-of-thought. Opening agent read does not add a grant and does not change citation membership.
- Reliability: `GET /knowledge` and the signals read do not insert rows. A failed index does not fall back to fixture knowledge.
- Accessibility: no new screen. The regression check confirms the existing text still renders.
- Performance: the index is a fixed list, not a scan of every object.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| `papership.com.au` as the human origin | Domain and DNS are an owner action | KL-P7 | no | `docs/plans/final_implementation_checklist.md` |
| Decide KL-O1 Postgres | Store choice is an owner default, already deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice is an owner default, already deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Remove `GET /knowledge` and put `require_human` back on the signals route. The markdown can remain. Plans, assessments, and observations stay. The Workspace copy does not need a restore if it was not edited.

## 19. Acceptance criteria

- A caller with `memory.read` or `org.admin` can read an index of the knowledge routes and can read a plan's signals, including when that caller is an agent principal.
- An agent principal still cannot record trust or impact.
- Another organisation cannot read the plan or its signals.
- The index and the markdown name the same paths the Workspace calls, and those responses are the existing handlers.
- No second store and no duplicated record body in the index.
- The no-plan agent screen still shows the KL-P5 sentences.
- Security review of the implementation is not BLOCKED.
- KL-P7 implementation is not started. The owner already has a draft plan.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p6/manifest.md`.

Implementation evidence, 2026-10-06: `GET /knowledge` lists the eleven routes. Signals no longer require a human. Trust and impact posts still do. Pytest knowledge-layer suite 14 passed. Contracts 16 passed. Web static scan 15 passed. Browser checked `principal-agent` with no plan at 1280 and 390. Security verdict PASS, no findings. Project lead accepted. Not committed. KL-P7 remains a draft and is not implemented.

## 21. Deviations and follow-ups

- KL-D4 asked to replace the worker path import before KL-P4. That replacement did not happen. This plan leaves it open instead of widening the worker.
- KL-P5 made signals human-only. This phase reopens read to an agent with `memory.read` and leaves the writes human-only.
- The owner asked for the KL-P7 plan before this security verdict returned. That plan stays a draft. This close does not implement it.
- ACQUIRE of a local file is KL-P8. This phase only attaches versions that are already in the caller's tenant.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/CANONICAL_CONCEPTS.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p6/manifest.md`, and every required role handoff. Confirm KL-P6 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_7_web_consolidation_plan.md`.

That plan puts the Workspace on the Papership domain. It does not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P7 until that plan is written and the owner asks.
