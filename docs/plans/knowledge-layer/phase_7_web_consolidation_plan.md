---
plan: phase_7_web_consolidation
status: complete_conditional
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_6_knowledge_api_plan.md
workstream: docs/workstreams/20261006-knowledge-layer-p7/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 7: Web and cloud consolidation

## 1. Objective

Serve the existing Workspace from one Papership web origin. The human path stays `/papership`. The intended host is `https://papership.com.au`.

The owner asked to implement this plan on 2026-10-06. Security review is PASS. The phase is `complete_conditional` because registrar DNS still does not serve the Workspace. KL-P8 is drafted and not implemented.

## 2. Relation to project end-state

KL-P7 is the canonical human client in `docs/knowledge-layer/CLIENT_ARCHITECTURE.md` and `docs/knowledge-layer/PHASE_ROADMAP.md`. The Workspace, Papership Registry (Knowledge → Materials), and admin stay the blueprint-2 app. A visitor reaches that app on the Papership domain instead of treating a legacy `*.vercel.app` alias as a second product.

The API remains the record store. This phase does not give Vercel a database. KL-P8 is the Desktop Bridge. Company OS "No Phase 8" does not forbid that later phase.

## 3. Entry criteria and inherited evidence

- The owner asked to plan KL-P7 on 2026-10-06 while the KL-P6 security review was still open (OT-85). The same precedent is the KL-P5 plan, which was drafted while the KL-P4 review was open. User request wins over "plan only after the previous phase is verified."
- KL-P6 is complete. Security verdict is PASS in `docs/workstreams/20261006-knowledge-layer-p6/security-engineer-subagent/handoff.md`. Project lead accepted it. The plan for KL-P7 was drafted before that verdict returned.
- KL-P0 through KL-P5 are recorded. KL-P2 through KL-P5 are security PASS. KL-P0 and KL-P1 are `complete_conditional`.
- `apps/web/src/App.jsx` already redirects `/` to `/papership`. The static scan locks that route. `vercel.json` builds `@papership/web` and rewrites to `index.html`.
- Production today is the Vercel project `papership` (`prj_S74JOIky7KugVTrfu652NhJYOL8l`), git `enginelabs-au/papership`. A legacy alias `orgos-ivory.vercel.app` may still exist. It is not a second project.
- The web client calls `VITE_API_BASE_URL`, defaulting to `http://127.0.0.1:8000`. The client already says the Vercel site has no store of its own.
- KL-O1, KL-O2, and KL-O6 stay open. KL-SEC-01 and KL-SEC-02 stay open.

## 4. Scope

- Attach `papership.com.au` only to the existing Vercel project `papership`. Apex is the origin. If `www.papership.com.au` is attached, it redirects to the apex. It is not a second app.
- Keep the product path `/papership`. `/` on that host redirects there. There is no new marketing page.
- Leave the legacy `*.vercel.app` alias in place if Vercel already has it. Do not advertise it as the product origin.
- Allow the browser origin `https://papership.com.au` on the API only by adding that name to `ENGINE_API_CORS_ORIGINS` together with the origins the process already needs (local Vite, preview, and Tauri). Never replace that list with the public origin alone when the variable is what production and local share.
- Update `docs/knowledge-layer/CLIENT_ARCHITECTURE.md` so the human origin is named.
- Regression-check the local Workspace at `/papership` on desktop and under 768px. After the hostname resolves, load `https://papership.com.au/papership` and confirm the same shell.

## 5. Non-goals

- No edit, redirect, pause, or deploy of `www.enginelabs.com.au` or Vercel project `enginelabs-au-site`.
- No second Vercel project. No domain purchase. `buy_domain` stays unused unless the owner later asks in a separate turn.
- No new API host, no SQLite file on Vercel, and no Postgres cutover. KL-O1 stays open.
- No change to `VITE_API_BASE_URL` or `ENGINE_API_BASE_URL`. A public visitor whose API base is loopback still sees the existing unreachable-API message. That message stays honest.
- No new auth scheme, cookie jar, or `ENGINE_TEST_HOOKS` on the public origin. Founder session behaviour stays as it is.
- No OAuth client-secret change and no copy of Hermes env. Provider-console redirect edits stay a later owner action if a callback must name the new web origin. This phase does not assume that it must.
- No blueprint-3 chrome (KL-O6). No `packages/ui` import into `apps/web` (KL-O4 default). No `BOTTOM_TABS` or `RAIL_TABS` change. No new screen and no copy change.
- No usage emission, no charges flip, and no new grant class.
- No Knowledge API change, no worker rewrite, and no Desktop Bridge.
- KL-P8 is not started.

