# Handoff: software-engineer

Task: 20261006-knowledge-layer-p9. Verdict: done, pending security.

`POST /approvals` accepts `requested`, `approved`, and `rejected`. A missing decision still inserts `approved`. A request inserts `pending`. A human decision updates that pending row. An agent with `org.admin` can request and cannot decide. Another tenant's reject is 404 and leaves the row pending. A reject with no pending row is 404. Extra key `path` is 422. Self-approval of `approval.release` stays 403. A legacy approved row still blocks a mismatched job step.

`apps/mobile` gained no Rust crate. Pytest `test_mobile_approvals.py` and `test_knowledge_layer.py` 3 passed. Contracts 16 passed. Web static scan 15 passed. Not committed. KL-P10 is not started.
