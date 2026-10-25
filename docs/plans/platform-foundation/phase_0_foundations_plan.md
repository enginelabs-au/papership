---
plan: platform_foundation_phase_0
status: implemented_pending_owner_review
created: 2026-10-25
updated: 2026-10-25
owner: lead-agent
workstream: docs/workstreams/20261025-platform-foundation/manifest.md
---

# PF-P0: Platform foundation (Workspace, Registry, Studio, Exchange)

## Objective
One integrated, locally usable foundation for four products with module boundaries, shared identity and rules, and one connected demo (Engine Labs enquiry assistant). Input: `docs/blueprints/papership-cursor-foundation-prompt.md`; UI guide `docs/ui-blueprint/blueprint-3`.

## Scope delivered
- Backend `services/api/app/foundation.py` + `foundation_demo.py`: blueprints and immutable versions with resolver lock, fixture evaluation, agents and exact-version installs, tasks, runs, approvals bound to payload hash, activity, Exchange policy/quotes/jobs (simulated), capabilities and integration control matrix, context, seed/reset, product flags.
- Registry: reuse of `registry.py`; added provenance and declared versus tested compatibility on package detail.
- Web: Workspace, Studio, Exchange panels; Registry filters, publish form, install onto a Workspace agent, detail fields; deep links; honest labels.
- Docs in `docs/platform/`.

## Out of scope (stated in the UI and docs)
Real runtime adapters, model calls, email, real CRM, payments, deployment, paid installs, disputes and refunds, production authentication, tested compatibility.

## Acceptance evidence
API 365 tests (41 foundation), worker 71, web scan 16, vite build, browser inspection (read-only), security review rounds with fixes. See `.cursor/STATE.md` D-40.

## Next phase (one only)
PF-P1: one real runtime adapter (observe, invoke, pause, cancel, enforce approval) replacing the demo runtime for one blueprint, with contract tests. Generate its plan only after owner acceptance of PF-P0.
