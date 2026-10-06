"""KL-P11: a material can carry an economic model. Charges stay off."""

from __future__ import annotations

import inspect
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi.testclient import TestClient

from app.config import TEST_JWT_SECRET_VALUE
from app.knowledge_layer import set_material_economics


def _token(sub: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": sub,
            "iss": "http://engine.test/auth/v1",
            "aud": "authenticated",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=15)).timestamp()),
            "role": "authenticated",
            "grant_version": 1,
            "aal": "aal2",
        },
        TEST_JWT_SECRET_VALUE,
        algorithm="HS256",
    )


def _pack(client: TestClient, headers: dict[str, str]) -> dict:
    listed = client.get("/registry/materials", headers=headers)
    assert listed.status_code == 200
    pack = next(row for row in listed.json()["materials"] if row["locator"] == "education-demo")
    return pack


def test_human_can_list_a_material_and_charges_stay_off(
    client: TestClient, founder_headers: dict[str, str], unpriv_headers: dict[str, str], tmp_path: Path
) -> None:
    pack = _pack(client, founder_headers)
    assert pack["economic_model"] is None
    assert pack["list_usd"] is None
    object_id = pack["object_id"]

    denied = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=unpriv_headers,
        json={"economic_model": "free"},
    )
    assert denied.status_code == 403

    extra = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=founder_headers,
        json={"economic_model": "listed", "list_usd": 12, "path": "/tmp/note"},
    )
    assert extra.status_code == 422

    needs_amount = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=founder_headers,
        json={"economic_model": "listed"},
    )
    assert needs_amount.status_code == 422
    free_amount = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=founder_headers,
        json={"economic_model": "free", "list_usd": 1},
    )
    assert free_amount.status_code == 422

    listed = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=founder_headers,
        json={"economic_model": "listed", "list_usd": 12},
    )
    assert listed.status_code == 200
    assert listed.json() == {"object_id": object_id, "economic_model": "listed", "list_usd": 12}

    again = _pack(client, founder_headers)
    assert again["economic_model"] == "listed"
    assert again["list_usd"] == 12

    freed = client.post(
        f"/registry/materials/{object_id}/economics",
        headers=founder_headers,
        json={"economic_model": "free"},
    )
    assert freed.status_code == 200
    assert _pack(client, founder_headers)["list_usd"] is None

    card = client.get("/billing/rate-card", headers=founder_headers)
    assert card.status_code == 200
    assert card.json()["charges_enabled"] is False
    db = sqlite3.connect(tmp_path / "store.sqlite")
    assert db.execute("SELECT COUNT(*) FROM allowances").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM allowance_reservations").fetchone()[0] == 0


def test_agent_and_other_tenant_cannot_write(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    pack = _pack(client, founder_headers)
    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-agent", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    agent = client.post(
        f"/registry/materials/{pack['object_id']}/economics",
        headers={"Authorization": f"Bearer {_token('principal-agent')}"},
        json={"economic_model": "unavailable"},
    )
    assert agent.status_code == 403

    other = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert other.status_code == 200
    foreign = client.post(
        f"/registry/materials/{pack['object_id']}/economics",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
        json={"economic_model": "listed", "list_usd": 9},
    )
    assert foreign.status_code == 404
    theirs = client.get(
        "/registry/materials",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
    )
    assert theirs.status_code == 200
    row = next(item for item in theirs.json()["materials"] if item["locator"] == "education-demo")
    assert row["object_id"] != pack["object_id"]
    assert row["economic_model"] is None
    assert row["list_usd"] is None


def test_economics_lookup_does_not_touch_allowances_or_charges() -> None:
    source = inspect.getsource(set_material_economics)
    assert "allowances" not in source
    assert "billing_charges" not in source
    assert "rate_card" not in source
