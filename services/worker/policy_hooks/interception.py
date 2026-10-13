"""Policy owns tool allow/deny. Prompts cannot override (SP-5 / MEM-22)."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from policy_hooks.catalog import lookup
from policy_hooks.egress import EgressDenied, assert_egress, extract_targets

PersistFn = Callable[[str, dict[str, Any]], dict[str, Any] | None]
POLICY_VERSION = "d17-2026-09-11"


def action_binding_hash(
    name: str,
    arguments: dict[str, Any] | None = None,
    *,
    target_id: str = "",
    target_version: str = "",
    policy_version: str = POLICY_VERSION,
) -> str:
    """AUTH-10: hash of action type, canonical parameters, target, policy version."""
    payload = {
        "action_type": name,
        "parameters": arguments or {},
        "policy_version": policy_version,
        "target_id": target_id,
        "target_version": target_version,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _target_id(args: dict[str, Any]) -> str:
    for key in ("target_id", "path", "url", "to", "repo"):
        value = args.get(key)
        if value:
            return str(value)
    return ""


def target_id_of(args: dict[str, Any]) -> str:
    return _target_id(args)


def binding_digest(name: str, args: dict[str, Any]) -> str:
    return action_binding_hash(
        name,
        args,
        target_id=_target_id(args),
        target_version=str(args.get("target_version") or ""),
    )


def _bind_persist(persist: PersistFn, name: str, args: dict[str, Any]) -> dict[str, Any] | None:
    digest = action_binding_hash(
        name,
        args,
        target_id=_target_id(args),
        target_version=str(args.get("target_version") or ""),
    )
    saved = persist(name, args)
    if not saved:
        return None
    echoed = saved.get("auth10")
    if echoed is not None and echoed != digest:
        raise PolicyError("AUTH-10 hash mismatch")
    return {**saved, "auth10": digest}


class PolicyError(Exception):
    """Raised when Papership policy refuses a tool. Never a model refusal."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail
        self.source = "policy"


def prompt_gate(persist_approval: PersistFn | None, name: str, args: dict[str, Any]) -> dict[str, Any]:
    """A free-text prompt decides which tools Hermes uses, so a human approves that exact prompt first."""
    if persist_approval is None:
        raise PolicyError("a free-text run needs a Papership approval record")
    approval = _bind_persist(persist_approval, name, args)
    if not approval:
        raise PolicyError("API must own the approval record")
    if approval.get("status") != "approved":
        raise ApprovalPending(name, approval)
    return approval


class ApprovalPending(PolicyError):
    """External tool is catalogued but its Papership approval is not yet `approved`."""

    def __init__(self, tool: str, approval: dict[str, Any]) -> None:
        super().__init__(f"external tool {tool!r} awaits an approved Papership approval")
        self.tool = tool
        self.approval = approval


class ScopeViolation(PolicyError):
    """Hermes attempted a side-effecting tool other than the one Papership declared."""

    def __init__(self, declared: str, observed: str) -> None:
        super().__init__(f"tool {observed!r} is outside the declared scope {declared!r}")
        self.declared = declared
        self.observed = observed


def classify_tool(name: str) -> str | None:
    found = lookup(name)
    return found[0] if found else None


def is_side_effecting(name: str) -> bool:
    found = lookup(name)
    return found is not None and found[1] != "read"


def allow_tool(config: dict[str, Any], name: str) -> bool:
    found = lookup(name)
    if found is None:
        return False
    toolset, risk = found
    if risk == "read":
        return True
    if config.get("interception_verified") is not True:
        return False
    spec = (config.get("side_effecting_toolsets") or {}).get(toolset) or {}
    return spec.get("enabled") is True


def intercept_tool_call(
    config: dict[str, Any],
    name: str,
    arguments: dict[str, Any] | None = None,
    prompt: str | None = None,
    *,
    persist_receipt: PersistFn | None = None,
    persist_approval: PersistFn | None = None,
    require_approved: bool = False,
    approval_covered: bool = False,
) -> dict[str, Any]:
    """Allow catalogued tools under risk class. Unknown tools are denied.

    `prompt` is ignored: injection text cannot override policy.
    """
    _ = prompt
    args = arguments or {}
    if not allow_tool(config, name):
        raise PolicyError(f"policy refused tool {name!r}")
    found = lookup(name)
    assert found is not None
    _toolset, risk = found
    for target in extract_targets(args):
        try:
            assert_egress(target)
        except EgressDenied as exc:
            raise PolicyError(str(exc)) from exc
    record: dict[str, Any] = {"tool": name, "risk": risk}
    if risk in {"external", "destructive"} and not approval_covered:
        if persist_approval is None:
            raise PolicyError("external tool requires an Papership approval record")
        approval = _bind_persist(persist_approval, name, args)
        if not approval:
            raise PolicyError("API must own the approval record")
        record["approval"] = approval
        if require_approved and approval.get("status") != "approved":
            raise ApprovalPending(name, approval)
    if risk in {"write", "external", "destructive"}:
        if persist_receipt is None:
            raise PolicyError("write tool requires an Papership receipt")
        saved = _bind_persist(persist_receipt, name, args)
        if not saved:
            raise PolicyError("API must own the tool receipt")
        record["receipt"] = saved
    return record


