---
plan: phase_8_desktop_bridge
status: complete
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_7_web_consolidation_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p8/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 8: Desktop Bridge

## 1. Objective

Let the Papership desktop app point at a file that stays on the machine. The API stores a title, a digest, and a size. It does not store the path or the bytes.

The owner asked to finish this plan and implement it. The routes and the desktop command are in the tree. Security review is PASS. The phase is complete.

## 2. Relation to project end-state

KL-P8 is the Desktop Bridge in `docs/knowledge-layer/PHASE_ROADMAP.md` and `docs/knowledge-layer/CLIENT_ARCHITECTURE.md`. Private and local files stay on the user machine (`docs/knowledge-layer/DATA_OWNERSHIP.md`). The bridge resolves them under the same grants. The cloud store is not a silent copy.

Company OS "No Phase 8" is the closed Company OS series. It does not forbid this Knowledge Layer phase (D-36). KL-P9 is the phone supervisor. KL-P12 later composes private context with organisation context. This phase does not do either.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P8 on 2026-10-06 while the KL-P7 security review was still open (OT-87). The same precedent is the KL-P5 and KL-P7 plans, which were drafted while the previous review was open. User request wins over "plan only after the previous phase is verified."
- KL-P7 is `complete_conditional`. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p7/security-engineer-subagent/handoff.md`. Registrar DNS is still GoDaddy. The plan for KL-P8 was drafted before that verdict returned.
- KL-P0 through KL-P6 are recorded. KL-P2 through KL-P6 are security PASS. KL-P0 and KL-P1 are `complete_conditional`.
- `apps/desktop/src-tauri` is Tauri 2. It loads `apps/web` at `/papership`. Commands today are `keychain_set`, `keychain_get`, and `keychain_clear`. Capabilities are `core:default` and `shell:allow-open` for `https://*`. There is no filesystem plugin.
- Knowledge objects already have `source_kind` values `memory`, `artifact`, `attachment`, `connection`, `registry`, and `pack`. Versions are content-addressed metadata. They do not hold file bytes.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- `POST /knowledge/local-files` registers a knowledge object with `source_kind` `local_file`. The body is `{ title, digest, byte_size }`. Extra keys, including `path` and `content`, are rejected. `GET /knowledge/local-files/{object_id}` reads that pointer. `byte_size` is stored as a decimal in the existing source locator. That locator is never a path.
- The caller who registers it is the owner. A later read of that object returns the title, digest, size, and version id to that owner only. Another principal, including one with `org.admin` in the same tenant, receives 404. Another organisation receives 404.
- The desktop command reads one user-selected file, returns its digest and size to the webview, and writes the absolute path only into the desktop app's local map, keyed by the object id. The command does not send the bytes to the API.
- In the browser, Knowledge does not open a native file picker. A local-file row, when one exists, says the file stays on this machine. The desktop shell is where the picker runs.
- The existing keychain commands stay. `shell:allow-open` is not widened.

## 5. Non-goals

- No upload of file bytes, no copy of the absolute path into SQLite, and no second knowledge store.
- No recursive directory grant, no read of `$HOME` by default, and no watch of a folder.
- No automatic citation of the local file on a ContextPlan. Plan create rules stay as they are.
- No change to trust verdicts, impact outcomes, or grants. Registering a file does not grant the agent the bytes.
- No revival of `apps/desktop/src` or import of `packages/ui` into `apps/web` (KL-O4).
- No blueprint-3 chrome (KL-O6). No `BOTTOM_TABS` or `RAIL_TABS` change.
- No new API host, no Postgres cutover, and no worker rewrite.
- No domain purchase, no registrar edit, and no change to `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- No usage emission, no charges flip, and no signed-store rebuild (OT-12 stays parked).
- KL-P9 is not started.

## 6. Current-state audit

- `apps/desktop/src-tauri/src/lib.rs` keeps `keychain_set`, `keychain_get`, and `keychain_clear`, and adds `bridge_pick_local_file` and `bridge_bind_local_file`. The service name is `au.enginelabs.desktop`.
- `apps/desktop/src-tauri/capabilities/default.json` allows the core defaults and opening `https://*` URLs. It does not allow a filesystem plugin and it does not grant `dialog:allow-open`.
- `apps/desktop/src-tauri/Cargo.toml` depends on `tauri` 2, `tauri-plugin-dialog` 2, `tauri-plugin-shell` 2, `sha2`, and `keyring` 3. The dialog plugin is used from Rust. The webview is not granted its path-returning command.
- `tauri.conf.json` loads the web app at `http://127.0.0.1:5173/papership` in dev and `apps/web/dist` in a build. CSP already allows `connect-src` to loopback.
- `knowledge_layer.py` registers a `local_file` pointer. The locator is the decimal size. Citation SQL still excludes that kind.
- The Workspace Knowledge list shows "Add a local file" only when the Tauri bridge is present.

## 7. Assumptions, constraints, risks, and decisions

