# Data ownership

Users own their content. Papership stores the metadata, relationships, approvals, and receipts needed to govern agent knowledge. It does not become the owner of source documents, repositories, or model transcripts.

Standing decisions: D-12 and D-14 in `.cursor/USER.md`. Residency and retention: `docs/policies/data-residency-and-retention.md`. Memory classes: `docs/policies/memory-governance.md`.

## Ownership root

Organisation is the root for knowledge entities (KL-D2). A row's organisation comes from the authenticated principal's organisation, not from a hard-coded `tenant-founder`, `principal-founder`, or `proj-engine-labs` literal. Those literals exist in the current store and are a seam. New Knowledge Layer tables must not copy them.

Teams, projects, agents, tasks, and users are scopes under the organisation. They are not separate ownership roots.

## What Papership stores

| Data | Store | Notes |
|---|---|---|
| Context metadata, versions, edges | API store, later Context Graph | Enough to reason. Not a second copy of the native file when a reference will do |
| Provenance | On the context version | Source, owner, class, timestamps, verification, expiry |
| Approvals and receipts | API store | Kept until the user deletes them. Never edited in place |
| Audit | Append-only `audit_records` | Essential accountability. Not a content archive |
| Impact events | `usage_events` when emit is on | Identifiers and enums only. `ENGINE_USAGE_EMIT` defaults off |
| Grants and principals | API store | Authority. Not knowledge content |
| Sealed connector tokens | `connections.token_blob` | Ciphertext. Never returned to clients. Not knowledge |

## What Papership references

| Native source | Canonical location | Papership holds |
|---|---|---|
| Git repository | The bound host repository | Binding, grant intersection, evidence pointers |
| Agent Skill | The skill file in its repository | Identity, version, relationships |
| MCP server or plugin | That ecosystem | Capability reference and trust verdict |
| Documents and messages | The source system or user store | Reference, classification, permission snapshot |
| Model prompts and outputs | The runtime and provider | Not stored as product memory unless a human records an approved fact |
| Private or local files | The user machine | A reference the Desktop Bridge can resolve (KL-P8). Not uploaded by default |
| Hermes transcripts | Hermes state on the worker host | A session id. Company records must remain readable if Hermes is stopped |

## Scopes and residency

| Scope | Where it lives | Who can retrieve it |
|---|---|---|
| global/public | Registry metadata visible inside the organisation when policy allows. Not cross-tenant memory (MEM-15). Sharing beyond the organisation needs a separate decision | Grants at query time |
| organisation | Tenant store | Members with the relevant grant |
| team, project, agent, task, user | Same store, narrower scope | Current grants, not the grants at write time |
| private/local | User machine via Desktop Bridge | That user, through the API's authorization of the bridge |

Primary records stay in the assigned data environment. Shared telemetry must not contain customer content. Model providers are a separate destination. A backup on the same disk is not disaster recovery.

SQLite is the live application store (`ENGINE_STORE_PATH`). Postgres in Compose is unused by application code (KL-O1). Until that decision, Knowledge Layer data lives in the same SQLite file, behind one typed model (KL-D3).

## Retention and deletion

Conversation, log, backup, and approved-knowledge defaults stay those in the memory and residency policies. Credentials are not memory. Inferred items expire under the residency policy. Organisation erasure is owner-authenticated and is not implemented as destroy in the current product. Context versions follow the same erasure path as the records they attach to. Superseding a version is not deletion.

## Learning

No cross-customer content learning by default. Preference learning stays personal. Impact learning stays inside the organisation. Broader use needs an explicit policy. Downloaded or third-party context does not become training material by being referenced.
