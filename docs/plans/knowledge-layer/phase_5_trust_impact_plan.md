---
plan: phase_5_trust_impact
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_4_context_plan_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p5/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 5: Trust and Impact

## 1. Objective

Record whether a specific ContextVersion is accepted for this organisation, and whether using it on a work item helped, harmed, or is unknown. Both records cite the version id. Neither record stores chain-of-thought, a numeric score, or a grant.

This document is the plan. It does not authorize implementation. Implementation starts only after the owner asks, and only after the KL-P4 security verdict is recorded and is not BLOCKED.

## 2. Relation to project end-state

KL-P5 is VERIFY and the first LEARN step (`docs/knowledge-layer/CONTEXT_LIFECYCLE.md`). TrustAssessment and ImpactObservation become real rows. ImpactEvaluation in this phase is the newest observation for that version on that work item, not a learned ranking. KL-P14 is where rankings may change retrieval, and even then they cannot override the authority ladder (KL-D6).

Cost stays a later economics concern (KL-P11). Lifecycle events stay KL-P10. The machine API stays KL-P6.

The API remains the only client contract (KL-D4). An assessment names a version id, not a mutable object (KL-D1). A trust label does not widen what the caller can read or do (KL-D6). Model reasoning is not stored or shown (KL-D7). SQLite stays the store (KL-D3).

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P5 on 2026-10-06.
- KL-P4 is complete. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p4/security-engineer-subagent/handoff.md`. Project lead accepted it. Implementation of this phase still waits for an owner ask.
- A ContextPlan cites version ids, or it stores the gap sentence and no citations. Citations are not rewritten when a newer version is inserted. Jobs and runs `context_plan_id` stay null.
- Agent detail Trust, Impact, and Cost still say "Unavailable until a later phase". Missing already follows the KL-P4 gap rule.
- Memory classes stay `source`, `approved`, and `inferred`. Pack trust reviews already use `none`, `pending`, `accepted`, and `refused` on a pack id, not on a version id. `ENGINE_USAGE_EMIT` stays 0.
- KL-O1 and KL-O2 stay open. Defaults: SQLite, and do not extend either dispatch path.
- KL-SEC-01 and KL-SEC-02 stay open. This phase must not copy tenant literals into `knowledge_layer.py`, and must not run inside the founder-loop worker.

## 4. Scope

- Table `context_trust_assessments`: id, tenant id, version id, verdict (`accepted` or `refused`), assessed-by principal id, created time. Insert-only.
- Table `context_impact_observations`: id, tenant id, version id, work item id, outcome (`helped`, `harmed`, or `unknown`), recorded-by principal id, created time. Insert-only. No prose column.
- `POST /knowledge/trust` body `{ version_id, verdict }`. `POST /knowledge/impact` body `{ version_id, work_item_id, outcome }`. Extra JSON keys are rejected.
- `GET /knowledge/plans/{id}/signals` returns one row per citation on that plan. `GET /knowledge/plans` itself is unchanged.
- Each signal is `{ version_id, trust, impact }`. `trust` is the newest assessment for that version, or, when the cited object is a pack and no assessment exists, the newest `pack_trust_reviews` verdict for that pack in the tenant (`none`, `pending`, `accepted`, `refused`) with source `pack_review`. `impact` is the newest observation for that version on the plan's work item, or null.
- Create and record require `memory.write` or `org.admin`. Read requires `memory.read` or `org.admin`. The caller must be a human principal. An agent principal receives 403.
- A version, plan, or work item outside the caller tenant is 404. A preference or session version is 403 unless the caller owns that object.
- Agent detail Trust and Impact show those words as text. Cost stays "Unavailable until a later phase".

## 5. Non-goals

- No numeric trust, impact, or cost score. No chain-of-thought, prompt, message, or document body.
- No change to `context_versions`, memory class, citation rows, or pack install state.
- No automatic promotion of `inferred` to `approved`. A pack review is displayed. It is not copied into `context_trust_assessments`.
- No ranking, no change to which versions a plan cites, and no change to grants.
- No write from the founder-loop worker, and no call to `run_engine_labs_stage_work`.
- No new usage-event name, no insert into `usage_events`, and no change to `ENGINE_USAGE_EMIT`.
- No new grant class. No marketplace, price, or charges flip.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome swap.
- No Postgres port. KL-O1 and KL-O2 stay open.
- KL-P6 is not started.

## 6. Current-state audit

- `POST /knowledge/plans` and `GET /knowledge/plans/{id}` exist. The plan payload is id, agent, work item, gap, and citations of object id plus version id. Tests assert the word `trust` is absent from that payload. This phase must not add trust fields to that response.
- `context_versions` rejects updates. Version ids are 64-hex.
- `pack_trust_reviews` stores a verdict per pack id. `review_pack_trust` in `services/api/app/phase7.py` accepts only `accepted` or `refused` and can update an existing review. This phase does not call that function and does not install a pack.
- `packages/contracts/src/usage.ts` prohibits `prompt`, `message`, `email`, `content`, `url`, `path`, `credential`, `token`, and `name`. Emit stays off.
- Agent detail in `apps/web/src/blueprint2/screens.jsx` hard-codes Trust, Impact, and Cost as "Unavailable until a later phase". The page already fetches a plan when `context_plan_id` is set.
- The capability catalogue remains 43 rows. Registry objects are not plan citations.

## 7. Assumptions, constraints, risks, and decisions

- KL-P5-N1. Verdicts on an assessment are only `accepted` and `refused`. No row means there is no assessment. A pack review may be shown beside a cited pack version, with source `pack_review`, and it does not become an assessment row.
- KL-P5-N2. Recording trust or impact does not update a version, a memory class, a citation, or a pack row.
- KL-P5-N3. Impact is only `helped`, `harmed`, or `unknown`. The signal shows the newest row for that version and that work item. There is no blended score. The HTTP body has no free-text field. Prohibited usage keys are rejected by forbidding extra fields.
- KL-P5-N4. Observations are stored in `context_impact_observations`. They are not usage events. `ENGINE_USAGE_EMIT` stays 0. This keeps KL-D7 without enabling emission before a schema review.
- KL-P5-N5. Only a human with `memory.write` or `org.admin` may record. An agent is 403 even if it holds those grants. Read stays `memory.read` or `org.admin`. Signals do not change the plan or any grant.
- KL-P5-N6. Cost stays unavailable until KL-P11. KL-O1 and KL-O2 stay open.
- KL-P5-N7. KL-P4 security is PASS. Implementation of this phase still waits for an owner ask.
- Risk: a pack review of `accepted` can be misread as approval of the version's class. The signal source must say `pack_review` so the UI can show "pack review accepted" rather than a class change.
- Risk: newest-observation display hides an older `harmed` after a later `unknown`. That is accepted for this phase. KL-P14 may aggregate. This phase does not.

## 8. Dependencies

- KL-P4 plan citations and version ids. If the KL-P4 security verdict is BLOCKED, stop and return to that phase before implementing this one.
- Existing pack trust reviews, read-only, for the pack-review display.
- AuthContext tenant and the current grant checks in `knowledge_layer.py`.
- No new environment variable. No Supabase migration. No Hermes call.

## 9. Architecture and affected systems

The API writes two insert-only tables and reads them for one plan. The web client fetches signals only when the agent profile has a `context_plan_id`. A failed fetch is an error string. It is not a fixture score.

Pack review lookup joins the cited object's `source_id` to `pack_trust_reviews.pack_id` in the same tenant. It does not call `install_pack`, `activate_pack`, or `review_pack_trust`.

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — tables, three routes, grant and human checks.
- `services/api/tests/test_trust_impact.py` — new. Do not import `tests.conftest`.
- `packages/contracts/src/entities.ts` and `packages/contracts/src/index.ts` — signal schemas. Do not add them to `ENTITY_SCHEMAS`.
- `packages/contracts/test/knowledge-layer.test.ts`
- `apps/web/src/blueprint2/App.jsx` — fetch signals when a plan id is present.
- `apps/web/src/blueprint2/screens.jsx` — Trust and Impact copy. Cost string stays.
- Docs listed in section 11, updated when the phase is implemented.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p5/manifest.md` (this planning turn).
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Contract

