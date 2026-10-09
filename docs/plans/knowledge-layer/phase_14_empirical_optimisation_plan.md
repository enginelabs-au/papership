---
plan: phase_14_empirical_optimisation
status: complete
created: 2026-10-09
updated: 2026-10-09
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_13_publisher_supply_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p14/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 14: Empirical optimisation

## 1. Objective

Inside a context plan, pack citations are ordered by the impact already recorded for that version and work item. Organisation context stays ahead of every pack, including a pack marked `helped`.

The owner asked to implement KL-P14. Security review returned PASS. The phase is complete. KL-P15 is not started.

## 2. Relation to project end-state

KL-P14 is empirical optimisation in `docs/knowledge-layer/PHASE_ROADMAP.md`. The diagram calls it network intelligence. Rankings cite evidence. They cannot override the authority ladder (KL-D6, KL-D7).

KL-P15 lets other agent platforms call Papership. This phase does not add a public resolver or a second API.

## 3. Entry criteria and inherited evidence

- KL-P13 security review [KL-P13 security review](033076ae-770b-4ee6-9ddc-4927cb1fead3) returned PASS. The lead accepted it. KL-P13 is `complete`.
- KL-P12 is `complete` with security PASS. Organisation citations are written before pack citations. The cap is 40. A pack stays band `pack`.
- `POST /knowledge/impact` already stores `helped`, `harmed`, or `unknown` against a version id and a work item. `GET /knowledge/plans/{id}/signals` already returns that outcome. There is no score.
- The agent page says `Context plan ${id} · Organisation N · Packs M`, or "No context plan".
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open. Registrar DNS remains (OT-89). Charges stay off.

## 4. Scope

- When a plan is created, pack citations are ordered `helped`, then no observation or `unknown`, then `harmed`.
- The outcome is the newest `context_impact_observations` row for that version and the plan's work item, in the caller tenant.
- Organisation citations stay first and are not reordered by impact. A `helped` pack cannot take a slot ahead of organisation context.
- The cap of 40 still drops packs before it drops organisation rows.
- The agent page, when a plan exists, keeps the two counts and adds "Organisation stays ahead of impact." No plan still says "No context plan".

## 5. Non-goals

- No numeric score, rank weight, or chain-of-thought.
- No new impact table and no new Knowledge API route. `human_writer` stays true only for `/knowledge/trust` and `/knowledge/impact`.
- No change to who may record impact. Agents still cannot record it.
- No reorder of the organisation band.
- No grant change and no use of grant `scope`.
- No copy of memory content, a file path, or an observation note. The outcome is the existing enum.
- No usage emission and no charge flip.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover, no worker rewrite, and no Hermes call.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- KL-P15 is not started.

## 6. Current-state audit

- `create_plan` splits eligible rows into organisation and pack, keeps each list in `created_at DESC`, then writes organisation first and slices at 40.
- Impact rows live in `context_impact_observations` with `version_id`, `work_item_id`, `outcome`, and `tenant_id`.
- `plan_signals` already reads the newest outcome for the plan's work item. It does not change citation order.
- `ContextPlanCitationSchema` is `object_id`, `version_id`, and `band`. This phase does not add a field.
- The agent page sentence is in `apps/web/src/blueprint2/App.jsx`.

## 7. Assumptions, constraints, risks, and decisions

- KL-P14-N1. This phase is Knowledge Layer KL-P14. It does not reopen the Company OS series.
- KL-P14-N2. Evidence is the existing outcome enum. There is no score (KL-D7).
- KL-P14-N3. Pack order is `helped`, then missing or `unknown`, then `harmed`. Ties stay `created_at DESC`.
- KL-P14-N4. Organisation context stays ahead of packs (KL-D6). Impact does not sort that band and cannot move a pack into it.
- KL-P14-N5. The lookup uses the caller tenant and the plan's work item. Another tenant's observation is ignored.
- KL-P14-N6. Signals stay the place that returns the outcome. Citation order is the ranking. The citation payload does not grow a score.
- KL-P14-N7. The owner asked to implement this plan. Security review PASS. This close does not start KL-P15.
- Risk: a helped pack could be read as more authoritative than organisation policy. The write order and the page sentence keep organisation first.
- Risk: a free-text reason would store chain-of-thought. This phase reads only the outcome enum.

## 8. Dependencies

- Existing `create_plan` band split and cap.
- Existing impact observations and `plan_signals`.
- No new environment variable.

## 9. Architecture and affected systems

The API remains the source of truth. Impact changes the order of pack citations only. The authority ladder does not move.

```
POST /knowledge/plans
  organisation citations first, unchanged order
  then packs: helped, then unknown or none, then harmed
  cap 40
GET /knowledge/plans/{id}/signals
  still returns the outcome
Agent page
  Context plan {id} · Organisation N · Packs M · Organisation stays ahead of impact
```

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — order the pack list by the newest impact outcome before the cap.
- `services/api/tests/test_context_plans.py` — a helped pack follows organisation context and precedes a harmed pack. The response has no score.
- `apps/web/src/blueprint2/App.jsx` — the agent page sentence only.

