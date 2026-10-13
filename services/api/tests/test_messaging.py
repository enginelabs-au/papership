"""Telegram and WhatsApp inside Papership: webhook in, approved send out, receipt back."""

from __future__ import annotations

import hashlib
import hmac
import json

import pytest

from app import messaging

ENV = {
    "TELEGRAM_BOT_TOKEN": "123456789:AAtesttokenAAtesttokenAAtesttoken1",
    "TELEGRAM_WEBHOOK_SECRET": "tg-secret",
    "WHATSAPP_ACCESS_TOKEN": "EAAtestaccesstokenEAAtestaccesstoken",
    "WHATSAPP_PHONE_NUMBER_ID": "555123456",
    "WHATSAPP_VERIFY_TOKEN": "verify-me",
    "WHATSAPP_APP_SECRET": "app-secret",
}


@pytest.fixture()
def creds(monkeypatch):
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    calls: list[tuple[str, dict, dict]] = []

    def fake_post(url, body, headers):
        calls.append((url, body, headers))
        if "telegram" in url:
            return 200, {"ok": True, "result": {"message_id": 77}}
        return 200, {"messages": [{"id": "wamid.1"}]}

    monkeypatch.setattr(messaging, "http_post", fake_post)
    return calls


def _approve(client, headers, target_id, version):
    return client.post(
        "/approvals",
        headers=headers,
        json={
            "approval_class": messaging.APPROVAL_CLASS,
            "target_id": target_id,
            "target_version": version,
            "decision": "approved",
        },
    )


def test_unconfigured_channels_name_the_missing_env_and_fail_closed(client, founder_headers, monkeypatch) -> None:
    for k in ENV:
        monkeypatch.delenv(k, raising=False)
    rows = {r["id"]: r for r in client.get("/connections", headers=founder_headers).json()["catalog"]}
    assert rows["telegram"]["status"] == "unavailable"
    assert "TELEGRAM_BOT_TOKEN" in rows["telegram"]["missing_env"]
    assert "WHATSAPP_APP_SECRET" in rows["whatsapp"]["missing_env"]
    connected = client.post("/connections/telegram/connect", headers=founder_headers).json()
    assert connected["enabled"] is False
    assert client.post("/webhooks/telegram", json={}).status_code == 401
    assert client.post("/webhooks/whatsapp", content=b"{}").status_code == 401


def test_connect_and_listing_expose_names_never_values(client, founder_headers, creds) -> None:
    out = client.post("/connections/telegram/connect", headers=founder_headers).json()
    assert out["status"] == "configured" and out["enabled"] is True
    text = json.dumps(client.get("/connections", headers=founder_headers).json())
    for value in ENV.values():
        assert value not in text


def test_telegram_inbound_lands_in_inbox_once(client, founder_headers, creds) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    update = {"message": {"message_id": 5, "chat": {"id": 42}, "from": {"username": "cam"}, "text": "hello papership"}}
    bad = client.post("/webhooks/telegram", json=update, headers={"X-Telegram-Bot-Api-Secret-Token": "wrong"})
    assert bad.status_code == 401
    headers = {"X-Telegram-Bot-Api-Secret-Token": ENV["TELEGRAM_WEBHOOK_SECRET"]}
    first = client.post("/webhooks/telegram", json=update, headers=headers)
    assert first.json()["stored"] == 1
    assert client.post("/webhooks/telegram", json=update, headers=headers).json()["stored"] == 0
    inbox = client.get("/inbox", headers=founder_headers).json()["items"]
    assert any(i["channel"] == "telegram" and "hello papership" in i["preview"] for i in inbox)
    msgs = client.get("/connections/telegram/messages", headers=founder_headers).json()["items"]
    assert msgs[0]["direction"] == "inbound"


