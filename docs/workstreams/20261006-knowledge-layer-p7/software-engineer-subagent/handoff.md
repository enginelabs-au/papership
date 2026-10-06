# Handoff: software-engineer

Task: 20261006-knowledge-layer-p7. Verdict: done, pending security. Public DNS remains.

`papership.com.au` and `www.papership.com.au` (308 to the apex) are attached only to Vercel project `papership` (`prj_S74JOIky7KugVTrfu652NhJYOL8l`). The marketing project was not selected. The product path stays `/papership`.

`cors_allowlist` keeps the local and Tauri origins, includes `https://papership.com.au`, and rejects `*`. Pytest `test_cors_origins.py` and `test_oauth.py` 10 passed. Web static scan 15 passed. Local browser at 1280 and 390 still shows the KL-P5 no-plan sentences and bottom tabs Today, Work, Inbox.

Nameservers are still `ns09.domaincontrol.com` and `ns10.domaincontrol.com`. `https://papership.com.au/papership` does not present the Workspace certificate. No domain was purchased. No API host was added. Not committed. KL-P8 was not started.
