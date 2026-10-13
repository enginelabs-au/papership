"""Telegram and WhatsApp inside Papership (B12, D-37).

Inbound: provider webhooks, signature-verified, land in the Inbox.
Outbound: compose -> pending approval bound to (recipient, text hash) -> human approves -> send -> receipt.
Credentials are read by name only (``messaging_secret``) and never stored, logged, or returned.
Only fixed provider hosts are contacted. No caller-supplied URL is ever fetched.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import TYPE_CHECKING, Any, Callable

from app.config import messaging_secret

if TYPE_CHECKING:
    from app.config import Settings
    from app.store import Store

TELEGRAM_HOST = "https://api.telegram.org"
WHATSAPP_HOST = "https://graph.facebook.com"
WHATSAPP_API_VERSION = "v21.0"
APPROVAL_CLASS = "approval.comms.send"
MAX_TEXT = 3500
MAX_WEBHOOK_BYTES = 262_144
MAX_INBOUND_PER_DELIVERY = 50
_TG_TOKEN = re.compile(r"\d{6,12}:[A-Za-z0-9_-]{20,80}")
_WA_ID = re.compile(r"\d{5,25}")
_WA_TOKEN = re.compile(r"[A-Za-z0-9_.~+=-]{20,600}")
PROVIDERS = {
    "telegram": {
        "required": ("TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"),
        "webhook_path": "/webhooks/telegram",
    },
    "whatsapp": {
        "required": (
            "WHATSAPP_ACCESS_TOKEN",
            "WHATSAPP_PHONE_NUMBER_ID",
            "WHATSAPP_VERIFY_TOKEN",
            "WHATSAPP_APP_SECRET",
        ),
        "webhook_path": "/webhooks/whatsapp",
    },
}

# Injected in tests. Takes (url, json_body, headers) and returns (status, parsed_json).
HttpPost = Callable[[str, dict[str, Any], dict[str, str]], tuple[int, dict[str, Any]]]


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_a: Any, **_k: Any) -> None:  # a redirect could carry the token elsewhere
        return None


_opener = urllib.request.build_opener(_NoRedirect)


def _http_post(url: str, body: dict[str, Any], headers: dict[str, str]) -> tuple[int, dict[str, Any]]:
    if not (url.startswith(TELEGRAM_HOST + "/") or url.startswith(WHATSAPP_HOST + "/")):
        raise ValueError("egress denied: not a messaging provider host")
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Content-Type": "application/json", **headers},
    )
    try:
        with _opener.open(req, timeout=15) as resp:  # noqa: S310 - fixed https hosts only
            raw = resp.read(1_000_000)
            code = getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        raw = exc.read(1_000_000)
        code = exc.code
    except Exception:  # noqa: BLE001 - never surface an exception that may embed the token-bearing URL
        return 503, {"error": "unreachable"}
    try:
        parsed = json.loads(raw.decode() or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return code, {}
    return code, parsed if isinstance(parsed, dict) else {}


def _bridge_post(url: str, body: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """POST to the loopback Hermes bridge. Only the configured loopback origin, fixed /send path, no redirects."""
    if not (url.startswith(bridge_url() + "/") and bridge_url()) or not url.endswith("/send"):
        raise ValueError("egress denied: not the Hermes bridge")
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), method="POST", headers={"Content-Type": "application/json"}
    )
    try:
        with _opener.open(req, timeout=20) as resp:  # noqa: S310 - loopback only
            raw, code = resp.read(100_000), getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        raw, code = exc.read(100_000), exc.code
    except Exception:  # noqa: BLE001
        return 503, {"error": "bridge unreachable"}
    try:
        parsed = json.loads(raw.decode() or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return code, {}
    return code, parsed if isinstance(parsed, dict) else {}


http_post: HttpPost = _http_post
bridge_post: Callable[[str, dict[str, Any]], tuple[int, dict[str, Any]]] = _bridge_post


_COLUMNS = (
    "id, tenant_id, provider, direction, peer, peer_label, body, external_id, status, target_id, target_version, created_at"
)


def _create(store: Store) -> None:
    store.conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messaging_messages (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          direction TEXT NOT NULL,
          peer TEXT NOT NULL,
          peer_label TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL,
          external_id TEXT NOT NULL,
          status TEXT NOT NULL,
          target_id TEXT NOT NULL DEFAULT '',
          target_version TEXT NOT NULL DEFAULT '',
          approval_id TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          UNIQUE (tenant_id, provider, direction, external_id)
        )
        """
    )
    store.conn.execute(
        """CREATE UNIQUE INDEX IF NOT EXISTS messaging_one_send_per_approval
           ON messaging_messages (approval_id) WHERE approval_id <> ''"""
    )


