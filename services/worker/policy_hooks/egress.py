"""SP-6: network tools cannot hit private, link-local, or cloud-metadata hosts."""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse

ALLOWED_EXACT = frozenset(
    {
        "127.0.0.1",
        "localhost",
        "api.github.com",
        "github.com",
        "openrouter.ai",
        "api.openrouter.ai",
        "hermes-agent.nousresearch.com",
    }
)

ALLOWED_SUFFIXES = (
    ".github.com",
    ".githubusercontent.com",
    ".openrouter.ai",
    ".nousresearch.com",
    ".vercel.com",
    ".vercel.app",
    ".enginelabs.com.au",
)

BLOCKED_EXACT = frozenset(
    {
        "169.254.169.254",
        "metadata.google.internal",
        "metadata.google.com",
    }
)

_URL_RE = re.compile(r"https?://[^\s\"']+", re.I)


class EgressDenied(Exception):
    def __init__(self, host: str) -> None:
        super().__init__(f"egress denied: {host}")
        self.host = host
        self.source = "policy"


def host_from_target(target: str) -> str:
    raw = (target or "").strip()
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    return (parsed.hostname or "").lower()


def _normalise_ip(host: str) -> str:
    """Resolve numeric host spellings (0x7f.0.0.1, 127.1, 2130706433) to dotted form."""
    if re.fullmatch(r"[0-9a-fx.]+", host, re.I) and any(c.isdigit() for c in host):
        try:
            return socket.inet_ntoa(socket.inet_aton(host))
        except OSError:
            return host
    return host


def _resolves_private(host: str) -> bool:
    """Best effort: deny when DNS returns a private address. A failed lookup is not a denial."""
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError):
        return False
    return any(_is_blocked_ip(info[4][0]) for info in infos)


def _is_blocked_ip(host: str) -> bool:
    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        return False
    return bool(
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
    )


def allow_egress(target: str) -> bool:
    host = host_from_target(target)
    if not host or host in BLOCKED_EXACT:
        return False
    if host in {"127.0.0.1", "localhost"}:
        return True
    normalised = _normalise_ip(host)
    if normalised != host or re.fullmatch(r"[0-9.]+", host):
        # A numeric spelling of any address is not a hostname; only the literal loopback above is allowed.
        if _is_blocked_ip(normalised) or normalised != host:
            return False
    if _is_blocked_ip(host):
        return False
    if host in ALLOWED_EXACT:
        return True
    if any(host.endswith(suffix) for suffix in ALLOWED_SUFFIXES):
        return True
    # Public DNS names (not raw private IPs) are allowed for web/browser research.
    if "." in host and not host.endswith(".local") and not host.endswith(".internal"):
        return not _resolves_private(host)
    return False


def assert_egress(target: str) -> None:
    if not allow_egress(target):
        raise EgressDenied(host_from_target(target) or target)


def _strings(value: object, depth: int = 0) -> list[tuple[str, str]]:
    """(key, text) for every string in nested arguments."""
    out: list[tuple[str, str]] = []
    if depth > 6:
        return out
    if isinstance(value, dict):
        for key, inner in value.items():
            if isinstance(inner, str):
                out.append((str(key), inner))
            else:
                out.extend(_strings(inner, depth + 1))
    elif isinstance(value, (list, tuple)):
        for inner in value:
            if isinstance(inner, str):
                out.append(("", inner))
            else:
                out.extend(_strings(inner, depth + 1))
    return out


def extract_targets(arguments: dict[str, object] | None) -> list[str]:
    if not arguments:
        return []
    found: list[str] = []
    pairs = _strings(arguments)
    for key, text in pairs:
        if key in ("url", "href", "host", "endpoint", "target") and text.strip():
            found.append(text.strip())
    found.extend(_URL_RE.findall(" ".join(text for _key, text in pairs)))
    return found
