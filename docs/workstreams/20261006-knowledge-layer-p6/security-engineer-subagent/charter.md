# Charter: security-engineer

Task: 20261006-knowledge-layer-p6. Risk: Tier 3. Independent, read-only.

Scope: review the KL-P6 diff. An agent with `memory.read` or `org.admin` may read the index and signals inside its tenant. Trust and impact writes stay human-only. Another tenant stays 404. The index must not carry memory bodies, citations, or scores.

Non-goals: do not edit product code. Do not close KL-SEC-01 or KL-SEC-02. Do not start KL-P7.

Gate: verdict PASS, CONDITIONAL, or BLOCKED, with findings. The lead records the handoff.
