import json

import hermes_query


def test_unknown_op_refused() -> None:
    assert hermes_query.run("rm")["status"] == "refused"


def test_blocked_when_api_server_down(monkeypatch) -> None:
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: {"hermes": "unreachable", "api_server": False})
    out = hermes_query.run("toolsets")
    assert out["status"] == "blocked_runtime"


def test_reads_catalogues_and_validates_session_id(monkeypatch) -> None:
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: {"api_server": True})
    monkeypatch.setattr("adapter.hermes_client.list_toolsets", lambda: (200, {"toolsets": ["web"]}))
    monkeypatch.setattr("adapter.hermes_client.list_skills", lambda: (200, {"skills": []}))
    monkeypatch.setattr("adapter.hermes_client.create_session", lambda _p=None: (201, {"id": "s1"}))
    monkeypatch.setattr("adapter.hermes_client.list_messages", lambda sid: (200, {"id": sid}))
    assert hermes_query.run("toolsets")["body"] == {"toolsets": ["web"]}
    assert hermes_query.run("skills")["status"] == "ok"
    assert hermes_query.run("session_create")["body"]["id"] == "s1"
    assert hermes_query.run("session_messages", "../etc")["status"] == "refused"
    assert hermes_query.run("session_messages", "abc-1")["body"] == {"id": "abc-1"}


def test_upstream_error_is_not_dressed_as_ok(monkeypatch) -> None:
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: {"api_server": True})
    monkeypatch.setattr("adapter.hermes_client.list_toolsets", lambda: (500, {"detail": "x"}))
    out = hermes_query.run("toolsets")
    assert out["status"] == "error" and out["body"] == {}
    json.dumps(out)
