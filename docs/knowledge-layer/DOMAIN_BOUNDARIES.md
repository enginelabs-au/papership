# Domain boundaries

Papership owns context relationships, resolution, provenance, trust, effectiveness, configuration, lineage, economics metadata, and cross-ecosystem context intelligence. Everything else stays in its native system. Papership references it.

## External systems

| Domain | Owner | Papership relationship |
|---|---|---|
| Foundation models | Model providers | Separate data destination. Keys stay off the web client and off the API process. No chain-of-thought is stored or shown |
| Agent runtimes | Hermes today; other runtimes later | Typed adapter in `services/worker`. Transport key is worker-only. Write and external tools stay unauthorized |
| Agent Skills | Skill authors and repositories | Federated source. `SKILL.md` stays canonical |
| MCP | MCP server authors | Federated capability reference. Papership does not implement a second MCP |
| Plugins | Plugin ecosystems | Same as MCP. Pack manifests in `packages/contracts` are the current trust-review seed, not a new plugin standard |
| Generic memory and vector stores | Their vendors | Papership may reference them. `memory_items` is governed product memory, not a replacement database product |
| Observability and tracing | Their vendors | Papership emits its own impact and audit events. It does not rebuild a trace UI |
| Git and CI | Repository host | Bound repository stays the source of code. Grants intersect with installation permissions |
| Business data | Source systems | Ledger keeps references and evidence. Specialist records stay in the source system |
| Payments | Payment rails | Optional later. Charges remain off. KL-P11 attaches economics metadata; it does not become the payments product |
| Distribution | App stores, Vercel, registries | Papership ships clients. It does not replace those channels |
| Cloud hosting | The operator's host | Compose and Vercel stay the deploy paths |

## Papership-owned behaviour

| Behaviour | Accountable service | Must not leak into |
|---|---|---|
| Context relationships and versions | API, Context Graph (KL-P2) | A client-only cache or a Hermes transcript |
| Resolution and knowledge gaps | API, Resolver (KL-P4) | Prompt text or a runtime's private planner |
| Trust assessments | API, Trust (KL-P5) | A downloaded pack or a model self-score |
| Impact observations and evaluations | API, Impact (KL-P5) | Generic APM spans |
| Approvals bound to an action and a version | API authority core | The runtime, the desktop, or the model |
| Policy and grants | API | Prompts, seat titles, or UI toggles |
| Knowledge lineage | API | Copies that become a second canonical file |
| Economics metadata | API, optional Commerce (KL-P11) | Hidden charges or a second billing ledger |

## Service boundaries that already exist

- The web and desktop bundles call only the Papership API. They do not call Hermes, model providers, or GitHub directly.
- The worker decides tool risk from the catalog. Unknown tools are denied. The API owns the approval record before any Hermes forward.
- Postgres in `infra/compose` is not an application database today. `services/api/migrations/001_init.sql` is not the live schema. See open item KL-O1 in [DECISION_LOG.md](DECISION_LOG.md).
- The worker and the API currently share a SQLite file by path import, and the API also shells out to the worker for loop stages. That leak is a seam to close before the Resolver (KL-D4). KL-P0 does not change it.

## Authority across the boundary

Source-system permissions, Papership grants, and the active action policy all have to allow an effect. A Papership grant does not widen a source ACL. A source ACL does not silently override organisation policy. The ladder is in [SECURITY_MODEL.md](SECURITY_MODEL.md).
