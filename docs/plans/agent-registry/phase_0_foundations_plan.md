---
plan: agent_registry_phase_0_foundations
status: implemented_pending_owner_review
created: 2026-10-25
updated: 2026-10-25
owner: lead-agent
source_phase: docs/plans/knowledge-layer/phase_15_ecosystem_scale_plan.md
workstream: docs/workstreams/20261025-agent-registry-pivot/manifest.md
---

# AR-P0: Foundations and whole-project map (Agent Registry pivot)

This is the first plan of the AR series (Agent Registry), the way KL-P0 started the Knowledge Layer series. `docs/plans/phase_0_foundations_plan.md` belongs to the closed Company OS and is not reused.

## 1. Objective

Turn Papership from "a dashboard over a knowledge layer" into the open pipeline for agent materials: publish, version, discover, resolve, install, measure. D-39 is the decision. This plan maps every phase and implements AR-P0 (decision, standard, plan) and AR-P1 (registry core) in the same pass because AR-P1 is the smallest slice that proves the pivot.

## 2. Relation to end-state

End-state: eight layers (build, materials, resolve, run, deploy, distribute, operate, commerce) with the Workspace as the graphical interface. This plan builds layers 2 and 3 on top of layer 4 (the existing Workspace) and leaves 1, 5, 6, 7 (partly present), 8 as later phases.

## 3. Entry criteria and inherited evidence

KL-P0 to KL-P15 complete (security PASS). D-38 knowledge loop built locally: API 204 tests, worker 71, web scan 15, build ok. Existing registry code is `knowledge_layer.py` (`/registry/materials`, pack pointers) and `phase7.py` (hard-coded pack fixtures); neither accepts third-party packages.

## 4. Scope (this pass: AR-P0 and AR-P1)

Package standard; `services/api/app/registry.py`: namespaces, publish, immutable versions, yank, search, semver and dependency resolution, install with lockfile, task resolver with token budget, deliveries, outcomes, per-version lift, demand gaps; routes under `/registry/*`; CLI `scripts/papership.py` (search, resolve, install, publish); MCP tools; web Registry tab; first-party seed packages from this repository's own skills; tests; D-39, spec, roadmap and state updates.

## 5. Non-goals

Payments, payouts, price enforcement, metering invoices, anonymous public access, eval execution, cross-framework conversion beyond file export, deploy or distribution adapters, trusted-publisher verification, hosted multi-user deployment, executing any package script.

## 6. Current-state audit

See section 3. Gaps: no third-party publish path, no package format, no versions beyond internal supersession, no dependency graph, no install into an agent, resolver ignores task text (fixed for repo docs by D-38, not for materials).

## 7. Assumptions, constraints, risks, decisions

Assumptions: text-only packages are enough for v1; the existing `memory.read` and `memory.write` grants gate registry read and publish (a dedicated `registry.publish` grant is AR-P2); SQLite FTS5 is adequate until KL-O1 is settled; the registry shares the existing single store. Risks: namespace squatting (first claim wins; verification is AR-P7); stored-prompt injection through packages (KL-D5: nothing is trusted or executed, content is returned labelled with source, publisher and trust); lexical retrieval quality (baseline, not the end state); lift is correlational. Decisions: D-39 and the guardrails in it.

## 8. Dependencies

`app.auth`, `app.store` (`StoreError`, `_id`, grants, audit), `app.knowledge_loop` (secret patterns, term extraction, budget helpers), SQLite FTS5.

## 9. Architecture

Registry is one module with its own tables (`ar_*`), registered the same way as `knowledge_loop`. The knowledge loop keeps indexing the owner's own repository (private org context). The registry holds public and private published packages. Resolve in AR-P2 will merge both sources into one ContextPlan.

## 10. Files in scope

`services/api/app/registry.py`, `services/api/app/main.py`, `services/api/tests/test_agent_registry.py`, `test_registry_hardening.py`, `test_papership_mcp.py`, `test_papership_cli.py`, `scripts/papership.py`, `scripts/papership_mcp.py`, `registry/seed/**`, `apps/web/src/blueprint2/registry.jsx`, `apps/web/src/blueprint2/App.jsx`, `apps/web/tests/static-scan.test.mjs`, docs under `docs/agent-registry/`, `docs/decisions/`, `docs/knowledge-layer/`.

## 11. Supporting documents

`docs/decisions/2026-10-25-agent-registry-pivot.md`, `docs/agent-registry/PACKAGE_SPEC.md`, `docs/workstreams/20261025-agent-registry-pivot/manifest.md`, updates to `docs/knowledge-layer/PHASE_ROADMAP.md`, `DECISION_LOG.md`, `VISION.md`.

## 12. Phase map

| Phase | Goal | Exit |
|---|---|---|
| AR-P0 | Decision, standard, plan | Docs exist and state is updated |
| AR-P1 | Registry core | Publish, version, yank, search, dependencies, install, resolve, outcomes, lift. API, CLI, MCP, Registry tab, tests green |
| AR-P2 | Resolver as router | Merge registry and private org context into one plan; dedicated `registry.publish` and `registry.install` grants; per-agent policy (auto-install under conditions with approval); rate limits |
| AR-P3 | Framework neutrality | Export to Agent Skills, Cursor rules and plugins, Claude, Codex; import of existing skills; `papership init` |
| AR-P4 | Evaluation | Eval packs executed by the worker under D-17 gates; before/after success per version replaces association-only lift |
| AR-P5 | Metering | Usage events per operation, creator statements, charges still off |
| AR-P6 | Commerce | Premium and metered licences with a payment rail. Needs owner decisions in D-39. Tier 4 |
| AR-P7 | Trust and publishers | Verified publishers, review process, takedown, signing |
| AR-P8 | Pipeline | Deploy and distribute adapters (Cloudflare, AWS, MCP endpoints, directories) behind approvals |

