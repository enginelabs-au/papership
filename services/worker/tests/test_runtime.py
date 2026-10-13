from adapter.interfaces import HermesRuntimeAdapter, UnwiredAdapter
from policy_hooks.interception import PolicyError


def test_unwired_still_offline() -> None:
    adapter = UnwiredAdapter()
    assert adapter.capabilities_check()["wired"] is False


def test_idempotent_start_without_api(monkeypatch) -> None:
    monkeypatch.delenv("HERMES_API_BASE_URL", raising=False)
    adapter = HermesRuntimeAdapter()
    first = adapter.start_run(purpose="loop", idempotency_key="job-1:start")
    second = adapter.start_run(purpose="loop", idempotency_key="job-1:start")
    assert first["status"] == "blocked_runtime"
    assert second["status"] == "blocked_runtime"


def test_head_405_is_reachable_not_api_server(monkeypatch) -> None:
    from adapter.hermes_client import probe_hermes

    monkeypatch.setenv("HERMES_API_BASE_URL", "http://127.0.0.1:9")

    def fake_status(url, method, timeout):
        return 405 if method == "HEAD" else None

    monkeypatch.setattr("adapter.hermes_client._probe_status", fake_status)
    monkeypatch.setattr("adapter.hermes_client._get_json", lambda *_a, **_k: None)
    probe = probe_hermes()
    assert probe["hermes"] == "reachable"
    assert probe["api_server"] is False
    adapter = HermesRuntimeAdapter()
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: probe)
    assert adapter.start_run(purpose="x")["status"] == "blocked_runtime"


def test_head_405_plus_capabilities_401_is_api_server(monkeypatch) -> None:
    from adapter.hermes_client import probe_hermes

    monkeypatch.setenv("HERMES_API_BASE_URL", "http://127.0.0.1:9")
    monkeypatch.setattr("adapter.hermes_client._probe_status", lambda *_a, **_k: 405)
    monkeypatch.setattr("adapter.hermes_client._get_json", lambda *_a, **_k: {"unauthorized": True})
    probe = probe_hermes()
    assert probe["hermes"] == "reachable"
    assert probe["api_server"] is True
    adapter = HermesRuntimeAdapter()
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: probe)
    monkeypatch.setattr(
        "adapter.hermes_client.start_run",
        lambda **_k: (202, {"id": "run-1"}),
    )
    result = adapter.start_run(
        purpose="Reply with pong.", idempotency_key="job-live:start", tool="memory_read", trusted_purpose=True
    )
    assert result["status"] == "accepted"


def test_live_api_server_requires_catalogued_tool(monkeypatch) -> None:
    adapter = HermesRuntimeAdapter()
    monkeypatch.setattr(
        "adapter.hermes_client.probe_hermes",
        lambda: {"hermes": "reachable", "mode": "http", "api_server": True, "http_status": 401},
    )
    try:
        adapter.start_run(purpose="x", idempotency_key="job-notool")
    except PolicyError as exc:
        assert "tool=" in exc.detail
    else:
        raise AssertionError("live start_run must require catalogued tool=")


def test_redirect_probe_is_serve_ui_not_api_server(monkeypatch) -> None:
    from adapter.hermes_client import probe_hermes

    monkeypatch.setenv("HERMES_API_BASE_URL", "http://127.0.0.1:9")

    def fake_status(url, method, timeout):
        return 302

    monkeypatch.setattr("adapter.hermes_client._probe_status", fake_status)
    probe = probe_hermes()
    assert probe["mode"] == "serve_ui"
    assert probe["api_server"] is False
    adapter = HermesRuntimeAdapter()
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: probe)
    assert adapter.start_run(purpose="x")["status"] == "blocked_runtime"


def test_github_tool_requires_approval() -> None:
    adapter = HermesRuntimeAdapter()
    try:
        adapter.start_run(tool="github", arguments={"op": "open_pr"})
    except Exception as exc:
        assert "approval" in str(exc)
    else:
        raise AssertionError("github tool must persist approval")


def test_subscribe_intercepts_write_events(monkeypatch) -> None:
    events = [
        {"type": "message", "text": "hi"},
        {"type": "tool_call", "name": "terminal", "arguments": {"cmd": "ls"}},
    ]
    monkeypatch.setattr("adapter.hermes_client.stream_events", lambda *_a, **_k: iter(events))
    adapter = HermesRuntimeAdapter()
    try:
        list(adapter.subscribe("run-1"))
    except PolicyError as exc:
        assert "receipt" in exc.detail
    else:
        raise AssertionError("subscribe must intercept write tool events")
    receipts: list[str] = []
    monkeypatch.setattr("adapter.hermes_client.stream_events", lambda *_a, **_k: iter(events))
    out = list(
        adapter.subscribe(
            "run-1",
            persist_receipt=lambda n, a: receipts.append(n) or {"id": "r"},
        )
    )
    assert receipts == ["terminal"]
    assert out[1]["name"] == "terminal"
