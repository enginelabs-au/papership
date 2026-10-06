---
schema_version: 1
task_id: 20261006-knowledge-layer-p1
role_id: security-engineer-subagent
status: complete
revision: 1
started_at: 2026-10-06T12:50:00Z
completed_at: 2026-10-06T13:00:00Z
predecessor_handoffs: []
summary: CONDITIONAL. The eight KL-P1 acceptance checks hold. Two medium residuals were found on the new reads. The lead applied both remediations after the verdict. No finding is BLOCKED.
outputs:
  - handoff.md
changed_paths: []
external_changes: []
requirement_coverage:
  - Tenant from the caller, no new founder literals: PASS
  - Knowledge list does not use _visible_to; preferences owner-only; missing grant is 403: PASS
  - List payloads omit memory bodies: PASS
  - No maybe_emit and no read inside the founder-loop worker: PASS
  - Nullable context columns, nothing writes a context plan id: PASS
  - Settings Permissions is read-only on the live pane: PASS
  - POST /approvals unchanged; no Hermes write; usage emit unchanged: PASS
  - BOTTOM_TABS unchanged: PASS
horizontal_checklist:
  - Identity and access: CONDITIONAL, then remediated (KL-P1-SEC-02)
  - Security and privacy: CONDITIONAL, then remediated (KL-P1-SEC-01)
  - Data ownership and residency: PASS for this diff
verdict: CONDITIONAL
---

# Security handoff — KL-P1 Workspace foundation

Verdict: **CONDITIONAL**. No finding is BLOCKED.

The review was read-only and did not edit the repo. The lead recorded this handoff and then applied the two remediations in `services/api/app/knowledge_layer.py`. Pytest `tests/test_knowledge_layer.py` passed after that change.

## Findings

| ID | Severity | Status | Issue |
|---|---|---|---|
| KL-P1-SEC-01 | medium | remediated | `sessions` rows were listed for any caller with `memory.read` or `org.admin`. The older memory list hides another principal's sessions from operators. The knowledge query now owner-filters `sessions` the same way as `preferences`. |
| KL-P1-SEC-02 | medium | remediated | `ledger.read` alone, which is the guest seat's only grant, could list agents, approvals, and audit. Those routes now require `org.admin`, or both `ledger.read` and `records.read`. A guest's lone `ledger.read` is refused. |
| KL-P1-SEC-03 | low | open, accepted | If the agents fetch fails, Settings Permissions can still show the old local toggles. They do not write grants. |

## Gate

Downstream work may proceed. KL-P2 implementation still waits for the owner to ask. Projection in that phase must keep the remediated filters.