## 6. Current-state audit

- Route table in `apps/web/src/App.jsx`: `/` and the old dashboard paths navigate to `/papership`.
- `apps/web/public/manifest.json` `start_url` is `/papership`. The service worker shell includes that path.
- `vercel.json` install, build, and output are the web workspace. The rewrite is a single-page fallback, not a second site.
- CORS in `services/api/app/main.py` uses `ENGINE_API_CORS_ORIGINS` when that list is non-empty. An empty list falls back to local Vite, preview, and Tauri origins. Methods and headers are already `*`. This phase must not add `allow_origins=["*"]` or an origin regex.
- `.cursor/memory/runbooks/vercel-papership-single-site.md` already forbids every Vercel project except `papership`.
- Knowledge routes from KL-P6 are unchanged. The public shell calls the same paths the index lists.

## 7. Assumptions, constraints, risks, and decisions

- KL-P7-N1. The human origin is `https://papership.com.au/papership`. D-32 keeps the path. `/` redirects to it. No landing page is added at `/`.
- KL-P7-N2. The only Vercel project this phase may touch is `papership` (`prj_S74JOIky7KugVTrfu652NhJYOL8l`). Confirm that id before any domain write. `enginelabs-au-site` is out of scope even if a tool returns it in an account list.
- KL-P7-N3. DNS registration and nameserver edits that the Vercel API cannot finish are an owner action. The agent may attach a domain the team already holds. The agent does not buy a domain in this phase.
- KL-P7-N4. The public site remains a shell. The store stays on the API process named by the existing base URL. Loopback remains a valid local default. This phase does not invent a cloud database so anonymous visitors can read tenant data.
- KL-P7-N5. CORS gains `https://papership.com.au` only as an explicit origin. A `www` host is added only when that host is actually attached. Wildcard origins are a failed check.
- KL-P7-N6. KL-O6 stays open. Live chrome stays blueprint-2.
- KL-P7-N7. The owner asked to implement on 2026-10-06 after KL-P6 was complete. Registrar DNS remains an owner action.
- Risk: attaching the domain before CORS includes it makes browser calls from that origin fail. Attach and the allowlist move together, or record which one is waiting.
- Risk: setting `ENGINE_API_CORS_ORIGINS` to only the public origin drops the local and Tauri defaults, because a non-empty list replaces the fallback. Implementation must preserve the origins that fallback already names, plus the new one.
- Risk: a public hostname looks like a launch. It is not a charges flip, a usage emitter, or a marketing-site merge.

## 8. Dependencies

- The existing Vercel project `papership` and root `vercel.json`.
- D-32 route `/papership` and the blueprint-2 shell.
- `ENGINE_API_CORS_ORIGINS` when the public origin must call the API.
- No new environment variable. No Supabase migration. No Hermes call.
- Owner DNS only when the domain is not already attachable. That does not block writing this plan.

## 9. Architecture and affected systems

Humans use one origin. The React route table stays the contract. Vercel serves the same `apps/web/dist`. The API stays off Vercel, as the single-site runbook already says.

```text
https://papership.com.au/  -->  /papership  -->  blueprint-2 Workspace
https://orgos-ivory.vercel.app/papership  -->  same deployment, legacy alias
www.enginelabs.com.au  -->  untouched
```

Registry and admin are screens inside that Workspace (Knowledge → Materials, Settings). They do not become separate sites.

## 10. Files and paths in scope

