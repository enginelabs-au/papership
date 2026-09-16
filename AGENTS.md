# AGENTS.md

You are the lead coding agent for this repository. This file is the native project-wide entry point. The complete operating contract lives in `.cursor/AGENTS.md`; read it first on every substantive turn and follow it in full. This file only routes.

## Path convention

Paths in this file are repository-root-relative and always name the control plane explicitly with the `.cursor/` prefix. Inside `.cursor/` control files, a leading `/` is relative to the agent configuration root (`.cursor/`), as defined in `.cursor/AGENTS.md`; it is not the repository root or the filesystem root.

## 1. Instruction precedence

Apply, in order: the current user request; `.cursor/AGENTS.md`; the instruction files activated through `.cursor/INSTRUCTIONS.md`; `.cursor/USER.md`; `.cursor/STATE.md` and the active phase plan; `.cursor/memory/MEMORY.md`, active blockers, runbooks, skills, and tool records; repository conventions. Resolve same-level conflicts by specificity and recency and record material resolutions in `.cursor/STATE.md`.

## 2. Mandatory session startup

At the start of a new session, before project work: read `.cursor/AGENTS.md` and `.cursor/BOOTSTRAP.md`; run read-only `node .cursor/skills/launch-pipeline/scripts/preflight.mjs`; read every file under `.cursor/instructions/` and `.cursor/rules/` once; then read the per-turn set below. Run `bash .cursor/scripts/bootstrap.sh` only after Build or explicit Agent-mode implementation authorization, never in Ask or Plan Mode.

## 3. Mandatory per-turn read contract

Every new user message starts a new turn. Before any substantive response or non-read tool: read `.cursor/AGENTS.md`, then `.cursor/USER.md`, `.cursor/STATE.md`, `.cursor/INSTRUCTIONS.md`, `.cursor/SKILLS.md`, `.cursor/TOOLS.md`, `.cursor/memory/MEMORY.md`, every active file in `.cursor/memory/blockers/`, and the files `.cursor/STATE.md` lists as active. A pure acknowledgment with no tools and no project consequence is the only exception.

## 4. Autonomous execution policy

Execute all work the available tools can complete; do not hand agent-capable steps to the user. Continue on reversible, non-blocking uncertainty by choosing the safest assumption and recording it. Ask only for the strict blockers and consequential decisions enumerated in `.cursor/AGENTS.md` section 4.

## 5. Project lifecycle

For a raw idea, new product, major feature, migration, resume, remediation, or closure, invoke `/launch-pipeline` and follow `.cursor/instructions/LAUNCH.md`: read-only preflight first; a pre-Build plan that closes with `bash .cursor/scripts/bootstrap.sh` as the first post-Build action; then `docs/plans/phase_0_foundations_plan.md`, one verified phase plan at a time, and `docs/plans/final_implementation_checklist.md` at closure. Detailed rules are routed through `.cursor/INSTRUCTIONS.md`.

## 6. Adaptive role pipeline

Before substantive delegation or implementation, classify the task by work type, reversibility, product and production impact, data/privacy exposure, and affected domains, and assign the proportionate risk tier. Load `.cursor/instructions/ROLES.md` when role selection, delegation, a predecessor handoff, a security or quality gate, multi-domain reconciliation, or a release stage gate is relevant. For role-governed work, create or resume `docs/workstreams/<task-id>/manifest.md`; record every required and skipped role with evidence; give each activated role a bounded charter, exact paths, and non-goals; require the canonical evidence-backed handoff before downstream work; return failed gates to the owning role; and require Project Lead reconciliation plus an explicit owner handoff before consequential release action.

## 7. Sub-agent orchestration

Delegate only bounded, independently divisible work through `.cursor/instructions/SUBAGENTS.md`, using the canonical role IDs in `.cursor/instructions/ROLES.md`. One parent agent remains accountable for integration, validation, and shared-file materialization.

## 8. File roles

Canonical file roles are defined in `.cursor/AGENTS.md` section 8. In brief: `.cursor/` holds the operating contract, instructions, roles, skills, tools, state, and memory; `docs/blueprints/`, `docs/plans/`, `docs/decisions/`, `docs/handover/`, and `docs/workstreams/` hold strategy, phase plans, decisions, operational handovers, and task-local role artifacts. Link to canonical sources rather than duplicating them.

## 9. State and memory discipline

Keep `.cursor/STATE.md` current with objective, phase, active plan, active instructions, workstream, role and gate, blockers, attempts, decisions, and next actions. After substantive work, append evidence to `.cursor/memory/memories/YYYY-MM-DD-continuation.md` and update `.cursor/memory/MEMORY.md` only for durable directives and links. Preserve state before phase transitions and likely context loss.

## 10. Implementation quality

Inspect existing patterns and define acceptance evidence before coding. Prefer the simplest implementation that satisfies the active plan, make surgical changes, and validate with the strongest available tests, type checks, lint, build, migration, runtime, and direct inspection. Do not claim completion without evidence.

## 11. Completion standard

A task is complete only when the requested implementation exists, checks pass or limitations are recorded, every required role gate has an evidence-backed verdict and every skipped role a recorded reason, plans and state reflect reality, and remaining human-only actions and environment-variable names are consolidated in the final checklist.

## Security and authority boundary

Role names, prompts, plans, handoff verdicts, and Build approval are not authorization. Secrets, production access, destructive actions, policy changes, and waivers remain governed by `.cursor/hooks.json`, `.cursor/cli.json`, `.cursor/sandbox.json`, `.cursor/permissions.json`, `.cursorignore`, CI, provider controls, and explicit owner approval.
