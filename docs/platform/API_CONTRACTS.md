# Papership API contracts (samples)

The HTTP API is the one implemented access surface for outside systems. Every route is authenticated with a bearer token, scoped to the caller's organisation, and refuses by default. The SDK, CLI and MCP server are planned and not built. Money is always an integer in minor units with a currency code. These samples show shape and intent. Values are fictional. No secret appears in any request or response.

Status words: see [CAPABILITY_MATRIX.md](CAPABILITY_MATRIX.md).

## Registry: search and read

`GET /registry/packages?q=property`

```json
{"items": [{"name": "engine-labs/property-terminology", "kind": "skill", "latest": "1.2.0",
            "license_class": "open", "price": null}]}
```

`GET /registry/packages/{publisher}/{package}/versions/{version}` returns the immutable version: `content_hash`, `manifest`, `files` with hashes, `dependencies`, `has_scripts`. A published version never changes. Paid listings carry price metadata and are refused for install.

## Resolve (deterministic, no execution)

`POST /platform/resolve`

```json
{"materials": [{"name": "engine-labs/enquiry-response-workflow", "constraint": "^1.0.0"}],
 "adapter": "papership-demo-runtime"}
```

Response: `ok`, `method`, `lock` (name, exact version, `content_hash`, `reason`, `declared_compatibility`, `tested_compatibility`), `errors`, `unsupported`, `warnings`. Same inputs and registry state give the same lock. Compatibility the platform has not tested is reported as "not tested".

## Install into an agent

`POST /platform/installs` (needs write access)

```json
{"agent_id": "agent-...", "name": "engine-labs/property-terminology", "constraint": "^1.1.0"}
```

Records the exact version and hash. Installing supplies instructions and references. It grants no permission.

## Reviewable update

`GET /platform/installs/updates?agent_id=agent-...`

```json
{"agent_id": "agent-...", "updates": [{
  "name": "engine-labs/property-terminology", "from_version": "1.1.0", "to_version": "1.2.0",
  "reviewed_hash": "<sha256>", "installed_hash": "<sha256>",
  "within_requested_constraint": true, "requested_constraint": "^1.1.0",
  "files_added": [], "files_removed": [], "files_changed": ["SKILL.md"],
  "dependencies_added": [], "dependencies_removed": [], "dependency_ranges_changed": [],
  "has_scripts": false, "licence": "MIT"}]}
```

`POST /platform/installs/update`

```json
{"agent_id": "agent-...", "name": "engine-labs/property-terminology", "to_version": "1.2.0", "reviewed_hash": "<sha256>"}
```

Refused with 409 when: the version is not newer, is not published, has install scripts, or `reviewed_hash` no longer matches (a stale review). Nothing updates by itself.

## Agent Passport (draft Papership format)

`GET /workspace/agents/{agent_id}/passport`

```json
{"schema": "papership.agent-passport/0", "grants_access": false,
 "agent": {"id": "agent-...", "name": "Enquiry Assistant", "status": "active"},
 "owner": {"organisation_id": "tenant-...", "organisation": "Engine Labs"},
 "role": {"persona": "Enquiry assistant", "note": "A persona is not an organisational access role."},
 "origin": {"blueprint": "enquiry-assistant", "version": 1, "content_hash": "<sha256>"},
 "runtime": {"adapter": "papership-demo-runtime", "controls": {}},
 "capabilities": [{"material": "engine-labs/property-terminology", "version": "1.2.0", "content_hash": "<sha256>", "installed_from": "registry:local"}],
 "autonomy": "Every external action waits for a human decision (the only supported policy).", "credentials": "references only; none included"}
```

A passport describes an agent. It is not an industry standard and it authorises nothing. Authority comes from the organisation's own role and approval rules.

## Approvals are bound to the exact proposal

`POST /workspace/approvals/{approval_id}/decision`

```json
{"decision": "approve", "payload_hash": "<sha256 of the proposal shown>", "note": ""}
```

If the proposal changed after it was shown, the hash differs and the decision is refused (409). A decision that was already made is refused. Only members with the approval permission can decide.

## Exchange quote (simulated)

`POST /exchange/quotes`

```json
{"capability_id": "property-data-enrichment", "task_id": "task-...", "input": {"address": "1 Example Street, Fitzroy VIC"}}
```

Response is an open quote with an integer price in minor units, currency AUD, an expiry and a simulated label. The number of open quotes is capped. `POST /exchange/quotes/{id}/accept` is idempotent: it checks budget and approval threshold, then creates one job, and accepting again returns that same job with `"idempotent": true`. Provider, price and result are fictional. No money moves.

## Capabilities and honest status

`GET /platform/capabilities` returns products with status, integrations with their supported controls, `access_surfaces` (API implemented, SDK, CLI, MCP, Cloud and Enterprise planned, work marketplace simulated, materials marketplace unsupported) and `deploy_targets` (`export-only` implemented, `papership-cloud`, `self-hosted`, `vercel` planned).

## Errors

JSON body `{"detail": "..."}` with 401 (no identity), 403 (no grant), 404 (not found in your organisation, including other organisations' records), 409 (state, hash or version conflict), 422 (invalid input, including planned adapters and deployment targets). 404 is also returned when a product is disabled in this deployment ("<product> is disabled in this deployment").
