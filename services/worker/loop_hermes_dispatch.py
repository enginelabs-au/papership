"""Dispatch founder loop stages to Hermes Host API (worker-only transport key)."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from adapter.interfaces import HermesRuntimeAdapter

LOOP_HERMES_TOOL = "memory_read"


def stage_purpose(stage: str, work_title: str, bound_repo: str) -> str:
    label = stage.replace("_", " ")
    return (
        f"Papership Engine Labs founder loop — stage {label}. "
        f"Work item: {work_title}. Repository: {bound_repo}. "
        "Use read-only tools. Reply with one concise paragraph the founder can paste into the work ledger."
    )


def _run_id_from_body(body: dict[str, Any]) -> str | None:
    for key in ("id", "run_id", "runId"):
        val = body.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _summarize_run(body: dict[str, Any], *, http_status: int) -> str:
    status = body.get("status") or body.get("state")
    parts = [f"Hermes run accepted (HTTP {http_status})."]
    if status:
        parts.append(f"Status: `{status}`.")
    output = body.get("output") or body.get("result") or body.get("summary")
    if isinstance(output, str) and output.strip():
        parts.append(output.strip()[:1200])
    elif isinstance(output, dict):
        text = output.get("text") or output.get("content")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip()[:1200])
    return "\n\n".join(parts)


def dispatch_loop_stage(
    *,
    stage: str,
    work_item_id: str,
    job_id: str,
    work_title: str,
    bound_repo: str,
    base_url: str | None = None,
) -> dict[str, Any]:
    if base_url:
        os.environ["HERMES_API_BASE_URL"] = base_url.rstrip("/")
    adapter = HermesRuntimeAdapter()
    probe = adapter.capabilities_check()
    if probe.get("api_server") is not True:
        return {
            "status": "blocked_runtime",
            "detail": (
                "Hermes Host API server is not available at HERMES_API_BASE_URL "
                "(need gateway on :8642 via tunnel, not the login UI on :9119)."
            ),
            "probe": {k: probe.get(k) for k in ("hermes", "mode", "api_server", "http_status", "wired")},
            "tool": LOOP_HERMES_TOOL,
        }
    purpose = stage_purpose(stage, work_title, bound_repo)
    idempotency_key = f"{job_id}:{stage}:{work_item_id}"
    started = adapter.start_run(
        purpose=purpose,
        idempotency_key=idempotency_key,
        tool=LOOP_HERMES_TOOL,
    )
    if started.get("status") != "accepted":
        return {
            "status": started.get("status") or "error",
            "detail": started.get("reason") or "Hermes did not accept the loop run.",
            "probe": started.get("probe"),
            "tool": LOOP_HERMES_TOOL,
            "purpose": purpose,
            "http_status": started.get("http_status"),
            "body": started.get("body"),
        }
    body = started.get("body") if isinstance(started.get("body"), dict) else {}
    run_id = _run_id_from_body(body)
    summary = _summarize_run(body, http_status=int(started.get("http_status") or 202))
    if run_id:
        from adapter.hermes_client import get_run

        code, run_body = get_run(run_id)
        if isinstance(run_body, dict) and code in {200, 201}:
            summary = _summarize_run(run_body, http_status=code)
    return {
        "status": "accepted",
        "run_id": run_id,
        "http_status": started.get("http_status"),
        "tool": LOOP_HERMES_TOOL,
        "purpose": purpose,
        "idempotency_key": idempotency_key,
        "summary": summary,
        "body": body,
        "replayed": started.get("replayed"),
    }


def main(argv: list[str] | None = None) -> int:
    raw = (argv or sys.argv)[1] if len((argv or sys.argv)) > 1 else sys.stdin.read()
    payload = json.loads(raw)
    result = dispatch_loop_stage(**payload)
    sys.stdout.write(json.dumps(result))
    return 0 if result.get("status") == "accepted" else 1


if __name__ == "__main__":
    raise SystemExit(main())
