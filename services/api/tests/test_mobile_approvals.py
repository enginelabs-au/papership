from __future__ import annotations

import inspect
from datetime import datetime, timedelta, timezone

import jwt

from app.config import TEST_JWT_SECRET_VALUE
from app.store import Store


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


def test_phone_can_approve_or_reject_without_a_store_upload(client, founder_headers, unpriv_headers):
    denied = client.post(
        "/approvals",
        headers=unpriv_headers,
        json={"approval_class": "approval.export", "target_id": "act-phone", "decision": "requested"},
    )
    assert denied.status_code == 403

    extra = client.post(
        "/approvals",
        headers=founder_headers,
        json={
            "approval_class": "approval.export",
            "target_id": "act-phone",
            "decision": "requested",
            "path": "/tmp/store.db",
        },
    )
    assert extra.status_code == 422

    requested = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "target_id": "act-phone", "target_version": "v1", "decision": "requested"},
    )
    assert requested.status_code == 200
    pending = requested.json()
    assert pending["status"] == "pending"
    assert "path" not in pending

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-agent", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    agent = {"Authorization": f"Bearer {_token('principal-agent')}"}
    refused = client.post(
        "/approvals",
        headers=agent,
        json={
            "approval_class": "approval.export",
            "target_id": "act-phone",
            "target_version": "v1",
            "decision": "approved",
        },
    )
    assert refused.status_code == 403
    asked = client.post(
        "/approvals",
        headers=agent,
        json={"approval_class": "approval.export", "target_id": "act-agent", "decision": "requested"},
    )
    assert asked.status_code == 200
    assert asked.json()["status"] == "pending"

    approved = client.post(
        "/approvals",
        headers=founder_headers,
        json={
            "approval_class": "approval.export",
            "target_id": "act-phone",
            "target_version": "v1",
            "requester_id": "principal-founder",
            "decision": "approved",
        },
    )
    assert approved.status_code == 200
    assert approved.json()["id"] == pending["id"]
    assert approved.json()["status"] == "approved"
    listed = client.get("/approvals", headers=founder_headers)
    matches = [row for row in listed.json()["approvals"] if row["target_id"] == "act-phone" and row["target_version"] == "v1"]
    assert len(matches) == 1

    again = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "target_id": "act-reject", "target_version": "v1", "decision": "requested"},
    )
    assert again.status_code == 200
    other_grant = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert other_grant.status_code == 200
    other = {"Authorization": f"Bearer {_token('principal-other')}"}
    missed = client.post(
        "/approvals",
        headers=other,
        json={"approval_class": "approval.export", "target_id": "act-reject", "target_version": "v1", "decision": "rejected"},
    )
    assert missed.status_code == 404
    still = client.get("/approvals", headers=founder_headers)
    assert any(row["id"] == again.json()["id"] and row["status"] == "pending" for row in still.json()["approvals"])

    rejected = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "target_id": "act-reject", "target_version": "v1", "decision": "rejected"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    missing = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "target_id": "act-missing", "decision": "rejected"},
    )
    assert missing.status_code == 404

    legacy = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "requester_id": "principal-unpriv", "target_id": "act-legacy"},
    )
    assert legacy.status_code == 200
    assert legacy.json()["status"] == "approved"

    assert "open(" not in inspect.getsource(Store.decide_approval)
    refused_self = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.release", "requester_id": "principal-founder", "target_id": "rel-phone"},
    )
    assert refused_self.status_code == 403
    created = client.post(
        "/approvals",
        headers=founder_headers,
        json={"approval_class": "approval.export", "requester_id": "principal-unpriv", "target_id": "act-v14-3", "target_version": "v1"},
    )
    assert created.status_code == 200
    job = client.post("/jobs", json={"purpose": "v14-3-phone"}, headers=founder_headers)
    assert job.status_code == 202
    blocked = client.post(
        f"/jobs/{job.json()['id']}/steps",
        json={"step_name": "external.write", "idempotency_key": "phone:stale", "target_id": "act-v14-3", "target_version": "v0"},
        headers=founder_headers,
    )
    assert blocked.status_code == 403
