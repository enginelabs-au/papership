---
schema_version: 1
task_id: 20261006-knowledge-layer
role_id: security-engineer-subagent
status: complete
revision: 1
mission: Independent read-only review of the Knowledge Layer Phase 0 security and data-ownership documents.
objective: Decide whether SECURITY_MODEL.md and DATA_OWNERSHIP.md are consistent with AUTH, MEM, and residency policy and with the known code seams, without treating a documented seam as a fixed control.
non_goals: No product code, policy, or hook edits. No charges enablement. No D-25 lift. No KL-P1 plan.
predecessor_handoffs: []
owned_paths:
  - docs/workstreams/20261006-knowledge-layer/security-engineer-subagent/
downstream_role: project-lead-subagent
---

# Charter

Read-only security gate for Knowledge Layer Phase 0. The running product is unchanged. This role ranks findings and does not remediate them.

The review ran in a mode that could not write these files. The lead materialized this charter, the plan, the evidence, and the handoff from that review without changing the verdict. Wording fixes KL-SEC-03, KL-SEC-04, KL-SEC-05, and KL-SEC-06 were applied by the lead after the verdict, in `docs/knowledge-layer/SECURITY_MODEL.md` and `docs/knowledge-layer/DATA_OWNERSHIP.md`.
