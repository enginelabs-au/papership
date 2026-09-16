# PROJECT_PLANNING.md

## Role

Act as the lead project planner and implementation orchestrator. Convert a project idea or major change into a complete end-state roadmap, then execute it one verified phase at a time.

## Activation

Activate for:

- a new application, service, package, or product
- a major feature spanning multiple components
- a migration, platform change, or substantial refactor
- work involving several integrations, environments, or deployment steps
- any task where a single short implementation plan would hide material dependencies

Do not activate for a small isolated fix that can be safely implemented and verified in one turn.

## Required context

Before planning:

- read the core agent files required by `AGENTS.md`
- read `/instructions/LAUNCH.md` and preserve its launch/resume/closure mode
- run the bootstrap
- inspect the repository, configuration, tests, documentation, and current deployment/integration state
- read relevant prior plans, blueprints, decisions, blockers, runbooks, and skills
- activate `STRATEGY.md` first when product or market discovery is material
- activate `/instructions/ROLES.md` and create a workstream manifest when specialist ownership or stage gates are material

## Phase 0: foundations and whole-project map

Create `docs/plans/phase_0_foundations_plan.md` using `/templates/phase-plan-template.md`.

Phase 0 must be exhaustive at the project level while remaining implementation-specific. It must include:

- user intent, problem statement, outcomes, non-goals, and definition of done
- current-state repository audit
- assumptions, constraints, risks, and unresolved decisions
- target architecture and component boundaries
- data, API, integration, security, privacy, accessibility, testing, observability, deployment, rollback, and documentation requirements as applicable
- the full phase map from phase 0 through final release/closure
- dependencies between phases
- supporting documents to create, with exact paths
- environment-variable registry containing names, purpose, scope, required phase, and source label; never secret values
- a deferred human-action queue
- phase-0 tasks in dependency order, with file targets and verification evidence
- an adaptive role matrix naming required and skipped roles, reasons, ownership, predecessor handoffs, and stage gates
- explicit phase-0 acceptance criteria
- an exact next-plan generation prompt

Phase 0 may implement foundational code and configuration after the plan is written, but must not prematurely implement later-phase features unless required to validate the foundation.

## Sequential planning loop

After a phase is fully implemented and verified:

1. Re-audit the repository and completed plan.
2. Update the completed plan with actual evidence, deviations, and remaining risks.
3. Confirm every required role gate in the active workstream has a supported verdict and every skipped role has a current rationale.
4. Update `STATE.md`, the continuation log, and any relevant decisions/runbooks.
5. Execute the plan's `Next Plan Generation Prompt`.
6. Create exactly one next phase plan named `docs/plans/phase_<N>_<descriptive_slug>_plan.md`.
7. Ensure the new plan derives from the original phase map but adapts to verified reality.
8. Implement and verify that phase before creating another.

Do not generate a pile of speculative detailed phase plans at project start. Phase 0 contains the roadmap; later plans are created just in time.

## Required sections in every phase plan

- metadata and status
- objective and relation to the end-state
- entry criteria and inherited evidence
- scope and non-goals
- assumptions and decisions
- dependencies
- files and systems affected
- supporting documents to create/update
- ordered implementation tasks
- adaptive role matrix, sub-agent delegation, ownership boundaries, predecessor handoffs, and gate status
- tests and validation matrix
- security/privacy/reliability checks
- environment-variable changes using names only
- deferred human actions
- rollback/recovery approach
- acceptance criteria
- completion evidence
- deviations and follow-ups
- next-plan generation prompt, or final-checklist instruction for the last phase

## Next-plan generation prompt standard

Every non-final phase plan must end with a prompt equivalent to:

> Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, the original `docs/plans/phase_0_foundations_plan.md`, this completed phase plan, the active workstream manifest and role handoffs, all completion evidence, current repository state, active blockers, and relevant decisions. Confirm this phase and every required role gate are fully implemented and validated. Then generate exactly one exhaustive next phase plan at `docs/plans/phase_<NEXT_NUMBER>_<DESCRIPTIVE_SLUG>_plan.md`. Derive it from the phase-0 roadmap and verified current state, preserve unresolved requirements, include all required plan sections and adaptive role decisions, defer non-blocking human actions to the final phase, and do not implement the next phase until the plan is written.

Replace placeholders with the exact next phase number and expected purpose where known.

## Final phase and closure

The final phase must integrate, harden, validate, document, and prepare production operation. After all agent-executable work is complete, create `docs/plans/final_implementation_checklist.md` from `/templates/final-implementation-checklist-template.md`.

The checklist must contain only:

- outstanding defects or unverified items
- required environment-variable names, source/provider, destination, and whether a value is still missing
- credentials, permissions, billing, or account actions only the user can perform
- production deployment, DNS, domain, OAuth, database, webhook, API, or provider dashboard actions still required
- final smoke tests and acceptance checks after those actions
- exact evidence that all other planned work is complete

Do not repeat completed implementation history in the final checklist.

## User interruption policy

Do not ask for non-blocking information during early phases. Make reversible assumptions and record them. Ask immediately only for strict blockers or consequential decisions defined in `AGENTS.md`.
