---
plan: phase_11_optional_economics
status: implemented_pending_security
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_10_lifecycle_fabric_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p11/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 11: Optional economics

## 1. Objective

A human in the tenant can attach an economic model to a Papership Registry material. The model is metadata. Charges stay off.

The owner asked to implement this plan. The model is in the tree and waiting on the security review. KL-P12 is not started.

## 2. Relation to project end-state

KL-P11 is optional economics in `docs/knowledge-layer/PHASE_ROADMAP.md` and `docs/knowledge-layer/ARCHITECTURE.md`. A publisher can name a model. Papership stays not primarily a marketplace. The existing trial rate card (D-35) stays the seat price list. `ENGINE_BILLING_CHARGES_ENABLED` stays off until a separate owner flip.

KL-P12 composes private organisation context. This phase does not change grants or scopes.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P11 on 2026-10-06 while the KL-P10 security review was still open (OT-94). The same precedent is the KL-P5, KL-P7, KL-P8, KL-P9, and KL-P10 plans. User request wins over "plan only after the previous phase is verified."
- KL-P10 was `implemented_pending_security` when this plan was drafted. The review later returned PASS and KL-P10 is `complete`. This plan did not close it.
- KL-P9 is `complete` with security PASS. KL-P0 through KL-P8 are recorded. Registrar DNS remains (OT-89).
- `GET /registry/materials` returns id, title, kind, class, locator, and object id for packs, artifacts, and attachments. It has no price field.
- `GET /billing/rate-card` publishes Free, Pro, Max, and Enterprise. `charges_enabled` follows the existing flag and is off.
- Allowances, reservations, and reconcile already exist. This phase does not call them.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- A human with `memory.write` or `org.admin` can set one model on a material in the caller tenant: `free`, `listed`, or `unavailable`.
- `listed` stores a non-negative integer `list_usd`. `free` and `unavailable` store no amount.
- `GET /registry/materials` returns `economic_model` and `list_usd`. No row means both are null.
- Knowledge → Materials shows "No economic model", "Free", "Listed · $N", or "Unavailable", and the page says charges stay off.
- The Knowledge API index gains the new route with `human_writer` false. The true set stays `/knowledge/trust` and `/knowledge/impact`.

## 5. Non-goals

- No charge, invoice, card, credit purchase, or allowance debit.
- No change to `ENGINE_BILLING_CHARGES_ENABLED` or the D-35 rate card figures.
- No second billing ledger and no payment-provider client.
- No marketplace browse, checkout, or publisher payout.
- No copy of memory content, a file path, or a local-file byte into the economics row.
- No grant, approval, trust, or lifecycle change.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover and no worker rewrite.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- KL-P12 is not started. KL-P10 is not closed by this plan.

## 6. Current-state audit

- Materials are context objects whose source kind is pack, artifact, or attachment. The list cap is 80. A missing `memory.read` grant is 403.
- `RegistryMaterialSchema` is strict and has no economics fields.
- The rate card and allowance routes live outside the Knowledge API. Charges default off.
- The Materials screen lists title, kind, class, and locator.
- The index test requires every documented `GET|POST /path` line to match `KNOWLEDGE_RESOURCES`, and the human-writer true set to stay the trust and impact routes.

## 7. Assumptions, constraints, risks, and decisions

- KL-P11-N1. This phase is Knowledge Layer KL-P11. It does not reopen the Company OS series.
- KL-P11-N2. The model is one row per tenant and material: `free`, `listed`, or `unavailable`. `listed` requires `list_usd` as an integer from 0 upward. The other two models reject an amount.
- KL-P11-N3. The writer is a human in the caller tenant with `memory.write` or `org.admin`. An agent is 403. A material in another tenant, or an object that is not a material, is 404.
- KL-P11-N4. The body is pydantic `extra=forbid`. A path, content, or card field is 422. The row stores the model and the optional amount only.
- KL-P11-N5. `human_writer` on the new index row stays false so the locked true set remains trust and impact. The route still refuses an agent.
- KL-P11-N6. Charges stay off. This phase does not read or write allowances and does not change the rate card.
- KL-P11-N7. Planning proceeded while the KL-P10 review was open because the owner asked. Implementation of KL-P11 waits for a later owner ask.
- Risk: a listed amount could be mistaken for a charge. The response and the screen say the figure is a list price and charges stay off.
- Risk: attaching a model to a local file would mix a machine-local pointer with a price. Only pack, artifact, and attachment objects accept a model.

## 8. Dependencies

- Existing materials list, context objects, and the Knowledge API index.
- Existing human check used by trust and impact.
- No new environment variable. `ENGINE_BILLING_CHARGES_ENABLED` stays as it is.

## 9. Architecture and affected systems

The API remains the source of truth. Economics metadata sits beside a material. The rate card and the allowance ledger stay separate.

