# Cursor workspace stack

## Start here

For a raw idea, major change, active-workstream resume, remediation, or closure, invoke:

```text
/launch-pipeline
```

The explicit-only native skill at `skills/launch-pipeline/SKILL.md` routes to `instructions/LAUNCH.md`. It runs read-only preflight first, asks only for unresolved consequential decisions, and presents one activation summary. After Build or explicit Agent-mode implementation authorization, `scripts/bootstrap.sh` is the first mutating gate.

Repository-root `AGENTS.md` is the native project-wide entry. It routes every substantive turn into this directory's `AGENTS.md` and core context.

## Core control files

- `AGENTS.md` — detailed operating contract and precedence.
- `BOOTSTRAP.md` — startup/materialization contract.
- `INSTRUCTIONS.md` — detailed instruction registry and activation protocol.
- `USER.md` — durable owner preferences.
- `STATE.md` — current resumable status, plan, workstream, role, and gate.
- `SKILLS.md` — reusable workflow registry.
- `TOOLS.md` — available capability and integration registry.

## Linked workflow directories

- `instructions/` — launch, strategy, planning, subagent, and role contracts.
- `agents/` — native specialist adapters.
- `skills/` — native discoverable and slash-invokable workflows.
- `rules/` — concise always-applied project guidance.
- `memory/` — durable index, continuations, blockers, fixed blockers, and runbooks.
- `templates/` — phase, workstream, role, evidence, handoff, and checklist schemas.
- `scripts/` — bootstrap and configuration validation.
- `hooks/` — deterministic security policy and tests.
- `config/` — configuration map and optional host adapter settings.

## Runtime configuration

These files intentionally remain at `.cursor/` root because Cursor discovers them at exact paths:

- `hooks.json`
- `cli.json`
- `sandbox.json`
- `permissions.json`
- `mcp.json` when added

See `config/README.md` for ownership and placement. Do not move native runtime files into `config/` or rely on undocumented symlink behavior.

`settings.json` is a compatibility symlink to `config/settings.json`; it is not a required native project runtime file.

## Loading model

- Cursor automatically loads repository-root `AGENTS.md`.
- Rules with `alwaysApply: true` are automatically included.
- Cursor discovers `agents/*.md` and `skills/*/SKILL.md`.
- `/launch-pipeline` is explicit-only and does not silently auto-start from ambient requests.
- Files under `instructions/` are loaded through the root router, `INSTRUCTIONS.md`, `STATE.md`, or a native skill such as `/launch-pipeline`.
- The parent Agent materializes read-only role outputs and advances the recorded stage gate.

Do not open roles as disconnected workflows. Every activated role consumes the workstream manifest, charter, plan, predecessor handoff, core context, and canonical role contract before acting.

## Validation

Run:

```bash
node .cursor/skills/launch-pipeline/scripts/preflight.mjs
node --test .cursor/skills/launch-pipeline/scripts/preflight.test.mjs
bash .cursor/scripts/bootstrap.sh
node --test .cursor/hooks/policy.test.mjs
node .cursor/scripts/validate-agent-config.mjs
node .cursor/skills/launch-pipeline/scripts/validate-launch.mjs
```

Launch validation classifies every `.cursor` file as native, routed, indexed, compatibility, or generated history and fails on orphaned control-plane files.

Production authority, secret access, destructive operations, and external mutation remain controlled by hooks, permissions, sandboxing, CI, provider policy, and explicit owner approval.