## 13. Ordered tasks (AR-P0, AR-P1)

1. Decision D-39, spec, manifest, this plan. Done.
2. `registry.py` data model, validation, semver, publish, yank, search.
3. Dependency resolution, install, lockfile.
4. Task resolver, deliveries, outcomes, lift, gaps.
5. Routes and registration in `main.py`.
6. Tests: validation and rejection cases, immutability, namespace ownership, tenant visibility, semver, resolution conflicts, resolver filters and budget, lift floor.
7. CLI and MCP tools, with tests.
8. Seed packages from this repository's skills; publish through the CLI against a live local API.
9. Web Registry tab; static-scan update; build.
10. Independent security review; remediate; update plan evidence; state, memory, roadmap.

## 14. Role map

| Role | Status | Gate evidence | Notes |
|---|---|---|---|
| product-manager-subagent | complete (owner brief) | D-39 | |
| software-engineer-subagent | required | tests green | |
| ui-ux-developer-subagent | required | build, scan | |
| security-engineer-subagent | required | review verdict | before any release |
| project-lead-subagent | required | handoff | |
| growth-marketing-subagent | skipped | manifest | |

## 15. Test and validation matrix

| Requirement | Method | Status |
|---|---|---|
| Invalid manifests and unsafe paths rejected | pytest | pass (test_agent_registry, test_registry_hardening) |
| Credential-shaped content rejected | pytest | pass, incl. zero-width, JSON-quoted, URL-embedded, adversarial timing |
| Versions immutable; idempotent republish | pytest | pass |
| Namespace owned by first claimant | pytest | pass, reserved slugs rejected |
| Private not visible to other tenants; public is | pytest | pass, per version |
| Semver, constraints, dependency conflicts | pytest | pass, lock cap 50 |
| Resolver reads the task, honours budget, jurisdiction, age, trust, kind | pytest | pass |
| Outcomes drive lift only after the sample floor | pytest | pass |
| CLI and MCP end to end through the real routes | pytest | pass (8 MCP, 4 CLI) |
| Real seed packages publish, resolve and install on a live API | manual run | pass (pre-hardening run; seeds are text and unaffected by later rules, re-run on next deploy) |
| Web build and scan | npm build, node --test | pass (build exit 0, scan 15/15). Browser interaction not verified: repo policy blocks browser state changes |

## 16. Environment variables

No new values. `PAPERSHIP_API_URL` and `PAPERSHIP_TOKEN` (already named for the MCP server) are reused by the CLI.

## 17. Deferred human actions

Owner-only decisions listed in D-39 (commission, payout rail, creator terms and takedown, anonymous access limits, registry domain, verification process, default licence). None blocks AR-P1.

## 18. Rollback

All new code is additive: new module, new tables, new routes, new tab. Revert the commit; `ar_*` tables are inert.

## 19. Acceptance criteria

All matrix rows pass; the security review has no unresolved high finding; D-39, spec and roadmap agree with the code.

## 20. Completion evidence

- API suite 324 passed (was 270 before this pivot); worker 71 passed; web static scan 15 passed; web build exit 0.
- New: `registry.py`, `scripts/papership.py`, `scripts/papership_mcp.py` v2, `registry/seed/*` (3 Engine Labs packages, private), Registry tab, `PACKAGE_SPEC.md`, D-39.
- Security review (security-engineer-subagent), three rounds. Round 1 CONDITIONAL (visibility across versions, Unicode and name bypasses, instruction-file injection, scan evasion, transaction safety, quotas, client path and redirect safety, MCP prompt-injection framing). Round 2 CONDITIONAL (quadratic JWT pattern, transaction isolation, JSON-quoted secrets, control characters). Round 3 CONDITIONAL (quadratic heading regex, non-transactional delivery and outcome writes, slug race). All high and medium findings from all rounds are fixed with tests. A fourth review has not been run, so there is no recorded independent PASS yet.
- Open low items: stored-bytes quota computed by SUM(LENGTH) on every publish (add a size column); JWT lookbehind misses a token glued to `-`, `_` or a letter; installing a shared dependency overwrites an explicit install's constraint text; the delivery and outcome rows of a concurrent read can still wait on the single SQLite lock.

## 21. Deviations and follow-ups

- Reused the existing `memory.read` and `memory.write` grants instead of new ones (planned for AR-P2).
- The first resolver returned a package on one shared word; added a coverage floor and relative score threshold after seeing it on real seed data.
- The hardening pass changed shared code: JWT pattern in `hermes_runs.py` and the heading regex in `knowledge_loop.py` (both were quadratic). Behaviour for normal text is unchanged; full suite passes.
- A first draft overwrote the existing `services/api/tests/test_registry.py` (capability rows); restored from git and the new tests live in `test_agent_registry.py`.
- Follow-up: obtain a fourth independent security verdict before any release; AR-P2 plan next.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, this plan, the active workstream manifest and role handoffs, all completion evidence, current repository state, active blockers, and D-39. Confirm AR-P1 and every required role gate are implemented and validated. Then generate exactly one exhaustive next phase plan at `docs/plans/agent-registry/phase_2_resolver_router_plan.md`. Derive it from the phase map here and verified current state, preserve unresolved requirements, include all required plan sections and adaptive role decisions, defer non-blocking human actions to the final phase, and do not implement the next phase until the plan is written.
