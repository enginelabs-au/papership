# Charter: security-engineer

Task: 20261006-knowledge-layer-p4. Risk: Tier 3. Independent and read-only.

Scope: review the KL-P4 diff. Confirm the plan is tenant-scoped, grants are `memory.write` or `org.admin` to create and `memory.read` or `org.admin` to read, preferences and sessions are not cited, registry and connection objects are not cited, citation version ids are not rewritten, and the route does not call the founder-loop worker.

Non-goals: do not edit product code. Do not close KL-SEC-01 or KL-SEC-02. Do not start KL-P5.

Gate: PASS, CONDITIONAL, or BLOCKED. BLOCKED stops the phase.
