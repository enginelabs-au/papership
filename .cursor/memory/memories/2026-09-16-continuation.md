# 2026-09-16 continuation


## Rename launch instruction filename

- Owner superseded the old keep-the-misspelled-filename rule.
- `git mv` the launch-pipeline instruction file to `.cursor/instructions/LAUNCH.md` and updated every path/string that pointed at the old name.
- Validation: `node .cursor/skills/launch-pipeline/scripts/preflight.mjs` and launch/config validators after the rename.
