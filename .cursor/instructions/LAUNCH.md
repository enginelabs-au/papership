# Product Pipeline Launcher

## Role and objective

This file is the canonical practical entry point for starting, resuming, and closing product work in this repository. Read-only preflight is its first executable gate; bootstrap is its cornerstone and first mutating gate after Build or explicit Agent-mode implementation authorization. The launcher connects the operating contract, instruction router, adaptive roles, phase plans, skills, tools, memory, state, workstreams, validation, and owner handoff into one parent-agent workflow.

The filename `LAUNCH.md` is retained exactly as requested. Invoke the native project skill as `/launch-pipeline`; do not ask the user to attach the entire `.cursor/` tree manually.

## Activation

Activate for:

- a raw product or business idea;
- a new application, service, feature, integration, migration, or major refactor;
- a request to continue an existing phase or workstream;
- cross-role remediation or re-verification;
- release-readiness, final checklist, or owner-handoff work;
- an explicit `/launch-pipeline` invocation.

Do not activate for a trivial answer or isolated low-risk change when the root router determines that no workstream, specialist, or phase plan is needed.

## Native discovery and routing

Cursor loads or discovers these surfaces without manual attachment:

- repository-root `AGENTS.md` — native project-wide router;
- `/rules/*.mdc` with `alwaysApply: true` — always-on project rules;
- `/agents/*.md` — native custom subagents;
- `/skills/*/SKILL.md` — native discoverable and slash-invokable skills;
- `/hooks.json`, `/cli.json`, `/sandbox.json`, and `/permissions.json` — native runtime and security configuration at required paths.

Files under `/instructions/` are ordinary Markdown, not native auto-loaded instructions. They must be reached through repository-root `AGENTS.md`, `/INSTRUCTIONS.md`, an active instruction entry in `/STATE.md`, or the `/launch-pipeline` skill. This launcher is the explicit bridge.

## Required launch graph

The parent agent remains the sole orchestrator. On activation, connect and read the stack in this order:

1. Repository-root `AGENTS.md`.
2. `/AGENTS.md`.
3. `/USER.md`, `/STATE.md`, `/INSTRUCTIONS.md`, `/SKILLS.md`, `/TOOLS.md`, and `/memory/MEMORY.md`.
4. Run the read-only `/skills/launch-pipeline/scripts/preflight.mjs`.
5. Every active blocker under `/memory/blockers/`.
6. This file.
7. The matched detailed instructions:
   - `/instructions/STRATEGY.md`
   - `/instructions/PROJECT_PLANNING.md`
   - `/instructions/SUBAGENTS.md`
   - `/instructions/ROLES.md`
8. Relevant `/rules/*.mdc`, skills, runbooks, decisions, blueprints, plans, workstream artifacts, source, tests, and configuration.

Do not load every historical memory or every skill body indiscriminately. Use the indexes to load only relevant detail.

## Read-only preflight and bootstrap cornerstone

Every `/launch-pipeline` invocation—new idea, major change, resume, remediation, or closure—must begin with:

```bash
node .cursor/skills/launch-pipeline/scripts/preflight.mjs
```

Preflight reads configuration health, materialization status, live state, and a lifecycle-mode hint without changing repository or external state. A `BLOCKED` preflight stops routing until the reported control-plane defect is repaired. `MATERIALIZATION_REQUIRED` is carried into the launch plan; it does not authorize a write while in Ask or Plan Mode.

After Build approval or an explicit Agent-mode implementation request, read `/BOOTSTRAP.md`, then run the resolved `/scripts/bootstrap.sh` as the first mutating action. Bootstrap must finish successfully before creating plans, workstreams, role artifacts, implementation, or closure changes. It:

- resolves the repository and agent configuration roots;
- creates `docs/blueprints/`, `docs/plans/`, `docs/decisions/`, `docs/handover/`, and `docs/workstreams/`;
- seeds `docs/README.md`, `docs/plans/README.md`, and `docs/workstreams/README.md` only when absent;
- creates required agent, instruction, hook, memory, rule, script, skill, template, and config directories;
- preserves existing non-empty project content;
- repairs the optional settings compatibility link when safe;
- validates required control-plane files and deterministic policy configuration.

If bootstrap fails, stop the launch before downstream mutation, preserve the failure evidence in state/continuation records when possible, repair only the missing or invalid artifact, rerun bootstrap, and continue only after it exits successfully.

## Intake contract

Extract from the user request and repository:

- idea or requested change;
- target user and problem;
- desired outcome and definition of success;
- known constraints, exclusions, references, and multimodal evidence;
- expected platform, environments, integrations, and delivery target when known;
- safety, privacy, security, legal, budget, timing, and production constraints;
- owner decisions already made.

