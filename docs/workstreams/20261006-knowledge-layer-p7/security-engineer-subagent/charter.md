# Charter: security-engineer

Task: 20261006-knowledge-layer-p7. Risk: Tier 3. Independent, read-only.

Scope: review the origin attach and CORS change. The domain write must be project `papership` only. `www.enginelabs.com.au` and `enginelabs-au-site` stay untouched. CORS must not allow `*`. Local and Tauri origins stay. The public shell must not gain a store. Production test hooks and charges stay off.

Non-goals: do not edit product code. Do not buy a domain. Do not close KL-SEC-01 or KL-SEC-02. Do not start KL-P8.

Gate: verdict PASS, CONDITIONAL, or BLOCKED, with findings. The lead records the handoff.
