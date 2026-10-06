# Canonical concepts

These nouns are the shared language for KL-P1 onward. "Seed" means an existing table, contract, or policy that later phases extend. It is not yet the full concept.

| Concept | Meaning | Seed in this repository | Introduced fully |
|---|---|---|---|
| Agent | A non-human principal that acts for a sponsor, inside a toolset ceiling and a run mode | `principals.kind = agent`; `runs.acting_identity`. No agent profile table. `principal-agent` is seeded and unused | KL-P1 profile; graph links in KL-P2 |
| Task | A unit of work an agent is trying to complete | `work_items`, `loop_stage_events`, `loop_stage_artifacts`, `jobs`, `runs` | Exists; context refs in KL-P1 |
| Organisation | The ownership root for knowledge, policy, and membership | `organisations` plus a `tenant_id` string on rows (`tenant-founder` today) | KL-D2 from KL-P1 |
| ContextObject | A Papership reference to something an agent may need to know or use. The native source stays canonical | `memory_items` (kind, class, provenance, version, parent, restriction); also attachments, loop artifacts, registry rows, connections | KL-P2 |
| ContextSource | Where a ContextObject was retrieved from | `connections`, `source_references`, `memory_items.provenance` | KL-P2 |
| ContextPlan | The resolved set of context chosen for one agent and one task | Grant intersection (`effective_grants`) and memory visibility are the only seeds | KL-P4, referenced from KL-P1 |
| ContextVersion | An immutable revision of a ContextObject | `memory_items.version` and `parent_id`; `approvals.target_version` | KL-P2, rule KL-D1 |
| ContextRelationship | A typed edge between context objects | `dependencies` (work items only). Vocabulary is new: requires, recommends, conflicts_with, supersedes, derived_from, validated_by, used_with, compatible_with, scoped_to, owned_by, published_by, retrieved_from, invalidated_by, improved, degraded | KL-P2 |
| KnowledgeGap | Something the task needs that the active context does not cover | None. The Workspace will show an honest empty state in KL-P1 | KL-P4 |
| Resolution | The Resolver's answer: which objects to acquire, under which constraints | None beyond grant and memory filters | KL-P4 |
| TrustAssessment | A judgement that a specific version is trustworthy for a scope | Memory classes `source` / `approved` / `inferred`; `pack_trust_reviews.verdict`; registry `acceptance_evidence`; source-permission intersection | KL-P5 |
| ImpactObservation | A recorded outcome of using a context version on a task | `usage_events`, `receipts`, `job_events`, `audit_records`, `loop_stage_events.evidence` | KL-P5 |
| ImpactEvaluation | A conclusion drawn from observations: helped, harmed, or unknown | `usage_baselines`, `field_evidence` (intent records) | KL-P5, deepened in KL-P14 |
| ContextDeployment | A context version made active for an agent, task, or runtime | `jobs`, `runs`, loop stage artifacts | KL-P10 |
| ContextLifecycleEvent | A traceable change as knowledge moves through the pipeline | `job_events` SSE, `audit_records`, loop stage events | KL-P10 |
| Publisher | A party that supplies Agent Materials | `PackManifest` in `packages/contracts/src/packs.ts` | KL-P3, supply quality in KL-P13 |
| Policy | A rule that bounds what context may be used or what an agent may do | `docs/policies/authority-model.md`, `memory-governance.md`, `data-residency-and-retention.md`; grant classes | Exists; ladder in [SECURITY_MODEL.md](SECURITY_MODEL.md) |
| Approval | A human decision bound to one action and one target version | `approvals` (`target_id`, `target_version`); worker hash of tool, args, target, and policy version | Exists; context changes join the same pattern in KL-P1 |
| Outcome | The structured result of a task, used later by Impact | Loop evidence strings, receipts, usage `outcome_code` | KL-P1 prepares events; KL-P5 evaluates |

## ContextObject, in outline

A ContextObject may reference an Agent Skill, MCP server, plugin, context pack, document or set, dataset, workflow, SOP, schema, template, decision tree, evaluation, policy, guardrail, memory item, tool, API, organisation knowledge, runtime state, or deployment configuration.

Papership stores identity, name, type, description, source, location, publisher, ownership, provenance, version, freshness, expiry, jurisdiction, authority, permissions, risk, license, price metadata, relevance, token estimate, compatibility, relationships, and references to evaluations and trust. It does not merge those sources into one file.

## Scopes

Context may be scoped as global/public, organisation, team, project, agent, task, user, or private/local. Private/local context is reachable through the Desktop Bridge (KL-P8), not by copying it into the cloud store.

## Classes already in force

Memory class rules in `docs/policies/memory-governance.md` apply until a later phase explicitly extends them:

- `source` — immutable reference; permissions come from the source record.
- `approved` — a human principal approved it; default retrieval uses this class.
- `inferred` — model or merge output; not promoted automatically; third-party and untrusted inputs stay in this posture until review (KL-D5).