_TOOLISH = ("tool", "function_call", "function-call", "tool_use")
_MAX_DEPTH = 6


def _coerce_args(raw: Any) -> dict[str, Any]:
    """Arguments may arrive as a JSON string (OpenAI style). Unparseable arguments are refused."""
    if raw is None or raw == "":
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise PolicyError("tool arguments are not parseable") from exc
        if isinstance(parsed, dict):
            return parsed
    raise PolicyError("tool arguments are not an object")


def _name_of(node: dict[str, Any]) -> str:
    for key in ("name", "tool_name", "tool", "function"):
        value = node.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            inner = value.get("name") or value.get("tool_name")
            if isinstance(inner, str) and inner.strip():
                return inner.strip()
    return ""


def _args_of(node: dict[str, Any]) -> Any:
    for key in ("arguments", "args", "input", "parameters"):
        if key in node:
            return node[key]
    fn = node.get("function")
    if isinstance(fn, dict):
        for key in ("arguments", "args", "input"):
            if key in fn:
                return fn[key]
    return None


def _walk(node: Any, out: list[tuple[str, dict[str, Any]]], depth: int = 0) -> None:
    if depth > _MAX_DEPTH:
        raise PolicyError("event nesting too deep to inspect")
    if isinstance(node, list):
        for item in node:
            _walk(item, out, depth + 1)
        return
    if not isinstance(node, dict):
        return
    typ = " ".join(
        str(node.get(k) or "").lower() for k in ("type", "event", "object", "kind")
    )
    toolish = any(t in typ for t in _TOOLISH) or isinstance(node.get("function"), dict) or "tool_calls" in node
    name = _name_of(node)
    if toolish and name:
        out.append((name, _coerce_args(_args_of(node))))
    elif toolish and not name and any(t in typ for t in _TOOLISH) and "tool_calls" not in node:
        carried = False
        for key in ("item", "data", "payload", "call", "tool_call"):
            child = node.get(key)
            if isinstance(child, dict) and _name_of(child):
                out.append((_name_of(child), _coerce_args(_args_of(child) if _args_of(child) is not None else _args_of(node))))
                carried = True
        if not carried and not any(isinstance(v, (dict, list)) for v in node.values()):
            raise PolicyError("unrecognised tool event")
    for value in node.values():
        if isinstance(value, (dict, list)):
            _walk(value, out, depth + 1)


def _unwrap_bridge(found: list[tuple[str, dict[str, Any]]]) -> list[tuple[str, dict[str, Any]]]:
    """Hermes defers most tools behind `tool_call({calls: [{name, arguments}]})`. Judge the real tool, never the wrapper.

    `tool_call` itself is not catalogued, so a wrapper we cannot read is refused (fails closed).
    """
    out: list[tuple[str, dict[str, Any]]] = []
    for name, args in found:
        if name.lower() != "tool_call":
            out.append((name, args))
            continue
        calls = args.get("calls") if isinstance(args, dict) else None
        if not isinstance(calls, list) or not calls:
            raise PolicyError("tool_call wrapper has no readable calls")
        for entry in calls:
            inner = entry.get("name") if isinstance(entry, dict) else None
            if not isinstance(inner, str) or not inner.strip():
                raise PolicyError("tool_call wrapper has an unreadable call")
            inner_args = _coerce_args(entry.get("arguments"))
            if inner.lower() == "tool_call":
                raise PolicyError("nested tool_call wrappers are refused")
            out.append((inner.strip(), inner_args))
    return out


def tool_calls_from_event(event: dict[str, Any] | None) -> list[tuple[str, dict[str, Any]]]:
    """Every tool call an event may carry. Fails closed: a tool-typed event with no readable name is refused."""
    if not isinstance(event, dict):
        return []
    found: list[tuple[str, dict[str, Any]]] = []
    _walk(event, found)
    seen: set[tuple[str, str]] = set()
    unique = []
    for name, args in _unwrap_bridge(found):
        key = (name.lower(), json.dumps(args, sort_keys=True, default=str))
        if key not in seen:
            seen.add(key)
            unique.append((name, args))
    return unique


def tool_call_from_event(event: dict[str, Any] | None) -> tuple[str, dict[str, Any]] | None:
    """First tool call in an event, if any (compat). Use `tool_calls_from_event` for enforcement."""
    calls = tool_calls_from_event(event)
    return calls[0] if calls else None
