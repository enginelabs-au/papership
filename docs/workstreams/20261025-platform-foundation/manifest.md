---
schema_version: 1
task_id: 20261025-platform-foundation
title: Papership platform foundation (Workspace, Registry, Studio, Exchange) from the owner foundation prompt
status: implemented_pending_owner_review
risk_tier: tier_3
created_at: 2026-10-25T02:30:00Z
updated_at: 2026-10-25T03:20:00Z
revision: 1
owner: lead-agent
active_role: software-engineer-subagent
current_gate: owner review of PF-P0
plan: docs/plans/platform-foundation/phase_0_foundations_plan.md
---

# Workstream: Platform foundation

Input: `docs/blueprints/papership-cursor-foundation-prompt.md` (owner) and the UI guide `docs/ui-blueprint/blueprint-3` (same drop as `Papership UI Mockups.zip`). The mockups cover the Workspace shell only; Studio and Exchange are designed in the same tokens and patterns.

Tier 3: approvals that gate external actions, simulated money (integer minor units), cross-product authority, untrusted package content, organisation boundaries. Nothing is deployed, published, purchased or emailed by this workstream.

## Required

| Role | Status | Reason |
|---|---|---|
| product-manager-subagent | complete (owner prompt) | The prompt is the PRD; scope limits are in the plan |
| software-engineer-subagent | required | `foundation.py`, routes, tests |
| ui-ux-developer-subagent | required (lead executes) | Workspace, Studio, Exchange panels and Registry publish form against blueprint-3 tokens |
| security-engineer-subagent | required | Approval enforcement, stale and duplicate decisions, organisation isolation, quote idempotency, package trust |
| project-lead-subagent | required | Reconciliation and owner handoff |

## Skipped

| Role | Reason |
|---|---|
| growth-marketing-subagent | No acquisition, pricing, analytics taxonomy or launch work. Sample prices are illustrative |

## Stop

No commit, push or deploy unless the owner asks. No payment rails, no real email or CRM writes, no third-party code execution.
