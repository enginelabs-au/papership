---
schema_version: 1
task_id: 20261006-knowledge-layer-p12
role_id: software-engineer-subagent
status: complete
revision: 1
started_at: 2026-10-09T10:40:00Z
completed_at: 2026-10-09T11:05:00Z
predecessor_handoffs:
  - docs/workstreams/20261006-knowledge-layer-p12/ui-ux-developer-subagent/handoff.md
summary: A context plan cites organisation context before packs. The cap omits packs when organisation rows fill it. An accepted pack stays pack. A null band is returned as pack.
outputs:
  - handoff.md
changed_paths:
  - services/api/app/knowledge_layer.py
  - services/api/tests/test_context_plans.py
  - packages/contracts/src/entities.ts
  - packages/contracts/test/knowledge-layer.test.ts
  - docs/knowledge-layer/CONTEXT_LIFECYCLE.md
external_changes: []
requirement_coverage:
  - Organisation citations precede pack citations: PASS
  - Forty organisation rows leave the pack uncited: PASS
  - An accepted pack review stays band pack: PASS
  - Inferred context stays band pack: PASS
  - Another tenant and a local file are absent: PASS
  - A null band is returned as pack: PASS
  - The citation contract requires band: PASS
verdict: PASS
---

# Software handoff — KL-P12 private organisation context

`create_plan` labels each eligible citation `organisation` or `pack` and writes organisation rows first, still capped at 40. `get_plan` returns the stored band. A null band is `pack`.

Pytest context-plan, lifecycle, and knowledge-index tests 13 passed. Contracts 16 passed. Web static scan 15 passed. No new route. Grants were not read. KL-P13 is not started.
