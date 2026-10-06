"""Bridge founder loop stages to Hermes via the worker process (keeps API_SERVER_KEY off the API)."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

from app.hermes_health import probe_hermes_api_server


def _hermes_env_paths() -> tuple[Path, ...]:
    return (
        Path.home() / ".config/papership/hermes-api-server.env",
        Path.home() / ".config/orgos/hermes-api-server.env",
    )


def _parse_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        out[key.strip()] = val.strip().strip('"').strip("'")
    return out


def _worker_root() -> Path:
    return Path(__file__).resolve().parents[2] / "worker"


def loop_hermes_unavailable_detail(probe: dict[str, Any]) -> str:
    status = probe.get("status") or "unknown"
    if status == "not_configured":
        return (
            "Hermes Host is not configured. Set HERMES_API_BASE_URL (typically "
            "http://127.0.0.1:8642 after bash scripts/hermes-tunnel.sh to HostHatch). "
            "Founder loop Start/Advance will not fake success."
        )
    if status == "serve_ui":
        return (
            "HERMES_API_BASE_URL points at the Hermes login UI, not the API server. "
            "Use the gateway port (8642 via tunnel), not serve (9119)."
        )
    if status == "unreachable":
        return (
            "Hermes Host is unreachable at HERMES_API_BASE_URL. "
            "Start the SSH tunnel to HostHatch and confirm GET /health on :8642."
        )
    if probe.get("api_server") is False:
        return (
            "Hermes is reachable but the Host API server is not listening "
            "(need /v1/capabilities with API_SERVER_KEY on the worker/VPS)."
        )
    return "Hermes Host is required for the founder loop but is not ready."


def assert_loop_hermes_ready(base_url: str) -> dict[str, Any]:
    probe = probe_hermes_api_server(base_url)
    if probe.get("status") not in {"reachable"} or probe.get("api_server") is not True:
        raise LoopHermesUnavailableError(loop_hermes_unavailable_detail(probe), probe=probe)
    return probe


class LoopHermesUnavailableError(Exception):
    def __init__(self, detail: str, *, probe: dict[str, Any] | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.probe = probe or {}


def dispatch_loop_stage(
    *,
    base_url: str,
    stage: str,
    work_item_id: str,
    job_id: str,
    work_title: str,
    bound_repo: str,
) -> dict[str, Any]:
    assert_loop_hermes_ready(base_url)
    worker = _worker_root()
    payload = {
        "stage": stage,
        "work_item_id": work_item_id,
        "job_id": job_id,
        "work_title": work_title,
        "bound_repo": bound_repo,
        "base_url": base_url.rstrip("/"),
    }
    env = os.environ.copy()
    env["HERMES_API_BASE_URL"] = base_url.rstrip("/")
    for path in _hermes_env_paths():
        if path.is_file():
            env.update(_parse_env_file(path))
            break
    if not (env.get("HERMES_API_SERVER_KEY") or "").strip():
        raise LoopHermesUnavailableError(
            "Hermes transport key is missing on this machine. "
            "Add HERMES_API_SERVER_KEY to ~/.config/papership/hermes-api-server.env "
            "(worker/VPS only — never on the API process).",
        )
    cmd = [
        "uv",
        "run",
        "python",
        "-m",
        "loop_hermes_dispatch",
        json.dumps(payload),
    ]
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(worker),
            env=env,
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise LoopHermesUnavailableError(
            f"Could not run Hermes loop dispatch ({type(exc).__name__}). "
            "Install worker deps with `cd services/worker && uv sync`.",
        ) from exc
    if proc.returncode != 0 and not proc.stdout.strip():
        stderr = (proc.stderr or "").strip()[:400]
        raise LoopHermesUnavailableError(
            f"Hermes loop dispatch failed (exit {proc.returncode}). {stderr}".strip(),
        )
    try:
        result = json.loads(proc.stdout.strip() or "{}")
    except json.JSONDecodeError as exc:
        raise LoopHermesUnavailableError("Hermes loop dispatch returned invalid JSON.") from exc
    if result.get("status") != "accepted":
        detail = str(result.get("detail") or loop_hermes_unavailable_detail(probe_hermes_api_server(base_url)))
        raise LoopHermesUnavailableError(detail, probe=result.get("probe"))
    return result
