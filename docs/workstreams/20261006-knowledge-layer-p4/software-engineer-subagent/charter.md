# Charter: software-engineer

Task: 20261006-knowledge-layer-p4. Risk: Tier 3. Lead-executed.

Scope: `context_plans` and `context_plan_citations` in `knowledge_layer.py`; `POST /knowledge/plans` and `GET /knowledge/plans/{id}`; Zod `ContextPlanSchema`; `tests/test_context_plans.py`.

Non-goals: no worker dispatch, no pack install, no version rewrite, no jobs or runs `context_plan_id`, no KL-P5, no Postgres port.

Evidence: pytest 9 passed across the knowledge-layer tests. Contracts 16 passed. Web static scan 15 passed.
