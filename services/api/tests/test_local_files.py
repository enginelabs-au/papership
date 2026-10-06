from __future__ import annotations

import inspect

from app import knowledge_layer


DIGEST = "a" * 64


def test_local_file_pointer_hides_path_and_other_principals(client, founder_headers, unpriv_headers):
    denied = client.post(
        "/knowledge/local-files",
        headers=unpriv_headers,
        json={"title": "notes.txt", "digest": DIGEST, "byte_size": 4},
    )
    assert denied.status_code == 403

    extra = client.post(
        "/knowledge/local-files",
        headers=founder_headers,
        json={"title": "notes.txt", "digest": DIGEST, "byte_size": 4, "path": "/tmp/secret", "content": "nope"},
    )
    assert extra.status_code == 422

    created = client.post(
        "/knowledge/local-files",
        headers=founder_headers,
        json={"title": "notes.txt", "digest": DIGEST, "byte_size": 4},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["title"] == "notes.txt"
    assert body["digest"] == DIGEST
    assert body["byte_size"] == 4
    assert "path" not in body
    assert "content" not in body

    listed = client.get("/knowledge/objects", headers=founder_headers)
    assert listed.status_code == 200
    match = [row for row in listed.json()["objects"] if row["id"] == body["id"]]
    assert len(match) == 1
    assert "/tmp" not in listed.text

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-agent", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    from datetime import datetime, timedelta, timezone

    import jwt

    from app.config import TEST_JWT_SECRET_VALUE

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "principal-agent",
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
    agent = {"Authorization": f"Bearer {token}"}
    assert client.get(f"/knowledge/local-files/{body['id']}", headers=agent).status_code == 404
    assert client.get(f"/knowledge/objects/{body['id']}", headers=agent).status_code == 404
    agent_list = client.get("/knowledge/objects", headers=agent)
    assert body["id"] not in agent_list.text

    other_grant = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert other_grant.status_code == 200
    other_token = jwt.encode(
        {
            "sub": "principal-other",
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
    other = {"Authorization": f"Bearer {other_token}"}
    assert client.get(f"/knowledge/local-files/{body['id']}", headers=other).status_code == 404

    source = inspect.getsource(knowledge_layer)
    assert "tenant-founder" not in source
    assert "maybe_emit" not in source
    assert "run_engine_labs_stage_work" not in source
