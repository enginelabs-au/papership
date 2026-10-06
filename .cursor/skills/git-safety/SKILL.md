---
name: git-safety
description: Fail-closed git identity and staged-secret checks for Papership commits and pushes. Use before any git commit or push in this repository.
disable-model-invocation: true
---

# Git safety

## Purpose

Keep Papership git writes on the Cursor anonymous identity and refuse commits that stage secrets or credential-bearing paths.

## When to use

Before `git commit` or `git push` in this repository. Hooks call the same script. Do not bypass it.

## Inputs

- `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`
- The staged index for a commit
- Push stdin lines (`local-ref local-sha remote-ref remote-sha`) for a push

## Tools used

- `scripts/git-safety.mjs`
- `git` (`var`, `diff --cached`, `cat-file`, `log`)

## Procedure

1. Set author and committer to `Cursor Agent <cursoragent@noreply.github.com>`. A GitHub noreply address is also allowed. Never run `git config` to change identity.
2. Before commit, run `node .cursor/skills/git-safety/scripts/git-safety.mjs commit`.
3. The `commit` mode checks identity, then scans staged paths and text for private keys, cloud tokens, and assignment-shaped secrets.
4. The `push` mode reads hook stdin and rejects any commit in the pushed range whose author or committer email is not anonymous.
5. Modes are `identity`, `staged`, `commit`, and `push`.

## Expected outcome

Commits and pushes proceed only with an allowed anonymous email and no staged secret material.

## Validation

`node .cursor/skills/git-safety/scripts/git-safety.mjs` with no mode exits 2 and prints usage. A commit with the anonymous identity and no secret paths exits 0 from `commit` mode.

## Failure modes / cautions

- A private inbox email is refused. Do not work around the refusal.
- Do not pass `--no-verify`.
- The scanner skips binary blobs and files over 1 MB. Large secret files can still match secret-bearing path names.
- Never print secret values while diagnosing a refusal.

## Related files

- `scripts/git-safety.mjs`
- `.cursor/USER.md` standing git identity rule
- `.githooks/` and `.cursor/hooks/policy.mjs`
