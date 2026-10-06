---
plan: phase_4_context_plan
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_3_federated_registry_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p4/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 4: Resolver

## 1. Objective

Write a ContextPlan for one agent and one work item. The plan cites exact ContextVersion ids the caller can already see, or it records an explicit gap when nothing qualifies. Native files stay the source. Trust, impact, and cost stay unavailable.

This document is the plan. It does not authorize implementation. Implementation starts only after the owner asks.

## 2. Relation to project end-state

KL-P4 is RESOLVE and the first real KnowledgeGap (`docs/knowledge-layer/CONTEXT_LIFECYCLE.md`). KL-P5 attaches trust and impact to a version id. KL-P10 tracks lifecycle events. This phase does not deploy context and does not rank it.

The API remains the only client contract (KL-D4). A citation names a version id, not a mutable row (KL-D1). Retrieval cannot widen what the caller can already read (KL-D6). SQLite stays the store for this phase (KL-D3).

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P4 on 2026-10-06 after KL-P3 was verified.
- KL-P3 is complete. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p3/security-engineer-subagent/handoff.md`. Project lead accepted it.
- `context_plan_id` is a nullable column on `work_items`, `jobs`, `runs`, and `agent_profiles`. Nothing writes it yet. The agent detail Context line is "No context plan". Missing, trust, impact, and cost say "Unavailable until a later phase".
- Context versions are insert-only. Materials are pack, artifact, and attachment objects. The capability catalogue stays 43 rows and is not a material list.
- Preferences and sessions stay owner-only on the knowledge list. This phase does not put them on a plan.
- KL-O1 and KL-O2 are still open. Their defaults apply: stay on SQLite, and do not extend the worker poll loop or the API subprocess bridge. This phase does not close those questions.
- KL-SEC-01 and KL-SEC-02 remain open. The resolver must not run inside `run_engine_labs_stage_work` and must not hold the store lock across a Hermes call.

## 4. Scope

- Tables `context_plans` and `context_plan_citations`. A plan has a tenant, an agent principal, a work item, an optional gap sentence, and a created time. A citation has a plan id, an object id, and a version id. No JSON column as a second schema.
- `POST /knowledge/plans` creates one plan. `GET /knowledge/plans/{id}` reads it. Both use the caller tenant from `AuthContext`.
- Citations are the current version, at creation time, of objects in that tenant whose `source_kind` is `pack`, `artifact`, or `attachment`, plus objects whose `owner_principal_id` is the named agent. `source_kind` `registry`, `connection`, and unowned `memory` are excluded. Preferences and sessions are excluded.
- When that set is empty, the plan is still stored and its gap is the sentence "No visible context is attached to this agent and task."
- The work item's `context_plan_id` and that agent's `agent_profiles.context_plan_id` are set to the new plan id. Jobs and runs stay null.
- Agent detail shows the plan id, the cited version ids as text, and the gap when one is stored. Trust, impact, and cost stay "Unavailable until a later phase".

## 5. Non-goals

- No trust score, impact score, cost figure, or chain-of-thought (KL-D7). Those three agent lines stay unavailable.
- No automatic attachment of a plan on read, on loop start, or inside the founder-loop worker.
- No Resolver that calls a model, Hermes, or an external catalogue.
- No rewrite of an existing citation when a later version is inserted. The plan keeps the version id it stored.
- No deploy, activate, or pack install.
- No marketplace, price, or `ENGINE_BILLING_CHARGES_ENABLED` change.
- No `ENGINE_USAGE_EMIT` change and no emitted lifecycle events.
- No new grant class. Create requires `memory.write` or `org.admin`. Read requires `memory.read` or `org.admin`.
- No change to `BOTTOM_TABS` or `RAIL_TABS`. No blueprint-3 chrome swap.
- No Postgres port. KL-O1 stays open under the SQLite default.
- No change to worker dispatch. KL-O2 stays open. This route does not call `run_engine_labs_stage_work`.
- The fixture work-item page (CCO-245) is not replaced with a live plan.

## 6. Current-state audit

| Surface | What exists | What this phase does |
|---|---|---|
| `context_plan_id` | Nullable on work items, jobs, runs, and agent profiles | Set it on the named work item and that agent's profile only |
| `work_items.context_refs` | Nullable text, unused | Leave null. Do not store the plan as JSON |
| Context versions | Insert-only rows from KL-P2 | Read the current version id. Do not update the version row |
| Materials | `GET /registry/materials` | Use the same pack, artifact, and attachment objects as candidates. Do not call install |
| Agent detail | Context is "No context plan". Missing is unavailable | Show the plan id and either citations or the gap sentence |
| Capability catalogue | 43 rows, Today → Registry | Not cited |

## 7. Assumptions, constraints, risks, and decisions

- KL-P4-N1. A plan is created only when a caller posts. Listing agents does not create one.
- KL-P4-N2. The citation set is the rule in section 4. It is not a model judgement. Cap 40, newest `created_at` first.
- KL-P4-N3. An empty set is a stored plan with a gap sentence and zero citations. The work item's `context_plan_id` is still set, so the UI can tell "no plan" from "plan with a gap".
- KL-P4-N4. Citations store `version_id` from `context_versions` at insert time. A later supersede does not update those rows.
- KL-P4-N5. KL-O1 stays open. This phase adds SQLite tables only. KL-O2 stays open. The route returns in the API process and does not enqueue work.
- KL-P4-N6. Missing knowledge is the gap sentence or "No gap recorded" when the plan has citations. Trust, impact, and cost are unchanged.
- Risk: a plan could cite another tenant's version id. Insert only rows whose object and version `tenant_id` equal the caller tenant. A foreign work item or agent is 404.
- Risk: private memory could be copied onto a plan. Preferences and sessions are excluded even when the caller owns them.
- Risk: the worker could be taught to resolve. It must not call this function.

## 8. Dependencies

- KL-P3 PASS handoff, overlay tables, and pack pointers.
- A work item and a principal in the caller's tenant. The test may insert both. Do not hardcode `tenant-founder` or `principal-founder` in `knowledge_layer.py`.
- AuthContext tenant.
- Owner ask before any product code.

## 9. Architecture and affected systems

`POST /knowledge/plans` and `GET /knowledge/plans/{id}` live in `knowledge_layer.py`. The handler reads `ctx.tenant_id`. It may call `ensure_projected` and `ensure_pack_pointers` so pack versions exist before citation. It then inserts the plan and citation rows and updates two nullable id columns. It does not run inside `run_engine_labs_stage_work`, does not call Hermes, and does not emit usage.

The web app loads the plan when the agent detail context id is set, or when the hash asks for that plan. Failed fetch is an error string.

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — plan tables in `migrate_workspace`, create, and read.
- `services/api/tests/test_context_plans.py` — new file. Do not import `tests.conftest`.
- `packages/contracts/src/entities.ts` and `index.ts` — plan and citation schemas, not added to `ENTITY_SCHEMAS`.
- `packages/contracts/test/knowledge-layer.test.ts`.
- `apps/web/src/api/papership.js` — fetch a plan by id when the agent has one.
- `apps/web/src/blueprint2/App.jsx` and `screens.jsx` — agent Context and Missing lines. Do not edit `BOTTOM_TABS` or `RAIL_TABS`.
- Docs in section 11, status only, after implementation.

## 11. Supporting documents to create or update

- This plan, status only, after implementation.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table.
- `docs/plans/README.md`.
- `docs/handover/outstanding-tasks.md`.
- `.cursor/STATE.md` and the UTC-day continuation log.
- `docs/workstreams/20261006-knowledge-layer-p4/manifest.md`.

## 12. Ordered implementation tasks

### T1 — Contract

- Objective: Zod schemas for a plan and a citation. A plan has id, agent_principal_id, work_item_id, gap (nullable string), and citations. A citation has object_id and version_id, both 64-hex. No trust, impact, cost, or body.
- Dependencies: none.
- Files: `packages/contracts/src/entities.ts`, `index.ts`, `test/knowledge-layer.test.ts`.
- Notes: do not add the schemas to `ENTITY_SCHEMAS`.
- Validation: `npm test` in `packages/contracts`.
- Completion: not started.

### T2 — Plan write and read

- Objective: `POST /knowledge/plans` inserts a plan and citations under the caller tenant and sets `work_items.context_plan_id` and `agent_profiles.context_plan_id`. `GET /knowledge/plans/{id}` returns that plan. Another tenant gets 404. A missing grant is 403.
- Dependencies: T1.
- Files: `knowledge_layer.py`, `tests/test_context_plans.py`.
- Notes: create the agent profile row if the principal exists in the tenant and the profile row is missing. Do not update `context_versions`. Do not select memory content or artifact bodies. Cap 40 citations. Empty set stores the gap sentence from KL-P4-N3.
- Validation: pytest. A pack version id on the plan is unchanged after a later supersede of that object. Hidden preference content is absent. `registry` count stays 43. Jobs and runs keep null `context_plan_id`. Source has no `maybe_emit`, `tenant-founder`, `principal-founder`, `_visible_to`, or `run_engine_labs_stage_work`.
- Completion: not started.

### T3 — Security review of the write

- Objective: independent review of the T2 diff before the screen is called done. Stop if the verdict is BLOCKED.
- Dependencies: T2.
- Files: `docs/workstreams/20261006-knowledge-layer-p4/security-engineer-subagent/`.
- Notes: the lead may keep writing the screen while the review runs. A BLOCKED verdict stops the phase.
- Validation: handoff on disk, verdict not BLOCKED.
- Completion: not started.

### T4 — Agent detail

- Objective: when the agent profile has a `context_plan_id`, the Context line shows that id and the cited version ids as text. Missing shows the gap sentence, or "No gap recorded" when the plan has citations and a null gap. With no plan, Context stays "No context plan" and Missing stays "Unavailable until a later phase". Trust, impact, and cost stay unavailable.
- Dependencies: T2. T3 before this task is called done.
- Files: `papership.js`, `App.jsx`, `screens.jsx`.
- Notes: do not paint a graph. Do not invent scores. A failed plan fetch is an error string, not a fixture plan. Bottom tabs stay.
- Validation: static scan. Browser at desktop width and under 768 px for an agent with no plan. The no-plan copy must remain honest if the local store has no posted plan.
- Completion: not started.

### T5 — Gates

- Objective: security review of the full diff, then project-lead reconciliation. Stop if the verdict is BLOCKED.
- Dependencies: T1–T4.
- Files: workstream role folders only.
- Validation: handoffs on disk, verdict not BLOCKED. Do not write the KL-P5 plan in that turn unless the owner asks.
- Completion: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. A new write attaches version ids to a task. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-36, the canonical ContextPlan, and this plan fix the scope. No score and no deploy | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | Context and Missing copy must stay honest | this plan | `apps/web/src/blueprint2/` | `ui-ux-developer-subagent/handoff.md` | lead-executed |
| software-engineer-subagent | required at implementation | Tables, routes, contract, agent detail | UI charter before T4; T1–T2 may start with the charter | section 10 | `software-engineer-subagent/handoff.md` | lead-executed |
| security-engineer-subagent | required at implementation | Tenant scope, no private memory, citations frozen, no worker dispatch | T2 diff, then full diff at T5 | read-only on product; writes the role folder | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No events emitted. Charges and usage flag stay as they are | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile gates before any KL-P5 plan | security T5 handoff | `project-lead-subagent/handoff.md` | owner handoff | PASS |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p4/<role-id>/`. They are not written in this planning turn. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Plan cites a visible pack version | pytest | citation version id matches the current pack version | passed |
| Empty plan records a gap | pytest | zero citations and the gap sentence; `context_plan_id` is set | passed |
| Citation is frozen | pytest | version id unchanged after a newer version is inserted | passed |
| Tenant isolation | pytest | other tenant GET of the plan is 404 | passed |
| Private memory excluded | pytest | preference content absent from the plan | passed |
| Catalogue not cited | pytest | capability ids are not citation object source ids; `registry` count stays 43 | passed |
| Jobs and runs untouched | pytest | their `context_plan_id` stays null | passed |
| No worker, emit, or founder literal | source assertion | `knowledge_layer.py` | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Browser | desktop and under 768px | agent with no plan still says "No context plan"; trust, impact, and cost stay unavailable | passed |
| Security gate | handoff | not BLOCKED | PASS |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: tenant from the caller; 404 for another tenant's plan, agent, or work item; 403 for a missing grant; preferences and sessions never cited; registry payloads and file bodies not selected; citations are ids.
- Reliability: create is one request and returns the plan. It does not enqueue the worker. A failed insert does not delete source objects. Version rows stay insert-only.
- Accessibility: citations and the gap are text. Keyboard reachability is part of the browser pass.
- Performance: citation cap 40. Do not hold the store lock across a Hermes call. Do not scan external catalogues.

