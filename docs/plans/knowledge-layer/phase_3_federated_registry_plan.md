---
plan: phase_3_federated_registry
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_2_context_graph_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p3/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 3: Federated Registry

## 1. Objective

Let an operator, and an API caller in the same organisation, find candidate Agent Materials. A candidate points at a pack already in Papership, or at a document-like ContextObject the caller can already see. Native files stay the source. The 43-domain capability catalogue stays a separate screen.

The owner asked to implement this plan on 2026-10-06. Product code is in the tree. The phase is not closed until the security review is recorded and is not BLOCKED. KL-P4 is not started.

## 2. Relation to project end-state

KL-P3 is discovery (DISCOVER in `docs/knowledge-layer/CONTEXT_LIFECYCLE.md`). KL-P4 writes a ContextPlan that cites version ids. KL-P5 attaches trust and impact to a version. KL-P13 deepens publisher catalogues. Commerce (KL-P11) is not this phase.

KL-D9: "capability registry" remains the 43-domain catalogue. "Papership Registry" is this discovery surface. The API remains the only client contract (KL-D4). SQLite remains the store (KL-O1, KL-D3). Third-party candidates stay `inferred` until a later human promotion (KL-D5).

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P3 on 2026-10-06 after KL-P2 was verified.
- KL-P2 is complete. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p2/security-engineer-subagent/handoff.md`. Project lead accepted it.
- Context objects, immutable versions, and typed relationships exist. `context_plan_id` is still null. Projection does not copy memory bodies, artifact markdown, or catalogue payloads.
- Preferences and sessions stay owner-only. Agent, approval, and audit lists still require `org.admin` or both `ledger.read` and `records.read`.
- Today → Registry (`Registry` in `apps/web/src/blueprint2/screens.jsx`) is the capability catalogue. Its caption already says the Papership Registry is a later surface.
- Packs `education-demo` (declarative) and `example-executable` (catalogued, activation denied) live in `services/api/app/phase7.py`. `GET /packs`, install, trust review, and activate already exist. This phase does not call those writes.
- KL-SEC-01 and KL-SEC-02 remain open. This phase must not copy them.

## 4. Scope

- `GET /registry/materials` for the caller's tenant. Each row has a title, kind, class, locator, and the ContextObject id when one exists. No price, trust number, or body.
- Two candidate sources only:
  - the in-process pack catalogue, as a tenant-local pointer (`source_kind` `pack`) when that pointer is missing
  - ContextObjects the caller can already list whose `source_kind` is `artifact` or `attachment`
- A Knowledge sub-view, Materials, titled Papership Registry. Hash `#knowledge/materials`. Empty state when that list is empty. A one-line note that skill hosts, MCP directories, and publisher catalogues are not connected.
- The executable pack stays `inferred`. This phase does not offer activation.

## 5. Non-goals

- No marketplace, price, checkout, or `ENGINE_BILLING_CHARGES_ENABLED` change.
- No Resolver, ContextPlan writer, knowledge-gap detector, or automatic attachment of context to a task.
- No trust score, impact score, cost figure, or chain-of-thought (KL-D7).
- No rename of Today → Registry, and no second copy of the 43 catalogue rows. Capability-registry pointers (`source_kind` `registry`) are not materials.
- No live fetch of an external publisher, skill host, or MCP directory.
- No pack install, activate, trust review, or custom-field write.
- No copy of file bytes into SQLite (KL-D8).
- Memory items, connections, preferences, and sessions are not materials on this screen. They stay on Knowledge, Integrations, and the owner-only memory rules.
- No new grant class. The read uses `memory.read` or `org.admin`.
- No Hermes write or external `accepted`. No `ENGINE_USAGE_EMIT` change.
- No new rail tab and no change to `BOTTOM_TABS` or `RAIL_TABS`. No blueprint-3 chrome swap. No Postgres move.

## 6. Current-state audit

