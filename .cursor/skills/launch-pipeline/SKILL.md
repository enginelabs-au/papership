---
name: launch-pipeline
description: Launches, resumes, remediates, and closes this repository's complete product delivery pipeline. Use when the user provides a raw idea, requests a new product or major feature, asks to continue an active workstream, invokes `/launch-pipeline`, or needs final release and owner-handoff coordination.
disable-model-invocation: true
---

# Launch Pipeline

## Purpose

Provide the sole user-facing command for the repository's linked strategy, planning, role, implementation, security, growth, delivery, state, memory, and owner-approval system.

## When to use

- Raw idea or new product.
- Major feature, migration, or multi-system change.
- Active phase or workstream resumption.
- Failed-gate remediation and re-verification.
- Release closure and owner handoff.

## Required context

Read in order:

1. Repository-root `AGENTS.md`.
2. `.cursor/AGENTS.md` and its complete per-turn context.
3. `.cursor/instructions/LAUNCH.md`.
4. Every detailed instruction, rule, skill, runbook, plan, workstream artifact, decision, blocker, source file, and test routed by those files.

Run the read-only preflight before selecting a mode:

```bash
node .cursor/skills/launch-pipeline/scripts/preflight.mjs
```

Do not run the mutating bootstrap while in Ask or Plan Mode. After Build approval or an explicit Agent-mode implementation request, bootstrap is the first mutating gate.

## Procedure

1. Run the read-only preflight and inspect its status, state hint, missing artifacts, and suggested next action.
2. Derive as much intake as possible from the invocation text, repository, state, plans, workstreams, and supplied evidence.
3. Select exactly one mode: new idea, major change, resume, remediation, or closure.
4. Use the AskQuestion tool only when a missing strict blocker or consequential owner decision prevents safe routing. Bundle related questions; do not ask about files the Agent can inspect.
5. Present the activation summary defined below. Files are activated automatically; the user is not walked through them one by one.
6. For consequential new work, enter Cursor Plan Mode and wait for Build. Before Build, remain read-only. The reviewable plan is incomplete unless its closing section is `First post-Build action` and includes `bash .cursor/scripts/bootstrap.sh`.
7. After Build or explicit Agent-mode implementation authorization, run that exact bootstrap command as the first mutating action and require a successful exit.
8. Follow the selected mode in `.cursor/instructions/LAUNCH.md`.
9. Keep one parent Agent responsible for orchestration and shared-file materialization.
10. For substantive work, create or resume the task manifest and classify every canonical role as required or skipped.
11. Launch each required custom subagent through direct parent Task delegation in dependency order; do not rely on slash syntax or automatic chaining.
12. Require charter, plan, evidence, and handoff artifacts plus supported gate verdicts.
13. Route failed gates through remediation and independent re-verification.
14. Continue autonomously until a strict blocker or the final owner decision.
15. Respect fail-closed policy and never infer production authority from this skill, a role, or Build approval.

## Activation summary

Before planning or execution, show one concise summary:

```text
Mode:
Preflight:
Objective:
Risk tier and reasons:
Activated instructions:
Required roles:
Skipped roles and reasons:
Expected artifacts:
Owner decisions or approvals:
Next gate:
First post-Build action: bash .cursor/scripts/bootstrap.sh
```

Do not claim a final risk tier or skip verdict before reading `/instructions/ROLES.md`. If evidence is incomplete, label the summary provisional and identify the validation point.

Every pre-Build Cursor plan must close with:

```text
## First post-Build action

After Build, run this command before creating plans, workstreams, role artifacts, or application code:

bash .cursor/scripts/bootstrap.sh

Require a successful exit. Do not skip this step because directories already exist.
```

## Inputs

Derive from the user's message and repository evidence:

- idea or requested change;
- target user, problem, desired outcome, and constraints;
- supplied links, images, files, or other multimodal references;
- existing workstream or phase when resuming;
- explicit authorization boundaries.

Ask only for strict blockers or consequential decisions. Record safe provisional assumptions.

## Tools used

- Native Cursor Agent, Plan Mode, custom subagents, and skills.
- Repository read/write, search, shell, browser, MCP, Figma, analytics, validation, and deployment tools only when routed by the active role and verified in `.cursor/TOOLS.md`.
- `scripts/preflight.mjs` for read-only launch health, state, and materialization checks.
- `scripts/validate-launch.mjs` to verify launch linkage and native config placement.

## Expected outputs

As applicable:

- `docs/blueprints/YYYY-MM-DD_<project_slug>.md`;
- `docs/plans/phase_0_foundations_plan.md` and sequential phase plans;
- `docs/workstreams/<task-id>/manifest.md`;
- activated role charters, plans, evidence, and handoffs;
- remediation and re-verification evidence;
- `docs/plans/final_implementation_checklist.md`;
- `docs/workstreams/<task-id>/delivery/owner-handoff.md`;
- accurate `.cursor/STATE.md`, memory, continuation, blocker, decision, and runbook updates.

## Validation

Run:

```bash
node .cursor/skills/launch-pipeline/scripts/preflight.mjs
node --test .cursor/skills/launch-pipeline/scripts/preflight.test.mjs
node .cursor/skills/launch-pipeline/scripts/validate-launch.mjs
```

After Build or explicit Agent-mode implementation authorization, also run:

```bash
bash .cursor/scripts/bootstrap.sh
```

Before closure, verify all criteria in `.cursor/instructions/LAUNCH.md` and `.cursor/instructions/ROLES.md`. Unsupported or missing evidence is not a pass.

## Failure modes / cautions

- Do not assume automatic role chaining; the parent Agent launches required roles directly.
- Do not run mutating bootstrap in Ask or Plan Mode.
- Do not ask the user to choose or execute individual control-plane files.
- Do not duplicate canonical role bodies or start disconnected role chats.
- Do not treat Build, role identity, or a handoff verdict as production authorization.
- Do not move native root runtime JSON files into `.cursor/config/`.
- Stop at strict blockers, policy denials, or the final owner decision.

## Related files

- `../../README.md`
- `.cursor/instructions/LAUNCH.md`
- `../../AGENTS.md`
- `../../INSTRUCTIONS.md`
- `../../instructions/ROLES.md`
- `../../STATE.md`

## Invocation

Preferred explicit use:

```text
/launch-pipeline

Idea or task: <describe the vision or requested change>
Target user/problem: <known context>
Outcome: <desired result>
Constraints/references: <known constraints and attachments>
```

This skill is explicit-only. Natural-language requests remain governed by repository instructions but do not silently start the complete launch pipeline.