- `vercel.json` — only if a host redirect cannot be expressed by the existing SPA fallback. The expected case is no rewrite change.
- `apps/web/src/App.jsx` — only if the `/` redirect is missing. It is already present. Expected case is no edit.
- `services/api/app/main.py` — only if the CORS fallback must mention the public origin when the env list is empty. Prefer the env list over hardcoding production into the local fallback. Do not hardcode the origin if the env list is the production control.
- `services/api/tests/` — a CORS test that an explicit list can include `https://papership.com.au` and that `*` is not an allowed origin.
- `docs/knowledge-layer/CLIENT_ARCHITECTURE.md` — name the human origin.
- `.cursor/memory/runbooks/vercel-papership-single-site.md` — name `papership.com.au` as the intended alias on project `papership` only.
- Vercel project `papership` domain settings, during implementation, after the project id is confirmed.
- Docs listed in section 11.

## 11. Supporting documents to create or update

- This plan and `docs/workstreams/20261006-knowledge-layer-p7/manifest.md` (this planning turn).
- On implementation: the client-architecture sentence, the runbook alias line, role charters, then handoffs after the security verdict.
- `docs/knowledge-layer/PHASE_ROADMAP.md` plans table, `docs/plans/README.md`, `docs/handover/outstanding-tasks.md`, `.cursor/STATE.md`, and the continuation log.

## 12. Ordered implementation tasks

### T1 — Confirm the route and name the origin

- Objective: keep `/papership` as the only product path and write the origin into the client-architecture doc and the Vercel runbook.
- Dependencies: none.
- Files: `docs/knowledge-layer/CLIENT_ARCHITECTURE.md`, `.cursor/memory/runbooks/vercel-papership-single-site.md`, `apps/web/src/App.jsx` only if the redirect is absent.
- Notes: do not add a landing page. Do not mention `enginelabs-au-site` as a deploy target.
- Validation: web static scan still requires `/` to navigate to `/papership`.
- Completion state: done. Web static scan 15 passed. Client architecture and the Vercel runbook name the origin.

### T2 — Attach the domain on the product project

- Objective: `papership.com.au` is a domain on Vercel project `papership` only.
- Dependencies: T1. The domain must already be holdable by the team. Otherwise stop and leave section 17.
- Files: Vercel project domain settings. No repo file if the dashboard attach needs none.
- Notes: read the project id first. Refuse any other project. Do not call `buy_domain`. Do not print DNS tokens if a tool returns them; record that the owner must finish nameservers.
- Validation: project domain list contains `papership.com.au` and does not show a write to `enginelabs-au-site`.
- Completion state: done. `papership.com.au` and `www.papership.com.au` (308 to the apex) are on `prj_S74JOIky7KugVTrfu652NhJYOL8l`. Vercel reports both verified. Public DNS still uses `ns09.domaincontrol.com` and `ns10.domaincontrol.com`, and the apex does not present the Workspace certificate.

### T3 — CORS allowlist

- Objective: the API can accept the browser origin `https://papership.com.au` without a wildcard and without dropping local or Tauri origins.
- Dependencies: T2, or an explicit note that the allowlist is ready before DNS answers.
- Files: production env `ENGINE_API_CORS_ORIGINS` (name only in docs), plus a unit test around the origin parser or middleware list. Do not store the joined secret-bearing env file in git.
- Notes: methods and headers stay as they are. Credentials stay on. No origin regex.
- Validation: pytest shows the public origin accepted when configured and `*` rejected.
- Completion state: done. `test_cors_origins.py` and `test_oauth.py` 10 passed. The allowlist always keeps local, Tauri, and `https://papership.com.au`, and rejects `*`.

### T4 — Workspace regression

- Objective: local `/papership` still shows the KL-P5 no-plan agent sentences, and the public URL shows the same shell once DNS resolves.
- Dependencies: T1. Public URL check depends on T2.
- Files: none unless a path string broke.
- Notes: desktop and under 768px. Bottom tabs stay Today, Work, Inbox. If DNS does not resolve, record that limit and do not claim the public exit.
- Validation: web static scan, local browser pass, and a public GET when the host answers.
- Completion state: local done. Browser at 1280 and 390 showed the KL-P5 sentences and bottom tabs Today, Work, Inbox. Public GET does not serve the app until registrar DNS changes.

