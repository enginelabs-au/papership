# 2026-09-16 continuation


## Engine Labs operator loop + domain catalogue (OT-69)

- Branch `cursor/engine-labs-operator-loop-ee2c` from `main` `95b15cb`.
- Added `capability_registry.py` (parse `docs/capabilities.md` → 43 rows + domain catalogue) and `engine_labs.py` (managed projects papership/mcg; create/start/advance jobs through 11 LOOP_STAGES; refuse MCG/Quark/portability/`execute_release`).
- Wired `/engine-labs/*` in `main.py`; store seed from MD; phase5 catalogue refuses CAPABILITY live_write; B08.01 → `configured` / registry 0.1.6-loop.
- UI: Today card + WorkItem start/advance via `papership.js` overlay.
- Validation: `services/api` pytest targeted 28 passed; `apps/web` `node --test tests/static-scan.test.mjs` 14 passed. `uv` missing in cloud env — used python3.12-venv + pip.
- No Cam decision needed. Idle owner bc-67d955c5 not messaged.

## Rename launch instruction filename

- Owner superseded the old keep-the-misspelled-filename rule.
- `git mv` the launch-pipeline instruction file to `.cursor/instructions/LAUNCH.md` and updated every path/string that pointed at the old name.
- Validation: `node .cursor/skills/launch-pipeline/scripts/preflight.mjs` and launch/config validators after the rename.
