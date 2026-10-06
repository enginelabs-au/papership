---
plan: phase_9_mobile_companion
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_8_desktop_bridge_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p9/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 9: Mobile Companion

## 1. Objective

Let a phone approve or reject knowledge activity through the existing approval API. The phone loads the same Workspace. It does not fork product logic, and it does not submit the user's store.

The owner asked to implement this plan. The decision route and the Reject button are in the tree. The phase stays open until the security review is recorded and is not BLOCKED.

## 2. Relation to project end-state

KL-P9 is the Mobile Companion in `docs/knowledge-layer/PHASE_ROADMAP.md` and `docs/knowledge-layer/CLIENT_ARCHITECTURE.md`. A phone supervises. Store submission stays owner-gated.

KL-P10 is the lifecycle fabric. This phase does not emit lifecycle events or cite context versions from jobs. Company OS `phase_7_ecosystem_mobile_plan.md` is historical and is not this phase.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P9 on 2026-10-06 while the KL-P8 security review was still open (OT-90). The same precedent is the KL-P5, KL-P7, and KL-P8 plans. User request wins over "plan only after the previous phase is verified."
- KL-P8 later returned security PASS and is `complete`. This plan was drafted before that verdict. It does not implement KL-P9.
- KL-P0 through KL-P6 are recorded. KL-P2 through KL-P6 are security PASS. KL-P0 and KL-P1 are `complete_conditional`. KL-P7 is `complete_conditional` with security PASS. Registrar DNS remains (OT-89).
- `POST /approvals` inserts a row with status `approved`. `GET /approvals` lists that tenant's rows for `org.admin` or both `ledger.read` and `records.read`. The Today → Decisions screen maps those rows. Its Reject button does not call the API.
- `apps/mobile` is a Tauri config spike. It loads `apps/web` at `/papership`. It has no Rust crate.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- `POST /approvals` accepts `decision` of `requested`, `approved`, or `rejected`. A missing `decision` stays `approved`, so current callers keep working. Any other value, and extra keys, are rejected.
- `requested` inserts one row with status `pending`. It does not change the target, a grant, or a file.
- `approved` and `rejected` are human decisions. An agent receives 403. If a pending row in the caller's tenant matches the class, target, and version, that row's status becomes the decision. If none matches and the decision is `approved`, the route inserts an approved row as it does today. If none matches and the decision is `rejected`, the route returns 404.
- Today → Decisions uses the existing Approve and Reject buttons. Reject sends `decision: "rejected"`. Approve sends `decision: "approved"`. The empty sentence stays "Nothing is waiting for your approval."
- The phone shell stays `apps/mobile` loading the same web app. The check is the Workspace at under 768px, hash `#today/decisions`.

## 5. Non-goals

- No second UI, no Capacitor app, and no new screens that copy the Workspace.
- No Rust crate under `apps/mobile`, no home-directory grant, and no file picker on the phone.
- No upload of the SQLite store, no change to `POST /knowledge/local-files`, and no path or file bytes in an approval.
- No new approval class. Existing self-approval refusal stays.
- No decider column and no second approvals table.
- No grant change, no trust or impact change, and no usage emission.
- No `BOTTOM_TABS` or `RAIL_TABS` change. No blueprint-3 chrome (KL-O6).
- No App Store or Play Store submission. No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- No charges flip and no signed-store rebuild.
- KL-P10 is not started. KL-P8 is not closed by this plan.

## 6. Current-state audit

- `store.decide_approval` always inserts status `approved`. It refuses self-approval for release, erasure, billing, and org.admin. The decider needs that approval class or `org.admin`. The table has no decider column.
- `GET /approvals` returns id, class, requester, target, version, and status. The list cap is 80.
- The overlay treats status `pending` as waiting and wires Approve to `POST /approvals`. Reject is an empty function. Nothing in the API inserts `pending`.
- Today subs include Decisions. The hash is `#today/decisions`. Below 768px the subnav stays on the page and the bottom tabs stay Today, Work, and Inbox.
- `apps/mobile/src-tauri/tauri.conf.json` sets `devUrl` to `http://127.0.0.1:5173/papership` and `frontendDist` to `apps/web/dist`. `apps/mobile/package.json` has a toolchain check and no UI package of its own.
- Agents are never approvers (`docs/knowledge-layer/SECURITY_MODEL.md`). That rule is not yet enforced on `POST /approvals`.