| Surface | What exists | What this phase does |
|---|---|---|
| Today → Registry | `registry` table, 43 rows, caption in `screens.jsx` | Leave the screen and the caption's meaning. Do not list those ids as materials |
| Knowledge | `#knowledge/objects` and `#knowledge/<object id>` | Add `#knowledge/materials`. Do not treat the word `materials` as an object id |
| Context graph | objects, versions, sources | Read artifact and attachment objects. Insert a pack pointer only when missing. Do not update `context_versions` |
| Packs | `education-demo`, `example-executable` in `PACKS` | Locator is the pack id. Do not call `install_pack` or `activate_pack` |
| Connections | Already projected as `source_kind` `connection` | Not materials. Unconnected ecosystems are a sentence, not fake rows |

## 7. Assumptions, constraints, risks, and decisions

- KL-P3-N1. Discovery reads the graph. It does not create a second object for a source KL-P2 already projected.
- KL-P3-N2. A missing pack pointer uses `source_kind` `pack`, `source_id` the pack id, class `inferred`, locator the pack id. The object id uses the existing tenant hash. Version 1 is insert-only.
- KL-P3-N3. Papership Registry is the Knowledge sub-view Materials. Today → Registry stays the capability catalogue. No new rail item named Registry.
- KL-P3-N4. Skill hosts, MCP directories, and publisher catalogues are named as not connected. They are not scraped.
- KL-P3-N5. Material rows are packs plus artifact and attachment objects. `source_kind` `registry`, `memory`, `connection`, and private kinds are excluded.
- Risk: `#knowledge/materials` is parsed as an object id today, because any detail other than `objects` opens object detail. The hash parser must special-case `materials` first.
- Risk: pack install could be wired by mistake. The new route must not call `install_pack`, `activate_pack`, or `review_pack_trust`.
- Risk: catalogue ids could be labelled as materials. Tests assert `registry` count stays 43 and capability ids are absent from the material list.

## 8. Dependencies

- KL-P2 PASS handoff and the overlay tables.
- `PACKS` in `phase7.py`. Read the ids and labels. Do not import the install functions into the new route.
- AuthContext tenant. No new `tenant-founder` literal in `knowledge_layer.py`.
- Owner ask before any product code.

## 9. Architecture and affected systems

`GET /registry/materials` lives in `knowledge_layer.py`. It uses the caller tenant from `AuthContext`, the same `memory.read` or `org.admin` gate as `GET /knowledge/objects`, and the list cap of 80. It may call `ensure_projected` and then insert missing pack pointers. It does not run inside `run_engine_labs_stage_work`, does not call Hermes, and does not emit usage.

The web app fetches that route when the Knowledge sub-view is Materials. A failed fetch is an error string, not the capability-catalogue fixture.

## 10. Files and paths in scope

- `services/api/app/knowledge_layer.py` — material read and pack-pointer insert.
- `services/api/tests/test_registry_materials.py` — new file. Do not import `tests.conftest`.
- `packages/contracts/src/entities.ts` and `index.ts` — candidate schema, not added to `ENTITY_SCHEMAS`.
- `packages/contracts/test/knowledge-layer.test.ts`.
- `apps/web/src/api/papership.js` — fetch `/registry/materials`.
- `apps/web/src/blueprint2/App.jsx` — Knowledge subs and hash parse. Do not edit `BOTTOM_TABS` or `RAIL_TABS`.
- `apps/web/src/blueprint2/screens.jsx` — Materials list. Do not change the Today → Registry caption into a claim that it is the Papership Registry.
- Docs in section 11, status only, after implementation.

## 11. Supporting documents to create or update

- This plan, status only, after implementation.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table.
- `docs/plans/README.md`.
- `docs/handover/outstanding-tasks.md`.
- `.cursor/STATE.md` and the UTC-day continuation log.
- `docs/workstreams/20261006-knowledge-layer-p3/manifest.md`.

## 12. Ordered implementation tasks

### T1 — Contract

