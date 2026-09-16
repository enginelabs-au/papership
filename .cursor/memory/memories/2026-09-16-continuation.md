# 2026-09-16 continuation


## Papership command room (continue PR #7)

- Paid founder/solo operator seat: `GET /seats/operator` + seeded domain/product entitlements (43 domains); operator template gains command-room grants (still no org.admin).
- Hey Engine → Hey Papership across live UI, API session default, rate card, wake-word decision, capabilities.
- Work → Workflows starts Founder/`engine_labs.loop`; Settings → AI & Agents shows Hermes Host probe box (no write tools; mock when unconfigured).
- Context Music / Quark / portability excluded. Tests: `test_command_room.py` + related 57 passed.


## Engine Labs managed project + loop job (P-009)

- Seeded `proj-engine-labs` (Papership / Engine Labs, bound `enginelabs-au/papership`).
- `/domains/catalogue` now returns all 43 domains. Live write still refused. B08.01 / P01.01 / P04.01 are `configured`, not `working`.
- `POST /projects/{id}/jobs` and `POST /jobs` with `engine_labs.loop` persist a queued job + work item at `request`. No auto-run, no live GitHub open, no Hermes write.
- Tests: `services/api/tests/test_engine_labs_job.py`.
- Quark and portability not in this increment. No Cam decision needed.


## Rename launch instruction filename

- Owner superseded the old keep-the-misspelled-filename rule.
- `git mv` the launch-pipeline instruction file to `.cursor/instructions/LAUNCH.md` and updated every path/string that pointed at the old name.
- Validation: `node .cursor/skills/launch-pipeline/scripts/preflight.mjs` and launch/config validators after the rename.

- 2026-09-16T13:20Z — CI fix on PR #7: `icon-fullbleed.test.mjs` now decodes RGBA PNG in Node (no PIL). Tip `edc0713`. product-ci https://github.com/enginelabs-au/papership/actions/runs/35101017265 success. Command-room work unchanged.

- 2026-09-16T13:35Z — Surfaced A1/A3 in UI on PR #7 tip `9eaae27`: Today command-room cards + hash routes `#settings/plan`, `#work/workflows`, `#today/registry`. CDP verified.

- 2026-09-16T14:16Z — OT-71: copied owner `Papership UI Mockups` into `docs/ui-blueprint/blueprint-3` (HTML + uploads, no `.DS_Store`). Live `/papership` still blueprint-2.
