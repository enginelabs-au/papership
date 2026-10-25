# 2026-10-25 continuation

## Agent Registry pivot (D-39), AR-P0 and AR-P1

- Owner brief (12:49 PM): pivot Papership into the open pipeline for agent materials. Recorded as D-39 (`docs/decisions/2026-10-25-agent-registry-pivot.md`). Supersedes the D-38 wedge and the "not a marketplace" guards; keeps the knowledge loop as resolver retrieval and impact core. Charges stay off; no commit, push or deploy without the owner.
- Built: `services/api/app/registry.py` (publish, immutable versions, yank, search, semver and dependency resolution, install with lockfile, task resolver with budget, deliveries, outcomes, lift, demand gaps), `scripts/papership.py`, `scripts/papership_mcp.py` v2, `registry/seed/*`, Registry tab, `docs/agent-registry/PACKAGE_SPEC.md`, plan `docs/plans/agent-registry/phase_0_foundations_plan.md`, workstream manifest.
- Security review: three rounds by security-engineer-subagent, each CONDITIONAL. Fixed with tests: per-version visibility, FTS visibility join before LIMIT, Unicode/name bypasses, reserved slugs and instruction filenames, credential scan after normalisation (and its quadratic regexes: JWT pattern in `hermes_runs.py`, heading regex in `knowledge_loop.py`), transaction isolation under the store lock, quotas, agent publish/yank/install/outcome limits, control characters in manifests, CLI/MCP no-redirect, https-only, name validation, path containment, per-response random fence around third-party text, MCP schema without `allow_scripts`/`agent_id`/`source`.
- Evidence at close: API 324 passed, worker 71, web scan 15, web build exit 0. No recorded independent PASS yet.
- Mistake caught: first draft overwrote the tracked `services/api/tests/test_registry.py` (capability catalogue test). Restored from git; new tests are in `test_agent_registry.py`. Check `git status` for `M` on test files before writing a new one.
- Lesson: any regex over user-uploaded text needs a linear-time test with adversarial fillers (`ey-`, `a://`, long whitespace), not just `"a" * n`.
- Next: fourth security verdict; browser check of the Registry tab; AR-P2 plan after owner accepts AR-P1.

## Platform foundation (D-40)

- Owner request (1:30 PM): implement `docs/blueprints/papership-cursor-foundation-prompt.md` using the UI mockup zip as a guide. The zip equals `docs/ui-blueprint/blueprint-3`, so no new assets were needed.
- Built: `foundation.py`, `foundation_demo.py`, `test_foundation.py` (41), web `platform/workspace/studio/exchange.jsx`, Registry publish form and install-onto-agent, App tabs, docs under `docs/platform/`, plan, decision.
- Security-engineer review: round 1 CONDITIONAL with 13 findings (Exchange approval only in the router, check-then-write races, approval not bound to the draft, kill switch bypass, denial rolled back with its audit, str.format on author text, missing tenant filters, quota/size, silent policy change, contact hijack, JSON-escaped credential scan, public bundle data, hardening). All fixed with tests. Round 2 found two lows (quota lockout from expired quotes, approved-but-unaccepted approval reusable), fixed afterwards.
- Evidence at close: API 365, worker 71, web scan 16, vite build ok, read-only browser screenshots. Two pre-existing lint errors remain in untouched `components/cc-org-dash` files.
- Lesson: put every authority check in the function that causes the effect and test it by calling that function directly; the router test alone hid the Exchange gap. Also validate focus ids from a URL hash before they reach an API path.
- Mistake caught: first draft of quote acceptance raised inside the transaction, which rolled back the denial audit and expiry. Raise after commit.

## Product shell and feature surfacing (D-40 addendum)

- Feedback: the first mockup-matching shell hid the prompt's features; the zip is a guide only. Rebuilt as a product shell (`shell.jsx`, `live.jsx`, `home.jsx`) and surfaced Agent Passport, reviewable updates, deployment targets, access surfaces, Studio pipeline and version compare (`foundation-ui.jsx`). Backend support in `foundation.py` with 3 new tests.
- Evidence: API 368, web scan 16 (BOTTOM_TABS assertion moved to shell.jsx PRODUCT_TABS), vite build ok, SSR render ok. Browser clicks are policy-blocked, so the signed-in UI was not visually checked.
- Lesson: when the owner supplies a UI reference, map the prompt's feature list to visible entry points first and treat the reference as layout only. Finding the end of a nested JSX block by "first `) : null}`" cut the block short; match on indentation instead.

## 3:14 PM UI tidy
Per-panel toggles with collapsed stubs replace layout presets and top-bar toggles; brand icon restored in the switcher; orb search glyph made crisp. Files: apps/web/src/blueprint2/shell.jsx, switcher.jsx, blueprint2.css. Evidence: vite build, static-scan 16 pass, screenshots.