- Objective: Zod schema for one material candidate. Fields: id, title, kind, class (`source`, `approved`, or `inferred`), locator, object_id. No content, price, or trust score.
- Dependencies: none.
- Files: `packages/contracts/src/entities.ts`, `index.ts`, `test/knowledge-layer.test.ts`.
- Notes: do not add the schema to `ENTITY_SCHEMAS`.
- Validation: `npm test` in `packages/contracts`.
- Completion: not started.

### T2 — Material read

- Objective: `GET /registry/materials` returns pack pointers and visible artifact or attachment objects for the caller tenant. Hidden preferences stay absent even if a later change projects them. Capability ids are absent. Pack class is `inferred`.
- Dependencies: T1.
- Files: `knowledge_layer.py`, `tests/test_registry_materials.py`.
- Notes: insert a pack pointer with the existing object-id and version-id recipe. Do not update `context_versions`. Do not select pack descriptions into a body field beyond the existing short label used as the title. Locator is the pack id.
- Validation: pytest. Founder sees `education-demo`. Another tenant does not see the founder's artifact. `SELECT COUNT(*) FROM registry` stays 43. A capability id is not in `source_id`s. `context_plan_id` stays null. Source has no `maybe_emit`, `tenant-founder`, `principal-founder`, or `_visible_to`.
- Completion: not started.

### T3 — Security review of the read

- Objective: independent review of the T2 diff before the screen is called done. Stop if the verdict is BLOCKED.
- Dependencies: T2.
- Files: `docs/workstreams/20261006-knowledge-layer-p3/security-engineer-subagent/`.
- Notes: the lead may keep writing the screen while the review runs. A BLOCKED verdict stops the phase.
- Validation: handoff on disk, verdict not BLOCKED.
- Completion: not started.

### T4 — Materials screen

- Objective: Knowledge → Materials lists candidates as text. Empty state is a sentence. Not-connected ecosystems are one sentence. Today → Registry still shows the capability catalogue. `#knowledge/materials` does not open an object detail page.
- Dependencies: T2. T3 before this task is called done.
- Files: `papership.js`, `App.jsx`, `screens.jsx`.
- Notes: special-case the hash detail `materials` before the object-id branch. Failed fetch shows the error string. No canvas, no price, no trust number. `BOTTOM_TABS` stays `today`, `work`, `inbox`.
- Validation: static scan. Browser at desktop width and under 768 px: Materials list or empty state, Today → Registry still the catalogue, object detail still opens for a real object id.
- Completion: not started.

### T5 — Gates

