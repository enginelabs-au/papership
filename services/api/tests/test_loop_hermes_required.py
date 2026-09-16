"""Founder loop requires Hermes Host — no fake artifacts when unset."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.managed_projects import ENGINE_LABS_PROJECT_ID


def test_start_loop_fails_when_hermes_unconfigured(
    env_jwt: None, tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.main import create_app

    monkeypatch.delenv("HERMES_API_BASE_URL", raising=False)

    app = create_app(str(tmp_path / "store.sqlite"))
    client = TestClient(app)
    from tests.conftest import make_token

    headers = {"Authorization": f"Bearer {make_token('principal-founder')}"}
    response = client.post(
        f"/projects/{ENGINE_LABS_PROJECT_ID}/jobs",
        json={"title": "Needs Hermes"},
        headers=headers,
    )
    assert response.status_code == 503
    assert "Hermes" in response.json()["detail"]