def migrate(store: Store) -> None:
    cols = {r["name"] for r in store.conn.execute("PRAGMA table_info(messaging_messages)").fetchall()}
    if cols and "approval_id" not in cols:
        # Pre-release shape (global unique key). Rebuild tenant-scoped, keeping rows.
        store.conn.execute("ALTER TABLE messaging_messages RENAME TO messaging_messages_old")
        _create(store)
        store.conn.execute(f"INSERT OR IGNORE INTO messaging_messages ({_COLUMNS}) SELECT {_COLUMNS} FROM messaging_messages_old")
        store.conn.execute("DROP TABLE messaging_messages_old")
    else:
        _create(store)
    store.flush()


_BRIDGE_URL = re.compile(r"http://(?:127\.0\.0\.1|localhost):\d{2,5}")


def bridge_url() -> str:
    """The Hermes WhatsApp bridge, only ever on loopback (reached through the SSH tunnel). Empty if unset or invalid."""
    value = messaging_secret("WHATSAPP_BRIDGE_URL").strip().rstrip("/")
    return value if _BRIDGE_URL.fullmatch(value) else ""


def _cloud_missing() -> list[str]:
    return [n for n in PROVIDERS["whatsapp"]["required"] if not messaging_secret(n)]


def whatsapp_mode() -> str:
    """cloud = official Meta Cloud API (send and receive). bridge = Hermes personal-number bridge (send only)."""
    if not _cloud_missing():
        return "cloud"
    return "bridge" if bridge_url() else "none"


def missing_env(provider: str) -> list[str]:
    spec = PROVIDERS.get(provider)
    if spec is None:
        return []
    if provider == "whatsapp" and whatsapp_mode() == "bridge":
        return []
    return [name for name in spec["required"] if not messaging_secret(name)]


def readiness(provider: str) -> dict[str, Any]:
    missing = missing_env(provider)
    return {"ready": not missing, "missing_env": missing}


def webhook_url(settings: Settings, provider: str) -> str:
    base = (settings.api_public_url or settings.api_base_url).rstrip("/")
    return f"{base}{PROVIDERS[provider]['webhook_path']}"


def annotate(item: dict[str, Any], settings: Settings) -> dict[str, Any]:
    """Add readiness to a connection row. Names only, never values."""
    provider = item.get("id") or item.get("provider")
    if provider not in PROVIDERS:
        return item
    state = readiness(provider)
    item["messaging_ready"] = state["ready"]
    item["missing_env"] = state["missing_env"]
    item["webhook_url"] = webhook_url(settings, provider)
    item["actions"] = {"read": "webhook", "send": "approval_then_receipt"}
    if provider == "whatsapp" and whatsapp_mode() == "bridge":
        item["mode"] = "bridge"
        item["actions"] = {"read": "none", "send": "approval_then_receipt"}
        item["status"] = "configured"
        item["handoff"] = (
            "Send-only through the Hermes WhatsApp bridge (your personal number). Incoming WhatsApp stays with "
            "Hermes. Send needs an approval, then returns a receipt. The tunnel to the VPS must be up."
        )
        return item
    if state["ready"]:
        if item.get("enabled"):
            item["status"] = "configured"
            item["handoff"] = "Connected. Inbound lands in Inbox. Send needs an approval, then returns a receipt."
        else:
            item["status"] = "configured"
            item["handoff"] = "Credentials are present. Press Connect to enable the channel."
    else:
        item["status"] = "unavailable"
        item["handoff"] = "Add " + ", ".join(state["missing_env"]) + " to the API host, then press Connect."
    return item