- Objective: security review of the full diff, then project-lead reconciliation. Stop if the verdict is BLOCKED.
- Dependencies: T1–T4.
- Files: workstream role folders only.
- Validation: handoffs on disk, verdict not BLOCKED. Do not write the KL-P4 plan in that turn unless the owner asks.
- Completion: not started.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. New tenant-scoped pack pointers and a discovery read. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-36, KL-D9, and this plan fix the scope. No price or marketplace change | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | Materials list, empty state, and the catalogue screen must stay distinct | this plan | `apps/web/src/blueprint2/` | `ui-ux-developer-subagent/handoff.md` | not started |
| software-engineer-subagent | required at implementation | Route, pack pointer, contract, screen | UI charter before T4; T1–T2 may start with the charter | section 10 | `software-engineer-subagent/handoff.md` | not started |
| security-engineer-subagent | required at implementation | Tenant scope, inferred packs, no catalogue leak, no install path | T2 diff, then full diff at T5 | read-only on product; writes the role folder | `security-engineer-subagent/handoff.md` | not started |
| growth-marketing-subagent | skipped | No events emitted. Charges and usage flag stay as they are | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile gates before any KL-P4 plan | security T5 handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p3/<role-id>/`. They are not written in this planning turn. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Pack candidate | pytest | `education-demo` locator present; class `inferred` | not started |
| Tenant isolation | pytest | other tenant does not see the founder's artifact candidate | not started |
| Catalogue unchanged | pytest | `registry` count stays 43; capability ids are not material source ids | not started |
| Private memory excluded | pytest | hidden preference absent | not started |
| No body, price, or score | pytest and contract test | those keys are absent | not started |
| No install | source assertion | material route does not call `install_pack` or `activate_pack` | not started |
| No founder literals, no emit, no `_visible_to` | source assertion | `knowledge_layer.py` | not started |
| `context_plan_id` still null | pytest | the new read does not set it | not started |
| Hash `materials` | browser or static scan | it opens Materials, not object detail | not started |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | not started |
| Browser | desktop and under 768px | Materials list or empty state; Today → Registry still the catalogue | not started |
| Security gate | handoff | not BLOCKED | not started |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: tenant from the caller; 403 for a missing grant; preferences and sessions never appear; capability payloads are not selected; pack pointers store an id, not a file; the executable pack is not activated; no new network calls.
- Reliability: pack insert is idempotent on `(tenant_id, source_kind, source_id)`. A failed insert does not delete the pack catalogue. The route stays out of `run_engine_labs_stage_work`.
- Accessibility: the list is text rows. The empty state and the not-connected sentence are plain language. Keyboard reachability is part of the browser pass.
- Performance: list cap 80. Do not hold the store lock across a Hermes call. Do not fetch external catalogues.

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
| Owner asks to implement KL-P3 | Scope start | KL-P3 | no | this plan section 1 |
| Publisher, skill-host, or MCP credentials | External catalogues are KL-P13 | KL-P13 | no | final checklist when that phase exists |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| Postgres decision | KL-O1 | before a later store move | no | final checklist when that phase exists |

## 18. Rollback and recovery

Stop serving `GET /registry/materials` and remove the Materials sub-view. Pack pointer rows are overlay rows keyed by tenant and pack id. They can remain; they are not the pack catalogue and not the capability catalogue. Do not drop `context_objects`, `PACKS`, or `registry`.

## 19. Acceptance criteria

- An operator can open Knowledge → Materials and see pack or document candidates for their organisation, or a clear empty state, plus the not-connected sentence.
- A candidate locator is a pack id or an existing artifact or attachment object. The native record is unchanged.
- Today → Registry still shows the capability catalogue. Its 43 rows are unchanged and are not material rows.
- The executable pack is not activated. No price, trust score, or context plan is shown.
- `#knowledge/materials` opens Materials. A real object id still opens object detail.
- Security review of the implementation is not BLOCKED.
- KL-P4 is not started.

## 20. Completion evidence

- `GET /registry/materials` and Knowledge → Materials are in the tree.
- Pytest `tests/test_registry_materials.py`, `tests/test_knowledge_layer.py`, and `tests/test_context_graph.py`: 6 passed. Contracts 16 passed. Web static scan 15 passed.
- Browser checked Materials at 1280 px and 390 px. An object id still opens object detail. Today → Registry still shows the capability catalogue.
- Security handoff PASS: `docs/workstreams/20261006-knowledge-layer-p3/security-engineer-subagent/handoff.md`.
- Project lead handoff PASS: `docs/workstreams/20261006-knowledge-layer-p3/project-lead-subagent/handoff.md`.
- Not committed. KL-P4 is not started.

## 21. Deviations and follow-ups

- The first draft of this plan would have listed every visible ContextObject, including capability-registry pointers. KL-P3-N5 excludes those pointers so the catalogue and the Papership Registry stay distinct.
- KL-P2 left `memory_items` able to change a version in place. This plan does not close that.
- KL-SEC-01 and KL-SEC-02 stay open.
- External publisher catalogues wait for KL-P13.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/CANONICAL_CONCEPTS.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p3/manifest.md`, and every required role handoff. Confirm KL-P3 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_4_context_plan_plan.md`.

That plan writes a ContextPlan that cites ContextVersion ids. It does not score trust or impact and does not deploy context. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P4 until that plan is written and the owner asks.