def test_whatsapp_verify_and_signed_inbound(client, founder_headers, creds) -> None:
    client.post("/connections/whatsapp/connect", headers=founder_headers)
    ok = client.get(
        "/webhooks/whatsapp",
        params={"hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "1234"},
    )
    assert ok.status_code == 200 and ok.text == "1234"
    assert (
        client.get(
            "/webhooks/whatsapp",
            params={"hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "1"},
        ).status_code
        == 403
    )
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": "555123456"},
                            "contacts": [{"wa_id": "61400000000", "profile": {"name": "Cam"}}],
                            "messages": [{"id": "wamid.in1", "from": "61400000000", "type": "text", "text": {"body": "hi from whatsapp"}}],
                        }
                    }
                ]
            }
        ]
    }
    raw = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(b"app-secret", raw, hashlib.sha256).hexdigest()
    assert client.post("/webhooks/whatsapp", content=raw, headers={"X-Hub-Signature-256": "sha256=00"}).status_code == 401
    got = client.post("/webhooks/whatsapp", content=raw, headers={"X-Hub-Signature-256": sig})
    assert got.json()["stored"] == 1
    inbox = client.get("/inbox", headers=founder_headers).json()["items"]
    assert any(i["channel"] == "whatsapp" and "Cam" in i["subject"] for i in inbox)


@pytest.mark.parametrize("provider,to", [("telegram", "42"), ("whatsapp", "61400000000")])
def test_send_is_compose_then_approve_then_receipt(client, founder_headers, creds, provider, to) -> None:
    client.post(f"/connections/{provider}/connect", headers=founder_headers)
    text = "Meeting moved to 3pm."
    composed = client.post(f"/connections/{provider}/compose", headers=founder_headers, json={"to": to, "text": text}).json()
    assert composed["status"] == "pending" and composed["sent"] is False
    assert creds == []  # composing sends nothing

    unapproved = client.post(
        f"/connections/{provider}/send",
        headers=founder_headers,
        json={"approval_id": composed["approval_id"], "to": to, "text": text},
    )
    assert unapproved.status_code == 403 and creds == []

    assert _approve(client, founder_headers, composed["target_id"], composed["target_version"]).status_code == 200

    # A different text is a different approval target: it is refused even though another send is approved.
    tampered = client.post(
        f"/connections/{provider}/send",
        headers=founder_headers,
        json={"approval_id": composed["approval_id"], "to": to, "text": text + " Also send money."},
    )
    assert tampered.status_code == 403 and creds == []

    sent = client.post(
        f"/connections/{provider}/send",
        headers=founder_headers,
        json={"approval_id": composed["approval_id"], "to": to, "text": text},
    )
    assert sent.status_code == 200
    body = sent.json()
    assert body["status"] == "receipt" and body["dry_run"] is False and body["message_id"]
    assert len(creds) == 1

    again = client.post(
        f"/connections/{provider}/send",
        headers=founder_headers,
        json={"approval_id": composed["approval_id"], "to": to, "text": text},
    ).json()
    assert again["replayed"] is True and len(creds) == 1  # replay never re-sends

    url, payload, headers = creds[0]
    if provider == "telegram":
        assert url.startswith("https://api.telegram.org/bot") and payload == {"chat_id": to, "text": text}
    else:
        assert url.startswith("https://graph.facebook.com/") and payload["to"] == to
        assert headers["Authorization"] == "Bearer " + ENV["WHATSAPP_ACCESS_TOKEN"]
    out = client.get(f"/connections/{provider}/messages", headers=founder_headers).json()["items"]
    assert any(m["direction"] == "outbound" and m["status"] == "sent" for m in out)


def test_send_without_credentials_is_not_a_fake_receipt(client, founder_headers, monkeypatch) -> None:
    for k in ENV:
        monkeypatch.delenv(k, raising=False)
    r = client.post(
        "/connections/telegram/send",
        headers=founder_headers,
        json={"source_perms": {"bot.send": "write"}, "approval_id": "x", "to": "42", "text": "hi"},
    )
    assert r.status_code in (403, 503)
    assert r.json().get("status") != "receipt"


