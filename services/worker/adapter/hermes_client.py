"""Hermes HTTP client. Transport key never logged. Desktop must not import this."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterator

from policy_hooks.env_allowlist import WORKER_ENV_ALLOWLIST


DOCUMENTED_API_SERVER = {
    "object": "hermes.api_server.capabilities",
    "pin": "v0.21.1",
    "features": {
        "run_submission": True,
        "run_status": True,
        "run_events_sse": True,
        "run_stop": True,
        "run_approval": True,
        "toolsets": True,
        "skills": True,
        "sessions": True,
    },
}


class StreamUnavailable(Exception):
    """The event stream could not be read to a clean end. Callers must treat the run as unobserved."""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):  # type: ignore[override]
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)
MAX_STREAM_EVENTS = 2000
MAX_STREAM_SECONDS = 120.0
_KEY_FILES = (
    Path.home() / ".config/papership/hermes-api-server.env",
    Path.home() / ".config/orgos/hermes-api-server.env",
)


def _open(req: urllib.request.Request, timeout: float):
    """Open without following redirects, so the bearer key never follows a Location header."""
    return _OPENER.open(req, timeout=timeout)


def _valid_base(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme == "https" and parsed.hostname:
        return True
    return parsed.scheme == "http" and (parsed.hostname or "") in {"127.0.0.1", "localhost", "::1"}


def hermes_base_url() -> str:
    url = (os.environ.get("HERMES_API_BASE_URL") or "").rstrip("/")
    return url if (not url or _valid_base(url)) else ""


def _key_from_file() -> str:
    for path in _KEY_FILES:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip().removeprefix("export ").strip()
            if line.startswith("HERMES_API_SERVER_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
        return ""
    return ""


def _transport_key() -> str:
    """Worker-only. The API process never calls this (D-37)."""
    if "HERMES_API_SERVER_KEY" not in WORKER_ENV_ALLOWLIST:
        return ""
    return os.environ.get("HERMES_API_SERVER_KEY") or _key_from_file()


def documented_capabilities() -> dict[str, Any]:
    probe = probe_hermes()
    payload = dict(DOCUMENTED_API_SERVER)
    payload["available_on_this_deployment"] = probe.get("api_server") is True
    payload["probe"] = {k: v for k, v in probe.items() if k != "detail"}
    return payload


def _probe_status(url: str, method: str, timeout: float) -> int | None:
    req = urllib.request.Request(url, method=method)
    try:
        with _open(req, timeout) as resp:
            return getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        return exc.code
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def probe_hermes(base_url: str | None = None, timeout: float = 3.0) -> dict[str, Any]:
    url = (base_url or hermes_base_url()).rstrip("/")
    if url and not _valid_base(url):
        return {"hermes": "not_configured", "wired": False, "api_server": False}
    if not url:
        return {"hermes": "not_configured", "wired": False, "api_server": False}
    target = f"{url}/health"
    # HEAD first: older gateway builds hung on GET /health. HEAD 405 is immediate.
    code = _probe_status(target, "HEAD", timeout)
    if code is None:
        code = _probe_status(target, "GET", timeout)
    if code is None:
        return {"hermes": "unreachable", "wired": False, "api_server": False, "detail": "TimeoutError"}
    if code in {301, 302, 303, 307, 308}:
        return {
            "hermes": "reachable",
            "wired": True,
            "http_status": code,
            "mode": "serve_ui",
            "api_server": False,
            "pin": os.environ.get("HERMES_VERSION_PIN", ""),
        }
    if code in {200, 204, 401, 405}:
        # HEAD 405 is reachability only. api_server is proven by capabilities
        # 401 (key required) or an advertised run_submission feature — never by 405.
        caps = _get_json(url, "/v1/capabilities", timeout=timeout)
        api = isinstance(caps, dict) and (
            caps.get("unauthorized") is True or "run_submission" in str(caps)
        )
        return {
            "hermes": "reachable",
            "wired": True,
            "http_status": code,
            "mode": "http",
            "api_server": bool(api),
            "pin": os.environ.get("HERMES_VERSION_PIN", ""),
        }
    return {"hermes": "error", "wired": False, "api_server": False, "http_status": code}


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "User-Agent": "Papership-worker"}
    key = _transport_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    return headers


def _get_json(base: str, path: str, timeout: float = 8.0) -> Any:
    req = urllib.request.Request(f"{base}{path}", method="GET", headers=_headers())
    try:
        with _open(req, timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        if exc.code in {301, 302, 303, 307, 308}:
            return {"redirect": True, "status": exc.code}
        if exc.code == 401:
            return {"unauthorized": True}
        return {"error": exc.code}
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    if not raw:
        return {}
    try:
        return json.loads(raw.decode())
    except json.JSONDecodeError:
        return None


def request_json(
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
    timeout: float = 20.0,
    base_url: str | None = None,
) -> tuple[int, Any]:
    base = (base_url or hermes_base_url()).rstrip("/")
    if not base or not _valid_base(base):
        return 503, {"detail": "HERMES_API_BASE_URL is not set or not https/loopback"}
    headers = _headers()
    headers.update(extra_headers or {})
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{base}{path}", data=data, method=method, headers=headers)
    try:
        with _open(req, timeout) as resp:
            raw = resp.read()
            code = getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        code = exc.code
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return 503, {"detail": type(exc).__name__}
    body: Any = {}
    if raw:
        try:
            body = json.loads(raw.decode())
        except json.JSONDecodeError:
            body = {"raw": raw.decode(errors="replace")[:200]}
    return code, body


def start_run(
    *,
    purpose: str,
    idempotency_key: str,
    session_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any]]:
    payload = {"purpose": purpose, **(extra or {})}
    if "input" not in payload:
        payload["input"] = purpose
    if session_id:
        payload["session_id"] = session_id
    code, body = request_json(
        "POST",
        "/v1/runs",
        payload=payload,
        extra_headers={"Idempotency-Key": idempotency_key},
    )
    return code, body if isinstance(body, dict) else {"detail": body}


def get_run(run_id: str) -> tuple[int, dict[str, Any]]:
    code, body = request_json("GET", f"/v1/runs/{run_id}")
    return code, body if isinstance(body, dict) else {"detail": body}


def stop_run(run_id: str) -> tuple[int, dict[str, Any]]:
    code, body = request_json("POST", f"/v1/runs/{run_id}/stop", payload={})
    return code, body if isinstance(body, dict) else {"detail": body}


def resolve_approval(run_id: str, decision: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    code, body = request_json("POST", f"/v1/runs/{run_id}/approval", payload=decision)
    return code, body if isinstance(body, dict) else {"detail": body}


def stream_events(run_id: str, last_event_id: str | None = None) -> Iterator[dict[str, Any]]:
    """Yield run events. Any transport failure raises `StreamUnavailable`; it never ends silently."""
    base = hermes_base_url()
    if not base:
        raise StreamUnavailable("no valid HERMES_API_BASE_URL")
    path = f"/v1/runs/{urllib.parse.quote(run_id, safe='')}/events"
    if last_event_id:
        path += f"?after={urllib.parse.quote(last_event_id, safe='')}"
    req = urllib.request.Request(f"{base}{path}", method="GET", headers=_headers())
    started = time.monotonic()
    count = 0
    try:
        with _open(req, 30) as resp:
            for raw in resp:
                if time.monotonic() - started > MAX_STREAM_SECONDS or count >= MAX_STREAM_EVENTS:
                    raise StreamUnavailable("event stream exceeded its bound")
                line = raw.decode(errors="replace").strip()
                if line.startswith("data:"):
                    chunk = line[5:].strip()
                    if chunk:
                        count += 1
                        try:
                            yield json.loads(chunk)
                        except json.JSONDecodeError:
                            yield {"raw": chunk}
    except (urllib.error.URLError, TimeoutError, OSError, urllib.error.HTTPError) as exc:
        raise StreamUnavailable(type(exc).__name__) from exc


def list_toolsets() -> tuple[int, Any]:
    return request_json("GET", "/v1/toolsets")


def list_skills() -> tuple[int, Any]:
    return request_json("GET", "/v1/skills")


def create_session(payload: dict[str, Any] | None = None) -> tuple[int, Any]:
    return request_json("POST", "/api/sessions", payload=payload or {})


def list_messages(session_id: str) -> tuple[int, Any]:
    return request_json("GET", f"/api/sessions/{session_id}/messages")