Resolve missing information from evidence first. Make reversible provisional assumptions when safe and record them. Ask only for strict blockers or consequential decisions under `/AGENTS.md`.

Use the AskQuestion tool for required clarification. Bundle related decisions and do not ask the user to select, open, or execute individual control-plane files.

Before Plan or execution, present one activation summary containing:

- selected lifecycle mode;
- preflight status;
- objective and provisional risk classification;
- activated instructions;
- required and skipped roles with reasons;
- expected artifacts;
- owner decisions or approvals;
- next gate.

The parent Agent loads and routes files automatically from that summary.

## Mode selection

Classify the launch as exactly one operating mode.

### New idea or product

Activate Strategy, Project Planning, Subagents, and Roles. Produce an evidence-based blueprint, phase-zero roadmap, task workstream, adaptive role matrix, and owner decision points before application implementation.

### Major feature or migration

Inspect existing product and architecture evidence. Activate Strategy only when product, market, architecture, or launch assumptions need revalidation. Always activate Project Planning and Roles when the change spans phases or domains.

### Resume

Read `/STATE.md`, the active phase plan, the active workstream manifest, the current role charter/plan, the latest predecessor handoff, blockers, and continuation evidence. Resume only at the recorded gate; do not restart discovery or repeat completed work without new evidence.

### Remediation

Read the blocking verdict and finding IDs. Route work to the owning upstream role, invalidate affected downstream gates, implement the bounded remediation, and require independent re-verification before proceeding.

### Closure

Require Project Lead reconciliation, the final implementation checklist when applicable, and `docs/workstreams/<task-id>/delivery/owner-handoff.md`. The owner chooses `APPROVE`, `REQUEST_CHANGES`, or `DO_NOT_PROCEED`.

## Cursor Plan Mode and Build boundary

For a new idea, major feature, migration, or other consequential work:

1. Begin in Cursor Plan Mode.
2. Run only read-only preflight, inspection, intake, classification, and planning.
3. Present a reviewable Cursor plan that includes the repository artifacts to materialize.
4. End that plan with the required first post-Build bootstrap invocation below. A plan that omits it is incomplete.
5. Wait for the user to accept the plan with Build.
6. After Build, run that exact bootstrap command as the first mutation, then materialize the strategy, phase, and workstream documents before application code.

Every pre-Build Cursor plan must include this closing section, even when preflight already reports `READY`:

```text
## First post-Build action

After Build, run this command before creating plans, workstreams, role artifacts, or application code:

bash .cursor/scripts/bootstrap.sh

Require a successful exit. Do not skip this step because directories already exist.
```

Clicking Build approves implementation of the reviewed local plan, including that bootstrap invocation. It does not authorize production deployment, publication, spend, secret access, remote database mutation, risk acceptance, or bypassing any stage gate.

If the user has already explicitly authorized implementation in Agent Mode, still create the required repository planning and role artifacts before code.

## New-product launch sequence

For a loose product vision, execute:

1. **Preflight and audit**
   - Run the read-only preflight.
   - Inspect repository, state, tools, skills, integrations, and prior evidence.
2. **Classification**
   - Assign task ID `YYYYMMDD-<descriptive-kebab-slug>`.
   - Classify risk and impacted domains under `/instructions/ROLES.md`.
   - Ask only for unresolved consequential decisions and present the activation summary.
3. **Plan and Build gate**
   - Produce the reviewable Cursor plan without repository mutation.
   - Close that plan with `First post-Build action` and `bash .cursor/scripts/bootstrap.sh`.
   - Wait for Build unless implementation was already explicitly authorized in Agent Mode.
4. **Bootstrap**
   - Run `/scripts/bootstrap.sh` as the first mutating action and require success.
5. **Workstream**
   - Create `docs/workstreams/<task-id>/manifest.md`.
   - Record all six roles as required or skipped with evidence.
6. **Strategy**
   - Produce `docs/blueprints/YYYY-MM-DD_<project_slug>.md` when Strategy is activated.
7. **Phase zero**
   - Produce `docs/plans/phase_0_foundations_plan.md`.
   - Map the complete expected lifecycle while detailing only the current phase.
8. **Role planning**
   - Materialize each activated role's `charter.md` and `plan.md`.
9. **Role execution**
   - Launch required roles through direct parent Task delegation in dependency order.
   - Materialize `evidence.md` and `handoff.md` before downstream activation.
10. **Implementation phases**
   - Implement and verify one phase at a time.
   - Generate only the next phase plan after the prior phase is complete.
11. **Remediation**
   - Return failed acceptance, quality, accessibility, privacy, reliability, or security gates to the accountable role and replay invalidated gates.
12. **Closure**
    - Produce the final checklist, Project Lead reconciliation, and owner handoff.
    - Stop at the owner decision or at an explicitly authorized, policy-permitted action.

