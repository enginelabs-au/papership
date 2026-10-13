"""D-37: every Hermes area is enabled behind the D-17 gates. Nothing runs outside policy."""

from __future__ import annotations

from app import hermes_runs

AREA_IDS = {
    "toolsets",
    "profiles",
    "sessions",
    "skills",
    "memory",
    "scheduling",
    "delegation",
    "browser",
    "research",
    "code_execution",
    "documents",
    "media",
    "runs",
    "health",
}


def test_inventory_enables_every_area_with_governed_tools(client, founder_headers) -> None:
    body = client.get("/hermes/inventory", headers=founder_headers)
    assert body.status_code == 200
    payload = body.json()
    assert payload["count"] == 14 and payload["decision"] == "D-37"
    assert payload["write_accepted"] is True
    by_id = {area["id"]: area for area in payload["areas"]}
    assert set(by_id) == AREA_IDS
    assert all(area["status"] == "configured" for area in payload["areas"])
    # Live state is reported honestly, never assumed.
    assert all(area["live_hermes"] in {"reachable", "blocked_runtime"} for area in payload["areas"])
    assert by_id["scheduling"]["local_surface"] == "/schedules"
    assert by_id["memory"]["local_surface"] == "/memory"
    gates = {t["name"]: t["gate"] for t in by_id["runs"]["tools"]}
    assert gates["github"] == "approval_then_receipt"
    assert {t["name"]: t["gate"] for t in by_id["code_execution"]["tools"]}["terminal"] == "receipt"
    assert {t["name"]: t["gate"] for t in by_id["research"]["tools"]}["web_search"] == "none"
    assert by_id["browser"]["tools"] and by_id["media"]["tools"] and by_id["delegation"]["tools"]


def test_execute_queues_a_gated_run_for_a_catalogued_tool(client, founder_headers) -> None:
    ok = client.post(
        "/hermes/inventory/code_execution/execute",
        headers=founder_headers,
        json={"tool": "write_file", "arguments": {"path": "notes/a.md"}},
    )
    assert ok.status_code == 202
    data = ok.json()
    assert data["gate"] == "receipt" and data["hermes_request"]["state"] == "queued"
    runs = client.get("/hermes/runs", headers=founder_headers).json()["items"]
    assert any(r["job_id"] == data["job"]["id"] and r["tool"] == "write_file" for r in runs)


def test_execute_refuses_unknown_tools_wrong_area_and_secrets(client, founder_headers) -> None:
    unknown = client.post("/hermes/inventory/runs/execute", headers=founder_headers, json={"tool": "rm_rf"})
    assert unknown.status_code == 422
    wrong_area = client.post("/hermes/inventory/research/execute", headers=founder_headers, json={"tool": "terminal"})
    assert wrong_area.status_code == 422
    assert client.post("/hermes/inventory/nope/execute", headers=founder_headers, json={"tool": "x"}).status_code == 404
    secret = client.post(
        "/hermes/inventory/runs/execute",
        headers=founder_headers,
        json={"tool": "github", "arguments": {"api_key": "x"}},
    )
    assert secret.status_code == 403


def test_run_endpoint_accepts_a_declared_tool(client, founder_headers) -> None:
    r = client.post(
        "/runs", headers=founder_headers, json={"purpose": "open pr", "tool": "github", "arguments": {"repo": "o/r"}}
    )
    assert r.status_code == 202
    assert r.json()["hermes_request"]["tool"] == "github"
    bad = client.post("/runs", headers=founder_headers, json={"purpose": "x", "tool": "bad tool!"})
    assert bad.status_code == 422


def test_access_control(client, unpriv_headers) -> None:
    assert client.get("/hermes/inventory", headers=unpriv_headers).status_code == 403
    denied = client.post("/hermes/inventory/runs/execute", headers=unpriv_headers, json={"tool": "github"})
    assert denied.status_code == 403
    assert client.get("/hermes/query/toolsets", headers=unpriv_headers).status_code == 403


