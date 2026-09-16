# Project documentation

- `blueprints/` — product, market, architecture, and go-to-market blueprints
- `plans/` — sequential implementation plans and final implementation checklist
- `decisions/` — material architecture and product decision records
- `handover/` — concise operational handovers when needed
- `workstreams/` — task-scoped role manifests, charters, evidence, and handoffs

Agent workflow is defined in root `AGENTS.md`, detailed in `.cursor/AGENTS.md`, and routed through `.cursor/INSTRUCTIONS.md`. Canonical role behavior is defined in `.cursor/instructions/ROLES.md`.

Start or resume the complete product lifecycle with `/launch-pipeline`; its detailed contract is `.cursor/instructions/LAUNCH.md`.

## Engine Labs

- Product intake (canonical requirements): `blueprints/company_agent_system_blueprint.md`
- Strategy blueprint: `blueprints/2026-09-10_engine_labs.md`
- UI specification: `blueprints/ui-blueprint.md`
- Active plan: `plans/phase_6_commercial_delivery_plan.md` (`draft`; D-33; do not implement until asked)
- Completed: `plans/phase_5_company_operations_plan.md` (G7 PASS 2026-09-12)
- Completed: `plans/phase_4_collaboration_connections_plan.md` (G5 PASS 2026-09-12)
- Completed: `plans/phase_3_release_verification_plan.md` (`complete`; G3 PASS-with-residuals 2026-09-11; V18-5 waiting)
- Earlier: `plans/phase_2_development_loop_plan.md`, `plans/phase_1_foundation_plan.md` (`complete_conditional`; G1 2026-09-11; H-6 accepted via D-09)
- Earlier plan: `plans/phase_0_foundations_plan.md` (`complete_conditional`; PL gate 2026-09-10T18:22Z)
- Workstream: `workstreams/20260910-engine-labs-company-os/manifest.md`
- Product documents (phase 0 outputs): `product.md`, `capabilities.md`, `architecture.md`, `blueprints/ui-blueprint.md` (spec) plus `ui-blueprint/` (pinned `8a843bd` app snapshot, captures, `SOURCE.md`), `roadmap.md`, `verification.md`, `policies/`
- Hey Engine (PRD-E.13): persistent assistant control + wake phrase; R1 ships the control and an honest unavailable state; runtime and wake word are later phases
- Decisions: `decisions/` — D-01…D-33 (Phase 6 planning D-33; route D-32; Phase 5 D-31; Phase 4 closeout D-22…D-30)
- Papership product UI: `apps/web` (blueprint-2 at `/papership`; leftover `/cc-org-dash` redirects) on Vercel project `orgos`. Engine Labs marketing stays on `enginelabs.com.au`.