- Objective: Zod schemas for a signal list. Verdict and outcome are enums. No score, body, or prohibited key. `.strict()`.
- Dependencies: none.
- Files: `packages/contracts/src/entities.ts`, `index.ts`, `test/knowledge-layer.test.ts`.
- Notes: version ids are 64-hex. Plan id is an ordinary string. Trust is nullable. Impact is nullable.
- Validation: `npm test` in `packages/contracts`.
- Completion state: not started.

### T2 — Store and routes

- Objective: the two tables, both posts, and the signals read.
- Dependencies: T1.
- Files: `knowledge_layer.py`, `tests/test_trust_impact.py`.
- Notes: ids are digests of tenant, version, verdict or outcome, and time, so repeats do not collide. Confirm the version's `tenant_id` before insert. Do not update `context_versions`. Do not select memory content or artifact bodies. Reject an agent principal. Map a private preference or session object to 403 when the caller is not the owner.
- Validation: pytest for the cases in section 14, plus the existing knowledge-layer tests still green.
- Completion state: not started.

### T3 — Security review of the route diff

- Objective: independent read-only review before the screen is called done.
- Dependencies: T2.
- Files: the role handoff under the workstream. The reviewer does not edit product code.
- Validation: verdict recorded and not BLOCKED.
- Completion state: not started.

### T4 — Agent detail

- Objective: Trust and Impact show the signal text or the empty sentences. Cost stays unavailable. A failed fetch is the error string.
- Dependencies: T2. T3 must not be BLOCKED before this task is called done.
- Files: `App.jsx`, `screens.jsx`.
- Notes: with no `context_plan_id`, do not fetch, and do not invent a score. Trust reads "No trust assessment". Impact reads "No impact recorded". When a pack review is the source, the words include "pack review". Browser check at desktop and under 768px for an agent with no plan.
- Validation: web static scan, plus the browser pass.
- Completion state: not started.

### T5 — Close the phase

