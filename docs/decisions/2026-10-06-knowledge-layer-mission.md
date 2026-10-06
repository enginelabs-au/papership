# Decision D-36: Knowledge Layer mission and document namespace

## Status

`accepted` — owner supplied the Knowledge Layer roadmap and authorized Phase 0 implementation on 2026-10-06.

Workstream: `docs/workstreams/20261006-knowledge-layer/manifest.md`.

## Context

Papership already shipped the Engine Labs Company OS lifecycle (plans `docs/plans/phase_0_foundations_plan.md` through `docs/plans/phase_7_ecosystem_mobile_plan.md`, gates through G11). `.cursor/STATE.md` recorded "No Phase 8" for that lifecycle. The owner then set a new primary mission: Papership is the Knowledge Layer for agents. Reusing `docs/plans/phase_0_*` for that mission would overwrite a closed plan series.

## Decision

1. **Mission.** Papership's primary mission is the Knowledge Layer for agents: determine what an agent needs to know, give it that knowledge, and learn whether it worked. The Company OS product contract (`docs/product.md`), capability registry (`docs/capabilities.md`), policies, and release roadmap (`docs/roadmap.md`) stay valid as the operational baseline. They are prior art, not rewritten by this decision.
2. **Namespace.** Knowledge Layer architecture lives in `docs/knowledge-layer/`. Sequential plans live in `docs/plans/knowledge-layer/phase_N_<slug>_plan.md`. Phase identifiers are `KL-P0` through `KL-P15`. The workstream is `docs/workstreams/20261006-knowledge-layer/`.
3. **Naming.** The existing 43-domain catalogue remains the **capability registry** (D-02). The later discovery and supply surface (KL-P3) is the **Papership Registry**. The two names are not interchangeable.
4. **"No Phase 8".** That note still means the Company OS lifecycle ended at phase 7. It does not forbid Knowledge Layer phase KL-P8 (Desktop Bridge).
5. **Phase 0 scope.** KL-P0 is documentation and alignment only. It does not change application code, schema, UI, or infrastructure.

## Alternatives considered

1. **Continue numbering inside `docs/plans/phase_8_*`.** Rejected: it collides with the closed lifecycle and with the recorded end of that series.
2. **Replace `docs/product.md` and `docs/architecture.md` in place.** Rejected: those documents still describe the running product. The Knowledge Layer docs link to them and supersede only the forward mission.

## Consequences

- Forward planning reads `docs/knowledge-layer/PHASE_ROADMAP.md` first.
- KL-P1 may adapt the live Workspace. It must not delete useful Company OS behaviour.
- A later decision is required before any Knowledge Layer phase changes production data, charges, or Hermes write/external tools.

## Evidence

- Owner roadmap: Knowledge Layer master prompt, 2026-10-06, implemented as KL-P0.
- Repository audits recorded in `docs/knowledge-layer/REPOSITORY_AUDIT.md`.
- Prior closeout: `docs/plans/final_implementation_checklist.md`, G11 PASS.
