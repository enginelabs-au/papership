# Handoff: software-engineer

Task: 20261006-knowledge-layer-p8. Verdict: done, pending security.

`POST /knowledge/local-files` and `GET /knowledge/local-files/{object_id}` store title, digest, and decimal size for the registering owner. `path` and `content` are 422. An unprivileged register is 403. A same-tenant agent with `org.admin`, and `principal-other`, receive 404 and do not see the row in the list. Citation SQL still excludes `local_file`.

`bridge_pick_local_file` hashes inside Rust and returns title, digest, and size. `bridge_bind_local_file` moves a pending digest to the object id in the app-data map. The command source has no API URL. `cargo test --lib` 2 passed. Capabilities stay `core:default` and `shell:allow-open` for `https://*`. `dialog:allow-open` is not granted.

Pytest knowledge-layer suite 18 passed, then `test_local_files.py` 1 passed after the other-tenant assertion. Contracts 16 passed. Web static scan 15 passed. Not committed. KL-P9 is not started.