## 7. Assumptions, constraints, risks, and decisions

- KL-P9-N1. This phase is Knowledge Layer KL-P9. Company OS phase 7 is a different document.
- KL-P9-N2. The phone and the browser render one Workspace. `apps/mobile` stays a shell around that build.
- KL-P9-N3. `decision` is `requested`, `approved`, or `rejected`. Stored status for a request is `pending`. `voided` stays the version-change state and is not a decision value.
- KL-P9-N4. A request requires `memory.write`, the named approval class, or `org.admin`. A human or an agent may request. Only a human may approve or reject, and that human still needs the approval class or `org.admin`.
- KL-P9-N5. Store submission stays owner-gated. The phone does not gain a route that accepts a store file or a local path.
- KL-P9-N6. Planning proceeded while the KL-P8 review was open because the owner asked. That review later returned PASS. The owner then asked to implement this plan.
- Risk: an agent that can request can fill the decision list. The request still requires a write grant, and it does not approve itself.
- Risk: updating a pending row across tenants would leak a decision. The match includes `tenant_id` from the auth context.
- Risk: a missing `decision` must keep today's insert-approved behavior so existing tests stay true.

## 8. Dependencies

- The existing `approvals` table, `POST /approvals`, and `GET /approvals`.
- The existing Today → Decisions screen and the `apps/mobile` shell.
- No new environment variable.

## 9. Architecture and affected systems

The API remains the source of truth. Web and the mobile shell call the same route. A decision updates one pending row or, for a legacy approve with no pending row, inserts one approved row. Reject does not delete the target object.

```
phone shell (apps/mobile) → same /papership Workspace
  Today → Decisions
    Approve → POST /approvals { decision: "approved" }
    Reject  → POST /approvals { decision: "rejected" }
API writes approvals.status in the caller tenant
```

## 10. Files and paths in scope

- `services/api/app/store.py` — decision status on the existing table.
- `services/api/app/main.py` — `POST /approvals` body.
- `services/api/tests/` — request, human decision, agent refusal, other tenant.
- `packages/contracts/src/entities.ts` — decision values if a request schema is added. The list schema already has `status`.
- `apps/web/src/api/papership.js` — Reject calls the route.
- `apps/web/src/blueprint2/App.jsx` and `screens.jsx` — only if the existing buttons need the decision argument. No new tab.
- `docs/knowledge-layer/CLIENT_ARCHITECTURE.md` — one sentence that the phone uses Today → Decisions.

Out of scope: `apps/mobile/src-tauri` beyond a comment if a path is wrong; `www.enginelabs.com.au`; Vercel project `enginelabs-au-site`; local-file routes; `BOTTOM_TABS`.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p9/manifest.md`.
- On implementation: role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Decision contract

- Objective: `POST /approvals` records `requested`, `approved`, or `rejected` under the rules in section 7.
- Dependencies: none.
- Files: `main.py`, `store.py`, a pytest module, contracts if a body schema is added.
- Notes: missing `decision` still inserts `approved`. Agent approve or reject is 403. Other-tenant pending row is untouched. Extra keys are rejected.
- Validation: pytest, including the existing approval callers.
- Completion state: passed. `test_mobile_approvals.py` covers request, human decision, agent refusal, other tenant, legacy approve, and self-approval.

### T2 — Phone decisions

- Objective: Reject sends `decision: "rejected"`. Approve sends `decision: "approved"`. The 390px Decisions screen shows the result.
- Dependencies: T1.
- Files: `papership.js`, and `App.jsx` or `screens.jsx` only for that call.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Empty copy stays. Do not launch an App Store build.
- Validation: web static scan. Browser at desktop and under 768px on `#today/decisions`. A simulator is required only when `apps/mobile/scripts/check-toolchain.mjs` reports one; otherwise record that the shell loads this same page.
- Completion state: passed at 1280 and 390. Reject recorded `rejected`. The toolchain report says simulator launch is owner-local, so the shell was not booted.

### T3 — Security review and close

