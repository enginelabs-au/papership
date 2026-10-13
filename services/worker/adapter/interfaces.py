"""D-04 adapter interfaces. UnwiredAdapter stays network-free."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator, Protocol


class RuntimeAdapter(Protocol):
    def start_run(self, **kwargs: Any) -> dict[str, Any]: ...

    def subscribe(self, run_id: str, last_event_id: str | None = None) -> Iterator[dict[str, Any]]: ...

    def stop(self, run_id: str) -> Any: ...

    def forward_approval(self, run_id: str, decision: dict[str, Any]) -> Any: ...

    def capabilities_check(self) -> dict[str, Any]: ...


from adapter.approvals import resolve_owned_approval
from policy_hooks.interception import (
    ApprovalPending,
    PolicyError,
    ScopeViolation,
    allow_tool,
    intercept_tool_call,
    is_side_effecting,
    prompt_gate,
    tool_calls_from_event,
)
from policy_hooks.startup import load_toolsets, validate_startup


def _default_config() -> dict[str, Any]:
    """Load toolsets.yaml and fail closed if the interception artefact or catalog hash no longer match."""
    worker_root = Path(__file__).resolve().parents[1]
    config = load_toolsets(worker_root / "config" / "toolsets.yaml")
    validate_startup(config, root=worker_root)
    return config


class UnwiredAdapter:
    """Typed adapter with no network and no Hermes client."""

    def start_run(self, **kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("Hermes is not wired in phase 1")

    def subscribe(self, run_id: str, last_event_id: str | None = None) -> Iterator[dict[str, Any]]:
        raise RuntimeError("Hermes is not wired in phase 1")
        yield {}  # pragma: no cover

    def stop(self, run_id: str) -> None:
        raise RuntimeError("Hermes is not wired in phase 1")

    def forward_approval(self, run_id: str, decision: dict[str, Any]) -> None:
        raise RuntimeError("Hermes is not wired in phase 1")

    def capabilities_check(self) -> dict[str, Any]:
        return {"hermes": "not_configured", "wired": False}


class HermesRuntimeAdapter:
    """Typed D-04 operations. Policy runs before any Hermes call."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or _default_config()

    def intercept(self, name: str, arguments: dict[str, Any] | None = None, **hooks: Any) -> dict[str, Any]:
        return intercept_tool_call(
            self.config,
            name,
            arguments,
            persist_receipt=hooks.get("persist_receipt"),
            persist_approval=hooks.get("persist_approval"),
            require_approved=bool(hooks.get("require_approved")),
            approval_covered=bool(hooks.get("approval_covered")),
        )

    def start_run(self, **kwargs: Any) -> dict[str, Any]:
        """Policy first, Hermes second.

        Hermes picks its own tools from the prompt, so unless the prompt is Papership-generated
        (`trusted_purpose=True`) a human must approve the exact (tool, arguments, prompt, session)
        before Hermes is called. External tools need that approval regardless.
        """
        declared = str(kwargs.get("tool") or "")
        purpose = str(kwargs.get("purpose") or "run")
        session_id = kwargs.get("session_id")
        bound = {**(kwargs.get("arguments") or {}), "_purpose": purpose, "_session_id": session_id or ""}
        if declared:
            if not allow_tool(self.config, declared):
                raise PolicyError(f"policy refused tool {declared!r}")
            try:
                if not kwargs.get("trusted_purpose"):
                    prompt_gate(kwargs.get("persist_approval"), declared, bound)
                self.intercept(
                    declared,
                    bound,
                    persist_receipt=kwargs.get("persist_receipt"),
                    persist_approval=kwargs.get("persist_approval"),
                    require_approved=True,
                )
            except ApprovalPending as exc:
                return {"status": "awaiting_approval", "tool": declared, "approval": exc.approval, "purpose": purpose}
        from adapter.hermes_client import probe_hermes, start_run as hermes_start

        probe = probe_hermes()
        if probe.get("api_server") is not True:
            return {
                "status": "blocked_runtime",
                "reason": "hermes_api_server_unavailable",
                "probe": {k: probe.get(k) for k in ("hermes", "mode", "api_server", "http_status")},
                "purpose": purpose,
            }
        if not declared:
            raise PolicyError("catalogued tool= is required for live Hermes runs")
        user_args = kwargs.get("arguments") or {}
        extra = None
        if user_args and not kwargs.get("trusted_purpose"):
            # Hermes receives exactly what was approved: the prompt, the tool, and its arguments.
            extra = {"input": f"{purpose}\n\nTool: {declared}\nArguments: {json.dumps(user_args, sort_keys=True, default=str)}"}
        code, body = hermes_start(
            purpose=purpose,
            idempotency_key=str(kwargs.get("idempotency_key") or ""),
            session_id=session_id,
            **({"extra": extra} if extra else {}),
        )
        replayed = code == 202 and bool((body or {}).get("idempotency_replayed") or body.get("Idempotency-Replayed"))
        return {
            "status": "accepted" if code in {200, 201, 202} else "error",
            "http_status": code,
            "body": body,
            "replayed": replayed,
            "tool": declared,
        }

    def subscribe(
        self,
        run_id: str,
        last_event_id: str | None = None,
        *,
        declared_tool: str | None = None,
        **hooks: Any,
    ) -> Iterator[dict[str, Any]]:
        """Observe a run and stop it on anything unexpected.

        Stops on: a side-effecting tool outside `declared_tool`, an unknown tool, a tool event that
        cannot be read, or a stream that cannot be read to its end. Hermes may already have executed
        an observed call; the stop limits the blast radius and the receipt records it. The run-level
        approval is the primary gate.
        """
        from adapter.hermes_client import StreamUnavailable, stream_events

        declared = (declared_tool or "").lower()
        try:
            for event in stream_events(run_id, last_event_id):
                for name, args in tool_calls_from_event(event):
                    if declared and name.lower() != declared and is_side_effecting(name):
                        raise ScopeViolation(declared_tool or "", name)
                    self.intercept(
                        name,
                        args,
                        persist_receipt=hooks.get("persist_receipt"),
                        persist_approval=hooks.get("persist_approval"),
                        require_approved=True,
                        approval_covered=bool(declared and name.lower() == declared),
                    )
                yield event
        except StreamUnavailable as exc:
            self._stop_quietly(run_id)
            raise PolicyError(f"run could not be observed ({exc})") from exc
        except PolicyError:
            self._stop_quietly(run_id)
            raise

    def _stop_quietly(self, run_id: str) -> None:
        try:
            self.stop(run_id)
        except Exception:  # stopping is best effort; the policy error is what the caller needs
            pass

    def stop(self, run_id: str) -> dict[str, Any]:
        from adapter.hermes_client import stop_run

        code, body = stop_run(run_id)
        return {"http_status": code, "body": body}

    def forward_approval(self, run_id: str, decision: dict[str, Any], persist=None) -> dict[str, Any]:
        from adapter.hermes_client import resolve_approval

        def _forward(rid: str, dec: dict[str, Any]) -> dict[str, Any]:
            code, body = resolve_approval(rid, dec)
            return {"http_status": code, "body": body}

        if persist is None:
            raise RuntimeError("approval persist is required")
        return resolve_owned_approval(run_id, decision, persist=persist, forward=_forward)

    def capabilities_check(self) -> dict[str, Any]:
        from adapter.hermes_client import documented_capabilities, probe_hermes

        probe = probe_hermes()
        docs = documented_capabilities()
        return {**probe, "documented": docs}


class HermesHealthAdapter(HermesRuntimeAdapter):
    """Backward-compatible name: now the runtime adapter."""