```
human POST /registry/materials/{object_id}/economics
  model free | listed | unavailable
  list_usd only when listed
GET /registry/materials
  economic_model, list_usd
Knowledge → Materials shows the model
charges stay off
```

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — the materials list fields, the new route, and the index row.
- `services/api/tests/` — human set, agent refusal, other tenant 404, listed amount, free without an amount, extra key 422, charges flag unchanged.
- `docs/knowledge-layer/KNOWLEDGE_API.md` — one route line.
- `packages/contracts/src/entities.ts` — `RegistryMaterialSchema` gains the two fields. Not added to `ENTITY_SCHEMAS`.
- `apps/web/src/blueprint2/screens.jsx` — the Materials row label only.
- `apps/web/src/blueprint2/App.jsx` — the Materials page sentence "Charges stay off."

Out of scope: `rate_card.py`, allowance routes, `schedules`, Hermes, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p11/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Store the model on the material

- Objective: a human can set `free`, `listed`, or `unavailable` on a material in the caller tenant, and the list returns it.
- Dependencies: none.
- Files: `knowledge_layer.py`, `KNOWLEDGE_API.md`, contracts, and a pytest module.
- Notes: agent 403. Other tenant and non-material 404. Extra keys 422. Do not call allowance or rate-card writers. `human_writer` stays false. Do not flip charges.
- Validation: pytest, including the knowledge index test.
- Completion state: not started.

### T2 — Show the model on Materials

- Objective: each row shows "No economic model", "Free", "Listed · $N", or "Unavailable". The page says charges stay off.
- Dependencies: T1.
- Files: `screens.jsx` for the row, `App.jsx` for the page sentence.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a checkout button.
- Validation: web static scan. Browser at desktop and under 768px on Knowledge → Materials. An empty list still says "No materials for this seat."
- Completion state: not started.

### T3 — Security review and close

- Objective: independent read-only review that the model is metadata, charges stay off, and another tenant cannot read or write it, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P12 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89.
- Validation: verdict not BLOCKED.
- Completion state: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change writes a list price beside tenant materials. It does not enable charges. It is reversible by deleting the economics row. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says economics metadata exists and Papership is not primarily a marketplace | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One label on the Materials row and a charges-stay-off sentence | this plan | Materials row and page sentence | `ui-ux-developer-subagent/handoff.md` | not started |
| software-engineer-subagent | required at implementation | Model and optional list amount on the existing materials list | UI charter for the label | section 10 | `software-engineer-subagent/handoff.md` | not started |
| security-engineer-subagent | required at implementation | No charge, same tenant, human writer, no card or path | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | not started |
| growth-marketing-subagent | skipped | No campaign, usage event, or charge flip | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P12 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p11/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Listed model | pytest | a human stores `listed` and `list_usd`, and the materials list returns both | passed |
| Free and unavailable | pytest | those models store no amount; an amount is 422 | passed |
| Agent | pytest | an agent post is 403 | passed |
| Other tenant | pytest | another tenant's material is 404 and absent from the list | passed |
| Extra key | pytest | `path` or `content` is 422 | passed |
| Charges off | pytest | the post does not change `charges_enabled` and does not insert an allowance | passed |
| Index | pytest | the new route is documented, and the human-writer true set is still trust and impact | passed |
| Materials label | browser, desktop and under 768px | the row label and "Charges stay off."; empty copy remains | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | in progress |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the amount is a published list figure, not a secret and not a charge. Tenant comes from the principal row. Preferences and sessions stay out of the materials query.
- Reliability: a material with no economics row still lists. A bad model does not write a partial row.
- Accessibility: the label is text on the existing row.
- Performance: one lookup of the economics rows for the listed materials.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |
| `ENGINE_TEST_HOOKS` | Local session mint | API process | must stay off in production | existing flag | unchanged |

No new variable.

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` at Vercel | Registrar DNS remains from KL-P7 | KL-P7 public exit | no for this plan | `docs/plans/final_implementation_checklist.md` |
| KL-P10 security verdict | Review was still open when this plan was drafted | KL-P10 close | no for planning | workstream handoff |
| Flip charges | Separate owner decision (OT-08) | later | no | `docs/handover/future-tasks.md` |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop writing the economics row and omit the two list fields. Materials, the rate card, and allowances stay. No payment record is created, so there is no charge to reverse.

## 19. Acceptance criteria

- A human can attach `free`, `listed`, or `unavailable` to a material in their tenant.
- `listed` stores `list_usd`. The other models do not.
- An agent cannot write the model. Another tenant cannot see it.
- The body rejects a path and content.
- Charges stay off, and no allowance row is written.
- Materials shows the label, and the bottom tabs stay.
- Security review is not BLOCKED.
- KL-P12 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p11/manifest.md`.

Implementation evidence is empty until the owner asks.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P11 only after KL-P10 is verified. The owner asked while OT-94 was open. KL-P10 later returned security PASS and is `complete`.
- The new route is a human write, and its index flag stays false so the existing true set does not grow.
- Seat prices stay on the rate card. This phase does not copy them onto materials.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p11/manifest.md`, and every required role handoff. Confirm KL-P11 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_12_private_organisation_context_plan.md`.

That plan composes public knowledge with private organisational context. Private context stays higher-authority than a downloaded pack. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P12 until that plan is written and the owner asks. Do not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`.
