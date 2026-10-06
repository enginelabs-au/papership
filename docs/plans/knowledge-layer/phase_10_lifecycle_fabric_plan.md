---
plan: phase_10_lifecycle_fabric
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_9_mobile_companion_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p10/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 10: Lifecycle Fabric

## 1. Objective

When a loop stage is recorded, the job event cites the work item's context plan and the version ids on that plan. The underlying tool stays external. Schedules are not a second clock.

The owner asked to implement this plan. The citation is in the tree and waiting on the security review. KL-P11 is not started.

## 2. Relation to project end-state

KL-P10 is the Lifecycle Fabric in `docs/knowledge-layer/PHASE_ROADMAP.md` and `docs/knowledge-layer/ARCHITECTURE.md`. A stage event cites context versions. Hermes, GitHub, and other tools stay outside the store.

KL-P11 is optional economics. This phase does not attach a price and does not turn charges on. KL-O3 is adopted here: `schedules` and `strategy_records` stay unused.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P10 on 2026-10-06 while the KL-P9 security review was still open (OT-92). The same precedent is the KL-P5, KL-P7, KL-P8, and KL-P9 plans. User request wins over "plan only after the previous phase is verified."
- KL-P9 is `implemented_pending_security`. This plan does not mark it complete and does not treat OT-92 as closed.
- KL-P0 through KL-P8 are recorded. KL-P2 through KL-P6 and KL-P8 are security PASS. KL-P0, KL-P1, and KL-P7 are `complete_conditional`. Registrar DNS remains (OT-89).
- A loop stage already writes `loop_stage_artifacts`, `loop_stage_events`, and a `loop.stage.artifact` job event. That payload names the stage, artifact, ledger path, and Hermes status. It does not name a context plan or a version id.
- A work item can hold `context_plan_id`. Citations are version ids, capped at 40. A missing plan stores the gap sentence from KL-P4.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- The existing `loop.stage.artifact` job event gains `context_plan_id` and `version_ids`. `version_ids` is the plan's citation list, at most 40 ids. No plan means `context_plan_id` is null and `version_ids` is empty.
- The same two fields are on the artifact response the Workspace already reads. The event and the response do not add memory content, a file path, or a score.
- Work → Workflows shows "No context plan" when the field is null, and otherwise "Context plan" plus the id and the version count. Bottom tabs stay Today, Work, and Inbox.
- `schedules` and `strategy_records` are not read.

## 5. Non-goals

- No new scheduler, no consumer of `schedules` or `strategy_records`, and no second event table.
- No copy of artifact markdown, memory content, local-file bytes, or a local path into the new fields.
- No change to Hermes dispatch, GitHub open, or write and external `accepted`.
- No usage emission and no charges flip.
- No trust, impact, grant, or approval change.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover and no worker rewrite (KL-O1 and KL-O2 stay open).
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- KL-P11 is not started. KL-P9 is not closed by this plan.

## 6. Current-state audit

- `store.py` inserts `loop.stage.artifact` with work item, stage, artifact id, artifact type, ledger path, memory item id, and Hermes status. The return body includes `body_markdown`.
- `GET /jobs/{job_id}/events` streams those payloads. It requires `run.start` or `org.admin`.
- `work_items.context_plan_id` is set by `POST /knowledge/plans`. Citations live in `context_plan_citations`.
- The Workflows page describes the live stage from `engineLabsLoop`. It does not show a context-plan citation.
- `schedules` and `strategy_records` have no knowledge consumer. KL-O3 says to leave them unused.

## 7. Assumptions, constraints, risks, and decisions

- KL-P10-N1. This phase is Knowledge Layer KL-P10. It does not reopen the Company OS series.
- KL-P10-N2. The citation is two fields on the existing stage event: `context_plan_id` and `version_ids`. Version ids are strings already stored on the plan. The cap is 40.
- KL-P10-N3. A work item with no plan records null and an empty list. The event is still written.
- KL-P10-N4. KL-O3 is adopted. `schedules` and `strategy_records` stay unused. This phase does not build a scheduler.
- KL-P10-N5. Underlying tools stay external. This phase does not call Hermes and does not add a tool payload.
- KL-P10-N6. Planning proceeded while the KL-P9 review was open because the owner asked. Implementation of KL-P10 waits for a later owner ask.
- Risk: copying `body_markdown` into the event would store a second body. The new fields are ids only.
- Risk: citing another tenant's plan would leak versions. The lookup uses the work item's tenant and its own `context_plan_id`.
- Risk: the existing ledger path stays on the old payload. This phase does not add another path field.

## 8. Dependencies

- The existing loop-stage writer, `job_events`, and context-plan citations.
- The existing Workflows loop description.
- No new environment variable.

## 9. Architecture and affected systems

The API remains the source of truth. A stage write looks up the work item's plan and copies version ids onto the event. The runtime that produced the stage stays outside this lookup.

```
loop stage write
  work item.context_plan_id
    → context_plan_citations.version_id (max 40)
  job event loop.stage.artifact
    context_plan_id, version_ids
Workflows shows the plan id and the count, or "No context plan"
```

## 10. Files and paths in scope