### T5 — Security review and close

- Objective: independent read-only review of the origin, CORS list, and project boundary, then project-lead reconciliation.
- Dependencies: T4, with the public check either passed or recorded as waiting on DNS.
- Files: security and project-lead handoffs.
- Notes: do not write the KL-P8 plan in that turn unless the owner asks. Do not commit unless the owner asks. Do not enable test hooks or charges.
- Validation: verdict not BLOCKED. If DNS is the only remainder, status is `complete_conditional` and section 17 stays the blocker. Otherwise `complete`.
- Completion state: done. Security verdict PASS. Status is `complete_conditional` because registrar DNS remains.

## 13. Adaptive role and delegation map

Risk tier for implementation: Tier 3. A public hostname is attached to the existing product project. Auth and the store do not move. The change is reversible by removing the domain. Data stays in the current tenant store. Planning does not start these roles.

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | D-32 and the KL-P7 roadmap row already fix the path and the domain. No new product behaviour | — | — | manifest | skipped |
| ui-ux-developer-subagent | skipped | No new screen, layout, or copy. The browser check repeats the existing Workspace | — | — | manifest | skipped |
| software-engineer-subagent | required at implementation | Domain attach on project `papership`, CORS origin, docs | this plan | section 10 | `software-engineer-subagent/handoff.md` | lead-executed |
| security-engineer-subagent | required at implementation | Public origin, CORS, and a hard ban on the marketing project | T2 and T3 | read-only on product | `security-engineer-subagent/handoff.md` | complete |
| growth-marketing-subagent | skipped | No event, campaign, price, or acquisition change. The hostname is not a launch measurement plan | — | — | manifest | skipped |
| project-lead-subagent | required at implementation | Reconcile the security gate and any DNS remainder before KL-P8 | security handoff | `project-lead-subagent/handoff.md` | owner handoff | complete |

Charters are written at implementation start under `docs/workstreams/20261006-knowledge-layer-p7/<role-id>/`. The lead may execute engineering. Security reviews the diff and does not grade its own change as the only gate.

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Product path stays `/papership` | static scan | `/` navigates to `/papership`; `start_url` stays `/papership` | passed |
| No marketing-site edit | project check | domain write targets `prj_S74JOIky7KugVTrfu652NhJYOL8l` only | passed |
| Domain attached | Vercel domain list | `papership.com.au` on project `papership`, or a recorded DNS block | passed, DNS still at the registrar |
| CORS | pytest | `https://papership.com.au` allowed when configured; `*` never allowed | passed |
| Local and Tauri origins kept | pytest or env review | fallback origins still present beside the public origin | passed |
| Bottom tabs | static scan | `BOTTOM_TABS` still `today`, `work`, `inbox` | passed |
| Browser | desktop and under 768px | local no-plan agent copy unchanged | passed |
| Public shell | GET the apex `/papership` | same app title when DNS resolves; otherwise the limit is recorded | waiting on registrar DNS |
| Test hooks and charges | config read | `ENGINE_TEST_HOOKS` off on the public deploy; charges flag still off | unchanged; no production API env edit |
| Security gate | handoff | not BLOCKED | passed |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: the marketing project is never selected. CORS is an explicit origin list. Credentials stay limited to those origins. Production test hooks stay off. Session token storage stays as it is today (`sessionStorage`, not a new `localStorage` copy). The public shell does not gain a store of tenant records.
- Reliability: removing the domain returns humans to the legacy alias. The SPA fallback still serves `/papership`. A failed domain attach does not rewrite application routes.
- Accessibility: no new screen. The regression check confirms the existing text still renders.
- Performance: no new asset pipeline. The same Vite build is served from the new host.

## 16. Environment-variable registry

