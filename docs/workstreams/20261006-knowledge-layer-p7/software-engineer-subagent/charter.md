# Charter: software-engineer

Task: 20261006-knowledge-layer-p7. Risk: Tier 3. Lead-executed.

Scope: keep `/papership`; name `https://papership.com.au` as the human origin; attach that domain only on Vercel project `papership` (`prj_S74JOIky7KugVTrfu652NhJYOL8l`); CORS allowlist keeps local and Tauri origins, adds the Papership origin, and rejects `*`.

Non-goals: no marketing-site edit, no domain purchase, no new API host, no store on Vercel, no screen copy change, no KL-P8.

Evidence: pytest `test_cors_origins.py` and `test_oauth.py` 10 passed. Web static scan 15 passed.
