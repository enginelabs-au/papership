---
schema_version: 1
task_id: 20261006-knowledge-layer-p11
role_id: software-engineer-subagent
status: done_pending_security
revision: 1
started_at: 2026-10-06T16:25:00Z
completed_at: 2026-10-06T16:30:00Z
verdict: PASS
---

# Software handoff — KL-P11 optional economics

`POST /registry/materials/{object_id}/economics` stores `free`, `listed`, or `unavailable` for a human in the caller tenant. `listed` stores `list_usd`. An agent is 403. Another tenant is 404. Extra keys are 422. The materials list returns the two fields. Charges stay off and no allowance row is written.

Pytest economics, knowledge index, and materials tests 8 passed. Contracts 16 passed. Web static scan 15 passed.

Downstream role is security. Do not start KL-P12.
