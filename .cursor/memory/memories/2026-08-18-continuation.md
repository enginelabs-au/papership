# 2026-08-18 continuation

## Production agent role pipeline

- Added a native root `AGENTS.md`, six `.cursor/agents/` adapters, and the canonical `.cursor/instructions/ROLES.md`.
- Adopted adaptive gated routing with task-local artifacts under `docs/workstreams/<task-id>/`; every canonical role is required or skipped with evidence.
- Added role manifest, charter, plan, evidence, handoff, and owner-handoff templates and integrated them with planning, bootstrap, state, memory, skills, tools, rules, and user preferences.
- Added fail-closed hooks, CLI/desktop permissions, sandbox network policy, `.cursorignore`, deterministic policy tests, config validation, and GitHub governance CI.
- Recorded the architecture decision in `docs/decisions/2026-08-18-agent-role-pipeline.md` and external owner controls in `docs/handover/agent-governance-operator-setup.md`.
- Validation evidence: 10 policy tests pass; active config validation passes; shell and JavaScript syntax pass; Markdown links and text whitespace pass; secret-pattern scan has no matches; bootstrap runs repeatedly with identical content hash.
- No commit or push was created. The existing `.cursor/` control plane and this implementation remain untracked until the owner explicitly requests versioning.

## Unified launch entry

- Added `.cursor/instructions/LAUNCH.md` as the complete practical lifecycle contract and `.cursor/skills/launch-pipeline/SKILL.md` as its native auto-discovered and slash-invokable entry.
- Linked launch behavior through Project Planning, Strategy, Subagents, USER, SKILLS, TOOLS, MEMORY, BOOTSTRAP, workspace runbooks, documentation indexes, and live state.
- Added `.cursor/README.md` and expanded `.cursor/config/README.md` so every major control-plane surface has a documented owner and loading path.
- Kept `hooks.json`, `cli.json`, `sandbox.json`, and `permissions.json` at required native `.cursor/` root paths; unsupported relocation or symlink indirection was intentionally rejected.
- Added and passed `validate-launch.mjs`; the full policy/config/launch suite, lints, link checks, syntax checks, native file-placement checks, and bootstrap content-idempotence validation pass.

## Bootstrap-first launch

- Confirmed `.cursor/scripts/bootstrap.sh` idempotently creates `docs/blueprints/`, `docs/plans/`, `docs/decisions/`, `docs/handover/`, and `docs/workstreams/`, then seeds the three documentation indexes only when absent.
- Initially made bootstrap the first executable gate for every `/launch-pipeline` mode; the later minimal-native integration below supersedes this with read-only preflight before the post-Build bootstrap mutation.
- Extended `validate-launch.mjs` to require the generated documentation tree and indexes and to verify the bootstrap source contains every directory, template seed, and control-plane validation link.
- Validation evidence: bootstrap completed successfully, agent configuration validation passed, launch validation passed, all 10 policy tests passed, and edited files have no linter diagnostics.

## Minimal native launch integration

- Made `/launch-pipeline` explicit-only with `disable-model-invocation: true`; natural-language requests no longer silently start the complete lifecycle.
- Added read-only `preflight.mjs`, adaptive mode/state reporting, a bundled AskQuestion intake contract, and a single activation summary so users do not select control-plane files individually.
- Corrected the lifecycle boundary: preflight and planning occur without mutation; bootstrap is the first mutating gate after Build or explicit Agent-mode implementation authorization.
- Replaced role slash-command guidance with direct parent Task delegation to native custom subagents.
- Added seven preflight tests covering state parsing plus new idea, major change, resume, remediation, and closure mode selection.
- Extended launch validation to classify all 77 `.cursor` files as native, routed, indexed, compatibility, or generated history; no orphan remains. Linked previously isolated Supabase/Vercel feedback and reference assets from their parent skills.
- The planned protected `/INSTRUCTIONS.md` change was denied by the fail-closed hook. The owner chose to preserve that boundary, so root-router, new-session bootstrap instructions, protected bootstrap/CLI, and CI changes remain owner-only follow-up rather than weakening governance.
- Final evidence: JavaScript and shell syntax pass; preflight reports `READY`; 7 preflight tests and 10 policy tests pass; configuration and reachability validators pass; two bootstrap runs pass; Git diff checks and edited-file lint diagnostics pass.

## Pre-Build bootstrap suggestion

- Required every `/launch-pipeline` Cursor plan generated before Build to close with a `First post-Build action` section containing `bash .cursor/scripts/bootstrap.sh`.
- Applied the same closing requirement to the activation summary, new-product sequence, and initial-idea prompt contract in `/instructions/LAUNCH.md` and `/skills/launch-pipeline/SKILL.md`.
- Launch validation now fails if those files omit the required heading or command.

## Remaining protected-route alignment

- Closed non-protected gaps: `SKILLS.md` now loads `LAUNCH.md` through `/launch-pipeline`; workspace and bootstrap runbooks are preflight-first; `docs/README.md` names the launch entry.
- Re-attempted `.cursor/INSTRUCTIONS.md`; the fail-closed hook still blocks it.
- Wrote the last physical owner patch at `docs/handover/protected-launch-route-patch.md` covering root `AGENTS.md`, instruction registry, session startup, bootstrap required files, config validator, CI, and CLI allowlist.
- After that owner patch, no further physical `.cursor` edits are required for the stack to route as one system. `/launch-pipeline` already works through native skill discovery.

## Protected launch-route patch applied

- Added owner-run `docs/handover/apply-protected-launch-route-patch.sh` because fail-closed hooks still block direct agent writes.
- The owner authorized applying that patch. The script updated root `AGENTS.md`, `/INSTRUCTIONS.md`, `/AGENTS.md`, the session-start rule, bootstrap, config validator, CI, and CLI allowlist.
- Validation passed: preflight `READY`, 7 preflight tests, 10 policy tests, config validator, launch reachability (77 files), and two bootstrap runs.
- The script is now idempotent. No further physical control-plane edits are required.

## Spent patch-file cleanup

- Removed `docs/handover/protected-launch-route-patch.md`, `docs/handover/apply-protected-launch-route-patch.sh`, and `docs/handover/apply-protected-launch-route-patch.mjs` after the patch landed in the live control-plane files.
- Removed the MEMORY index entry for the spent patch. The applied routing now lives in `AGENTS.md`, `/INSTRUCTIONS.md`, `/AGENTS.md`, the session-start rule, bootstrap, the config validator, CI, and `cli.json`.