## 16. Environment-variable registry

No new variables. Names that stay in force:

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| ENGINE_STORE_PATH | SQLite file | API | unchanged | local or host | existing, value not recorded |
| SUPABASE_JWT_SECRET | HMAC secret name | API | unchanged | operator secret store | existing, value not recorded |
| ENGINE_JWT_ISSUER | Token issuer | API | unchanged | existing | existing |
| ENGINE_JWT_AUDIENCE | Token audience | API | unchanged | existing | existing |
| ENGINE_TEST_HOOKS | Local session mint | API test and local | unchanged | existing | existing |
| ENGINE_USAGE_EMIT | Usage emission | API | must stay off | existing | unchanged |
| ENGINE_BILLING_CHARGES_ENABLED | Charges | API | must stay off | existing | unchanged |

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Owner asks to implement KL-P4 | Scope start | KL-P4 | no | this plan section 1 |
| Close KL-O1 (Postgres or not) | Product store decision | a later store move | no | final checklist when that phase exists |
| Close KL-O2 (worker dispatch) | Loop runtime decision | when dispatch is replaced | no | final checklist when that phase exists |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop serving the plan routes and stop reading `context_plan_id` in the agent view. Plan and citation rows can remain. Clearing `context_plan_id` back to null restores the "No context plan" line. Do not drop `context_versions` or the materials tables.

