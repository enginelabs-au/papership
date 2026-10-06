# Security model

This model binds later Knowledge Layer phases. It extends `docs/policies/authority-model.md` (AUTH-01 through AUTH-30) and `docs/policies/memory-governance.md` (MEM-01 through MEM-22). It does not replace them, and KL-P0 does not change enforcement code.

## Authority ladder

Higher rungs win. Lower-authority material must not silently override a higher rung (KL-D6).

| Rung | Examples | Can override |
|---|---|---|
| System and platform policy | AUTH and MEM rules, tool catalog, egress deny, charges off, Hermes write/external unauthorized | Nothing in product data |
| Organisation mandatory policy | Owner grants, retention, connector destination class | User and task instructions, packs, model output |
| User and task instruction | The operator's request, the task scope | Operational and reference context |
| Operational context | Active ContextPlan, approved memory, run mode | Reference material |
| Reference and advisory context | Third-party packs, inferred memory, web or tool output | Nothing above it |

Enforcement stays in the API. Prompts are not a policy store (MEM-21). Seat titles are not grants (AUTH-01). An agent's effective authority is the intersection of the sponsor's current grants, the toolset ceiling, and the run mode (AUTH-07).

## Untrusted by default

Context from third parties, tool output, fetched pages, external messages, and model output is untrusted (KL-D5, MEM-06). It is stored as `inferred` or as a reference until a human with `memory.write` in scope approves that version. There is no automatic promotion.

Retrieval filters by the caller's grants at query time (MEM-07). Memory and context never widen authority. Derived summaries inherit the strictest source restriction (MEM-08).

## Approvals

An approval binds one action to a hash of action type, parameters, target id, target version, and policy version (AUTH-10, KL-D1). Changing the version voids the approval. Context attachment, context revocation, release, erasure, billing administration, and organisation administration use this pattern.

Agents are never approvers (AUTH-09). Self-approval is refused for release, erasure, billing administration, and organisation administration. The API owns the approval record before a runtime is told the decision.

KL-P1 wires the existing approval API to the Workspace. It does not add new approval classes unless a context change cannot be expressed as an existing class. If a new class is required, it is `approval.<class>`, registered, and never assignable to an agent.

## Identity

Human, agent, and service principals stay distinct (AUTH-05). Cursor delivery roles, product seats, and Hermes runtime identities do not share credentials. JWTs are verified in the API (issuer, audience, lifetime, `grant_version`). The web client keeps the session token in memory and `sessionStorage`, not `localStorage`. Desktop capabilities stay `core:default` plus HTTPS `shell:allow-open`.

`POST /auth/local-session` exists only when test hooks are enabled. It is not a production identity provider.

Packaged desktop session tokens stay in the OS keychain (AUTH-26). The web client's memory plus `sessionStorage` rule does not apply to the desktop shell. The desktop must not store the session token in `sessionStorage`.

## Tenant isolation seams

These are known limits of the current store. They are not fixed in KL-P0. Later phases must not make them worse.

- Tenant is a string. Several code paths still write `tenant-founder` or `principal-founder`.
- Grant `scope` is stored and unused. There is no per-object ACL yet.
- Memory visibility is partly decided by seat-template name, not only by grants.
- The API process holds an in-process lock across a Hermes subprocess that can run for up to 90 seconds.
- The worker imports the API store by path. That is a trust-boundary leak (KL-D4).

Search, aggregates, attachments, notifications, and memory stay on the server-side grant checks (AUTH-12).

## Impact and disclosure

Impact records use the usage-event schema. Prohibited payload keys include prompt text, message content, documents, names, emails, credentials, and repository diffs. Model chain-of-thought is not collected and not shown (KL-D7). Operators see structured reasons, evidence links, provenance, decisions, scores, and evaluation results.

Usage emission stays off until a phase explicitly enables `ENGINE_USAGE_EMIT` after schema review. KL-P0 emits nothing.

## Runtime boundary

Unknown tools are denied. Catalogued write tools need a receipt. External and destructive tools need a Papership approval. Private and metadata egress is denied. Registry rows for side-effecting Hermes tools stay `unavailable`. An enabled toolset is not registry acceptance: write and external tools still stop at receipt and approval. D-25 write and external `accepted` stays unauthorized. Production deployment credentials stay out of the worker.

## Secrets

No Knowledge Layer document, plan, or log stores secret values. Connector tokens stay sealed. The loop bridge currently reads the worker env file inside the API process and passes `HERMES_API_SERVER_KEY` to the child. The worker is the consumer. New Knowledge Layer paths must not copy that pattern, log the value, return it from the API, or add the key to the API allowlist. GitHub App private keys stay on the API host. Client bundles must not contain provider credentials.

## Review trigger

Re-review this model before KL-P1 merges any of: new grant classes, context tables, approval wiring, or event emission. Re-review again before KL-P4 if the worker/API store sharing is still in place.
