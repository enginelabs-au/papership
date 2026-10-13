"""Gmail and Slack OAuth start + token exchange. Tokens are sealed and never returned."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from cryptography.fernet import Fernet

from app.config import Settings, oauth_secret
from app.connectors import get_connector
from app.store import Store, StoreError

GMAIL_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_TOKEN = "https://oauth2.googleapis.com/token"
GMAIL_SCOPES = " ".join(
    (
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
    )
)
SLACK_AUTHORIZE = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN = "https://slack.com/api/oauth.v2.access"
SLACK_SCOPES = "channels:read,users:read,chat:write"
STATE_TTL_SECONDS = 600


def oauth_readiness(settings: Settings) -> dict[str, str]:
    return {
        "gmail": _readiness(
            bool(settings.gmail_oauth_client_id),
            bool(oauth_secret("GMAIL_OAUTH_CLIENT_SECRET")),
        ),
        "slack": _readiness(
            bool(settings.slack_client_id),
            bool(oauth_secret("SLACK_CLIENT_SECRET")),
        ),
    }


def annotate_connection(row: dict[str, Any], settings: Settings) -> dict[str, Any]:
    item = dict(row)
    provider = item.get("id") or item.get("provider")
    ready = oauth_readiness(settings)
    if provider in ready:
        item["oauth_ready"] = ready[provider] == "ready"
        item["oauth"] = ready[provider]
        if item.get("has_token"):
            item["status"] = "configured"
            item["handoff"] = "Connected. Read and draft stay dry-run. Send stays approval-then-receipt."
        elif ready[provider] == "ready":
            item["status"] = "configured"
            item["handoff"] = "Continue in your browser. Papership never embeds the provider sign-in."
        elif ready[provider] == "missing_secret":
            item["handoff"] = "Client ID is present. Add the client secret on the API host, then retry."
    item.pop("token_blob", None)
    return item


def start_oauth_connect(store: Store, settings: Settings, principal_id: str, provider: str) -> dict[str, Any] | None:
    spec = get_connector(provider)
    if spec is None or provider not in {"gmail", "slack"}:
        return None
    client_id, redirect, secret_name = _client_parts(settings, provider)
    if not client_id:
        return None
    if not oauth_secret(secret_name):
        raise StoreError(f"{secret_name} is not set on the API host", 409)
    principal = store.principal(principal_id)
    nonce = secrets.token_urlsafe(24)
    expires_at = int(time.time()) + STATE_TTL_SECONDS
    store.save_oauth_state(nonce, provider, principal_id, principal["tenant_id"], expires_at)
    state = _sign_state(settings, nonce, provider, principal_id, expires_at)
    store.begin_oauth(principal_id, spec)
    if provider == "gmail":
        authorize_url = GMAIL_AUTHORIZE + "?" + urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect,
                "response_type": "code",
                "scope": GMAIL_SCOPES,
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
                "include_granted_scopes": "false",
            }
        )
    else:
        authorize_url = SLACK_AUTHORIZE + "?" + urlencode(
            {
                "client_id": client_id,
                "scope": SLACK_SCOPES,
                "redirect_uri": redirect,
                "state": state,
            }
        )
    return {
        "provider": provider,
        "status": "pending_oauth",
        "enabled": False,
        "authorize_url": authorize_url,
        "destination_class": spec["destination_class"],
    }


def complete_oauth_callback(
    store: Store,
    settings: Settings,
    provider: str,
    code: str,
    state: str,
) -> dict[str, str]:
    if provider not in {"gmail", "slack"}:
        return {"result": "error", "reason": "unknown_provider"}
    if not code or not state:
        return {"result": "error", "reason": "missing_code_or_state"}
    nonce = _state_nonce(state)
    if not nonce:
        return {"result": "error", "reason": "invalid_state"}
    pending = store.peek_oauth_state(nonce)
    if pending is None or pending["provider"] != provider:
        return {"result": "error", "reason": "invalid_state"}
    if not verify_state_against_row(
        settings, state, pending["provider"], pending["principal_id"], int(pending["expires_at"])
    ):
        return {"result": "error", "reason": "invalid_state"}
    row = store.consume_oauth_state(nonce)
    if row is None:
        return {"result": "error", "reason": "invalid_state"}
    secret_name = "GMAIL_OAUTH_CLIENT_SECRET" if provider == "gmail" else "SLACK_CLIENT_SECRET"
    if not oauth_secret(secret_name):
        return {"result": "error", "reason": "missing_secret"}
    try:
        token = exchange_code(settings, provider, code)
    except StoreError as exc:
        if exc.status_code == 409:
            return {"result": "error", "reason": "missing_secret"}
        return {"result": "error", "reason": "exchange_failed"}
    spec = get_connector(provider)
    if spec is None:
        return {"result": "error", "reason": "unknown_provider"}
    blob = seal_token(settings, token)
    store.store_oauth_token(row["principal_id"], spec, blob)
    return {"result": "ok", "reason": ""}


def exchange_code(settings: Settings, provider: str, code: str) -> dict[str, Any]:
    client_id, redirect, secret_name = _client_parts(settings, provider)
    secret = oauth_secret(secret_name)
    if not client_id or not secret:
        raise StoreError(f"{secret_name} is not set on the API host", 409)
    if provider == "gmail":
        payload = _post_form(
            GMAIL_TOKEN,
            {
                "code": code,
                "client_id": client_id,
                "client_secret": secret,
                "redirect_uri": redirect,
                "grant_type": "authorization_code",
            },
        )
        access = str(payload.get("access_token") or "")
        if not access:
            raise StoreError("gmail token exchange failed", 502)
        return {
            "provider": "gmail",
            "access_token": access,
            "refresh_token": str(payload.get("refresh_token") or ""),
            "token_type": str(payload.get("token_type") or "Bearer"),
            "scope": str(payload.get("scope") or GMAIL_SCOPES),
            "expires_in": int(payload.get("expires_in") or 0),
        }
    payload = _post_form(
        SLACK_TOKEN,
        {
            "code": code,
            "client_id": client_id,
            "client_secret": secret,
            "redirect_uri": redirect,
        },
    )
    if not payload.get("ok"):
        raise StoreError("slack token exchange failed", 502)
    access = str(payload.get("access_token") or "")
    if not access:
        raise StoreError("slack token exchange failed", 502)
    team = payload.get("team") if isinstance(payload.get("team"), dict) else {}
    return {
        "provider": "slack",
        "access_token": access,
        "refresh_token": str(payload.get("refresh_token") or ""),
        "token_type": str(payload.get("token_type") or "bot"),
        "scope": str(payload.get("scope") or SLACK_SCOPES),
        "expires_in": int(payload.get("expires_in") or 0),
        "team_id": str(team.get("id") or ""),
    }


def seal_token(settings: Settings, token: dict[str, Any]) -> str:
    body = dict(token)
    body["sealed_at"] = int(time.time())
    return _fernet(settings).encrypt(json.dumps(body).encode("utf-8")).decode("ascii")


def frontend_redirect(settings: Settings, provider: str, result: str, reason: str = "") -> str:
    origin = "http://localhost:5173"
    origins = [part.rstrip("/") for part in settings.cors_origins]
    vite = [part for part in origins if ":5173" in part]
    localhost = [part for part in vite if "localhost" in part]
    if localhost:
        origin = localhost[0]
    elif vite:
        origin = vite[0]
    else:
        preview = [part for part in origins if ":4173" in part]
        if preview:
            origin = preview[0]
    query = urlencode(
        {
            "oauth": provider,
            "result": result,
            "tab": "integrations",
            **({"reason": reason} if reason else {}),
        }
    )
    return f"{origin}/papership?{query}"


def _client_parts(settings: Settings, provider: str) -> tuple[str, str, str]:
    if provider == "gmail":
        return settings.gmail_oauth_client_id, settings.gmail_oauth_redirect_url, "GMAIL_OAUTH_CLIENT_SECRET"
    return settings.slack_client_id, settings.slack_oauth_redirect_url, "SLACK_CLIENT_SECRET"


def _readiness(has_id: bool, has_secret: bool) -> str:
    if has_id and has_secret:
        return "ready"
    if has_id:
        return "missing_secret"
    return "missing_client"


def _fernet(settings: Settings) -> Fernet:
    digest = hashlib.sha256(
        f"{settings.jwt_secret}|{settings.attachment_signing_key}|oauth-v1".encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _sign_state(settings: Settings, nonce: str, provider: str, principal_id: str, expires_at: int) -> str:
    message = f"{nonce}|{provider}|{principal_id}|{expires_at}".encode("utf-8")
    mac = hmac.new(_state_key(settings), message, hashlib.sha256).hexdigest()
    return f"{nonce}.{expires_at}.{mac}"


def _state_nonce(state: str) -> str:
    parts = (state or "").split(".")
    return parts[0] if len(parts) == 3 and parts[0] else ""


def _state_key(settings: Settings) -> bytes:
    return hashlib.sha256(f"{settings.jwt_secret}|oauth-state".encode("utf-8")).digest()


def verify_state_against_row(
    settings: Settings, state: str, provider: str, principal_id: str, expires_at: int
) -> bool:
    expected = _sign_state(settings, state.split(".")[0], provider, principal_id, expires_at)
    return hmac.compare_digest(expected, state)


def _post_form(url: str, data: dict[str, str]) -> dict[str, Any]:
    body = urlencode(data).encode("utf-8")
    request = Request(url, data=body, method="POST", headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        exc.read()
        raise StoreError("token exchange failed", 502) from exc
    except URLError as exc:
        raise StoreError("token exchange failed", 502) from exc
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise StoreError("token exchange failed", 502) from exc
    if not isinstance(payload, dict):
        raise StoreError("token exchange failed", 502)
    return payload