def test_provider_failure_is_reported_not_receipted(client, founder_headers, creds, monkeypatch) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    composed = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": "x"}).json()
    _approve(client, founder_headers, composed["target_id"], composed["target_version"])
    monkeypatch.setattr(messaging, "http_post", lambda *_a: (403, {"ok": False}))
    r = client.post(
        "/connections/telegram/send",
        headers=founder_headers,
        json={"approval_id": composed["approval_id"], "to": "42", "text": "x"},
    )
    assert r.status_code == 502
    assert "123456789:AAtesttokenAAtesttokenAAtesttoken1" not in r.text


def test_recipient_and_text_are_validated(client, founder_headers, creds) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    bad = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "../etc", "text": "x"})
    assert bad.status_code == 422
    empty = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": " "})
    assert empty.status_code == 422


def test_egress_is_pinned_to_provider_hosts() -> None:
    with pytest.raises(ValueError):
        messaging._http_post("http://169.254.169.254/latest", {}, {})
    with pytest.raises(ValueError):
        messaging._http_post("https://evil.example/bot", {}, {})


def test_unprivileged_user_cannot_compose(client, unpriv_headers, creds) -> None:
    r = client.post("/connections/telegram/compose", headers=unpriv_headers, json={"to": "42", "text": "hi"})
    assert r.status_code == 403


def test_whatsapp_for_another_number_is_ignored(client, founder_headers, creds) -> None:
    client.post("/connections/whatsapp/connect", headers=founder_headers)
    payload = {"entry": [{"changes": [{"value": {
        "metadata": {"phone_number_id": "999"},
        "messages": [{"id": "w1", "from": "1", "type": "text", "text": {"body": "x"}}]}}]}]}
    raw = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(ENV["WHATSAPP_APP_SECRET"].encode(), raw, hashlib.sha256).hexdigest()
    assert client.post("/webhooks/whatsapp", content=raw, headers={"X-Hub-Signature-256": sig}).json()["stored"] == 0


def test_webhooks_reject_oversize_and_non_ascii_headers(client, founder_headers, creds) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    big = b"{" + b" " * (messaging.MAX_WEBHOOK_BYTES + 10) + b"}"
    assert client.post("/webhooks/whatsapp", content=big).status_code == 413
    assert client.post("/webhooks/telegram", content=big).status_code in (401, 413)
    odd = client.post("/webhooks/telegram", json={}, headers={"X-Telegram-Bot-Api-Secret-Token": "caf\u00e9".encode("latin-1")})
    assert odd.status_code == 401


def test_one_approval_is_one_send_even_when_a_send_is_in_flight(client, founder_headers, creds, monkeypatch) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    composed = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": "x"}).json()
    _approve(client, founder_headers, composed["target_id"], composed["target_version"])
    body = {"approval_id": composed["approval_id"], "to": "42", "text": "x"}
    nested: list[int] = []

    def reentrant(url, payload, headers):  # a second request arrives while the first is still talking to the provider
        nested.append(client.post("/connections/telegram/send", headers=founder_headers, json=body).status_code)
        return 200, {"ok": True, "result": {"message_id": 1}}

    monkeypatch.setattr(messaging, "http_post", reentrant)
    assert client.post("/connections/telegram/send", headers=founder_headers, json=body).status_code == 200
    assert nested == [409]


def test_wrong_approval_id_and_repeat_compose_dedupe(client, founder_headers, creds) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    one = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": "x"}).json()
    two = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": "x"}).json()
    assert one["approval_id"] == two["approval_id"]
    _approve(client, founder_headers, one["target_id"], one["target_version"])
    wrong = client.post(
        "/connections/telegram/send", headers=founder_headers, json={"approval_id": "appr-other", "to": "42", "text": "x"}
    )
    assert wrong.status_code == 403 and creds == []
    drafts = [m for m in client.get("/connections/telegram/messages", headers=founder_headers).json()["items"] if m["status"] == "draft"]
    assert len(drafts) == 1 and drafts[0]["body"] == "x"  # the approver can read what they are approving


