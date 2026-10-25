# D-39 — Papership becomes the open pipeline for agent materials (Registry first)

Date: 2026-10-25. Status: accepted by the owner (brief of 2026-10-25). Supersedes the wedge in D-38 and the "not a marketplace" guards in D-36, KL-P3 and KL-P11. Keeps D-38's moat insight and the knowledge loop.

## Decision

Papership is the operating and knowledge layer for AI agents, with two product surfaces and one network between them.

- **Registry.** Open, versioned, installable Agent Materials: skills, context packs, workflows, reference packs, eval packs, template packs, memory packs, personas, policy packs, tool packs, datasets and bundles. Anyone publishes. Public materials are free to browse and install.
- **Workspace.** Where an organisation runs agents: roles, tasks, approvals, memory, permissions, connected tools. It pulls materials from the Registry when an agent has a knowledge gap.
- **Resolver and API.** Given a task and constraints, return the right material set (search, rank, resolve dependencies, pick versions, check compatibility, trim to a token budget) and record what happened. External agents call this directly; this is the commercial layer.

Sentence to build around: *Make the world's expertise installable by agents.* Business model underneath: *give the knowledge away, charge for making it useful at machine scale.*

## What stays, what changes

| Area | Before (D-36, D-38) | Now |
|---|---|---|
| Registry (KL-P3) | Discovery of materials, "Not a marketplace" | A real package registry with third-party publishing, immutable versions, dependencies and install. Marketplace commerce is a later phase, charges still off |
| Wedge | Coding agents on the owner's own stack | Registry supply seeded by Engine Labs, first consumers are the owner's own agents. Domain packs beyond coding come with publishers |
| Knowledge loop (D-38) | Product core | Becomes the resolver's retrieval and impact core. The same delivery, outcome and lift mechanics now attach to package versions |
| Workspace and company-OS surfaces | Demoted to Operations | Unchanged. The Workspace is the runtime that consumes the Registry |
| Authority ladder, KL-D5 untrusted third-party context | Normative | Normative and load-bearing: every published material is untrusted until promoted, and nothing in a package is ever executed by Papership |

## Moat (restated)

Files are copyable. The moat is intelligence about the files: which material version, delivered to which model and runtime for which task, changed the outcome; plus dependency graph, compatibility, trust and publisher reputation. First-party Workspace usage is what makes that data real rather than download counts. The moat claim stays gated as in D-38: only evaluated lift may be cited, never download counts.

## Business model (recorded, not enabled)

Three licence classes as metadata only: `open` (target 80–95% of the ecosystem), `premium` (publisher sets price), `metered` (per invocation). Paid infrastructure is the API (search, resolution, trust checks, conversion, context optimisation, private registries, governance). **Charges stay off.** Publishing, installing and browsing are free. No payment rails are built or connected by this decision (D-17/D-37 gates and the owner's standing instruction apply).

## Guardrails that hold

1. Packages are text. Papership stores and serves them; it never executes package scripts. Any file that is not plain data or prose (see the spec's code-file rule) is stored and flagged, never indexed or delivered as context, and installs only with an explicit `allow_scripts` that a human gives (an agent over MCP cannot).
2. Package versions are immutable and content-addressed (KL-D1). Yank hides a version from search and resolution; it never edits or deletes content.
3. Credential-shaped content and credential-named files are rejected at publish, after Unicode normalisation and invisible-character removal. The scan itself is bounded so an uploaded file cannot stall the API.
4. A publisher namespace is owned by the organisation that first claims it. Only that organisation publishes under it. Reserved namespaces (papership, official, verified, major vendors) cannot be claimed.
5. Private by default. `public` is an explicit choice, applies per version, and agents cannot make it: they publish private drafts, a human publishes publicly.
5a. Third-party text never arrives as operator instructions: files agent tools auto-load as instructions (`AGENTS.md`, `CLAUDE.md` and similar) are rejected, manifest text has no control or invisible characters, and the MCP server fences every material passage with a per-response random delimiter.
6. Trust is `unreviewed` for everything until a human review process exists. `trust=verified` filters return nothing today, by design.
7. Resolution and install cannot widen grants (KL-D6). Installing a material is a Workspace action by an authenticated principal and is audited.

## Deferred by design (recorded, owned by later phases)

Dedicated `registry.publish` and `registry.install` grants and per-principal rate limits (AR-P2; v1 uses `memory.read` and `memory.write`). Takedown, verified publishers, signing and dependency-name squatting controls (AR-P7). Per-version eval before and after, which replaces association-only lift (AR-P4). A hosted multi-writer store; v1 is one SQLite connection.

## Owner-only decisions this opens (not blocking the build)

Commission rates and price floors; payout rail (Stripe Connect or equivalent) and tax treatment; creator terms, licensing and takedown policy; anonymous public browsing and its abuse limits; the public registry domain; the process that grants `verified` trust and trusted-publisher status; whether the open materials are licensed under a default licence.

## Roadmap

`docs/plans/agent-registry/phase_0_foundations_plan.md` holds the AR-P0 to AR-P8 map. Package standard: `docs/agent-registry/PACKAGE_SPEC.md`.