## 19. Acceptance criteria

- A caller can create a ContextPlan for an agent and a work item in their organisation. The plan cites version ids, or it stores the gap sentence and no citations.
- A cited version row is unchanged if a newer version is added later.
- Another organisation cannot read the plan.
- The capability catalogue is not cited and stays 43 rows.
- Agent detail shows the plan or "No context plan". Trust, impact, and cost stay unavailable.
- The resolver does not run inside the founder-loop worker.
- Security review of the implementation is not BLOCKED.
- KL-P5 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p4/manifest.md`.

Implementation evidence: `POST /knowledge/plans` and `GET /knowledge/plans/{id}` in `services/api/app/knowledge_layer.py`. Pytest knowledge-layer suite 9 passed. Contracts 16 passed. Web static scan 15 passed. Browser checked the no-plan agent at 1280 and 390. Security handoff PASS. Project lead accepted. Not committed.

## 21. Deviations and follow-ups

- The roadmap exit says dispatch is non-blocking. This plan meets that by keeping the resolver on a request that returns the plan, and by not extending either KL-O2 path. KL-O1 and KL-O2 stay open.
- KL-SEC-01 and KL-SEC-02 stay open.
- A task-specific "required knowledge" list does not exist yet. The only gap this phase can state honestly is that no visible context matched the citation rule.
- The owner asked to plan KL-P5 at 2026-10-06T13:41Z while this phase's security review was still open. That plan does not implement KL-P5, and it does not mark KL-P4 complete.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/CANONICAL_CONCEPTS.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p4/manifest.md`, and every required role handoff. Confirm KL-P4 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_5_trust_impact_plan.md`.

That plan attaches trust and impact to a ContextVersion id. It does not emit chain-of-thought and does not turn rankings into grants. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P5 until that plan is written and the owner asks.
