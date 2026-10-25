# Agent Package standard, v1

Status: draft, implemented by `services/api/app/registry.py`. Builds on the open Agent Skills layout (KL-D8: native formats stay canonical). A package is a folder of text files plus one manifest, `agent-package.json`. It is a knowledge module, not an agent.

## Layout

```text
independent-tour-manager/
  agent-package.json     required manifest
  SKILL.md               recommended entry point (Agent Skills compatible)
  DOMAIN_MODEL.md  GLOSSARY.md  RULES.md
  references/  workflows/  schemas/  evals/  templates/
  scripts/               optional; stored and flagged, never executed by Papership
```

## Manifest

```json
{
  "schema": "papership.agent-package/1",
  "name": "engine-labs/independent-tour-manager",
  "version": "2.4.1",
  "kind": "context-pack",
  "description": "Advancing, riders, settlement and show-day procedure for independent tours.",
  "category": "live-events",
  "tags": ["touring", "settlement"],
  "jurisdiction": ["AU"],
  "compatible": ["agent-skills", "claude", "cursor", "codex"],
  "requires": { "engine-labs/australian-business-basics": ">=2.1" },
  "license": { "class": "open", "spdx": "CC-BY-4.0" },
  "visibility": "private"
}
```

| Field | Rule |
|---|---|
| `schema` | exactly `papership.agent-package/1` |
| `name` | `publisher/package`, each part `[a-z0-9][a-z0-9-]{0,38}`. The publisher part is a namespace owned by one organisation |
| `version` | `MAJOR.MINOR.PATCH` numeric. Immutable once published |
| `kind` | `skill`, `context-pack`, `workflow`, `reference-pack`, `eval-pack`, `template-pack`, `memory-pack`, `persona`, `policy-pack`, `tool-pack`, `dataset`, `bundle` |
| `description` | 10 to 400 characters |
| `jurisdiction` | optional ISO-style codes such as `AU`, `AU-NSW`. Empty means applies anywhere. A request for `AU-NSW` matches packages tagged `AU-NSW` or `AU`. A request for `AU` does not match a package tagged only `AU-NSW` |
| `requires` | map of package name to a constraint: `1.2.3`, `>=1.2`, `>1.2.3`, `<=`, `<`, `^1.2.3`, `~1.2.3`, `*` |
| `license.class` | `open` (free), `premium` (publisher price, metadata only), `metered` (per use, metadata only). Charges are off; the optional `pricing` object is stored, never charged |
| `visibility` | `private` (default) or `public`. Applies per version: publishing a public `1.1.0` never exposes a private `1.0.0`. A name cannot go from public back to private |

Names and versions are ASCII only and matched in full (no trailing newline, no non-ASCII digits, no zero-width characters). Manifest strings must not contain control (Cc) or invisible format (Cf) characters, so a description can never carry terminal escape sequences or bidi tricks. Reserved publisher namespaces (`papership`, `official`, `verified`, `registry`, `admin`, `system`, `root` and major vendor names) cannot be claimed.

## Files

- Text only (UTF-8), at most 200 files, 1 MiB total, 200 KiB each, at most 2000 indexed sections.
- Paths are relative, `/` separated, characters `[A-Za-z0-9._-]` per segment, starting with a letter or digit (so no `..` and no hidden segments).
- Content that looks like a credential, or a credential-named file, rejects the whole publish. The scan runs after Unicode normalisation and zero-width removal, and covers URLs with embedded passwords, vendor tokens and `password=` style assignments.
- Files that agent tools auto-load as instructions (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `copilot-instructions.md`) are rejected. Use `SKILL.md`. Third-party text must never arrive as operator instructions (KL-D5).
- Code is anything that is not plain data or prose: a file under `scripts/` or `bin/`, or any extension outside `.md .markdown .txt .json .yaml .yml .csv .tsv .toml .xml`. Code is stored and flagged (`has_scripts`), never indexed or delivered as context, and install requires explicit `allow_scripts`.
- Quotas per organisation: 200 packages, 2000 versions, 200 MiB stored. A dependency graph resolves to at most 50 packages.
- A publish request must declare its size (`Content-Length`) and stay under about 2.5 MB; chunked uploads are refused with 413.
- Agent principals publish private drafts only (a human publishes publicly), may withdraw only what they published, and cannot install for another agent without `org.admin`.

## Known limits (v1)

Single shared SQLite connection (publish, yank and install hold its lock for the whole transaction, so the registry is one writer at a time). Dedicated `registry.publish` and `registry.install` grants and rate limits are AR-P2. Takedown, verified publishers and signing are AR-P7. Search indexes the latest published version and the latest public version of each package.
- `content_hash` is the SHA-256 of the sorted `path` and content pairs. Same name and version with different content is a conflict. Identical content is an idempotent success.

## Semantics

- A version is `published` or `yanked`. Yanked versions stay downloadable by exact version for existing installs but never appear in search or resolution.
- Resolution picks, per package, the highest version satisfying every constraint reached through the dependency graph. There is no backtracking in v1; an unsatisfiable graph returns an explicit conflict.
- `trust` is `unreviewed` for every version today.
- Telemetry attaches to `name@version`: deliveries, outcomes and lift, as defined for the knowledge loop. Lift is an association with the baseline success rate of all resolved deliveries, not a causal before/after. Causal numbers need Eval Packs (AR-P4).
