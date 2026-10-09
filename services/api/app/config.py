"""Phase-1 environment allowlist. Phase-2 names are never read (F-SEC-09)."""

from __future__ import annotations

import os
from collections.abc import Sequence
from dataclasses import dataclass

API_ENV_ALLOWLIST = frozenset(
    {
        "ENGINE_API_BASE_URL",
        "ENGINE_API_CORS_ORIGINS",
        "ENGINE_JWT_ISSUER",
        "ENGINE_JWT_AUDIENCE",
        "DBOS_SYSTEM_DATABASE_URL",
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_JWT_SECRET",
        "ENGINE_USAGE_EMIT",
        "HERMES_API_BASE_URL",
        "HERMES_VERSION_PIN",
        "GITHUB_APP_ID",
        "GITHUB_APP_INSTALLATION_ID",
        "GITHUB_APP_PRIVATE_KEY",
        "GITHUB_APP_PRIVATE_KEY_PATH",
        "GITHUB_APP_OWNER",
        "GITHUB_APP_REPO",
        "GMAIL_OAUTH_CLIENT_ID",
        "GMAIL_OAUTH_CLIENT_SECRET",
        "GMAIL_OAUTH_REDIRECT_URL",
        "SLACK_CLIENT_ID",
        "SLACK_CLIENT_SECRET",
        "SLACK_OAUTH_REDIRECT_URL",
        "ENGINE_BILLING_CHARGES_ENABLED",
        "ENGINE_PACK_EXECUTION_ENABLED",
        "ENGINE_API_PUBLIC_URL",
        "ENGINE_STORE_PATH",
        "ENGINE_ATTACHMENT_SIGNING_KEY",
        "ENGINE_TEST_HOOKS",
        "ENGINE_TEST_CRASH_AFTER_PERSIST",
        "PORT",
        "HOME",
        "PATH",
        "USER",
        "TMPDIR",
        "LANG",
        "LC_ALL",
        "PYTHONPATH",
        "VIRTUAL_ENV",
        "UV_PROJECT_ENVIRONMENT",
    }
)

PHASE2_ENV_NAMES = frozenset(
    {
        "HERMES_API_SERVER_KEY",
        "MODEL_PROVIDER_API_KEY",
        "GITHUB_APP_WEBHOOK_SECRET",
    }
)

# Dev fallback secret name used only in tests — never a production value.
TEST_JWT_SECRET_NAME = "SUPABASE_JWT_SECRET"
TEST_JWT_SECRET_VALUE = "test-only-not-for-production-jwt-secret-0001"


@dataclass(frozen=True)
class Settings:
    jwt_issuer: str
    jwt_audience: str
    jwt_secret: str
    store_path: str
    usage_emit: bool
    attachment_signing_key: str
    test_hooks: bool
    cors_origins: tuple[str, ...]
    database_url: str
    dbos_system_database_url: str
    api_base_url: str
    supabase_url: str
    hermes_api_base_url: str
    hermes_version_pin: str
    github_app_id: str
    github_installation_id: str
    github_private_key_path: str
    github_owner: str
    github_repo: str
    gmail_oauth_client_id: str
    gmail_oauth_redirect_url: str
    slack_client_id: str
    slack_oauth_redirect_url: str
    billing_charges_enabled: bool
    pack_execution_enabled: bool
    api_public_url: str


def _get(name: str, default: str = "") -> str:
    if name not in API_ENV_ALLOWLIST:
        raise RuntimeError(f"refusing to read non-allowlisted env: {name}")
    if name in PHASE2_ENV_NAMES:
        raise RuntimeError(f"phase-2 env must not be read: {name}")
    return os.environ.get(name, default)


LOCAL_BROWSER_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:1420",
    "http://localhost:1420",
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
)
PAPERSHIP_WEB_ORIGIN = "https://papership.com.au"
PAPERSHIP_WWW_ORIGIN = "https://www.papership.com.au"


def cors_allowlist(configured: Sequence[str]) -> list[str]:
    """Local, Tauri, and the Papership web origin, plus any explicit extras.

    A configured list adds origins. It does not remove the defaults.
    A wildcard origin is rejected.
    """
    allowed: list[str] = []
    for origin in (*LOCAL_BROWSER_ORIGINS, PAPERSHIP_WEB_ORIGIN, PAPERSHIP_WWW_ORIGIN, *configured):
        item = origin.strip()
        if not item:
            continue
        if item == "*":
            raise RuntimeError("wildcard CORS origin is not allowed")
        if item not in allowed:
            allowed.append(item)
    return allowed