- KL-P8-N1. This phase is Knowledge Layer KL-P8. Company OS "No Phase 8" does not apply.
- KL-P8-N2. The API row is `{ title, digest, byte_size, owner }`. `digest` is sha256 hex of the bytes. `byte_size` is a non-negative integer. The absolute path is not a field.
- KL-P8-N3. The desktop map from object id to path lives in the app data directory on that machine. If the map has no entry, the desktop says the file is not on this machine. It does not ask the API for a path.
- KL-P8-N4. Register requires `memory.write` or `org.admin`. Read requires `memory.read` or `org.admin`, and then the owner check. A miss is 404, including for another principal in the same tenant. The list of knowledge objects omits `local_file` rows for everyone except the owner, so a title does not leak.
- KL-P8-N5. The Rust command accepts one path the user selected in that invocation. It does not accept an arbitrary caller-supplied path from the webview. The capability set does not grant a recursive home read.
- KL-P8-N6. The browser build detects the absence of the Tauri invoke bridge and does not render the picker. Copy for a visible local-file row is "This file stays on this machine."
- KL-P8-N7. Planning proceeded while the KL-P7 review was open because the owner asked. That review later returned PASS. The owner then asked to finish this plan and implement it. The webview capability set does not include `dialog:allow-open`, because that plugin command returns a path to JavaScript. The dialog runs inside the Rust command.
- Risk: a webview message that includes a path would let script read any file the capability allows. The command must take the dialog result inside Rust, not a path string from JavaScript.
- Risk: putting the digest in the tenant store lets the owner prove a file's identity later. It does not let another principal reconstruct the file. The response still must not include bytes.
- Risk: `shell:allow-open` for every `https://*` URL is already present. This phase does not widen it and does not add `http://*`.

## 8. Dependencies

- The existing Tauri host and the Knowledge object tables.
- The same AuthContext tenant and grant checks.
- No new environment variable. No Supabase migration. No Hermes call.
- A Tauri dialog plugin may be added. It is a dependency of this phase, not a new product service.

## 9. Architecture and affected systems

The file stays on disk. The API remembers who owns the pointer and the digest. Only the desktop that created the pointer can open the bytes, and only because the path is in its local map.

```text
User picks a file in the desktop dialog
  -> Rust hashes the bytes and keeps the path locally
  -> Webview POSTs title, digest, byte_size
  -> API stores a local_file version for that owner
Browser on papership.com.au
  -> no picker
  -> owner may see the title and "This file stays on this machine."
  -> no bytes and no path
```

Context plans, trust, and impact do not gain a new write path in this phase.

## 10. Files and paths in scope