Never include values.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| `ENGINE_API_CORS_ORIGINS` | Browser origins allowed to call the API | API process | add `https://papership.com.au` beside existing local and Tauri origins | existing API env | name only; no wildcard |
| `VITE_API_BASE_URL` | Web client API base | web build | unchanged | existing web env | do not point at a new host |
| `ENGINE_API_BASE_URL` | API's own base | API process | unchanged | existing API env | unchanged |
| `ENGINE_TEST_HOOKS` | Local session mint | API process | must stay off in production | existing flag | unchanged |
| `ENGINE_STORE_PATH` | SQLite file | API process | stays off Vercel | existing API env | unchanged |
| `ENGINE_USAGE_EMIT` | Usage emission | API process | must stay off | existing flag | unchanged |
| `ENGINE_BILLING_CHARGES_ENABLED` | Charges | API process | must stay off | existing flag | unchanged |

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Point `papership.com.au` nameservers or apex records at Vercel | Nameservers are still `ns09.domaincontrol.com` and `ns10.domaincontrol.com`. The agent attached the domain on the product project and did not buy it or edit the registrar | KL-P7 public exit | yes for the public URL; no for the local implementation | `docs/plans/final_implementation_checklist.md` |
| Provider-console OAuth redirect, only if a callback must name the new web origin | Google or Slack console ownership | later, if implementation finds it necessary | no | same checklist |
| Decide KL-O1 Postgres | Store choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Decide KL-O2 worker dispatch | Dispatch choice stays deferred | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Blueprint-3 chrome (KL-O6) | Owner visual decision | later | no | `docs/knowledge-layer/DECISION_LOG.md` |
| Charges flip | OT-08 | later | no | `docs/handover/future-tasks.md` |
| D-25 write/external Hermes | Still unauthorized | later | no | `docs/handover/future-tasks.md` |

## 18. Rollback and recovery

Remove `papership.com.au` from Vercel project `papership`. Leave `enginelabs-au-site` unchanged. Remove `https://papership.com.au` from `ENGINE_API_CORS_ORIGINS` without clearing the local and Tauri origins. The `/papership` route does not need a code restore if it was not edited.

## 19. Acceptance criteria

- `https://papership.com.au/papership` serves the existing Workspace, or the only gap is the owner DNS action recorded in section 17.
- `/` on that host redirects to `/papership`. There is no new marketing page.
- The domain is attached to Vercel project `papership` only. `www.enginelabs.com.au` and `enginelabs-au-site` are unchanged.
- CORS allows the new origin by exact name and still allows local and Tauri origins. `*` is not an allowed origin.
- The Vercel deployment still has no knowledge store. API base URLs are unchanged.
- The local no-plan agent screen still shows the KL-P5 sentences. Bottom tabs stay Today, Work, Inbox.
- Security review is not BLOCKED.
- KL-P8 implementation is not started. The owner already has a draft plan.

## 20. Completion evidence

Planning evidence: this file and `docs/workstreams/20261006-knowledge-layer-p7/manifest.md`.

Implementation evidence, 2026-10-06: domain attached on Vercel project `papership` only. `www` redirects to the apex with 308. CORS allowlist keeps local and Tauri origins, includes `https://papership.com.au`, and rejects `*`. Pytest 10 passed for CORS and OAuth. Web static scan 15 passed. Local browser checked the no-plan agent at 1280 and 390. Security verdict PASS, no findings. Project lead accepted `complete_conditional` because registrar DNS remains. Not committed. KL-P8 remains a draft and is not implemented.

## 21. Deviations and follow-ups

- The sequential rule says to plan KL-P7 only after KL-P6 is verified. The owner asked while OT-85 was open. KL-P6 was later marked complete with security PASS. This plan stays a draft.
- KL-P7 does not host the API. "Cloud" in the roadmap title is the existing Vercel web shell on the Papership domain.
- A visitor to the public origin still depends on `VITE_API_BASE_URL`. This phase does not replace loopback with a new public API.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/CLIENT_ARCHITECTURE.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer-p7/manifest.md`, and every required role handoff. Confirm KL-P7 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_8_desktop_bridge_plan.md`.

That plan reaches knowledge that must stay on the machine through the existing Tauri host. Company OS "No Phase 8" does not apply. The cloud store must not become a silent copy of local files. Include every section of `.cursor/templates/phase-plan-template.md`. Do not implement KL-P8 until that plan is written and the owner asks. Do not edit `www.enginelabs.com.au` or the Vercel project `enginelabs-au-site`.