def load_settings() -> Settings:
    for banned in PHASE2_ENV_NAMES:
        # Existence in the process env is ignored; we never call os.environ.get on them.
        if banned in API_ENV_ALLOWLIST:
            raise RuntimeError("phase-2 name leaked into allowlist")
    usage_raw = _get("ENGINE_USAGE_EMIT", "0").strip() or "0"
    origins = tuple(
        part.strip()
        for part in _get("ENGINE_API_CORS_ORIGINS", "").split(",")
        if part.strip()
    )
    return Settings(
        jwt_issuer=_get("ENGINE_JWT_ISSUER", "http://engine.test/auth/v1"),
        jwt_audience=_get("ENGINE_JWT_AUDIENCE", "authenticated"),
        jwt_secret=_get("SUPABASE_JWT_SECRET", ""),
        store_path=_get("ENGINE_STORE_PATH", "/tmp/engine-labs-api-store.sqlite"),
        usage_emit=usage_raw not in {"0", "false", "off", ""},
        attachment_signing_key=_get("ENGINE_ATTACHMENT_SIGNING_KEY", "dev-attachment-signing-not-prod"),
        test_hooks=_get("ENGINE_TEST_HOOKS", "0") in {"1", "true"},
        cors_origins=origins,
        database_url=_get("DATABASE_URL", ""),
        dbos_system_database_url=_get("DBOS_SYSTEM_DATABASE_URL", ""),
        api_base_url=_get("ENGINE_API_BASE_URL", "http://127.0.0.1:8000"),
        supabase_url=_get("SUPABASE_URL", ""),
        hermes_api_base_url=_get("HERMES_API_BASE_URL", ""),
        hermes_version_pin=_get("HERMES_VERSION_PIN", ""),
        github_app_id=_get("GITHUB_APP_ID", ""),
        github_installation_id=_get("GITHUB_APP_INSTALLATION_ID", ""),
        github_private_key_path=_get("GITHUB_APP_PRIVATE_KEY_PATH", "") or _get("GITHUB_APP_PRIVATE_KEY", ""),
        github_owner=_get("GITHUB_APP_OWNER", ""),
        github_repo=_get("GITHUB_APP_REPO", ""),
        gmail_oauth_client_id=_get("GMAIL_OAUTH_CLIENT_ID", ""),
        gmail_oauth_redirect_url=_get("GMAIL_OAUTH_REDIRECT_URL", "http://127.0.0.1:8000/oauth/gmail/callback"),
        slack_client_id=_get("SLACK_CLIENT_ID", ""),
        slack_oauth_redirect_url=_get("SLACK_OAUTH_REDIRECT_URL", "http://localhost:8000/oauth/slack/callback"),
        billing_charges_enabled=_get("ENGINE_BILLING_CHARGES_ENABLED", "0").strip().lower()
        in {"1", "true", "on"},
        pack_execution_enabled=_get("ENGINE_PACK_EXECUTION_ENABLED", "0").strip().lower()
        in {"1", "true", "on"},
        api_public_url=_get("ENGINE_API_PUBLIC_URL", "") or _get("ENGINE_API_BASE_URL", "http://127.0.0.1:8000"),
    )


def settings_public_dict(settings: Settings) -> dict[str, object]:
    return {
        "jwt_issuer": settings.jwt_issuer,
        "jwt_audience": settings.jwt_audience,
        "usage_emit": settings.usage_emit,
        "store_path": settings.store_path,
        "cors_origins": list(settings.cors_origins),
        "has_jwt_secret": bool(settings.jwt_secret),
        "has_database_url": bool(settings.database_url),
        "has_dbos_url": bool(settings.dbos_system_database_url),
        "hermes_pin": settings.hermes_version_pin,
        "has_hermes_url": bool(settings.hermes_api_base_url),
        "has_github_app_id": bool(settings.github_app_id),
        "has_github_key_path": bool(settings.github_private_key_path),
        "github_repo": f"{settings.github_owner}/{settings.github_repo}".strip("/"),
        "billing_charges_enabled": settings.billing_charges_enabled,
        "pack_execution_enabled": settings.pack_execution_enabled,
        "api_public_url": settings.api_public_url,
        "has_gmail_oauth_client_id": bool(settings.gmail_oauth_client_id),
        "has_gmail_oauth_secret": bool(_get("GMAIL_OAUTH_CLIENT_SECRET", "")),
        "has_slack_client_id": bool(settings.slack_client_id),
        "has_slack_secret": bool(_get("SLACK_CLIENT_SECRET", "")),
    }


def oauth_secret(name: str) -> str:
    """Read an OAuth client secret. Never log or return this to callers."""
    if name not in {"GMAIL_OAUTH_CLIENT_SECRET", "SLACK_CLIENT_SECRET"}:
        raise RuntimeError(f"refusing to read non-oauth secret: {name}")
    return _get(name, "")
