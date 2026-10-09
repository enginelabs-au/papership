---
plan: phase_15_ecosystem_scale
status: complete
created: 2026-10-09
updated: 2026-10-09
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_14_empirical_optimisation_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p15/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 15: Ecosystem scale

## 1. Objective

An external agent resolves knowledge by calling the existing context-plan routes. The payload is identifiers and enums. It is not a copy of the graph.

The owner asked to implement KL-P15. Security review returned PASS. The phase is complete. There is no KL-P16.

## 2. Relation to project end-state

KL-P15 is ecosystem scale in `docs/knowledge-layer/PHASE_ROADMAP.md`. Papership is a dependency other agent platforms can call. External agents resolve knowledge through Papership without a private fork of the graph. The guard is interoperability over lock-in.

KL-P6 already made the Knowledge API the machine contract. This phase locks the resolve payload. It does not add a second API, an SDK, or a public unauthenticated caller.

## 3. Entry criteria and inherited evidence

- KL-P14 security review [KL-P14 security review](01c5f839-3c12-4c6d-949e-b49e6693aa92) returned PASS. The lead accepted it. KL-P14 is `complete`.
- `POST /knowledge/plans`, `GET /knowledge/plans/{plan_id}`, and `GET /knowledge/plans/{plan_id}/signals` already exist. `ContextPlanSchema` and `ContextSignalsSchema` are strict.
- A plan cites organisation context before packs. Pack order follows impact. The response has no score and no body.
- The agent page says `Context plan ${id} · Organisation N · Packs M · Organisation stays ahead of impact`, or "No context plan".
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open. Registrar DNS remains (OT-89). Charges stay off.

## 4. Scope

- A created plan's keys stay `id`, `agent_principal_id`, `work_item_id`, `gap`, and `citations`.
- Each citation's keys stay `object_id`, `version_id`, and `band`.
- Signals stay `plan_id` and `signals`. Each signal's keys stay `version_id`, `trust`, and `impact`.
- `gap` is null, or the existing sentence `No visible context is attached to this agent and task.` It is not memory content.
- The agent page, when a plan has loaded, keeps the current sentence and adds "Same plan for an external agent." No plan still says "No context plan".
- `docs/knowledge-layer/KNOWLEDGE_API.md` and `docs/knowledge-layer/EXTERNAL_INTEGRATIONS.md` say an external runtime calls those three routes and does not receive the graph.

## 5. Non-goals

- No new Knowledge API route, SDK, webhook, or second graph.
- No unauthenticated caller. The same grants stay. A missing grant stays 403.
- No copy of memory content, a file path, a locator, or a score into the plan or the signals.
- No change to citation order, bands, or the impact ranking from KL-P14.
- No usage emission and no charge flip.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover, no worker rewrite, and no Hermes call.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- No KL-P16 plan.

## 6. Current-state audit

- `get_plan` returns the five plan fields. `plan_signals` returns the plan id and one signal per citation.
- `ContextPlanCitationSchema`, `ContextPlanSchema`, and `ContextSignalsSchema` are already `.strict()`.
- `KNOWLEDGE_API.md` already says the Workspace and an external agent call the same routes. It does not yet say the resolve payload is not a graph copy.
- `EXTERNAL_INTEGRATIONS.md` already lists other agent runtimes as KL-P6 consumers. They call the Knowledge API. Papership does not embed their agents.
- The agent page sentence is in `apps/web/src/blueprint2/App.jsx`.

## 7. Assumptions, constraints, risks, and decisions

- KL-P15-N1. This phase is Knowledge Layer KL-P15. It does not reopen the Company OS series. It is the last row in `PHASE_ROADMAP.md`.
- KL-P15-N2. Resolve means the existing plan create, plan read, and signals read. No new route.
- KL-P15-N3. The allowed keys above are the external contract. A content, path, locator, or score field fails the test.
- KL-P15-N4. `gap` stays null or the existing fixed sentence. It does not echo memory content.
- KL-P15-N5. An external caller uses the same tenant and the same grants as the Workspace. Papership does not issue a separate platform key in this phase.
- KL-P15-N6. The page clause states that the external agent uses this plan. It does not offer a download of the graph.
- KL-P15-N7. The owner asked to implement this plan. Security review PASS. This close does not write a KL-P16 plan.
- Risk: a later field could smuggle a body into the plan. The key-set test and the strict schemas reject it.
- Risk: a public anonymous resolve would widen grants. This phase does not add one.

## 8. Dependencies

- Existing plan and signals routes and their Zod schemas.
- Existing grants on those routes.
- No new environment variable.

## 9. Architecture and affected systems

The API remains the only copy of the graph. An external runtime receives the plan and its signals.

```
POST /knowledge/plans
GET /knowledge/plans/{id}
GET /knowledge/plans/{id}/signals
  identifiers and enums only
Agent page
  Context plan {id} · Organisation N · Packs M · Organisation stays ahead of impact · Same plan for an external agent
```

## 10. Files and paths in scope

- `services/api/tests/test_context_plans.py` — the plan and signals payloads contain only the allowed keys, and `gap` is null or the fixed sentence.
- `apps/web/src/blueprint2/App.jsx` — the agent page sentence only.
- `docs/knowledge-layer/KNOWLEDGE_API.md` — one sentence that those three routes are the resolve contract and are not a graph copy.
- `docs/knowledge-layer/EXTERNAL_INTEGRATIONS.md` — the other-runtimes row names KL-P15 and those three routes.

