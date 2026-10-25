---
schema_version: 1
task_id: 20261025-agent-registry-pivot
title: Papership pivot — open Agent Registry, Resolver and Workspace
status: in_progress
risk_tier: tier_3
created_at: 2026-10-25T02:00:00Z
updated_at: 2026-10-25T03:00:00Z
revision: 2
owner: lead-agent
active_role: security-engineer-subagent
current_gate: AR-P1 security re-review (round 2 findings remediated, verdict pending)
plan: docs/plans/agent-registry/phase_0_foundations_plan.md
---

# Workstream: Agent Registry pivot

Tier 3: untrusted third-party uploads, a multi-tenant public surface, licence and pricing metadata (money-adjacent, charges off), tenant boundaries. No production deploy, no payment rails, no external publishing in this workstream.

## Required

| Role | Status | Reason |
|---|---|---|
| product-manager-subagent | complete (owner brief) | Scope, licence classes and pricing metadata are product decisions. The owner's 2026-10-25 brief is the PRD; D-39 records it and lists the owner-only decisions it opens |
| software-engineer-subagent | required | Registry module, routes, CLI, MCP tools, tests |
| ui-ux-developer-subagent | required (lead executes) | New Registry tab, resolve and install flows |
| security-engineer-subagent | required | Untrusted uploads, namespace ownership, tenant visibility, secret rejection. Independent review before any release |
| project-lead-subagent | required | Reconciliation and owner handoff |

## Skipped

| Role | Reason |
|---|---|
| growth-marketing-subagent | No campaign, public launch, analytics taxonomy or attribution in AR-P0/AR-P1. Positioning copy is in D-39 only. Revisit at AR-P6 |

## Stop

Do not commit, push or deploy unless the owner asks. Do not connect payment rails. Charges stay off.
