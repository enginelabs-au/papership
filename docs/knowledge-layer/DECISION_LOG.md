# Decision log

Mission and namespace: [D-36](../decisions/2026-10-06-knowledge-layer-mission.md). Company OS decisions D-01 through D-35 stay in `docs/decisions/`.

## Binding for later phases

### KL-D1 — Immutable context versions

A ContextVersion is immutable and identified by its content. Trust assessments, impact observations, and approvals reference that exact version. This extends `approvals.target_version` and the worker approval hash. Supersession writes a new version. It does not edit the old one.

### KL-D2 — Organisation is the ownership root

Every knowledge entity belongs to an organisation taken from the authenticated principal. New code must not introduce hard-coded `tenant-founder`, `principal-founder`, or `proj-engine-labs` literals. Existing literals stay until the phase that touches those paths removes them.

### KL-D3 — One typed persistence path

Knowledge entities have one Pydantic model and one serializer. Zod in `packages/contracts` mirrors that model. JSON-in-TEXT columns are not a second schema. SQLite remains acceptable through KL-P3. Moving to Postgres is a store swap behind that model, not a rewrite. See KL-O1.

### KL-D4 — Knowledge API is the only client and runtime contract

Web, desktop, mobile, and external agents use the API. The worker's path import of the API store, and the API's subprocess call into the worker for loop stages, are temporary. A Resolver must not run inside the store-wide lock. Replace both with an explicit contract before KL-P4.

### KL-D5 — Third-party context is untrusted

`memory_items` is the ContextObject seed. Classes `source`, `approved`, and `inferred` stay. Untrusted inputs remain untrusted until a human promotes that version (MEM-05, MEM-06).

### KL-D6 — Authority ladder

The ladder in [SECURITY_MODEL.md](SECURITY_MODEL.md) is normative. Retrieval and packs cannot widen grants (AUTH-07, MEM-07, MEM-21).

### KL-D7 — Impact events omit chain-of-thought

Impact and knowledge events reuse `usage.py` rules: dotted names, identifier and enum fields, prohibited content keys. Model chain-of-thought is out of scope for storage and UI.

### KL-D8 — Native formats stay canonical

`AGENTS.md`, Agent Skills, MCP, plugin manifests, and Git remain the source. Papership stores an overlay of metadata and relationships.

### KL-D9 — Two registries

"Capability registry" means the 43-domain catalogue (D-02). "Papership Registry" means Agent Materials discovery and supply (KL-P3). UI copy must not call the catalogue the Papership Registry.

## Open items

| ID | Question | Deadline | Default if still open |
|---|---|---|---|
| KL-O1 | Is Compose Postgres plus `migrations/001_init.sql` the future store, or abandoned? | Before KL-P4 | Stay on SQLite behind KL-D3. Do not port the drifted SQL file as-is |
| KL-O2 | Which dispatch path is canonical: worker poll loop or API subprocess bridge? | Before KL-P4 | Neither is extended. KL-D4 replaces both for knowledge calls |
| KL-O3 | Do `schedules` and `strategy_records` feed the Lifecycle Fabric? | Before KL-P10 | Leave unused. Do not build a second scheduler on them without a consumer |
| KL-O4 | Does `packages/ui` become the web design system or stay retired with `apps/desktop/src`? | Before KL-P1 visual work, else KL-P7 | Live chrome stays blueprint-2 CSS. Do not import `packages/ui` into `apps/web` in KL-P0 or by default in KL-P1 |
| KL-O5 | What is empty `internal/engine-labs/`? | Next hygiene pass | Leave it. Do not put Knowledge Layer code there |
| KL-O6 | When does live chrome move from blueprint-2 to blueprint-3? | Owner, before any visual replacement | KL-P1 maps information architecture inside blueprint-2 |

## Explicitly not decided here

Libraries, table DDL, route paths, queue technology, and component file splits. The implementing phase chooses them from existing conventions (FastAPI, SQLite until KL-O1, Vite React JSX, hash routes, Zod contracts, pytest, `node --test`).
