---
plan: phase_12_private_organisation_context
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_11_optional_economics_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p12/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 12: Private organisation context

## 1. Objective

A context plan cites the organisation's own context before any downloaded pack. A pack cannot take a slot ahead of that organisation context, and it cannot be labelled as organisation policy.

The owner asked to implement this plan. Security review returned PASS. The phase is complete. The owner then asked to plan KL-P13. That plan is a draft and is not implemented.

## 2. Relation to project end-state

KL-P12 is private organisation context in `docs/knowledge-layer/PHASE_ROADMAP.md`. Public knowledge and private organisational context are composed. Private context stays higher-authority than downloaded packs (KL-D2, KL-D6). The authority ladder in `docs/knowledge-layer/SECURITY_MODEL.md` puts organisation policy above reference packs.

KL-P13 seeds example Agent Materials. This phase does not add a catalogue or a publisher workflow.

## 3. Entry criteria and inherited evidence

- KL-P11 security review [KL-P11 security review](5665ec4e-4831-43c4-8ebb-c74897b4f4c5) returned PASS. The lead accepted it. KL-P11 is `complete`. The implementation is on `main` at `8efc8c2`. Charges stay off.
- `POST /knowledge/plans` already cites current versions of packs, artifacts, attachments, and memory owned by the agent. The cap is 40. Order is `created_at DESC`, so a newer pack can occupy a slot ahead of older organisation context.
- Preferences, sessions, registry rows, and connections are already excluded. Local files are not in that query.
- The citation contract is `object_id` and `version_id` only. `ContextPlanCitationSchema` is strict.
- The agent page says `Context plan ${id}` or "No context plan".
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open. Grant `scope` is stored and unused. Registrar DNS remains (OT-89).

## 4. Scope

- The eligible set stays the set `create_plan` already selects.
- Each new citation stores a `band`: `organisation` or `pack`.
- `organisation` means the object is in the caller tenant, `source_kind` is not `pack`, and the current version class is `source` or `approved`.
- `pack` means `source_kind` is `pack`, or the class is `inferred`. A pack stays `pack` even when a pack review is `accepted`.
- Organisation citations are written first. Pack citations fill only the remaining slots under the existing cap of 40. A full organisation set omits packs rather than displacing organisation context.
- `GET /knowledge/plans/{plan_id}` returns `band` on each citation. A citation written before this column exists returns `pack`, so an old row is not presented as organisation policy.
- The agent page, when a plan exists, says `Context plan ${id} · Organisation N · Packs M`. No plan still says "No context plan".

## 5. Non-goals

- No new grant, no use of the unused grant `scope` column, and no per-object ACL.
- No team, project, or user scope narrower than the tenant.
- No upload of a local file, and no citation of `local_file`. Preferences and sessions stay out.
- No change to trust, impact, economics, approvals, or lifecycle citation fields.
- No new Knowledge API route. `human_writer` stays true only for `/knowledge/trust` and `/knowledge/impact`.
- No memory body, file path, or chain-of-thought on the citation.
- No hard-coded `tenant-founder`, `principal-founder`, or `proj-engine-labs`.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover, no worker rewrite, and no second scheduler.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- Charges stay off. No usage emission.
- KL-P13 is not started.

## 6. Current-state audit

- `create_plan` in `services/api/app/knowledge_layer.py` inserts citations in `created_at DESC` order, capped at 40.
- `get_plan` returns `object_id` and `version_id` and does not name a band.
- `context_plan_citations` has no `band` column. `migrate_workspace` already adds missing columns with `PRAGMA table_info` and `ALTER TABLE`.
- `ContextPlanCitationSchema` is `.strict()` with `object_id` and `version_id`. The contracts test parses a citation without `band`.
- The agent `pageDesc` in `apps/web/src/blueprint2/App.jsx` is the plan id or "No context plan".
- Another tenant's plan is already 404. The plan query filters `tenant_id`.

## 7. Assumptions, constraints, risks, and decisions

- KL-P12-N1. This phase is Knowledge Layer KL-P12. It does not reopen the Company OS series.
- KL-P12-N2. Organisation is the caller tenant (KL-D2). The band is stored on the citation at insert time so a later class edit does not move history.
- KL-P12-N3. Organisation policy outranks a downloaded pack (KL-D6). Order and the cap enforce that. An accepted pack review does not promote the pack into the organisation band.
- KL-P12-N4. Inferred context stays in the pack band. It remains citable when a slot remains. It cannot precede organisation context.
- KL-P12-N5. A missing `band` on an older citation is returned as `pack`.
- KL-P12-N6. The eligible set, the cap of 40, and the gap sentence stay as they are. Zero citations of either band still store the existing gap.
- KL-P12-N7. The owner asked to implement this plan. The security review is in progress. This implementation does not start KL-P13.
- Risk: labelling a pack as organisation policy would invert the ladder. The stored band and the accepted-pack rule prevent that.
- Risk: filling the cap with organisation rows hides packs. That is the intended precedence. The agent sentence shows both counts, including zero packs.

## 8. Dependencies

- Existing `POST /knowledge/plans` and `GET /knowledge/plans/{plan_id}`.
- Existing tenant filter and the citation cap.
- No new environment variable.

## 9. Architecture and affected systems

The API remains the source of truth. The plan still cites version ids. The new field is only which band that version occupied when the plan was written.