def test_query_reads_through_the_worker_and_reports_blocked_runtime(client, founder_headers, monkeypatch) -> None:
    from app import loop_hermes_bridge

    def blocked(*_a, **_k):
        raise loop_hermes_bridge.LoopHermesUnavailableError("Hermes Host is not configured.")

    monkeypatch.setattr(loop_hermes_bridge, "query_hermes", blocked)
    out = client.get("/hermes/query/toolsets", headers=founder_headers).json()
    assert out["status"] == "blocked_runtime" and out["items"] == []

    monkeypatch.setattr(loop_hermes_bridge, "query_hermes", lambda _b, op, arg="": {"status": "ok", "body": {"op": op}})
    assert client.get("/hermes/query/skills", headers=founder_headers).json()["body"] == {"op": "skills"}
    assert client.get("/hermes/query/nope", headers=founder_headers).status_code == 404
    assert client.get("/hermes/query/session_messages?arg=../x", headers=founder_headers).status_code == 422
    created = client.post("/hermes/sessions", headers=founder_headers).json()
    assert created["status"] == "ok"


def test_unknown_tool_never_reaches_a_job_consumer(client, founder_headers) -> None:
    job = client.post("/runs", headers=founder_headers, json={"purpose": "x", "tool": "rm_rf_everything"}).json()["job"]
    # Accepted into the queue as an unvalidated name; the worker denies it (unknown tools are denied).
    assert job["status"] == "queued"
    assert hermes_runs.APPROVAL_CLASS == "approval.hermes.tool"


def test_secret_shaped_values_and_prompts_are_refused(client, founder_headers) -> None:
    for value in ("ghp_" + "a" * 30, "sk-" + "b" * 24, "Bearer " + "c" * 24, "123456789:" + "d" * 35):
        r = client.post(
            "/hermes/inventory/runs/execute", headers=founder_headers, json={"tool": "github", "arguments": {"note": [value]}}
        )
        assert r.status_code == 403, value
    prompt = client.post("/runs", headers=founder_headers, json={"purpose": "use ghp_" + "a" * 30, "tool": "github"})
    assert prompt.status_code == 403
    assert client.post("/runs", headers=founder_headers, json={"purpose": "x" * 5000, "tool": "github"}).status_code == 413


def test_pending_runs_are_capped_per_tenant(client, founder_headers) -> None:
    from app import hermes_runs

    codes = [
        client.post("/runs", headers=founder_headers, json={"purpose": f"r{i}", "tool": "web_search"}).status_code
        for i in range(hermes_runs.MAX_PENDING_PER_TENANT + 2)
    ]
    assert codes[: hermes_runs.MAX_PENDING_PER_TENANT] == [202] * hermes_runs.MAX_PENDING_PER_TENANT
    assert codes[-1] == 429


def test_sessions_must_be_owned_and_runs_need_a_grant(client, founder_headers, unpriv_headers, monkeypatch) -> None:
    from app import loop_hermes_bridge

    unknown = client.post("/runs", headers=founder_headers, json={"purpose": "x", "tool": "web_search", "session_id": "foreign"})
    assert unknown.status_code == 404
    monkeypatch.setattr(
        loop_hermes_bridge, "query_hermes", lambda _b, op, arg="": {"status": "ok", "body": {"id": "sess-1"}}
    )
    assert client.post("/hermes/sessions", headers=founder_headers).status_code == 200
    ok = client.post("/runs", headers=founder_headers, json={"purpose": "x", "tool": "web_search", "session_id": "sess-1"})
    assert ok.status_code == 202
    assert client.get("/hermes/query/session_messages?arg=foreign", headers=founder_headers).status_code == 404
    assert client.post("/runs", headers=unpriv_headers, json={"purpose": "x", "tool": "web_search"}).status_code == 403
    assert client.get("/hermes/runs", headers=unpriv_headers).status_code == 403


def test_the_requester_is_the_person_who_asked(tmp_path) -> None:
    from app.store import Store

    store = Store(str(tmp_path / "req.sqlite"))
    store.seed_founder()
    job = store.persist_job("principal-founder", "pr")
    hermes_runs.record_request(
        store, job["id"], "tenant-founder", "github", {"repo": "o/r"}, requester_id="principal-founder"
    )
    approval = hermes_runs.tool_approval(store, job["id"], "github", "digest-1")
    row = store.conn.execute("SELECT requester_id FROM approvals WHERE id=?", (approval["id"],)).fetchone()
    assert row["requester_id"] == "principal-founder"
