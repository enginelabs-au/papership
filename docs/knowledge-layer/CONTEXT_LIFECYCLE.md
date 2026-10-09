# Context lifecycle

The product loop and the state of a context version are different. The loop is what Papership does for a task. The state machine is what happens to one piece of knowledge.

## Task loop

| Step | Meaning | Accountable layer | Ready when |
|---|---|---|---|
| TASK | An agent has a task under constraints | Workspace, jobs, runs | Now, for the founder loop |
| KNOWLEDGE_GAP | Required knowledge is missing or stale | Resolver | KL-P4. KL-P1 may show an empty gap list |
| DISCOVER | Candidate materials are found across ecosystems | Papership Registry | KL-P3 |
| RESOLVE | A ContextPlan is chosen for this agent and task | Resolver | KL-P4 |
| VERIFY | Candidates are checked against policy, trust, and freshness | Trust | KL-P5 |
| ACQUIRE | Permitted versions are attached. Private sources stay local | Knowledge API, Desktop Bridge | KL-P6, local in KL-P8 |
| ASSEMBLE | The plan is composed without merging native sources into one blob | Context Graph | KL-P2 structure, KL-P4 selection |
| APPLY | The runtime receives the plan through the Knowledge API | Knowledge API | KL-P6 |
| EXECUTE | The runtime does the task. Papership does not replace the runtime | External runtime | Hermes adapter exists; write tools unauthorized |
| MEASURE_IMPACT | Structured outcomes are recorded against context versions | Impact | KL-P5. KL-P1 only reserves event names |
| LEARN | Evaluations update trust and relevance. No silent policy override | Trust, Impact | KL-P5, optimiser in KL-P14 |
| UPDATE_CONTEXT_GRAPH | New versions and edges are written. Old versions stay | Context Graph | KL-P2 |
| NEXT_TASK | The next task sees the updated graph | All clients | After KL-P2 |

Closing the laptop does not cancel execution. That rule already exists for cloud jobs and stays.

## Context version states

```text
referenced -> candidate -> approved -> active -> superseded
                |            |           |
                v            v           v
             refused      restricted   revoked
```

| State | Meaning | Rule |
|---|---|---|
| referenced | Metadata points at a native source. Content may not be copied | Default for third-party material |
| candidate | Proposed for a task or organisation. Class is untrusted or inferred | Cannot override policy |
| approved | A human with the right grant accepted this version | Required before default retrieval |
| active | Part of a current ContextPlan or agent attachment | Cites an exact version (KL-D1) |
| superseded | A newer version replaced it. History remains | Not deleted by supersession |
| refused | Trust or policy rejected it | Visible to the operator, not applied |
| restricted | Visibility narrowed after approval | Derived objects inherit the tighter scope |
| revoked | Approval or source permission was withdrawn | Running work rechecks at a safe boundary |

Every consequential transition is traceable, versioned, reversible by adding a new version or revoking activation, and auditable. Erasure is a separate, owner-approved path (`docs/policies/erasure-and-offboarding.md`). KL-P0 does not add erasure behaviour. Erasure still records intent only.

## Events

Papership-specific events use the existing usage-event rules: `domain.object.action`, identifier and enum fields, no prompt text, no document body, no chain-of-thought. Catalogue additions wait for KL-P1 and must pass the same prohibited-key checks as `services/api/app/usage.py`.

Reserved families, not emitted by KL-P0:

- `knowledge.object.referenced|approved|restricted|revoked`
- `knowledge.gap.recorded`
- `context.plan.proposed|applied|reverted`
- `context.version.activated|superseded`
- `approval.decision.approved|rejected` (already in the Company OS catalogue)

Server-side transitions are the source for these events. Clients emit navigation only.

## What the Workspace shows

From KL-P1, an operator can inspect role, task, active context, source, version, and approvals. Gaps, automatic resolution, and impact scores stay empty or clearly unavailable until their phases. See [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md).

From KL-P10, a recorded loop stage cites the work item's context plan id and that plan's version ids. The citation is identifiers only and does not call the runtime.

From KL-P12, a context plan cites organisation context before downloaded packs. The citation stores a band, `organisation` or `pack`, and does not store a body or a path.

From KL-P14, pack citations are ordered by the newest impact outcome for that version and work item: helped, then unknown or none, then harmed. Organisation context stays ahead of that order. There is no score.
