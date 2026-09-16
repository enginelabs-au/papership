# 2026-09-16 continuation


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