## Adaptive role order

Use only roles marked required in the manifest, preserving this relative order:

1. `product-manager-subagent`
2. `ui-ux-developer-subagent`
3. `software-engineer-subagent`
4. `security-engineer-subagent`
5. `growth-marketing-subagent`
6. `project-lead-subagent`
7. user/operator/owner

The parent agent launches every required role directly. Do not rely on custom-agent descriptions to guarantee automatic chaining. Do not create six disconnected chats. Read-only role outputs are returned to the parent for verification and materialization.

The complete role responsibilities, triggers, skip criteria, ownership, verdicts, and remediation loops live only in `/instructions/ROLES.md`.

## Role invocation contract

Every role brief must include:

- canonical role ID;
- task ID, risk tier, objective, and delegation reason;
- manifest, charter, role plan, predecessor handoff, and active phase plan;
- required core and detailed instruction files;
- exact read/write paths and external-system boundaries;
- non-goals, prohibited actions, and inherited decisions;
- output paths, evidence requirements, gate criteria, and downstream role.

Direct parent Task targets are:

- `product-manager-subagent`
- `ui-ux-developer-subagent`
- `software-engineer-subagent`
- `security-engineer-subagent`
- `growth-marketing-subagent`
- `project-lead-subagent`

The parent selects the matching custom subagent in its Task call and supplies the complete bounded brief. User-facing slash commands and disconnected role chats are not the orchestration mechanism.

## Canonical outputs

Use these locations:

- strategy: `docs/blueprints/`;
- phase plans and final checklist: `docs/plans/`;
- material decisions: `docs/decisions/`;
- task manifest and role artifacts: `docs/workstreams/<task-id>/`;
- owner handoff: `docs/workstreams/<task-id>/delivery/owner-handoff.md`;
- operational handovers: `docs/handover/`;
- live resumable status: `/STATE.md`;
- durable indexes and decisions: `/memory/MEMORY.md`;
- UTC continuation evidence: `/memory/memories/YYYY-MM-DD-continuation.md`;
- blockers and resolution criteria: `/memory/blockers/`;
- stable procedures: `/skills/`;
- exact historical procedures: `/memory/runbooks/`.

Do not duplicate canonical role bodies, long instructions, secret values, or unverified claims across outputs.

## Resume prompt contract

When the user asks to resume, behave as though instructed:

> Read repository-root `AGENTS.md`, the complete core context, `/instructions/LAUNCH.md`, the active phase plan, active workstream manifest, current role charter and plan, latest predecessor handoff, blockers, decisions, and continuation evidence. Verify current repository state against recorded evidence. Resume only from the recorded gate, preserve completed work, route the next required role, and continue until a strict blocker or owner decision.

## Initial idea prompt contract

When the user provides a raw idea, behave as though instructed:

> Act as the parent orchestrator. Follow repository-root `AGENTS.md` and `/instructions/LAUNCH.md`. Treat this as a new product. Run read-only preflight; infer intake from evidence; ask only for unresolved consequential decisions; present the activation summary; and enter Plan Mode without mutation. Close the pre-Build plan with `First post-Build action` and `bash .cursor/scripts/bootstrap.sh`. After Build, run that bootstrap command first. Then activate Strategy, Project Planning, Subagents, and Roles; classify risk and affected domains; create an adaptive required/skipped-role matrix; materialize the blueprint, phase zero, and workstream; invoke required roles through direct parent Task delegation in dependency order; require role charters, plans, evidence, and handoffs; remediate failed gates; and continue autonomously until a strict blocker or final owner decision. Do not perform production, publishing, spend, secret, destructive, or external mutation without explicit policy-permitted authorization.

## Security and production boundary

Role names, prompts, plans, handoffs, and Build approval are not authorization identities.

The launcher must respect:

- `/hooks.json`;
- `/cli.json`;
- `/sandbox.json`;
- `/permissions.json`;
- `.cursorignore`;
- protected branches, required CI/review, provider permissions, scoped credentials, and explicit owner approval.

These native JSON files remain at the `.cursor/` root because Cursor discovers them at exact documented paths. Organize their purpose through `/config/README.md`; do not move them into `/config/` or replace them with undocumented symlink indirection.

## Validation and completion

A launched workflow is complete only when:

- required instruction files were activated and recorded;
- every role is required or skipped with evidence;
- every activated role has charter, plan, evidence, and handoff artifacts;
- all blocking remediation loops are closed and invalidated gates replayed;
- implementation and integrated checks pass or exact limitations are surfaced;
- no high or critical security finding remains open;
- phase plan, state, memory, blockers, and continuation evidence match reality;
- the final checklist contains remaining human-only work;
- Project Lead prepared the owner handoff;
- the owner decision is recorded rather than inferred.
