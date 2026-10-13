"""Claim queued Papership jobs, start Hermes runs under policy, persist receipts and approvals.

No Hermes key on the API: only this worker process talks to Hermes (D-17, D-37).
"""

from __future__ import annotations

from typing import Any

from adapter.interfaces import HermesRuntimeAdapter
from policy_hooks.interception import ApprovalPending, PolicyError, ScopeViolation, binding_digest


def _hooks(store: Any, job_id: str) -> dict[str, Any]:
    def persist_receipt(name: str, args: dict[str, Any]) -> dict[str, Any]:
        digest = binding_digest(name, args)
        return store.add_receipt(job_id, f"tool.{name}", f"{job_id}:tool:{name}:{digest[:16]}")

    def persist_approval(name: str, args: dict[str, Any]) -> dict[str, Any]:
        return store.hermes_tool_approval(job_id, name, binding_digest(name, args))

    return {"persist_receipt": persist_receipt, "persist_approval": persist_approval}


def _consume_hermes_request(store: Any, adapter: HermesRuntimeAdapter, job: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    job_id = job["id"]
    tool = request["tool"]
    hooks = _hooks(store, job_id)
    try:
        started = adapter.start_run(
            purpose=str(job.get("purpose") or "run"),
            idempotency_key=f"{job_id}:start",
            tool=tool,
            arguments=request.get("arguments") or {},
            session_id=request.get("session_id") or None,
            **hooks,
        )
    except PolicyError as exc:
        store.set_hermes_state(job_id, "refused", exc.detail)
        store.add_receipt(job_id, "worker.refused", f"{job_id}:refused")
        store.fail_job(job_id, exc.detail)
        return {"id": job_id, "status": "refused", "detail": exc.detail}
    status = started.get("status")
    if status == "awaiting_approval":
        store.set_hermes_state(job_id, "awaiting_approval", "approve target in Papership approvals")
        store.add_receipt(job_id, "worker.awaiting_approval", f"{job_id}:awaiting_approval")
        return {"id": job_id, "status": "awaiting_approval", "approval": started.get("approval")}
    if status == "blocked_runtime":
        store.set_hermes_state(job_id, "blocked_runtime", str(started.get("reason") or ""))
        store.add_receipt(job_id, "worker.blocked_runtime", f"{job_id}:blocked_runtime")
        return {"id": job_id, "status": "blocked_runtime", "detail": started.get("reason")}
    if status != "accepted":
        store.set_hermes_state(job_id, "error", f"http {started.get('http_status')}")
        store.fail_job(job_id, f"hermes http {started.get('http_status')}")
        return {"id": job_id, "status": "error", "detail": started.get("http_status")}
    body = started.get("body") if isinstance(started.get("body"), dict) else {}
    run_id = str(body.get("id") or body.get("run_id") or body.get("runId") or "")
    store.claim_job(job_id)
    if not run_id:
        # An unobserved run cannot be stopped or scoped. Fail closed.
        store.set_hermes_state(job_id, "intercepted", "Hermes returned no run id, so the run cannot be observed")
        store.add_receipt(job_id, "worker.intercepted", f"{job_id}:intercepted")
        store.fail_job(job_id, "no run id")
        return {"id": job_id, "status": "intercepted", "detail": "no run id"}
    store.set_hermes_state(job_id, "running", "", run_id)
    store.add_receipt(job_id, "worker.hermes_accepted", f"{job_id}:hermes_accepted")
    try:
        events = list(adapter.subscribe(run_id, declared_tool=tool, **hooks))
    except (ScopeViolation, ApprovalPending, PolicyError) as exc:
        store.set_hermes_state(job_id, "intercepted", exc.detail)
        store.add_receipt(job_id, "worker.intercepted", f"{job_id}:intercepted")
        store.fail_job(job_id, exc.detail)
        return {"id": job_id, "status": "intercepted", "detail": exc.detail}
    store.add_receipt(job_id, "worker.subscribed", f"{job_id}:subscribed")
    store.set_hermes_state(job_id, "completed", "", run_id)
    store.complete_job(job_id)
    return {"id": job_id, "status": "completed", "events": len(events), "run_id": run_id}


def consume_queued_jobs(store: Any, *, limit: int = 8) -> list[dict[str, Any]]:
    """Claim queued jobs, run Hermes under policy, write receipts. Safe if Hermes is down."""
    claimed: list[dict[str, Any]] = []
    adapter = HermesRuntimeAdapter()
    for job in store.list_queued_jobs(limit=limit):
        job_id = job["id"]
        getter = getattr(store, "get_hermes_request", None)
        request = getter(job_id) if getter else None
        if request and request.get("tool"):
            claimed.append(_consume_hermes_request(store, adapter, job, request))
            continue
        store.claim_job(job_id)
        try:
            store.add_receipt(job_id, "worker.claimed", f"{job_id}:claimed")
            events = list(
                adapter.subscribe(
                    job.get("run_id") or job_id,
                    persist_receipt=lambda name, _args, jid=job_id: store.add_receipt(
                        jid, f"tool.{name}", f"{jid}:tool:{name}"
                    ),
                )
            )
            store.add_receipt(job_id, "worker.subscribed", f"{job_id}:subscribed")
            store.complete_job(job_id)
            claimed.append({"id": job_id, "status": "completed", "events": len(events)})
        except PolicyError as exc:
            store.add_receipt(job_id, "worker.intercepted", f"{job_id}:intercepted")
            claimed.append({"id": job_id, "status": "intercepted", "detail": exc.detail})
        except Exception as exc:  # Hermes down or stream empty is non-fatal
            store.add_receipt(job_id, "worker.idle", f"{job_id}:idle")
            claimed.append({"id": job_id, "status": "idle", "detail": type(exc).__name__})
    return claimed