- `services/api/app/store.py` — the `loop.stage.artifact` payload and the artifact return.
- `services/api/tests/` — a stage with a plan cites version ids; a stage without a plan cites none; the payload has no content key.
- `apps/web/src/blueprint2/App.jsx` — the Workflows description line only.
- `docs/knowledge-layer/DECISION_LOG.md` — KL-O3 adopted by this plan.
- `docs/knowledge-layer/CONTEXT_LIFECYCLE.md` — one sentence that a stage event cites version ids.

Out of scope: `schedules`, `strategy_records`, Hermes bridge, usage emission, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p10/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Cite the plan on the stage event

- Objective: `loop.stage.artifact` carries `context_plan_id` and `version_ids` for the work item's tenant.
- Dependencies: none.
- Files: `store.py` and a pytest module.
- Notes: no plan yields null and an empty list. More than 40 citations are truncated to 40. Do not add `content`, `body`, or `path`. Do not read `schedules` or `strategy_records`.
- Validation: pytest. `tests/test_lifecycle_fabric.py` passed, including the engine-labs job tests and context-plan tests run with it (15 passed).
- Completion state: done, pending security.

### T2 — Show the citation on Workflows

- Objective: the live loop line says "No context plan" or names the plan and the version count.
- Dependencies: T1.
- Files: `App.jsx` only for that sentence.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not render version ids as a long list.
- Validation: web static scan 15 passed. Browser at 1280 showed "No context plan" with the stage chip, then "Context plan plan-klp10-browser · 2 versions". At 390 the same sentence stayed and the bottom tabs stayed Today, Work, and Inbox.
- Completion state: done, pending security.

### T3 — Security review and close

- Objective: independent read-only review that the event cites ids only and does not call an external tool, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P11 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89.
- Validation: verdict not BLOCKED.
- Completion state: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change copies version ids into an existing tenant event. It is reversible by omitting the two fields. No public origin or tool call is added. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says lifecycle events cite context versions and tools stay external | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One sentence on the live loop: no plan, or plan id and version count | this plan | Workflows description only | `ui-ux-developer-subagent/handoff.md` | not started |
| software-engineer-subagent | required at implementation | Two fields on the existing stage event | UI charter for the sentence | section 10 | `software-engineer-subagent/handoff.md` | not started |
| security-engineer-subagent | required at implementation | Ids only, same tenant, no tool call, no schedule reader | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | not started |
| growth-marketing-subagent | skipped | No usage event, price, or campaign | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P11 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p10/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Plan citation | pytest | a work item with a plan puts that plan id and its version ids on the stage event | passed |
| No plan | pytest | null plan id and an empty version list | passed |
| Cap | pytest | more than 40 citations store 40 ids | passed |
| No body | pytest | the new fields do not include content, body, or path | passed |
| Other tenant | pytest | a plan from another tenant is not cited | passed |
| Schedules unused | source assertion | the stage writer does not read `schedules` or `strategy_records` | passed |
| No tool call | source assertion | the new lookup does not call Hermes | passed |
| Workflows sentence | browser, desktop and under 768px | "No context plan" or the plan id and count; stage chip remains | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: version ids are already visible to a principal who can read the plan. The event does not add bodies. Tenant comes from the work item row. Preferences and sessions stay out of citations, as they already do in plan create.
- Reliability: a missing plan does not fail the stage write.
- Accessibility: the sentence is text next to the existing stage chip.
- Performance: one citation query, capped at 40.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |
| `ENGINE_TEST_HOOKS` | Local session mint | API process | must stay off in production | existing flag | unchanged |
| `HERMES_API_BASE_URL` | External loop dispatch | API process | must not be called by the new lookup | existing setting | unchanged |

No new variable.

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` at Vercel | Registrar DNS remains from KL-P7 | KL-P7 public exit | no for this plan | `docs/plans/final_implementation_checklist.md` |
| KL-P9 security verdict | Review was still open when this plan was drafted | KL-P9 close | no for planning | workstream handoff |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop writing the two fields. Events already stored can keep them; they are ids. Stage artifacts and user files are not deleted. Hermes dispatch stays as it was.

## 19. Acceptance criteria

- A stage event for a work item with a context plan cites that plan id and its version ids.
- A stage event for a work item without a plan cites none.
- The new fields contain no content and no path.
- `schedules` and `strategy_records` are not read.
- The lookup does not call Hermes.
- Workflows shows the sentence, and the bottom tabs stay.
- Security review is not BLOCKED.
- KL-P11 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p10/manifest.md`.

Implementation evidence: pytest lifecycle, engine-labs, and context-plan tests 15 passed. Web static scan 15 passed. Browser checked Workflows at 1280 and 390. Security review PASS. Project lead accepted. Not committed. KL-P11 was implemented later by a separate owner request and stays on its own review.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P10 only after KL-P9 is verified. The owner asked while OT-92 was open. KL-P9 later returned security PASS and is `complete`.
- The owner asked to plan KL-P11 while this phase's security review was still open. The review later returned PASS. The owner then asked to implement KL-P11 separately. That work does not reopen KL-P10.
- KL-O3 is adopted as "leave unused" rather than left as an open question for the implementer.
- The existing ledger path on the old payload is unchanged. Narrowing it is not this phase.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p10/manifest.md`, and every required role handoff. Confirm KL-P10 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_11_optional_economics_plan.md`.

That plan lets a publisher attach economic metadata. Papership stays not primarily a marketplace. Charges stay off until a separate owner flip. Do not rebuild payment rails. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P11 until that plan is written and the owner asks. Do not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`.