- Objective: independent read-only review that an agent cannot decide and a phone cannot submit the store, then project-lead reconciliation.
- Dependencies: T2.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P10 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not close OT-89.
- Validation: verdict not BLOCKED.
- Completion state: security review is in progress.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The change decides who may approve or reject. It is reversible by restoring insert-approved behavior. No public origin or store upload is added. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | PHASE_ROADMAP and CLIENT_ARCHITECTURE already say the phone supervises through the approval API and does not fork product logic | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | Wire the existing Reject button and confirm the narrow Decisions screen | this plan | Today decisions copy only | `ui-ux-developer-subagent/handoff.md` | done |
| software-engineer-subagent | required at implementation | Decision values on `POST /approvals` and the button call | UI charter for the button | section 10 | `software-engineer-subagent/handoff.md` | done, pending security |
| security-engineer-subagent | required at implementation | Agent cannot decide; other tenant cannot; no store upload | T1 and T2 | read-only on product | `security-engineer-subagent/handoff.md` | in progress |
| growth-marketing-subagent | skipped | No store listing, event, price, or campaign | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P10 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | not started |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p9/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Request inserts pending | pytest | `decision: "requested"` returns status `pending` | passed |
| Human approves a pending row | pytest | matching row becomes `approved` and is not duplicated | passed |
| Human rejects a pending row | pytest | matching row becomes `rejected` | passed |
| Reject with no pending row | pytest | 404 | passed |
| Legacy approve | pytest | omitted `decision` still inserts `approved` | passed |
| Agent cannot decide | pytest | agent `approved` or `rejected` is 403 | passed |
| Other tenant | pytest | a decision does not change another tenant's row | passed |
| No store upload | source assertion | no new route accepts a store file or a path | passed |
| Phone screen | browser, desktop and under 768px | `#today/decisions` still renders; Reject is no longer a no-op in source | passed at 1280 and 390 |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: agents are not approvers. Self-approval refusal stays. Tenant comes from the auth context. The body has no path and no file bytes. Preferences and sessions stay owner-only.
- Reliability: a decision that finds no pending row does not invent a rejected target. Legacy approve still inserts.
- Accessibility: Approve and Reject stay named buttons. The empty state stays text.
- Performance: one row is updated. The list cap stays 80.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_STORE_PATH` | SQLite file | API process | already required | local env | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |
| `ENGINE_TEST_HOOKS` | Local session mint | API process | must stay off in production | existing flag | unchanged |

No new variable.

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` at Vercel | Registrar DNS remains from KL-P7 | KL-P7 public exit | no for this plan | `docs/plans/final_implementation_checklist.md` |
| KL-P8 security verdict | Recorded PASS after this plan was drafted | KL-P8 close | no | workstream handoff |
| App Store or Play Store signing | Owner accounts | later | no | `docs/handover/future-tasks.md` |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Restore `POST /approvals` to insert-only `approved`. Pending rows already written can remain; they do not grant access. User files and the SQLite file are not deleted. The mobile shell config stays.

## 19. Acceptance criteria

- A human can approve or reject a pending approval in their tenant.
- An agent cannot approve or reject.
- Another tenant's row is unchanged.
- The phone surface is the existing Decisions screen, and Reject calls the API.
- The API does not accept a store file or a path on this route.
- `apps/mobile` still loads the same web app and gains no native crate.
- Security review is not BLOCKED.
- KL-P10 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p9/manifest.md`.

Implementation evidence: pytest `test_mobile_approvals.py` and `test_knowledge_layer.py` 3 passed. Contracts 16 passed. Web static scan 15 passed. Browser at 1280 rejected a pending row; at 390 the bottom tabs stayed Today, Work, and Inbox. Security review PASS. Project lead accepted. Not committed. KL-P10 was implemented later by a separate owner request and stays on its own review.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P9 only after KL-P8 is verified. The owner asked while OT-90 was open. KL-P8 later returned security PASS and is `complete`.
- The owner asked to plan KL-P10 while this phase's security review was still open. The review later returned PASS. The owner then asked to implement KL-P10 separately. That work does not reopen KL-P9.
- A pending queue does not exist yet. This plan adds `requested` rather than a second table.
- App Store submission stays out of scope. The mobile README already says a missing simulator is acceptable when the toolchain report says so.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p9/manifest.md`, and every required role handoff. Confirm KL-P9 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_10_lifecycle_fabric_plan.md`.

That plan tracks configuration from task through outcome. Lifecycle events cite context versions. Underlying tools stay external. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P10 until that plan is written and the owner asks. Do not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`.
