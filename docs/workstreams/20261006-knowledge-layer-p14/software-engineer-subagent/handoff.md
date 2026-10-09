---
schema_version: 1
task_id: 20261006-knowledge-layer-p14
role_id: software-engineer-subagent
status: complete
revision: 1
started_at: 2026-10-09T11:50:00Z
completed_at: 2026-10-09T12:05:00Z
predecessor_handoffs:
  - docs/workstreams/20261006-knowledge-layer-p14/ui-ux-developer-subagent/handoff.md
summary: Pack citations follow the newest impact outcome. Organisation context stays ahead, including ahead of a helped pack. No score is stored.
outputs:
  - handoff.md
changed_paths:
  - services/api/app/knowledge_layer.py
  - services/api/tests/test_context_plans.py
  - docs/knowledge-layer/CONTEXT_LIFECYCLE.md
external_changes: []
requirement_coverage:
  - Organisation citation precedes a helped pack: PASS
  - Helped pack precedes unknown, which precedes harmed: PASS
  - Another tenant's observation does not change order: PASS
  - Full organisation cap still omits a helped pack: PASS
  - Response has no score and no memory content: PASS
verdict: PASS
---

# Software handoff — KL-P14 empirical optimisation

`create_plan` sorts the pack band by the newest `context_impact_observations` row for the caller tenant and the plan's work item. The order is helped, then unknown or none, then harmed. Ties stay `created_at DESC`. The organisation band is not sorted by impact.

Pytest `tests/test_context_plans.py` and `tests/test_knowledge_api.py`: 10 passed. A harmed organisation citation still preceded a helped pack. The newest outcome won over an older opposite outcome. A `tenant-other` helped row did not pull that pack forward. Forty organisation citations still filled the cap ahead of a helped pack. The response had no score and did not include the memory content.

The empty-plan test also clears `EXAMPLE_MATERIALS`, because those two pointers are always projected and were occupying the gap the test clears `PACKS` to create.