Out of scope: trust writes, economics, example pointers, grants, Hermes, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p14/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- One sentence in `docs/knowledge-layer/CONTEXT_LIFECYCLE.md` that pack order cites impact and organisation context stays ahead.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.
- No new route line in `KNOWLEDGE_API.md`.

## 12. Ordered implementation tasks

### T1 — Order packs by impact

- Objective: pack citations are written `helped`, then missing or `unknown`, then `harmed`, after every organisation citation.
- Dependencies: none.
- Files: `knowledge_layer.py` and `test_context_plans.py`.
- Notes: read only the newest outcome for the caller tenant and the plan work item. Do not add a column. Do not add a route. Do not sort the organisation band by impact. Do not emit usage.
- Validation: pytest. A helped pack follows an organisation citation and precedes a harmed pack. The body has no score and no content.
- Completion state: done. Pytest context-plan and knowledge-api tests 10 passed.

### T2 — Say that organisation stays ahead

- Objective: a plan says `Context plan ${id} · Organisation N · Packs M · Organisation stays ahead of impact.` No plan still says "No context plan".
- Dependencies: T1.
- Files: `App.jsx`.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a score on the page.
- Validation: web static scan. Browser at desktop and under 768px on an agent that has a plan, and on one that does not.
- Completion state: done. Web static scan 15 passed. Browser checked the agent page at 1280 and at 390.

### T3 — Security review and close

- Objective: independent read-only review that impact cannot outrank organisation context, another tenant's observation is ignored, and no score or body is stored, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P15 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89.
- Validation: verdict not BLOCKED.
- Completion state: done. Security PASS. Project lead accepted. KL-P15 not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change reorders pack citations inside the existing cap. It does not widen grants and it does not cross the authority ladder. It is reversible by restoring `created_at` order inside the pack band. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says rankings cite evidence and cannot override the authority ladder | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One clause on the agent page | this plan | agent page sentence | `ui-ux-developer-subagent/handoff.md` | not started |
| software-engineer-subagent | required at implementation | Pack order from the existing impact enum | UI charter for the sentence | section 10 | `software-engineer-subagent/handoff.md` | not started |
| security-engineer-subagent | required at implementation | Organisation stays first, no score, same tenant | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No campaign, usage event, or public ranking | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P15 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | PASS |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p14/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Organisation first | pytest | an organisation citation precedes a helped pack | passed |
| Pack order | pytest | a helped pack precedes a harmed pack | passed |
| Unknown | pytest | a missing or unknown outcome sits between helped and harmed | passed |
| Other tenant | pytest | another tenant's observation does not change the order | passed |
| No score | pytest | the plan response has no score and no content | passed |
| Cap | pytest | organisation rows still fill the cap before packs | passed |
| Agent sentence | browser, desktop and under 768px | the plan sentence includes both counts and "Organisation stays ahead of impact."; no plan stays "No context plan" | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | PASS |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the ranking is an enum already stored on an impact row. It does not add a reason, a body, or a path. Tenant comes from the principal. A pack cannot be stored as organisation context.
- Reliability: a plan with no impact rows keeps today's pack order, because every pack is in the middle group. A missing plan still stores the existing gap.
- Accessibility: the clause is text in the existing page description.
- Performance: one lookup of the newest outcome per pack candidate before the existing cap.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |

No new variable.

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` at Vercel | Registrar DNS remains from KL-P7 | KL-P7 public exit | no for this plan | `docs/plans/final_implementation_checklist.md` |
| Flip charges | Separate owner decision (OT-08) | later | no | `docs/handover/future-tasks.md` |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop sorting the pack list by outcome and return to `created_at DESC` inside that band. Impact rows stay. Organisation files and packs are not deleted.

## 19. Acceptance criteria

- A helped pack follows organisation context.
- A helped pack precedes a harmed pack.
- A missing or unknown outcome sits between those two.
- Another tenant's observation does not change the order.
- The plan response has no score and no body.
- The agent page shows both counts and says organisation stays ahead of impact. The bottom tabs stay.
- Security review is not BLOCKED.
- KL-P15 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p14/manifest.md`.

Implementation evidence: pytest context-plan and knowledge-api tests 10 passed. Web static scan 15 passed. Browser at the agent page showed the impact sentence for organisation 1 and packs 4 at 1280, and the same sentence at 390 with `data-narrow` 1 and Today, Work, and Inbox. "No context plan" showed at 390 after the plan link was cleared. The temporary plan and memory were removed. The memory content was not on the page. Security review PASS. Project lead accepted. Not committed. KL-P15 is not started.

## 21. Deviations and follow-ups

- The ranking is citation order inside the pack band. Signals already return the outcome, so the citation schema does not grow a score.
- Organisation order stays `created_at DESC`. Impact does not reshuffle that band.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p14/manifest.md`, and every required role handoff. Confirm KL-P14 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_15_ecosystem_scale_plan.md`.

Do not implement KL-P15 in that planning turn.
