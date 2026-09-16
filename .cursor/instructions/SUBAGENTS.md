# SUBAGENTS.md

## Role

Use sub-agents as bounded specialists while retaining one lead agent responsible for scope, integration, validation, and final decisions.

## Activation

Use one or more sub-agents when:

- independent investigations can run in parallel
- repository mapping is broad
- research and implementation can be separated
- tests, security, accessibility, performance, or architecture need an independent review
- a strategy blueprint requires separate market, competitor, architecture, or distribution analysis
- a complex plan benefits from adversarial gap analysis

Do not use sub-agents for trivial tasks, tightly coupled edits, or work where coordination costs exceed the benefit.

## Required briefing

Every sub-agent brief must include:

- canonical role ID from `/instructions/ROLES.md`
- task/workstream ID and risk tier
- objective
- why the task is delegated
- required context files to read
- task manifest, role charter, and predecessor handoff paths
- exact paths it may inspect
- exact paths it may edit, or `read-only`
- non-goals and prohibited actions
- assumptions already decided
- required output format
- required validation/evidence
- completion criteria

Every sub-agent must read `/AGENTS.md`, `/INSTRUCTIONS.md`, `/instructions/ROLES.md`, `/instructions/LAUNCH.md` when the assignment belongs to a launched product lifecycle, and the core context required by its canonical role, plus the active plan, task manifest, role charter, predecessor handoff, and instruction files relevant to its assignment. A role starts by verifying or completing its charter and exhaustive plan; delegation is not permission to implement before that plan exists.

## Write ownership

Avoid concurrent writes to the same file. Prefer:

- read-only specialist reports returned to the lead agent
- separate output files under `docs/` with explicit ownership
- disjoint source-file ownership
- one lead-agent integration pass

Sub-agents must not alter shared `STATE.md`, `MEMORY.md`, active blockers, or the active plan unless explicitly assigned sole ownership for that file.

## Canonical specialist roles

Use only these stable role IDs for the primary product pipeline:

- `product-manager-subagent`
- `ui-ux-developer-subagent`
- `software-engineer-subagent`
- `security-engineer-subagent`
- `growth-marketing-subagent`
- `project-lead-subagent`

The detailed responsibilities, activation and skip conditions, allowed actions, outputs, validation gates, and downstream handoffs live in `/instructions/ROLES.md`. Do not recreate role bodies in delegation prompts. Additional narrow specialists may support an activated canonical role, but they must have a bounded objective and may not bypass the canonical role's gate or ownership.

## Adaptive ordering and handoff

- Start only the roles marked `required` in `docs/workstreams/<task-id>/manifest.md`.
- Respect predecessor evidence and dependency order. Independent discovery may run in parallel only when it cannot create conflicting decisions or writes.
- A downstream role may begin only after the predecessor handoff has a supported `PASS` or explicitly bounded `CONDITIONAL` verdict.
- A `BLOCKED` verdict returns to the owning upstream role. Security findings return to `software-engineer-subagent` until independently re-verified.
- Materialize read-only sub-agent output into the assigned role directory before downstream activation.
- Record every skipped canonical role and the reason; silence is not a skip decision.

## Lead-agent integration

After sub-agents finish, the lead agent must:

1. inspect all findings and diffs
2. reject unsupported or duplicated conclusions
3. reconcile conflicts against user intent and repository evidence
4. integrate changes in dependency order
5. run project-wide validation
6. materialize the role handoff using the canonical schema
7. update the workstream manifest, active plan, and state with verified results only
8. route the next required role or close through the project-lead and owner gates

Sub-agent output is evidence, not authority.
