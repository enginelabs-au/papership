# D-38 — What Papership is, its wedge, its moat, and what is demoted

Date: 2026-10-14. Status: accepted by the owner (wedge, demotion and build order chosen 2026-10-14). Supersedes nothing; narrows D-36.

## One paragraph

Papership is the service an agent calls to learn what it needs to know for a task. The agent describes the task. Papership returns a small, current, attributable context pack (a few passages, each with its file and heading, inside a token budget), says plainly when nothing relevant is documented, and then learns from the outcome which context helped and which misled. It is used through an API and an MCP server. The web app is a window onto that loop and a place to approve things; it is not the product.

## Wedge

Coding agents, starting with the owner's own stack (Hermes, Cursor, Claude Code) on the owner's own repositories. One user, one repo, a task every day, and a pass/fail signal every day (CI, PR merge, human verdict). Nothing else gives a faster, more honest feedback loop. Company operations, other agent types and other organisations come after the loop demonstrably improves coding-agent outcomes.

## Moat

Retrieval is a commodity. A graph, a registry and trust labels are commodities. The only asset a competitor cannot copy is the accumulated record of which context, delivered to which kind of agent (task, model, runtime), changed the outcome. That record is the impact graph, and the lift it produces is what ranks future context. If the loop does not measurably raise task success over the baseline, Papership has no moat and this document should be revisited.

Moat test, evaluated from `GET /knowledge/loop`:

1. Deliveries with an outcome: at least 50 before judging.
2. Per-passage lift is shown only from `min_samples` (3) outcomes and is reported against the baseline success rate of all resolved deliveries.
3. The claim "Papership improves agent outcomes" is allowed only when ranking with lift beats ranking without lift on held-out deliveries. This comparison is not built yet (see Open).

## The loop (implemented 2026-10-14)

ingest (`POST /knowledge/ingest`) → resolve (`POST /knowledge/resolve`, MCP `resolve_context`) → deliver (a pack plus `delivery_id`) → measure (`POST /knowledge/outcomes`, MCP `report_outcome`, sources `ci`, `pr`, `human`, `agent`) → learn (per-passage lift multiplies the lexical score; `GET /knowledge/loop`). Code: `services/api/app/knowledge_loop.py`; MCP: `scripts/papership_mcp.py`; UI: the Loop tab.

Honest limits of the first version: lexical (BM25) retrieval only, no embeddings; outcomes are recorded by whoever calls the API, so CI and PR outcomes are not yet captured automatically; lift is correlational (a passage that was served on easy tasks looks good), not causal; the repository index is a local, tenant-scoped content copy (see Data policy amendment).

## Demoted to Operations (kept, working, not the product)

Work ledger, Inbox, People, Data, Files, Integrations, Telegram and WhatsApp messaging, Hermes inventory and runs, seats, commercial and rate-card surfaces, the command-room registry and the 20-domain company-OS blueprint. These stay in the code and behind their gates. In the web app they live under "Operations" in the rail, not in the top navigation. Approvals stay visible because they gate real-world action.

## Kill list (do not extend; remove if they block the loop)

- New business-domain panels for the company-OS blueprint. No new domain ships until the loop's moat test has data.
- Features that only restate data already shown elsewhere (second registries, duplicate status pages).
- Any claim of "knowledge" that is not backed by a retrievable passage with a source path.
- Manual impact entry as the primary way to measure; outcomes should come from CI, PR and agent self-report.

## Data policy amendment

Earlier policy kept raw customer content out of Papership stores. The loop needs passages to retrieve, so Papership keeps a tenant-scoped, local index (`kb_chunks`, SQLite FTS5) of the owner's own repository documents. Controls: immutable versions (KL-D1: changed text supersedes, never overwrites); only an allowlist of documentation globs; credential-named files and credential-shaped passages are never indexed; outcome detail text is rejected if credential-shaped; every read is tenant-scoped and grant-gated (`memory.read`, ingest needs `memory.write` or `org.admin`). Indexing a third party's repository needs its own decision.

## Open

- Held-out comparison of ranking with and without lift (the actual moat evidence).
- Automatic outcomes from CI and PR merges.
- Hosting the API so an agent on the Hermes VPS can call it (today the API runs locally; the MCP server needs `PAPERSHIP_API_URL` and `PAPERSHIP_TOKEN`).
- Noise: `docs/workstreams/**` dominates the index; consider down-weighting or excluding it once outcome data shows whether it helps.
- Independent security review of the ingest and resolve surface before release.