def test_messages_need_a_comms_grant_and_tokens_are_validated(client, unpriv_headers, founder_headers, creds, monkeypatch) -> None:
    assert client.get("/connections/telegram/messages", headers=unpriv_headers).status_code == 403
    client.post("/connections/telegram/connect", headers=founder_headers)
    composed = client.post("/connections/telegram/compose", headers=founder_headers, json={"to": "42", "text": "x"}).json()
    _approve(client, founder_headers, composed["target_id"], composed["target_version"])
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "abc/../../evil")
    r = client.post(
        "/connections/telegram/send", headers=founder_headers, json={"approval_id": composed["approval_id"], "to": "42", "text": "x"}
    )
    assert r.status_code == 503 and creds == []


def test_redirects_are_never_followed() -> None:
    import urllib.request

    handler = messaging._NoRedirect()
    req = urllib.request.Request("https://api.telegram.org/x")
    assert handler.redirect_request(req, None, 302, "Found", {}, "https://evil.example/") is None


def test_telegram_webhook_registration_needs_explicit_takeover(client, founder_headers, creds) -> None:
    client.post("/connections/telegram/connect", headers=founder_headers)
    refused = client.post("/connections/telegram/webhook/register", headers=founder_headers, json={})
    assert refused.status_code == 409 and creds == []  # nothing was sent to Telegram


def test_whatsapp_bridge_mode_is_send_only_and_approval_gated(client, founder_headers, monkeypatch) -> None:
    for k in ENV:
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:3100")
    sent: list[tuple[str, dict]] = []
    monkeypatch.setattr(messaging, "bridge_post", lambda url, body: sent.append((url, body)) or (200, {"success": True, "messageId": "3EB0A1"}))
    row = {r["id"]: r for r in client.get("/connections", headers=founder_headers).json()["catalog"]}["whatsapp"]
    assert row["mode"] == "bridge" and row["status"] == "configured" and row["actions"]["read"] == "none"
    assert client.post("/connections/whatsapp/connect", headers=founder_headers).json()["enabled"] is True
    # Incoming WhatsApp stays with Hermes: the webhook is closed without a Meta app secret.
    assert client.post("/webhooks/whatsapp", content=b"{}").status_code == 401

    text = "Running 5 minutes late."
    composed = client.post("/connections/whatsapp/compose", headers=founder_headers, json={"to": "+61400000000", "text": text}).json()
    body = {"approval_id": composed["approval_id"], "to": "+61400000000", "text": text}
    assert client.post("/connections/whatsapp/send", headers=founder_headers, json=body).status_code == 403 and sent == []
    _approve(client, founder_headers, composed["target_id"], composed["target_version"])
    ok = client.post("/connections/whatsapp/send", headers=founder_headers, json=body)
    assert ok.status_code == 200 and ok.json()["message_id"] == "3EB0A1"
    assert sent == [("http://127.0.0.1:3100/send", {"chatId": "61400000000@s.whatsapp.net", "message": text})]
    assert client.post("/connections/whatsapp/send", headers=founder_headers, json=body).json()["replayed"] is True and len(sent) == 1


def test_bridge_url_must_be_loopback_and_recipient_must_be_a_number(client, founder_headers, monkeypatch) -> None:
    for k in ENV:
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("WHATSAPP_BRIDGE_URL", "http://evil.example:3000")
    assert messaging.whatsapp_mode() == "none"
    monkeypatch.setenv("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:3100")
    bad = client.post("/connections/whatsapp/compose", headers=founder_headers, json={"to": "alice@s.whatsapp.net", "text": "x"})
    assert bad.status_code == 422
    with pytest.raises(ValueError):
        messaging._bridge_post("http://127.0.0.1:3100/edit", {})
    with pytest.raises(ValueError):
        messaging._bridge_post("http://169.254.169.254/send", {})