Out of scope: new routes, SDKs, grants, Hermes, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p15/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.
- No new route line in `KNOWLEDGE_API.md`.

## 12. Ordered implementation tasks

### T1 — Lock the resolve payload

- Objective: a plan and its signals contain only the keys in section 4. `gap` is null or the fixed sentence. The body has no content, path, locator, or score.
- Dependencies: none.
- Files: `test_context_plans.py`.
- Notes: do not add a route. Do not change `create_plan` order. Do not emit usage. The knowledge index resource list stays as it is.
- Validation: pytest.
- Completion state: done. Pytest context-plan and knowledge-api tests 11 passed.

### T2 — Say the external agent uses this plan

- Objective: a loaded plan says `Context plan ${id} · Organisation N · Packs M · Organisation stays ahead of impact · Same plan for an external agent.` No plan still says "No context plan".
- Dependencies: T1.
- Files: `App.jsx`, `KNOWLEDGE_API.md`, `EXTERNAL_INTEGRATIONS.md`.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a download.
- Validation: web static scan. Browser at desktop and under 768px on an agent that has a plan, and on one that does not.
- Completion state: done. Web static scan 15 passed. Browser checked the agent page at 1280 and at 390.

### T3 — Security review and close

- Objective: independent read-only review that the resolve payload cannot carry a graph copy, grants are unchanged, and no new route appears, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write a KL-P16 plan. Do not commit unless the owner asks. Do not close OT-89. Do not treat this close as the Knowledge Layer final checklist unless the owner asks.
- Validation: verdict not BLOCKED.
- Completion state: done. Security PASS. Project lead accepted. No KL-P16 plan.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change locks an existing payload and adds one clause. It does not add a caller or widen grants. It is reversible by dropping the clause and the key-set test. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says external agents resolve through Papership without a private fork | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One clause on the agent page | this plan | agent page sentence | `ui-ux-developer-subagent/handoff.md` | not started |
| software-engineer-subagent | required at implementation | Payload key set and the two doc sentences | UI charter for the sentence | section 10 | `software-engineer-subagent/handoff.md` | not started |
| security-engineer-subagent | required at implementation | No graph copy, same grants, no new route | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No campaign, usage event, or public SDK | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate. Do not open KL-P16 | security handoff | `project-lead-subagent/handoff.md` | owner handoff | PASS |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p15/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Plan keys | pytest | only `id`, `agent_principal_id`, `work_item_id`, `gap`, `citations` | passed |
| Citation keys | pytest | only `object_id`, `version_id`, `band` | passed |
| Signal keys | pytest | only `plan_id` and `signals`; each signal only `version_id`, `trust`, `impact` | passed |
| Gap | pytest | null or the fixed sentence | passed |
| No copy | pytest | the response text has no content, path, locator, or score | passed |
| No new route | pytest | the knowledge index resource list is unchanged | passed |
| Agent sentence | browser, desktop and under 768px | the loaded plan includes "Same plan for an external agent."; no plan stays "No context plan" | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | PASS |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the external contract is the existing authenticated plan. It does not add a body, a path, or a second store. Tenant and grants stay as they are.
- Reliability: a plan with a gap still returns the fixed sentence and an empty citation list. A missing plan stays 404.
- Accessibility: the clause is text in the existing page description.
- Performance: no new query. The test reads the response that already exists.

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

Remove the page clause and the key-set test. The routes and the schemas stay. No graph rows are deleted.

## 19. Acceptance criteria

- A plan response has only the five allowed keys, and each citation has only the three allowed keys.
- Signals have only the allowed keys.
- `gap` is null or the fixed sentence.
- The response has no content, path, locator, or score.
- The knowledge index does not gain a route.
- The agent page shows the existing counts and says the same plan is for an external agent. The bottom tabs stay. No plan stays "No context plan".
- Security review is not BLOCKED.
- No KL-P16 plan is written.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p15/manifest.md`.

Implementation evidence: pytest context-plan and knowledge-api tests 11 passed. Web static scan 15 passed. Browser at the agent page showed the external-agent sentence for organisation 1 and packs 4 at 1280, and the same sentence at 390 with `data-narrow` 1 and Today, Work, and Inbox. "No context plan" showed at 390 after the plan link was cleared. The temporary plan and memory were removed. The memory content was not on the page. Security review PASS. Project lead accepted. Not committed. No KL-P16 plan.

## 21. Deviations and follow-ups

- KL-P6 already exposed the routes. This phase locks their shape and says an external runtime uses that shape.
- A separate platform credential, an SDK, and a public anonymous resolve stay out.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p15/manifest.md`, and every required role handoff. Confirm KL-P15 acceptance criteria are met and the security verdict is not BLOCKED.

Do not generate a KL-P16 plan. KL-P15 is the last phase in `docs/knowledge-layer/PHASE_ROADMAP.md`. When the owner asks to close the Knowledge Layer, update `docs/plans/final_implementation_checklist.md` with the remaining human actions in section 17. Do not start that close in the verification turn unless the owner asks.
