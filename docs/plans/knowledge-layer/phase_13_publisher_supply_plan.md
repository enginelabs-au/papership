---
plan: phase_13_publisher_supply
status: complete
created: 2026-10-09
updated: 2026-10-09
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_12_private_organisation_context_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p13/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 13: Publisher supply

## 1. Objective

Knowledge → Materials lists two example pointers: one for an Agent Skill and one for an MCP server. Each pointer is a title and an id. The native file stays outside Papership.

The owner asked to implement this plan. Security review returned PASS. The phase is complete. KL-P14 is not started.

## 2. Relation to project end-state

KL-P13 is supply quality in `docs/knowledge-layer/PHASE_ROADMAP.md`. The diagram calls it publisher supply. Contextbook-style examples exist. Agent Skills and MCP stay the canonical standards (KL-D8). Papership stores an overlay, not a second skill format or a second protocol.

KL-P14 ranks context from impact, inside policy. This phase does not rank, score, or learn.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P13 on 2026-10-09 while the KL-P12 security review was still open (OT-98). The same precedent is the KL-P5, KL-P7, KL-P8, KL-P9, KL-P10, KL-P11, and KL-P12 plans. User request wins over "plan only after the previous phase is verified."
- KL-P12 security review returned PASS after this plan was drafted. KL-P12 is `complete`. This plan did not close it and does not implement KL-P13.
- KL-P11 is `complete` with security PASS. Charges stay off.
- `GET /registry/materials` lists packs, artifacts, and attachments. Packs `education-demo` and `example-executable` live in `PACKS`. Install of an unknown pack id is 404.
- The capability catalogue stays 43 rows. That catalogue is not the Papership Registry.
- The Materials page says skill hosts, MCP directories, and publisher catalogues are not connected, and charges stay off.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open. Registrar DNS remains (OT-89).

## 4. Scope

- Two example pointers, `example-skill` and `example-mcp`, are projected as pack objects in the caller tenant.
- Titles are "Example skill" and "Example MCP server". Class is `inferred`. The locator is the id. No file body and no path.
- They are not members of `PACKS`. `POST /packs/install` for either id stays 404. They cannot be activated.
- `GET /registry/materials` returns both for a caller with `memory.read` or `org.admin`.
- A context plan that cites them uses band `pack`, because the source kind is pack and the class is inferred.
- The Materials page says the two examples point at native files, that skill hosts, MCP directories, and publisher catalogues are still not connected, and that charges stay off.

## 5. Non-goals

- No copy of a `SKILL.md` body, an MCP schema, or a plugin manifest.
- No new skill dialect and no second MCP protocol.
- No install, activate, or execute path for the examples.
- No change to `education-demo`, `example-executable`, or the 43-row capability catalogue.
- No economics row, no charge, and no allowance write.
- No grant change and no use of grant `scope`.
- No new Knowledge API route. `human_writer` stays true only for `/knowledge/trust` and `/knowledge/impact`.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No Postgres cutover, no worker rewrite, and no Hermes call.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- KL-P14 is not started. KL-P12 is not closed by this plan.

## 6. Current-state audit

- `ensure_pack_pointers` projects `PACKS` as context objects with `source_kind` `pack` and class `inferred`.
- `list_materials` includes those objects. The list cap is 80.
- `install_pack` rejects an id that is not in `PACKS` with 404.
- `RegistryMaterialSchema` is strict. It has no example flag. The row already shows title, kind, class, and locator.
- Tests assert `GET /packs` includes `education-demo` and `example-executable`, and that the registry count stays 43.
- The Materials sentence is in `apps/web/src/blueprint2/App.jsx`.

## 7. Assumptions, constraints, risks, and decisions

- KL-P13-N1. This phase is Knowledge Layer KL-P13. It does not reopen the Company OS series.
- KL-P13-N2. An example is a pack pointer that is not installable. Native Agent Skill and MCP files stay canonical (KL-D8).
- KL-P13-N3. The two ids are `example-skill` and `example-mcp`. Titles are "Example skill" and "Example MCP server". Class is `inferred`. Locator equals the id.
- KL-P13-N4. Projection uses the existing pack pointer path. The examples are not added to `PACKS`, so install and activate do not see them.
- KL-P13-N5. Because they are inferred packs, a context plan cites them in the pack band. They do not outrank organisation context.
- KL-P13-N6. The same pointers are projected for each caller tenant. They are fixtures, not another tenant's private objects.
- KL-P13-N7. The owner asked to implement this plan. The security review is in progress. This implementation does not start KL-P14.
- Risk: an example could be mistaken for a connected catalogue. The page says hosts and directories are still not connected.
- Risk: storing a path or a skill body would copy a native file. The row stores the id only.

## 8. Dependencies

- Existing materials list and pack projection.
- Existing pack install rejection for unknown ids.
- No new environment variable. `ENGINE_PACK_EXECUTION_ENABLED` stays as it is. Charges stay off.

## 9. Architecture and affected systems

The API remains the source of truth. The examples sit beside the two existing packs on the materials list. The pack install table does not gain rows for them.

```
example-skill and example-mcp
  projected as pack, class inferred, locator = id
GET /registry/materials
  both titles
POST /packs/install
  unknown pack, 404
Knowledge → Materials
  examples point at native files
  catalogues stay unconnected
  charges stay off
```

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — project the two examples next to pack pointers. Do not add them to `PACKS`.
- `services/api/tests/test_registry_materials.py` — both locators are listed, install of either id is 404, the registry count stays 43, and the response has no skill body.
- `apps/web/src/blueprint2/App.jsx` — the Materials page sentence only.

