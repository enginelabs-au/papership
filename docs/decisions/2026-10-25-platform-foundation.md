# D-40 — Platform foundation: four products on one local core

Date: 2026-10-25. Status: implemented, pending owner review. Builds on D-39 (Registry) and the owner foundation prompt.

## Decision
Ship Workspace, Registry, Studio and Exchange as modules of the existing app. Exchange is fully simulated and labelled. The runtime is deterministic and calls no model. Control claims are per integration. Details and limits: `docs/platform/README.md` and `docs/platform/CAPABILITY_MATRIX.md`.

## Rules fixed by this decision
- External actions are approved or rejected against an exact payload hash (including the draft version for CRM proposals). Enforcement lives in the service functions that perform the effect, not in the UI or router.
- Money is currency plus integer minor units with separate estimate, authorised and recorded usage. Nothing is charged.
- A blueprint version is immutable and stores its resolver lock. Paid, code-bearing, missing or conflicting materials make resolution fail.
- Public release of a blueprint bundle needs a human Owner or Founder.

## Not decided here (owner)
Production identity, settlement provider, commission and creator terms (carried from D-39), which real runtime adapter comes first.