def _connection_tenants(store: Store, provider: str) -> list[str]:
    """The tenant that owns this deployment's bot. Credentials are global, so more than one owner is ambiguous."""
    rows = store.conn.execute(
        "SELECT tenant_id FROM connections WHERE provider=? AND enabled=1", (provider,)
    ).fetchall()
    tenants = [r["tenant_id"] for r in rows]
    return tenants if len(tenants) == 1 else []


def connect(store: Store, principal_id: str, provider: str) -> dict[str, Any]:
    from app.connectors import get_connector
    from app.store import StoreError, _id

    spec = get_connector(provider)
    if spec is None or provider not in PROVIDERS:
        raise StoreError("unknown provider", 403)
    if not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: org.admin", 403)
    state = readiness(provider)
    p = store.principal(principal_id)
    status = "configured" if state["ready"] else "unavailable"
    enabled = 1 if state["ready"] else 0
    now = _now()
    existing = store.conn.execute(
        "SELECT id FROM connections WHERE tenant_id=? AND provider=?", (p["tenant_id"], provider)
    ).fetchone()
    if existing:
        cid = existing["id"]
        store.conn.execute(
            "UPDATE connections SET status=?, enabled=?, last_sync=? WHERE id=?",
            (status, enabled, now if enabled else None, cid),
        )
    else:
        cid = _id("conn")
        store.conn.execute(
            """INSERT INTO connections
               (id, tenant_id, provider, status, destination_class, enabled, last_sync, lineage, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)""",
            (cid, p["tenant_id"], provider, status, spec["destination_class"], enabled, now if enabled else None, now),
        )
    store.append_audit(principal_id, "connection.connect", "connection", provider)
    store.flush()
    return {
        "id": cid,
        "provider": provider,
        "status": status,
        "enabled": bool(enabled),
        "destination_class": spec["destination_class"],
        "missing_env": state["missing_env"],
    }


# ---- inbound -------------------------------------------------------------------------------


