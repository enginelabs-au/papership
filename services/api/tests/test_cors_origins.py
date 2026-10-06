from __future__ import annotations

import pytest

from app.config import LOCAL_BROWSER_ORIGINS, PAPERSHIP_WEB_ORIGIN, cors_allowlist


def test_allowlist_keeps_local_tauri_and_papership_origin():
    allowed = cors_allowlist(())
    assert PAPERSHIP_WEB_ORIGIN in allowed
    for origin in LOCAL_BROWSER_ORIGINS:
        assert origin in allowed
    assert "*" not in allowed
    assert "https://www.enginelabs.com.au" not in allowed


def test_configured_origins_are_added_without_dropping_defaults():
    allowed = cors_allowlist(("https://preview.example",))
    assert "https://preview.example" in allowed
    assert PAPERSHIP_WEB_ORIGIN in allowed
    assert "tauri://localhost" in allowed


def test_wildcard_origin_is_rejected():
    with pytest.raises(RuntimeError, match="wildcard"):
        cors_allowlist(("*",))