- Objective: security review of the full diff, then project-lead reconciliation.
- Dependencies: T4.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P6 plan in that turn unless the owner asks. Do not commit unless the owner asks.
- Validation: verdict not BLOCKED, handoffs on disk, plan status updated.
- Completion state: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. Recording a trust judgement is a new write, and it must not widen grants. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-36, KL-D6, and KL-D7 already fix the scope: cite a version, no chain-of-thought, no grant change | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | Trust and Impact copy must stay honest, including the empty and error states | this plan | `apps/web/src/blueprint2/` | `ui-ux-developer-subagent/handoff.md` | lead-executed |
| software-engineer-subagent | required at implementation | Tables, routes, contract, agent detail | UI charter before T4; T1–T2 may start with the charter | section 10 | `software-engineer-subagent/handoff.md` | lead-executed |
| security-engineer-subagent | required at implementation | Tenant scope, agent cannot self-assess, no private body, no grant widening | T2 diff, then full diff at T5 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No usage event is emitted. Charges and `ENGINE_USAGE_EMIT` stay as they are | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile gates before any KL-P6 plan | security T5 handoff | `project-lead-subagent/handoff.md` | owner handoff | PASS |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p5/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Human can accept a version | pytest | 200, verdict `accepted`, version row unchanged | passed |
| Agent cannot record trust or impact | pytest | 403 | passed |
| Missing grant | pytest | 403 | passed |
| Other tenant | pytest | 404 on post and on signals | passed |
| Private preference | pytest | 403, and the secret body is absent | passed |
| Impact enum | pytest | `helped` stored; extra keys rejected; no `content` or `prompt` in the response | passed |
| Newest observation wins | pytest | a later `unknown` is what signals return | passed |
| Pack review is not an assessment row | pytest | signals source `pack_review`; `context_trust_assessments` has no matching insert from that read | passed |
| Plan payload unchanged | pytest | `GET /knowledge/plans/{id}` still has no trust or impact field | passed |
| Catalogue untouched | pytest | `registry` count stays 43 | passed |
| No worker or emit | source assertion | `knowledge_layer.py` has no `maybe_emit`, `run_engine_labs_stage_work`, `tenant-founder`, or `principal-founder` | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Browser | desktop and under 768px | no-plan agent shows "No trust assessment" and "No impact recorded"; Cost stays unavailable | passed |
| Security gate | handoff | not BLOCKED | PASS |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: tenant from the caller; 404 across tenants; 403 for a missing grant, an agent principal, or another principal's preference or session. No memory content, artifact body, prompt, or chain-of-thought in the payload. An assessment does not change grants or version class.
- Reliability: each post inserts one row and returns. A failed insert does not delete the version or the plan. Reads do not enqueue work.
- Accessibility: trust and impact are text. The browser pass includes the empty state.
- Performance: signals are bounded by the plan's citation cap of 40. Do not hold the store lock across a Hermes call.

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
| KL-P4 security verdict | Recorded PASS after this plan was drafted | KL-P4 close | no | `docs/workstreams/20261006-knowledge-layer-p4/security-engineer-subagent/handoff.md` |
| Decide KL-O1 Postgres | Store choice is an owner default, already deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice is an owner default, already deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop serving the three new routes and stop reading signals in the agent view. Assessment and observation rows can remain. Restoring the Trust and Impact strings to "Unavailable until a later phase" returns the previous screen. Do not drop `context_versions`, plans, or pack reviews.

## 19. Acceptance criteria

- A human in the organisation can record `accepted` or `refused` against a version id, and `helped`, `harmed`, or `unknown` against that version and a work item.
- The version row, the plan citations, memory class, and grants stay unchanged.
- An agent principal cannot record either row.
- Another organisation cannot read or write them.
- Signals for a plan show the newest matching row, or the pack review when that is the only trust input, or null.
- Agent detail shows that text, or "No trust assessment" and "No impact recorded". Cost stays unavailable.
- No chain-of-thought is stored. `ENGINE_USAGE_EMIT` stays off.
- Security review of the implementation is not BLOCKED.
- KL-P6 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p5/manifest.md`.

Implementation evidence: `POST /knowledge/trust`, `POST /knowledge/impact`, and `GET /knowledge/plans/{id}/signals` in `services/api/app/knowledge_layer.py`. Pytest knowledge-layer suite 11 passed. Contracts 16 passed. Web static scan 15 passed. Browser checked the no-plan agent at 1280 and 390. Security handoff PASS. Project lead accepted. Not committed.

## 21. Deviations and follow-ups

- The roadmap names ImpactEvaluation as a conclusion from many observations. This phase shows the newest observation only. Aggregation waits for KL-P14.
- Impact is stored beside the usage-event rules (enums, no prohibited keys) and not in `usage_events`, because emission is still off.
- KL-P4 was not verified closed when the owner asked for this plan. The verdict later returned PASS. Implementation of KL-P5 still waits for an owner ask.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/CANONICAL_CONCEPTS.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p5/manifest.md`, and every required role handoff. Confirm KL-P5 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_6_knowledge_api_plan.md`.

That plan exposes the same canonical state to an external agent through the existing API. It does not add a second store. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P6 until that plan is written and the owner asks.
