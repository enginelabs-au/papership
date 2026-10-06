---
schema_version: 1
task_id: 20261006-knowledge-layer
role_id: security-engineer-subagent
status: complete
revision: 1
entry_criteria:
  - Manifest risk tier 2 and security-engineer-subagent required
  - SECURITY_MODEL.md and DATA_OWNERSHIP.md exist
  - KL-P0 is documentation only (D-36)
ordered_tasks:
  - Read the role contract, manifest, security model, ownership doc, decisions, and AUTH, MEM, and residency policies
  - Check each assigned seam in current source
  - Scan Knowledge Layer docs for secret values
  - Rank findings and issue the gate verdict
gate_criteria:
  - PASS only with no open high or critical finding
  - CONDITIONAL only for bounded medium and low residuals
  - BLOCKED for open high or critical, a missing critical control, or a document that authorizes unsafe behaviour
downstream_handoff: project-lead-subagent
deviations:
  - Artifact files were materialized by the lead from the review result.
---

# Plan

The review compares the two Knowledge Layer documents to binding policy and to the code those documents describe. It does not change enforcement.
