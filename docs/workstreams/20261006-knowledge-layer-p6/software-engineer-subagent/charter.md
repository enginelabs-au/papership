# Charter: software-engineer

Task: 20261006-knowledge-layer-p6. Risk: Tier 3. Lead-executed.

Scope: `GET /knowledge` index in `knowledge_layer.py`; drop `require_human` on signals only; Zod index schema; `docs/knowledge-layer/KNOWLEDGE_API.md`; `tests/test_knowledge_api.py`; no-plan agent regression.

Non-goals: no second store, no new auth scheme, no worker rewrite, no screen copy change, no KL-P7.

Evidence: pytest knowledge-layer suite 14 passed. Contracts 16 passed. Web static scan 15 passed.