def _ingest(store: Store, tenant_id: str, provider: str, peer: str, label: str, text: str, external_id: str) -> bool:
    from app.store import _id

    text = (text or "").strip()
    if not text or not external_id:
        return False
    cur = store.conn.execute(
        """INSERT OR IGNORE INTO messaging_messages
           (id, tenant_id, provider, direction, peer, peer_label, body, external_id, status, created_at)
           VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, 'received', ?)""",
        (_id("msg"), tenant_id, provider, peer[:80], label[:80], text[:MAX_TEXT], external_id[:120], _now()),
    )
    if cur.rowcount == 0:
        return False  # duplicate delivery
    store.conn.execute(
        """INSERT INTO inbox_threads (id, tenant_id, subject, preview, channel, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (_id("thr"), tenant_id, f"{provider.title()} · {label or peer}"[:120], text[:160], provider, _now()),
    )
    store.flush()
    return True


def verify_telegram(secret_header: str | None) -> bool:
    expected = messaging_secret("TELEGRAM_WEBHOOK_SECRET")
    return bool(expected) and bool(secret_header) and hmac.compare_digest(expected.encode(), (secret_header or "").encode())


def verify_whatsapp_signature(raw_body: bytes, header: str | None) -> bool:
    secret = messaging_secret("WHATSAPP_APP_SECRET")
    if not secret or not header or not header.startswith("sha256="):
        return False
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest.encode(), header[len("sha256=") :].encode())


def verify_whatsapp_challenge(mode: str, token: str, challenge: str) -> str | None:
    expected = messaging_secret("WHATSAPP_VERIFY_TOKEN")
    if mode == "subscribe" and expected and token and hmac.compare_digest(expected.encode(), token.encode()):
        return challenge
    return None


def ingest_telegram(store: Store, update: dict[str, Any]) -> int:
    message = update.get("message") or update.get("channel_post") or {}
    if not isinstance(message, dict):
        return 0
    chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
    sender = message.get("from") if isinstance(message.get("from"), dict) else {}
    label = sender.get("username") or sender.get("first_name") or str(chat.get("title") or chat.get("id") or "")
    peer = str(chat.get("id") or "")
    external = f"{peer}:{message.get('message_id')}"
    stored = 0
    for tenant in _connection_tenants(store, "telegram"):
        stored += int(_ingest(store, tenant, "telegram", peer, str(label), str(message.get("text") or ""), external))
    return stored


def ingest_whatsapp(store: Store, payload: dict[str, Any]) -> int:
    stored = 0
    tenants = _connection_tenants(store, "whatsapp")
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            if str((value.get("metadata") or {}).get("phone_number_id") or "") != messaging_secret("WHATSAPP_PHONE_NUMBER_ID"):
                continue  # addressed to some other number
            names = {c.get("wa_id"): (c.get("profile") or {}).get("name", "") for c in value.get("contacts") or []}
            for msg in (value.get("messages") or [])[:MAX_INBOUND_PER_DELIVERY]:
                if not isinstance(msg, dict) or msg.get("type") != "text":
                    continue
                peer = str(msg.get("from") or "")
                for tenant in tenants:
                    stored += int(
                        _ingest(
                            store,
                            tenant,
                            "whatsapp",
                            peer,
                            names.get(peer) or peer,
                            str((msg.get("text") or {}).get("body") or ""),
                            str(msg.get("id") or ""),
                        )
                    )
    return stored


# ---- outbound ------------------------------------------------------------------------------


def text_digest(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:32]


def _clean(provider: str, to: str, text: str) -> tuple[str, str]:
    from app.store import StoreError

    to = (to or "").strip()
    text = (text or "").strip()
    if provider == "whatsapp" and whatsapp_mode() == "bridge":
        digits = to.lstrip("+")
        if not (digits.isdigit() and 7 <= len(digits) <= 15):
            raise StoreError("recipient must be a phone number with country code, digits only", 422)
        to = digits
    if not to or len(to) > 40 or not all(c.isalnum() or c in "+-_@" for c in to):
        raise StoreError("recipient is invalid", 422)
    if not text or len(text) > MAX_TEXT:
        raise StoreError("message text is empty or too long", 422)
    return to, text


def compose(store: Store, principal_id: str, provider: str, to: str, text: str) -> dict[str, Any]:
    """Create the pending approval the send will be bound to. Sends nothing."""
    from app.store import StoreError

    if provider not in PROVIDERS:
        raise StoreError("unknown provider", 403)
    if not (store.has_grant(principal_id, "comms.draft") or store.has_grant(principal_id, "comms.send") or store.has_grant(principal_id, "org.admin")):
        raise StoreError("denied: comms.draft", 403)
    to, text = _clean(provider, to, text)
    p = store.principal(principal_id)
    target_id = f"{provider}:{to}"
    version = text_digest(text)
    tenant = p["tenant_id"]
    pending = _approval_row(store, tenant, target_id, version, "pending")
    if pending:
        approval = {"id": pending["id"], "status": "pending"}  # same recipient and text: one pending approval
    else:
        approval = store.decide_approval(
            approval_class=APPROVAL_CLASS,
            requester_id=principal_id,
            decider_id=principal_id,
            target_id=target_id,
            target_version=version,
            tenant_id=tenant,
            decision="requested",
        )
    from app.store import _id

    store.conn.execute(
        """INSERT OR IGNORE INTO messaging_messages
           (id, tenant_id, provider, direction, peer, peer_label, body, external_id, status,
            target_id, target_version, created_at)
           VALUES (?, ?, ?, 'outbound', ?, '', ?, ?, 'draft', ?, ?, ?)""",
        (_id("msg"), tenant, provider, to, text, f"draft:{approval['id']}", target_id, version, _now()),
    )
    store.flush()
    return {
        "provider": provider,
        "approval_id": approval["id"],
        "status": approval["status"],
        "approval_class": APPROVAL_CLASS,
        "target_id": target_id,
        "target_version": version,
        "sent": False,
    }


def _telegram_token() -> str:
    from app.store import StoreError

    token = messaging_secret("TELEGRAM_BOT_TOKEN").strip()
    if not _TG_TOKEN.fullmatch(token):
        raise StoreError("TELEGRAM_BOT_TOKEN is not in the expected format", 503)
    return token


def _provider_send(provider: str, to: str, text: str) -> tuple[int, dict[str, Any], str]:
    from app.store import StoreError

    if provider == "telegram":
        code, body = http_post(f"{TELEGRAM_HOST}/bot{_telegram_token()}/sendMessage", {"chat_id": to, "text": text}, {})
        ok = code == 200 and body.get("ok") is True
        mid = str((body.get("result") or {}).get("message_id") or "")
        return (200 if ok else code or 502), body, mid
    if whatsapp_mode() == "bridge":
        code, body = bridge_post(f"{bridge_url()}/send", {"chatId": f"{to}@s.whatsapp.net", "message": text})
        mid = str(body.get("messageId") or "")
        return (200 if code == 200 and body.get("success") is True else code or 502), body, mid
    number_id = messaging_secret("WHATSAPP_PHONE_NUMBER_ID").strip()
    access = messaging_secret("WHATSAPP_ACCESS_TOKEN").strip()
    if not _WA_ID.fullmatch(number_id) or not _WA_TOKEN.fullmatch(access):
        raise StoreError("WhatsApp credentials are not in the expected format", 503)
    code, body = http_post(
        f"{WHATSAPP_HOST}/{WHATSAPP_API_VERSION}/{number_id}/messages",
        {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}},
        {"Authorization": f"Bearer {access}"},
    )
    mid = str(((body.get("messages") or [{}])[0]).get("id") or "")
    return code, body, mid


def _approval_row(store: Store, tenant_id: str, target_id: str, version: str, status: str) -> dict[str, Any] | None:
    row = store.conn.execute(
        """SELECT * FROM approvals
           WHERE tenant_id=? AND approval_class=? AND target_id=? AND target_version=? AND status=?
           ORDER BY rowid DESC LIMIT 1""",
        (tenant_id, APPROVAL_CLASS, target_id, version, status),
    ).fetchone()
    return store.row_to_dict(row) if row else None  # type: ignore[return-value]


def send_approved(
    store: Store, principal_id: str, provider: str, to: str, text: str, approval_id: str = ""
) -> dict[str, Any]:
    """Deliver only for an approved record bound to exactly this recipient and text.

    One approval is one send: the claim row is unique per approval, so a concurrent or repeated call
    returns the first receipt (or a conflict) and never delivers twice.
    """
    from app.store import StoreError, _id

    if provider not in PROVIDERS:
        raise StoreError("unknown provider", 403)
    if not (store.has_grant(principal_id, "comms.send") or store.has_grant(principal_id, "org.admin")):
        raise StoreError("denied: comms.send", 403)
    to, text = _clean(provider, to, text)
    state = readiness(provider)
    if not state["ready"]:
        raise StoreError("credentials missing: " + ", ".join(state["missing_env"]), 503)
    p = store.principal(principal_id)
    tenant = p["tenant_id"]
    connected = store.conn.execute(
        "SELECT 1 FROM connections WHERE tenant_id=? AND provider=? AND enabled=1", (tenant, provider)
    ).fetchone()
    if not connected:
        raise StoreError("connect the channel first", 409)
    target_id = f"{provider}:{to}"
    version = text_digest(text)
    approval = _approval_row(store, tenant, target_id, version, "approved")
    if not approval or (approval_id and approval["id"] != approval_id):
        raise StoreError("approval not live", 403)
    rid = _id("msg")
    claimed = store.conn.execute(
        """INSERT OR IGNORE INTO messaging_messages
           (id, tenant_id, provider, direction, peer, peer_label, body, external_id, status,
            target_id, target_version, approval_id, created_at)
           VALUES (?, ?, ?, 'outbound', ?, '', ?, ?, 'sending', ?, ?, ?, ?)""",
        (rid, tenant, provider, to, text, f"claim:{approval['id']}", target_id, version, approval["id"], _now()),
    )
    if claimed.rowcount == 0:
        prior = store.conn.execute(
            "SELECT * FROM messaging_messages WHERE approval_id=? AND tenant_id=?", (approval["id"], tenant)
        ).fetchone()
        if prior and prior["status"] == "sent":
            return {
                "status": "receipt", "provider": provider, "dry_run": False, "replayed": True,
                "message_id": prior["external_id"], "receipt_id": prior["id"], "approval_id": approval["id"],
            }
        if prior and prior["status"] == "failed":
            retry = store.conn.execute(
                "UPDATE messaging_messages SET status='sending' WHERE id=? AND status='failed'", (prior["id"],)
            )
            if retry.rowcount == 0:
                raise StoreError("this send is already in progress", 409)
            rid = prior["id"]
        else:
            raise StoreError("this send is already in progress", 409)
    store.flush()
    try:
        code, _body, mid = _provider_send(provider, to, text)
    except StoreError:
        store.conn.execute("UPDATE messaging_messages SET status='failed' WHERE id=?", (rid,))
        store.flush()
        raise
    ok = code in (200, 201) and bool(mid)
    store.conn.execute(
        "UPDATE messaging_messages SET status=?, external_id=? WHERE id=?",
        ("sent" if ok else "failed", (mid or f"claim:{approval['id']}") if ok else f"claim:{approval['id']}", rid),
    )
    store.append_audit(principal_id, f"messaging.send.{'ok' if ok else 'failed'}", "connection", provider)
    store.flush()
    if not ok:
        raise StoreError(f"{provider} refused the send (http {code})", 502)
    return {
        "status": "receipt",
        "provider": provider,
        "dry_run": False,
        "replayed": False,
        "message_id": mid,
        "receipt_id": rid,
        "approval_id": approval["id"],
    }


def register_telegram_webhook(
    store: Store, settings: Settings, principal_id: str, confirm_takeover: bool = False
) -> dict[str, Any]:
    from app.store import StoreError

    if not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: org.admin", 403)
    state = readiness("telegram")
    if not state["ready"]:
        raise StoreError("credentials missing: " + ", ".join(state["missing_env"]), 503)
    if not confirm_takeover:
        # Telegram allows one receiver per bot. A webhook stops any other poller (for example the
        # Hermes gateway) from receiving this bot's messages.
        raise StoreError(
            "Registering a webhook takes this bot's incoming messages away from any other receiver "
            "(such as Hermes). Send still works without it. Confirm to take over.",
            409,
        )
    url = webhook_url(settings, "telegram")
    if not url.startswith("https://"):
        raise StoreError("Telegram needs a public https ENGINE_API_PUBLIC_URL", 409)
    token = _telegram_token()
    code, body = http_post(
        f"{TELEGRAM_HOST}/bot{token}/setWebhook",
        {"url": url, "secret_token": messaging_secret("TELEGRAM_WEBHOOK_SECRET"), "allowed_updates": ["message"]},
        {},
    )
    if code != 200 or body.get("ok") is not True:
        raise StoreError(f"Telegram refused setWebhook (http {code})", 502)
    store.append_audit(principal_id, "messaging.telegram.webhook", "connection", "telegram")
    return {"provider": "telegram", "webhook": "registered", "url": url}


def list_messages(store: Store, tenant_id: str, provider: str, limit: int = 50) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        """SELECT id, provider, direction, peer, peer_label, body, status, created_at
           FROM messaging_messages WHERE tenant_id=? AND provider=? ORDER BY created_at DESC, rowid DESC LIMIT ?""",
        (tenant_id, provider, limit),
    ).fetchall()
    return [store.row_to_dict(r) for r in rows]  # type: ignore[misc]
