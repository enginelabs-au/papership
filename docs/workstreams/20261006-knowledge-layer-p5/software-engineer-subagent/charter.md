# Charter: software-engineer

Task: 20261006-knowledge-layer-p5. Risk: Tier 3. Lead-executed.

Scope: `context_trust_assessments` and `context_impact_observations` in `knowledge_layer.py`; `POST /knowledge/trust`, `POST /knowledge/impact`, and `GET /knowledge/plans/{id}/signals`; Zod signal schemas; `tests/test_trust_impact.py`.

Non-goals: no version rewrite, no grant change, no usage emission, no worker dispatch, no KL-P6.

Evidence: pytest knowledge-layer suite 11 passed. Contracts 16 passed. Web static scan 15 passed.