- `apps/desktop/src-tauri/src/lib.rs` — one command that opens a dialog, hashes the chosen file, and records the path locally. Keychain commands stay.
- `apps/desktop/src-tauri/Cargo.toml` and `capabilities/default.json` — dialog permission scoped to that command. No recursive filesystem allow.
- `services/api/app/knowledge_layer.py` — register and owner-only read. List filter hides `local_file` from non-owners.
- `services/api/tests/test_local_files.py` — new. Do not import `tests.conftest`.
- `packages/contracts/src/entities.ts` and `index.ts` — a strict local-file schema. Do not add it to `ENTITY_SCHEMAS`.
- `apps/web/src/blueprint2/` — the picker only when the Tauri bridge exists. The browser sentence when a row is visible.
- `docs/knowledge-layer/CLIENT_ARCHITECTURE.md` — one sentence that the bridge stores a digest, not the file.
- Docs listed in section 11.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p8/manifest.md` (this planning turn).
- On implementation: role charters, the client-architecture sentence, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Pointer contract

- Objective: a strict schema and an API register/read that refuse `path` and `content`.
- Dependencies: none.
- Files: `entities.ts`, `index.ts`, `knowledge_layer.py`, `tests/test_local_files.py`.
- Notes: owner is the caller. Digest is 64 hex characters. Size is zero or greater. Another principal in the tenant is 404. The knowledge list omits the row for a non-owner. GET does not insert a second version.
- Validation: pytest. Contracts `npm test`.
- Completion state: passed.

### T2 — Desktop resolve

- Objective: Rust selects one file, returns digest and size, and stores the path only in the app data map.
- Dependencies: T1 for the object id the map uses. The hash function can be tested before the route exists.
- Files: `lib.rs`, `Cargo.toml`, `capabilities/default.json`.
- Notes: JavaScript must not pass the path in. The command does not perform an HTTP upload. Existing keychain commands stay registered.
- Validation: `cargo test` for the digest of a known byte string. Capability file has no recursive home read.
- Completion state: passed. `dialog:allow-open` was not granted.

### T3 — Workspace states

- Objective: the browser has no native picker. The desktop shows the picker. A visible row says the file stays on this machine.
- Dependencies: T1 and T2.
- Files: `apps/web/src/blueprint2/App.jsx` and `screens.jsx` only for that control.
- Notes: do not change `BOTTOM_TABS` or `RAIL_TABS`. Do not add a new rail tab.
- Validation: web static scan. Browser check at desktop and under 768px that the browser build does not show the picker. Desktop launch is required only if a local Tauri dev window is already runnable; otherwise record that the cargo test covered the command and the browser covered the fallback.
- Completion state: browser checked at 1280 and 390. "Add a local file" was absent. A Tauri window was not launched.

### T4 — Security review and close

- Objective: independent read-only review of the path boundary and the owner check, then project-lead reconciliation.
- Dependencies: T3.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P9 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not sign or ship a desktop binary.
- Validation: verdict not BLOCKED.
- Completion state: security PASS. Project lead accepted.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. The desktop gains a user-selected file read. The API stores a digest, not the file. The change is reversible by removing the command and the route. No public origin or auth scheme changes. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-36 and DATA_OWNERSHIP already say private files stay on the machine and are not uploaded by default | — | — | manifest | skipped |
| ui-ux-developer-subagent | required at implementation | One new control and two states: desktop picker, browser sentence with no picker | this plan | `apps/web/src/blueprint2/` for that control | `ui-ux-developer-subagent/handoff.md` | done |
| software-engineer-subagent | required at implementation | API pointer, Rust command, local path map | UI charter for the control copy | section 10 | `software-engineer-subagent/handoff.md` | done |
| security-engineer-subagent | required at implementation | Path must not come from the webview; bytes must not reach the API; non-owner is 404 | T2 and T3 | read-only on product | `security-engineer-subagent/handoff.md` | PASS |
| growth-marketing-subagent | skipped | No event, campaign, price, or acquisition change | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate before any KL-P9 plan | security handoff | `project-lead-subagent/handoff.md` | owner handoff | PASS |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p8/<role-id>/`. The lead may execute engineering. UI specifies the control before that code is called done. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| No path or bytes in the API | pytest | extra keys `path` and `content` are rejected; response has neither | passed |
| Owner read | pytest | registering caller receives title, digest, and size | passed |
| Other principal | pytest | same-tenant non-owner is 404 on the object and does not see it in the list | passed |
| Other organisation | pytest | 404 | passed |
| Missing grant | pytest | unprivileged register is 403 | passed |
| Digest command | cargo test | known bytes produce a stable sha256; command source does not reference an API URL | passed, 2 tests |
| Capability scope | static scan | `default.json` has no recursive home filesystem allow | passed |
| Browser has no picker | browser, desktop and under 768px | existing Knowledge screen stays; no native file dialog | passed at 1280 and 390 |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| No worker or founder literal | source assertion | `knowledge_layer.py` still has no `tenant-founder`, `principal-founder`, `maybe_emit`, or `run_engine_labs_stage_work` | passed |
| Security gate | handoff | not BLOCKED | PASS |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the path stays on the machine. The tenant store holds a digest and a title the user submitted. Non-owners do not receive the row. The webview cannot name an arbitrary path. Preferences and sessions stay owner-only. No new grant class.
- Reliability: a missing local map entry is an empty state, not a fetch of bytes from another machine. Deleting the API row does not delete the user's file.
- Accessibility: the browser sentence is text, not only an icon. The desktop control is a button with a name. The regression check confirms the existing Workspace text still renders.
- Performance: hashing is of one selected file. The knowledge list does not scan the disk.

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
| Sign and ship the desktop binary | OT-12, owner accounts | later | no | `docs/handover/future-tasks.md` |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Remove the `local_file` routes and the Rust command. Leave keychain commands in place. Local path maps can stay on disk; they are not the cloud store. User files on disk are not deleted. `shell:allow-open` stays as it was.

## 19. Acceptance criteria

- An owner can register a local file pointer and read back its title, digest, and size.
- The API response and the stored row contain no path and no file bytes.
- Another principal cannot read or list that object.
- The desktop hashes a user-selected file without sending the bytes to the API, and it keeps the path only in its local map.
- The browser does not open a native file picker.
- Existing keychain commands still exist. Capabilities do not gain a recursive home read.
- Security review is not BLOCKED.
- KL-P9 is not started.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p8/manifest.md`.

Implementation evidence: pytest knowledge-layer suite 18 passed, then `test_local_files.py` 1 passed. Contracts 16 passed. Web static scan 15 passed. `cargo test --lib` 2 passed. Browser at 1280 and 390 did not show "Add a local file". Security review PASS. Project lead accepted. Not committed. KL-P9 is planned and not implemented.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P8 only after KL-P7 is verified. The owner asked while OT-87 was open. KL-P7 was later marked `complete_conditional` with security PASS. The owner then asked to implement this plan.
- The owner asked to plan KL-P9 while this phase's security review was still open. That plan does not close KL-P8.
- Automatic inclusion of a local file in a ContextPlan waits. KL-P12 is the later private-context composition.
- The pre-existing `https://*` shell open stays. Narrowing it is not this phase.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/DATA_OWNERSHIP.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p8/manifest.md`, and every required role handoff. Confirm KL-P8 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_9_mobile_companion_plan.md`.

That plan lets a phone approve or reject knowledge activity through the existing approval API. It must not fork product logic, and store submission stays owner-gated. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P9 until that plan is written and the owner asks. Do not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`.
