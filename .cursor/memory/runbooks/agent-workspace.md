# Domain: Agent workspace operating layout

## Purpose

Document the canonical autonomous agent control plane, startup materialization, sequential project planning, instruction routing, and context-preservation layout.

## Canonical paths

- `/AGENTS.md` — operating contract
- `/BOOTSTRAP.md` and `/scripts/bootstrap.sh` — post-Build materialization
- `/skills/launch-pipeline/scripts/preflight.mjs` — read-only launch health check
- `/INSTRUCTIONS.md` and `/instructions/` — instruction routing
- `/instructions/LAUNCH.md` and `/skills/launch-pipeline/SKILL.md` — practical product lifecycle entry
- `/instructions/ROLES.md` and `/agents/` — canonical role behavior and native adapters
- `/STATE.md` — active objective, phase, plan, and instructions
- `/memory/` — durable memory, continuations, blockers, and runbooks
- `/SKILLS.md` and `/skills/` — stable procedures
- `/TOOLS.md` — capability registry
- `/rules/*.mdc` — concise always-applied enforcement
- `docs/blueprints/` — strategy outputs
- `docs/plans/` — sequential phase plans and final checklist
- `docs/decisions/` — material decision records
- `docs/handover/` — operational handovers
- `docs/workstreams/` — task-local role charters, evidence, and handoffs

## Procedure

1. Install the agent configuration directory (for this repository, `.cursor/`) at repository root and keep a concise native `AGENTS.md` at the repository root.
2. Run read-only `node .cursor/skills/launch-pipeline/scripts/preflight.mjs` before selecting a lifecycle mode.
3. After Build or explicit Agent-mode implementation authorization, run `/scripts/bootstrap.sh`. From the configuration root, use `bash scripts/bootstrap.sh`.
4. Confirm root documentation directories and indexes exist.
5. Confirm `/settings.json` links to `config/settings.json`.
6. On every substantive turn, read `/AGENTS.md` first and then its complete core set.
7. Invoke `/launch-pipeline` for a raw idea, major change, resume, remediation, or closure; otherwise route detailed modes through `/INSTRUCTIONS.md`.
8. For substantive role-based work, create `docs/workstreams/<task-id>/manifest.md`, record required/skipped roles, and materialize each activated role's charter and handoff.
9. For new multi-phase projects, create and implement `docs/plans/phase_0_foundations_plan.md`, then generate one next phase plan at a time.
10. Preserve evidence in plans, workstreams, state, continuation logs, blockers, and runbooks according to file roles.

## Validation

- The resolved preflight script reports `READY` or `MATERIALIZATION_REQUIRED`.
- After authorization, the resolved `/scripts/bootstrap.sh` exits successfully.
- Required control files are non-empty.
- Root `docs/` subdirectories exist.
- Root `AGENTS.md` routes into the installed control plane and `docs/workstreams/README.md` explains task artifacts.
- Rules contain valid always-applied frontmatter.
- Native role adapters, policy configuration, and validator checks pass.
- No secret values are stored in the control plane.
