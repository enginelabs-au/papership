"""D-37: the five D-25 gaps plus the 2026-10-13 security review. Gates hold before and during a run."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[2] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from adapter.hermes_client import StreamUnavailable
from adapter.interfaces import HermesRuntimeAdapter
from jobs import consume_queued_jobs
from policy_hooks.interception import (
    ApprovalPending,
    PolicyError,
    ScopeViolation,
    tool_calls_from_event,
)

API_UP = {"hermes": "reachable", "mode": "http", "api_server": True, "http_status": 401}


@pytest.fixture()
def live(monkeypatch):
    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: API_UP)
    started: list[dict] = []

    def fake_start(**kwargs):
        started.append(kwargs)
        return 202, {"id": "hermes-run-1"}

    monkeypatch.setattr("adapter.hermes_client.start_run", fake_start)
    stopped: list[str] = []
    monkeypatch.setattr("adapter.hermes_client.stop_run", lambda rid: stopped.append(rid) or (200, {}))
    return started, stopped


class Approver:
    """Stand-in for the API approval store: pending until flipped."""

    def __init__(self) -> None:
        self.status = "pending"
        self.digests: list[str] = []

    def __call__(self, name, args):
        from policy_hooks.interception import binding_digest

        digest = binding_digest(name, args)
        self.digests.append(digest)
        return {"id": "a1", "status": self.status, "auth10": digest}


# ---- gap 1: accepted for write and external ------------------------------------------------


def test_write_tool_accepted_with_a_receipt_when_the_prompt_is_trusted(live) -> None:
    started, _ = live
    receipts: list[str] = []
    out = HermesRuntimeAdapter().start_run(
        purpose="write a note",
        idempotency_key="j:start",
        tool="write_file",
        arguments={"path": "notes/a.md"},
        trusted_purpose=True,
        persist_receipt=lambda n, a: receipts.append(n) or {"id": "r"},
    )
    assert out["status"] == "accepted" and receipts == ["write_file"] and len(started) == 1


def test_write_tool_without_receipt_hook_never_reaches_hermes(live) -> None:
    started, _ = live
    with pytest.raises(PolicyError, match="receipt"):
        HermesRuntimeAdapter().start_run(
            purpose="x", idempotency_key="j", tool="write_file", arguments={}, trusted_purpose=True
        )
    assert started == []


def test_free_text_run_waits_for_approval_even_for_a_read_tool(live) -> None:
    """Hermes chooses its own tools from the prompt, so the prompt itself is what a human approves."""
    started, _ = live
    approver = Approver()
    kwargs = dict(purpose="summarise the repo", idempotency_key="j", tool="memory_read", persist_approval=approver)
    pending = HermesRuntimeAdapter().start_run(**kwargs)
    assert pending["status"] == "awaiting_approval" and started == []
    approver.status = "approved"
    assert HermesRuntimeAdapter().start_run(**kwargs)["status"] == "accepted"
    assert len(started) == 1


def test_free_text_run_without_approval_hook_is_refused(live) -> None:
    started, _ = live
    with pytest.raises(PolicyError, match="approval"):
        HermesRuntimeAdapter().start_run(purpose="x", idempotency_key="j", tool="memory_read")
    assert started == []


def test_approval_binds_the_prompt_and_session(live) -> None:
    approver = Approver()
    base = dict(idempotency_key="j", tool="memory_read", persist_approval=approver)
    HermesRuntimeAdapter().start_run(purpose="read the notes", **base)
    HermesRuntimeAdapter().start_run(purpose="delete the notes", **base)
    HermesRuntimeAdapter().start_run(purpose="read the notes", session_id="s2", **base)
    assert len(set(approver.digests)) == 3  # a different prompt or session is a different approval


def test_external_tool_waits_then_is_accepted_with_both_records(live) -> None:
    started, _ = live
    approver = Approver()
    receipts: list[str] = []
    kwargs = dict(
        purpose="open pr",
        idempotency_key="j:start",
        tool="github",
        arguments={"repo": "o/r"},
        persist_receipt=lambda n, a: receipts.append(n) or {"id": "r"},
        persist_approval=approver,
    )
    assert HermesRuntimeAdapter().start_run(**kwargs)["status"] == "awaiting_approval"
    assert started == [] and receipts == []  # no receipt, no Hermes call before approval
    approver.status = "approved"
    assert HermesRuntimeAdapter().start_run(**kwargs)["status"] == "accepted"
    assert receipts == ["github"] and len(started) == 1


def test_unknown_tool_is_denied_before_any_network(live) -> None:
    started, _ = live
    with pytest.raises(PolicyError, match="refused"):
        HermesRuntimeAdapter().start_run(purpose="x", idempotency_key="j", tool="rm_rf_everything", arguments={})
    assert started == []


# ---- gap 2/3: scope and stop ---------------------------------------------------------------


def _events(monkeypatch, events):
    monkeypatch.setattr("adapter.hermes_client.stream_events", lambda *_a, **_k: iter(events))


def _run(adapter, **kw):
    return list(adapter.subscribe("run-9", persist_receipt=lambda n, a: {"id": "r"}, **kw))


def test_out_of_scope_write_stops_the_run(monkeypatch, live) -> None:
    _, stopped = live
    _events(monkeypatch, [{"type": "tool_call", "name": "terminal", "arguments": {"cmd": "ls"}}])
    with pytest.raises(ScopeViolation):
        _run(HermesRuntimeAdapter(), declared_tool="write_file")
    assert stopped == ["run-9"]


@pytest.mark.parametrize(
    "event",
    [
        {"type": "x", "data": {"item": {"type": "function_call", "name": "terminal", "arguments": {}}}},
        {"choices": [{"delta": {"tool_calls": [{"function": {"name": "terminal", "arguments": "{\"cmd\": \"ls\"}"}}]}}]},
        {"type": "tool_use", "tool": {"name": "terminal"}, "input": {"cmd": "ls"}},
        {"event": "hermes.tool.progress", "item": {"name": "TERMINAL", "arguments": {}}},
    ],
)
def test_nested_and_openai_shaped_tool_events_cannot_hide(monkeypatch, live, event) -> None:
    _, stopped = live
    _events(monkeypatch, [event])
    with pytest.raises(ScopeViolation):
        _run(HermesRuntimeAdapter(), declared_tool="write_file")
    assert stopped == ["run-9"]


def test_json_string_arguments_are_parsed_and_egress_checked(monkeypatch, live) -> None:
    _, stopped = live
    event = {"type": "tool_call", "name": "web_extract", "arguments": '{"opts": {"url": "http://169.254.169.254/latest"}}'}
    _events(monkeypatch, [event])
    with pytest.raises(PolicyError, match="egress"):
        _run(HermesRuntimeAdapter(), declared_tool="web_extract")
    assert stopped == ["run-9"]


def test_unparseable_arguments_stop_the_run(monkeypatch, live) -> None:
    _, stopped = live
    _events(monkeypatch, [{"type": "tool_call", "name": "web_extract", "arguments": "{not json"}])
    with pytest.raises(PolicyError, match="parseable"):
        _run(HermesRuntimeAdapter(), declared_tool="web_extract")
    assert stopped == ["run-9"]


def test_unknown_tool_event_stops_the_run(monkeypatch, live) -> None:
    _, stopped = live
    _events(monkeypatch, [{"type": "tool_call", "name": "mystery_tool", "arguments": {}}])
    with pytest.raises(PolicyError, match="refused"):
        _run(HermesRuntimeAdapter(), declared_tool="web_search")
    assert stopped == ["run-9"]


def test_tool_event_with_no_readable_name_fails_closed() -> None:
    with pytest.raises(PolicyError, match="unrecognised"):
        tool_calls_from_event({"type": "tool_call"})


def test_stream_failure_is_not_a_clean_completion(monkeypatch, live) -> None:
    _, stopped = live

    def broken(*_a, **_k):
        raise StreamUnavailable("TimeoutError")
        yield {}  # pragma: no cover

    monkeypatch.setattr("adapter.hermes_client.stream_events", broken)
    with pytest.raises(PolicyError, match="could not be observed"):
        _run(HermesRuntimeAdapter(), declared_tool="write_file")
    assert stopped == ["run-9"]


def test_read_tools_inside_a_scoped_run_are_allowed(monkeypatch, live) -> None:
    events = [{"type": "tool_call", "name": "memory_read", "arguments": {}}]
    _events(monkeypatch, events)
    assert list(HermesRuntimeAdapter().subscribe("run-11", declared_tool="write_file")) == events


def test_declared_tool_events_need_only_a_receipt_because_the_run_is_approved(monkeypatch, live) -> None:
    _, stopped = live
    receipts: list[str] = []
    _events(monkeypatch, [{"type": "tool_call", "name": "github", "arguments": {"repo": "o/r"}}])
    out = list(
        HermesRuntimeAdapter().subscribe(
            "run-12", declared_tool="github", persist_receipt=lambda n, a: receipts.append(n) or {"id": "r"}
        )
    )
    assert len(out) == 1 and receipts == ["github"] and stopped == []


def test_undeclared_external_event_without_an_approved_record_stops(monkeypatch, live) -> None:
    _, stopped = live
    _events(monkeypatch, [{"type": "tool_call", "name": "github", "arguments": {"repo": "o/r"}}])
    with pytest.raises(ApprovalPending):
        list(
            HermesRuntimeAdapter().subscribe(
                "run-10",
                persist_receipt=lambda n, a: {"id": "r"},
                persist_approval=lambda n, a: {"id": "a", "status": "pending"},
            )
        )
    assert stopped == ["run-10"]


# ---- gap 4/5: consumer end to end ----------------------------------------------------------


def _store(tmp_path):
    from app.store import Store

    store = Store(str(tmp_path / "d37.sqlite"))
    store.seed_founder()
    return store


def _approve(store, approval):
    from app import hermes_runs

    store.decide_approval(
        approval_class=hermes_runs.APPROVAL_CLASS,
        requester_id="worker",
        decider_id="principal-founder",
        target_id=approval["target_id"],
        target_version=approval["auth10"],
        tenant_id="tenant-founder",
        decision="approved",
    )


def test_consumer_end_to_end_external_approval_then_receipt(tmp_path, monkeypatch, live) -> None:
    from app import hermes_runs

    store = _store(tmp_path)
    monkeypatch.setattr("adapter.hermes_client.stream_events", lambda *_a, **_k: iter([]))
    job = store.persist_job("principal-founder", "open a pull request")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "github", {"repo": "o/r"})

    first = consume_queued_jobs(store)
    assert first[0]["status"] == "awaiting_approval"
    started, _ = live
    assert started == []  # nothing reaches Hermes before approval

    _approve(store, first[0]["approval"])
    second = consume_queued_jobs(store)
    assert second[0]["status"] == "completed" and len(started) == 1
    steps = {r["step_name"] for r in store.conn.execute("SELECT step_name FROM receipts WHERE job_id=?", (job["id"],))}
    assert {"tool.github", "worker.hermes_accepted", "worker.subscribed"} <= steps


def test_consumer_read_tool_with_free_text_also_needs_approval(tmp_path, live) -> None:
    from app import hermes_runs

    store = _store(tmp_path)
    job = store.persist_job("principal-founder", "summarise")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "web_search", {"q": "x"})
    assert consume_queued_jobs(store)[0]["status"] == "awaiting_approval"
    assert live[0] == []


def test_consumer_changed_arguments_need_a_new_approval(tmp_path, live) -> None:
    from app import hermes_runs

    store = _store(tmp_path)
    digests = []
    for repo in ("o/a", "o/b"):
        job = store.persist_job("principal-founder", f"pr {repo}")
        hermes_runs.record_request(store, job["id"], "tenant-founder", "github", {"repo": repo})
    for row in consume_queued_jobs(store):
        digests.append(row["approval"]["auth10"])
    assert len(set(digests)) == 2


def test_consumer_refuses_unknown_tool(tmp_path, live) -> None:
    from app import hermes_runs

    store = _store(tmp_path)
    job = store.persist_job("principal-founder", "bad")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "rm_rf_everything", {})
    out = consume_queued_jobs(store)
    assert out[0]["status"] == "refused"
    assert store.get_job(job["id"])["status"] == "failed"


def test_consumer_blocked_runtime_stays_queued_after_approval(tmp_path, monkeypatch) -> None:
    from app import hermes_runs

    monkeypatch.setattr("adapter.hermes_client.probe_hermes", lambda: {"hermes": "unreachable", "api_server": False})
    store = _store(tmp_path)
    job = store.persist_job("principal-founder", "note")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "write_file", {"path": "a.md"})
    pending = consume_queued_jobs(store)[0]
    assert pending["status"] == "awaiting_approval"
    _approve(store, pending["approval"])
    out = consume_queued_jobs(store)
    assert out[0]["status"] == "blocked_runtime"
    assert store.get_job(job["id"])["status"] == "queued"


def test_consumer_stream_failure_fails_the_job_not_completes_it(tmp_path, monkeypatch, live) -> None:
    from app import hermes_runs

    store = _store(tmp_path)
    job = store.persist_job("principal-founder", "pr")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "github", {"repo": "o/r"})
    _approve(store, consume_queued_jobs(store)[0]["approval"])

    def broken(*_a, **_k):
        raise StreamUnavailable("OSError")
        yield {}  # pragma: no cover

    monkeypatch.setattr("adapter.hermes_client.stream_events", broken)
    out = consume_queued_jobs(store)
    assert out[0]["status"] == "intercepted"
    assert store.get_job(job["id"])["status"] == "failed"
    assert live[1] == ["hermes-run-1"]


def test_consumer_without_a_run_id_fails_closed(tmp_path, monkeypatch, live) -> None:
    from app import hermes_runs

    monkeypatch.setattr("adapter.hermes_client.start_run", lambda **_k: (202, {}))
    store = _store(tmp_path)
    job = store.persist_job("principal-founder", "pr")
    hermes_runs.record_request(store, job["id"], "tenant-founder", "github", {"repo": "o/r"})
    _approve(store, consume_queued_jobs(store)[0]["approval"])
    out = consume_queued_jobs(store)
    assert out[0]["status"] == "intercepted"
    assert store.get_job(job["id"])["status"] == "failed"


def test_hermes_receives_the_approved_arguments(live) -> None:
    started, _ = live
    approver = Approver()
    approver.status = "approved"
    HermesRuntimeAdapter().start_run(
        purpose="open a pr", idempotency_key="j", tool="github", arguments={"repo": "o/r"},
        persist_receipt=lambda n, a: {"id": "r"}, persist_approval=approver,
    )
    assert '"repo": "o/r"' in started[0]["extra"]["input"] and "Tool: github" in started[0]["extra"]["input"]


def test_tool_call_wrapper_is_judged_by_the_real_tool_inside_it(monkeypatch, live) -> None:
    _, stopped = live
    wrapped = {"type": "tool_call", "name": "tool_call", "arguments": {"calls": [{"name": "terminal", "arguments": {"cmd": "ls"}}]}}
    _events(monkeypatch, [wrapped])
    with pytest.raises(ScopeViolation):  # a write hidden in the wrapper cannot ride on a declared read
        _run(HermesRuntimeAdapter(), declared_tool="web_search")
    assert stopped == ["run-9"]
    assert tool_calls_from_event(
        {"type": "tool_call", "name": "tool_call", "arguments": {"calls": [{"name": "todo", "arguments": "{\"a\": 1}"}]}}
    ) == [("todo", {"a": 1})]


@pytest.mark.parametrize("calls", [None, [], [{"arguments": {}}], [{"name": "tool_call", "arguments": {}}]])
def test_unreadable_or_nested_wrappers_are_refused(calls) -> None:
    with pytest.raises(PolicyError):
        tool_calls_from_event({"type": "tool_call", "name": "tool_call", "arguments": {"calls": calls}})


def test_bridge_discovery_tools_are_read_only_and_allowed() -> None:
    from policy_hooks.catalog import lookup

    assert lookup("tool_search") == ("bridge", "read") and lookup("tool_describe") == ("bridge", "read")
    assert lookup("tool_call") is None
