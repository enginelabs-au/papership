"""API-side Hermes reachability. No bearer key. No customer content."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


def _status(url: str, method: str, timeout: float) -> int | None:
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        return exc.code
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def _classify(code: int | None) -> str | None:
    if code is None:
        return None
    if code in {301, 302, 303, 307, 308}:
        return "serve_ui"
    if code in {200, 204, 401, 405}:
        return "reachable"
    return "error"


def probe_hermes(base_url: str, timeout: float = 3.0) -> str:
    url = (base_url or "").rstrip("/")
    if not url:
        return "not_configured"
    target = f"{url}/health"
    # HEAD first: older gateway builds hung on GET /health. HEAD 405 is immediate.
    classified = _classify(_status(target, "HEAD", timeout))
    if classified is not None:
        return classified
    classified = _classify(_status(target, "GET", timeout))
    if classified is not None:
        return classified
    return "unreachable"


def _capabilities_probe(base_url: str, timeout: float) -> bool:
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/v1/capabilities",
        method="GET",
        headers={"Accept": "application/json", "User-Agent": "Papership-api-probe"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            return True
        raw = exc.read()
    except (urllib.error.URLError, TimeoutError, OSError):
        return False
    if not raw:
        return False
    try:
        body = json.loads(raw.decode())
    except json.JSONDecodeError:
        return False
    if isinstance(body, dict) and body.get("unauthorized") is True:
        return True
    return "run_submission" in json.dumps(body)


def probe_hermes_api_server(base_url: str, timeout: float = 3.0) -> dict[str, Any]:
    """Health probe plus whether the Host API server (not login UI) is listening."""
    url = (base_url or "").rstrip("/")
    status = probe_hermes(url, timeout=timeout)
    api_server = False
    if status == "reachable":
        api_server = _capabilities_probe(url, timeout)
    return {
        "status": status,
        "api_server": api_server,
        "configured": bool(url),
    }