```
POST /knowledge/plans
  organisation citations first (source or approved, not a pack)
  then pack citations (packs and inferred), remaining slots only
  cap 40
GET /knowledge/plans/{id}
  each citation has band organisation | pack
Agent page
  Context plan {id} · Organisation N · Packs M
```

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — citation insert order, `band` column, and the plan response.
- `services/api/tests/test_context_plans.py` — organisation before packs, cap omits a pack, an accepted pack stays `pack`, another tenant stays absent.
- `packages/contracts/src/entities.ts` — `ContextPlanCitationSchema` gains `band`. It stays `.strict()` and stays out of `ENTITY_SCHEMAS`.
- `packages/contracts/test/knowledge-layer.test.ts` — the citation fixture includes `band`.
- `apps/web/src/blueprint2/App.jsx` — the agent page sentence only.

Out of scope: grant tables, local-file routes, economics, Hermes, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p12/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.
- One sentence in `docs/knowledge-layer/CONTEXT_LIFECYCLE.md` that a context plan cites organisation context before packs. No new route line in `KNOWLEDGE_API.md`.

## 12. Ordered implementation tasks

### T1 — Cite organisation context before packs

- Objective: a new plan stores `band` and writes organisation citations before pack citations, still capped at 40.
- Dependencies: none.
- Files: `knowledge_layer.py` and `test_context_plans.py`.
- Notes: add `band` with the existing `PRAGMA` / `ALTER TABLE` pattern. Do not add a route. Do not cite `local_file`. Do not read grant `scope`. Do not hard-code a tenant id. A pack with an accepted review stays `pack`.
- Validation: pytest. Organisation rows precede pack rows. Forty organisation rows leave the pack uncited. Another tenant's object is absent.
- Completion state: done. Pytest 13 passed.

### T2 — Show the two counts on the agent page

- Objective: a plan says `Context plan ${id} · Organisation N · Packs M`. No plan still says "No context plan".
- Dependencies: T1.
- Files: `App.jsx`.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a second page.
- Validation: web static scan. Browser at desktop and under 768px on an agent that has a plan, and on one that does not.
- Completion state: done. Browser checked the agent page at 1280 and 390.

### T3 — Security review and close

- Objective: independent read-only review that organisation context outranks packs, another tenant is absent, and no path or body is stored, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P13 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89.
- Validation: verdict not BLOCKED.
- Completion state: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change decides which context an agent is told to use, inside the existing tenant and the existing cap. It does not widen grants. It is reversible by creating a new plan. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says private organisation context stays higher-authority than downloaded packs | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One sentence on the agent page | this plan | agent page sentence | `ui-ux-developer-subagent/handoff.md` | done, pending security |
| software-engineer-subagent | required at implementation | Band and order on the existing plan | UI charter for the sentence | section 10 | `software-engineer-subagent/handoff.md` | done, pending security |
| security-engineer-subagent | required at implementation | Same tenant, packs cannot outrank organisation context, no grant change | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No campaign, usage event, or public launch | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P13 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p12/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Organisation first | pytest | an organisation citation precedes a pack citation | passed |
| Cap | pytest | forty organisation rows leave the pack uncited | passed |
| Accepted pack | pytest | a pack with an accepted review has band `pack` | passed |
| Inferred | pytest | inferred context is band `pack` and does not precede organisation context | passed |
| Other tenant | pytest | another tenant's object is absent | passed |
| Local file | pytest | a local file is not cited | passed |
| Older citation | pytest | a null band is returned as `pack` | passed |
| Contract | contracts test | a citation requires `band` and rejects an unknown band | passed |
| Agent sentence | browser, desktop and under 768px | the plan sentence includes both counts; no plan stays "No context plan" | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the band is an enum. The citation still carries ids only. Tenant comes from the principal. Retrieval does not widen grants (KL-D6). A pack cannot be stored as organisation context.
- Reliability: a plan with no eligible rows still stores the existing gap. Adding the column does not rewrite old citation ids.
- Accessibility: the counts are text in the existing page description.
- Performance: the same eligible query, then a split in memory before the existing cap.

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
| Use grant `scope` | KL-SEC seam. This phase does not build an ACL | later | no | `docs/knowledge-layer/SECURITY_MODEL.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop writing `band` and return citations without it. Plans already stored can keep the column. Organisation files and packs are not deleted. Grants are unchanged.

## 19. Acceptance criteria

- A new plan cites organisation context before packs.
- The cap of 40 drops packs before it drops organisation context.
- An accepted pack review does not move that pack into the organisation band.
- Inferred context stays in the pack band.
- Another tenant's object is absent. A local file is not cited.
- A citation stores no body and no path.
- The agent page shows both counts, and the bottom tabs stay.
- Grants are unchanged.
- Security review is not BLOCKED.
- KL-P13 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p12/manifest.md`.

Implementation evidence: pytest context-plan, lifecycle, and knowledge-index tests 13 passed. Contracts 16 passed. Web static scan 15 passed. Browser checked the agent page at 1280 and 390. Security review PASS. Project lead accepted. Not committed. The owner then asked to plan KL-P13. That plan is a draft.

## 21. Deviations and follow-ups

- KL-P11 security PASS was recorded in the same turn as this draft, after the owner asked to plan KL-P12. The implementation of KL-P11 was already on `main`.
- Grant `scope` stays unused. A narrower team or project scope is not this phase.
- Older citations without `band` are shown as `pack` so they are not treated as organisation policy.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p12/manifest.md`, and every required role handoff. Confirm KL-P12 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_13_publisher_supply_plan.md`.

Do not implement KL-P13 in that planning turn.
