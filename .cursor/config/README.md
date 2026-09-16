# Agent configuration map

## Native files that intentionally remain at `.cursor/` root

Cursor discovers these project files at exact documented locations. They are runtime entrypoints, not miscellaneous JSON, and must not be moved behind undocumented symlinks:

- `/hooks.json` — project lifecycle hooks and fail-closed policy command wiring.
- `/cli.json` — project Cursor CLI permissions.
- `/sandbox.json` — shell filesystem and network sandbox policy.
- `/permissions.json` — desktop Agent auto-run guidance.
- `/mcp.json` — reserved location if repository-scoped MCP servers are added later.

Their supporting implementation belongs in organized subdirectories:

- `/hooks/` — deterministic hook scripts and tests.
- `/scripts/` — bootstrap and configuration validation.
- `/memory/runbooks/` — operational procedures and history.

## Host compatibility settings

- `/config/settings.json` retains optional host/plugin adapter settings.
- `/settings.json` is a compatibility symlink to `/config/settings.json`; it is not relied upon as a native Cursor project-config surface.
- Run `/scripts/bootstrap.sh` to repair the compatibility link when safe.

## Linked operating stack

- Native project entry: repository-root `AGENTS.md`.
- Detailed operating contract: `/AGENTS.md`.
- Practical product entry: `/skills/launch-pipeline/SKILL.md` and `/instructions/LAUNCH.md`.
- Instruction routing: `/INSTRUCTIONS.md` and `/instructions/`.
- Native specialist adapters: `/agents/`.
- Native reusable workflows: `/skills/`.
- Always-applied guidance: `/rules/`.
- Live/durable continuity: `/STATE.md` and `/memory/`.

Portable behavior must not assume a particular model, an authenticated external integration, or support for symlinked native runtime configuration.
