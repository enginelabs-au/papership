"""Read Hermes catalogues through the worker (the only process that holds the transport key).

Usage: python -m hermes_query '{"op": "toolsets"}'. Prints one JSON object. Never invents a list.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any

SESSION_ID = re.compile(r"[A-Za-z0-9_-]{1,80}")
OPS = ("toolsets", "skills", "session_create", "session_messages")


def run(op: str, arg: str = "") -> dict[str, Any]:
    from adapter import hermes_client as h

    if op not in OPS:
        return {"status": "refused", "detail": "unknown op"}
    probe = h.probe_hermes()
    if probe.get("api_server") is not True:
        return {"status": "blocked_runtime", "probe": {k: probe.get(k) for k in ("hermes", "mode", "api_server")}}
    if op == "toolsets":
        code, body = h.list_toolsets()
    elif op == "skills":
        code, body = h.list_skills()
    elif op == "session_create":
        code, body = h.create_session({})
    else:
        if not SESSION_ID.fullmatch(arg or ""):
            return {"status": "refused", "detail": "invalid session id"}
        code, body = h.list_messages(arg)
    ok = code in {200, 201}
    return {"status": "ok" if ok else "error", "http_status": code, "body": body if ok else {}}


def main(argv: list[str] | None = None) -> int:
    raw = (argv or sys.argv)[1] if len(argv or sys.argv) > 1 else sys.stdin.read()
    payload = json.loads(raw)
    result = run(str(payload.get("op") or ""), str(payload.get("arg") or ""))
    sys.stdout.write(json.dumps(result))
    return 0 if result.get("status") == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