Out of scope: `phase7.py` pack execution, economics, grants, Hermes, `BOTTOM_TABS`, marketing site, Vercel `enginelabs-au-site`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p13/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- One sentence in `docs/knowledge-layer/EXTERNAL_INTEGRATIONS.md` that the two examples are pointers and the standards stay outside Papership.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.
- No new route line in `KNOWLEDGE_API.md`.

## 12. Ordered implementation tasks

### T1 — Project the two examples

- Objective: Materials lists `example-skill` and `example-mcp`. Install of either id is 404.
- Dependencies: none.
- Files: `knowledge_layer.py` and `test_registry_materials.py`.
- Notes: class `inferred`, source kind `pack`, locator is the id. Do not add the ids to `PACKS`. Do not store a body or a path. Do not change the 43-row catalogue. Do not write an economics row.
- Validation: pytest. Both locators are present. `education-demo` remains. Install is 404. Registry count stays 43.
- Completion state: done. Pytest 9 passed.

- Objective: the Materials page says the examples point at native files, that skill hosts, MCP directories, and publisher catalogues are not connected, and that charges stay off.
- Dependencies: T1.
- Files: `App.jsx`.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a checkout or an install button. Empty copy stays "No materials for this seat."
- Validation: web static scan. Browser at desktop and under 768px on Knowledge → Materials.
- Completion state: done. Browser checked Materials at 1280 and 390.

### T3 — Security review and close

- Objective: independent read-only review that the examples are ids only, install stays closed, and another tenant's private objects are not copied into the examples, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P14 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89. Do not close OT-98 from this phase.
- Validation: verdict not BLOCKED.
- Completion state: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change publishes two fixture pointers into every tenant's materials list. It does not install code and it does not widen grants. It is reversible by stopping the projection. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP already says examples exist and Skill and MCP standards are not reinvented | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One sentence on the Materials page | this plan | Materials page sentence | `ui-ux-developer-subagent/handoff.md` | done, pending security |
| software-engineer-subagent | required at implementation | Two pack pointers that are not installable | UI charter for the sentence | section 10 | `software-engineer-subagent/handoff.md` | done, pending security |
| security-engineer-subagent | required at implementation | Ids only, install stays 404, no body or path | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No campaign, usage event, or public catalogue launch | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P14 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p13/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Example skill | pytest | Materials includes locator `example-skill` and title "Example skill" | passed |
| Example MCP | pytest | Materials includes locator `example-mcp` and title "Example MCP server" | passed |
| Not installable | pytest | `POST /packs/install` for either id is 404 | passed |
| Existing packs | pytest | `education-demo` is still listed and `GET /packs` still has the two `PACKS` ids | passed |
| Catalogue | pytest | registry count stays 43 | passed |
| No body | pytest | the materials response has no skill body and no path | passed |
| Pack band | pytest | a plan that cites an example stores band `pack` | passed |
| Materials sentence | browser, desktop and under 768px | the page names native files, unconnected catalogues, and charges off | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the pointer is an id. It does not carry file bytes, a path, or another tenant's memory. Install and activate do not accept the ids.
- Reliability: a tenant that already has materials still lists them. The two examples are additive.
- Accessibility: the titles are text on the existing rows, and the explanation is the existing page description.
- Performance: two extra pack projections on the materials read.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_PACK_EXECUTION_ENABLED` | Pack execution | API process | must stay as it is | existing flag | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |

No new variable.

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` at Vercel | Registrar DNS remains from KL-P7 | KL-P7 public exit | no for this plan | `docs/plans/final_implementation_checklist.md` |
| KL-P12 security verdict | Recorded PASS after this draft | KL-P12 close | no | workstream handoff |
| Flip charges | Separate owner decision (OT-08) | later | no | `docs/handover/future-tasks.md` |
| Connect a live skill host or MCP directory | Separate publisher decision | later | no | `docs/knowledge-layer/EXTERNAL_INTEGRATIONS.md` |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Stop projecting the two ids. Materials, the two `PACKS` entries, and the capability catalogue stay. No install row is created, so there is no install to remove.

## 19. Acceptance criteria

- Materials lists "Example skill" and "Example MCP server".
- Neither id can be installed.
- The response has no skill body and no path.
- `education-demo` and the 43-row catalogue stay.
- A cited example is band `pack`.
- The Materials page says the examples point at native files and that catalogues are not connected. Charges stay off. The bottom tabs stay.
- Security review is not BLOCKED.
- KL-P14 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p13/manifest.md`.

Implementation evidence: pytest materials, economics, and knowledge-index tests 9 passed. Web static scan 15 passed. Browser checked Materials at 1280 and 390. Security review PASS. Project lead accepted. Not committed. KL-P14 not started.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P13 only after KL-P12 is verified. The owner asked while OT-98 was open. KL-P12 later returned security PASS and is `complete`.
- The examples are fixture pointers, not a connected publisher catalogue.
- Live skill hosts and MCP directories stay unconnected.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p13/manifest.md`, and every required role handoff. Confirm KL-P13 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_14_empirical_optimisation_plan.md`.

Do not implement KL-P14 in that planning turn.
