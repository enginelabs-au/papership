# D-37 — Owner approval: Hermes capabilities and Telegram/WhatsApp inside Papership

Date: 2026-10-13
Status: accepted — owner-directed. Lifts the D-25 hold (OT-10). Builds on D-17. Charges stay off (OT-08 stays parked).

## Owner instruction (2026-10-13)

"hermes capabilities is approved, please allow all those functions and wire them up. also charges can remain off for the moment but whatsapp and telegram inside papership should work."

## What the approval changes

1. Write and external Hermes tools may reach `accepted`. The earlier Security verdicts (2026-09-12, 2026-09-13) were CONDITIONAL on five gaps, not on a ban. This decision records the owner's approval and the remediation of each gap. It does not waive the gates.
2. All fourteen Hermes areas in `docs/capabilities.md` §5 are `configured`.
3. Telegram and WhatsApp are connectors with signed inbound webhooks, an Inbox landing, and an approved send.

## What the approval does not change

- Unknown tools stay denied. The catalogue is `services/worker/policy_hooks/catalog.py`.
- Risk gates (D-17): read = none; write = receipt; external/destructive = an **approved** Papership approval, then a receipt.
- `HERMES_API_SERVER_KEY` is worker-only. The API and desktop never read it. The API reads Hermes through a worker subprocess.
- Private, link-local and cloud-metadata egress stays denied.
- No secret value is stored, logged, returned, or accepted in tool arguments.
- Charges stay off. `ENGINE_BILLING_CHARGES_ENABLED` is unchanged.
- Nothing is `working` until a live run against the real dependency has linked evidence (`docs/capabilities.md` §2).

## The five D-25 gaps and the 2026-10-13 security review

An independent review of the first implementation returned FAIL for live write/external Hermes and CONDITIONAL for messaging (16 findings). The core finding: Hermes picks its own tools from the free-text prompt, so a declared `tool=` cannot be enforced before execution. The remediation below was re-reviewed: CONDITIONAL for both, no new medium or higher findings.

| # | Gap | Remediation | Evidence |
|---|---|---|---|
| 1 | Only a read tool had an `accepted` test | `accepted` tests for write (with receipt) and external (after approval) | `services/worker/tests/test_d37_remediation.py` |
| 2 | Hermes not scoped to the declared `tool=` | Hermes-side scoping is unavailable on the pinned API. Papership enforces it on the event stream: any other side-effecting tool, an unknown tool, an unreadable tool event, a stream failure, or a missing run id stops the run and fails the job | `test_out_of_scope_write_stops_the_run`, nested/OpenAI-shaped event cases, `test_stream_failure_is_not_a_clean_completion` |
| 3 | Subscribe intercepted after execution | Every free-text run needs an approved record bound to (tool, arguments, prompt, session) **before** Hermes is called. Hermes receives exactly the approved arguments. Papership-generated prompts (`trusted_purpose`, read-only loop stages) skip the prompt approval | `test_free_text_run_waits_for_approval_even_for_a_read_tool`, `test_approval_binds_the_prompt_and_session`, `test_hermes_receives_the_approved_arguments` |
| 4 | Job consumer had `persist_receipt` only | `persist_approval` hook creates or reads an approval bound to the AUTH-10 hash. A changed argument is a new approval. The requester is the person who asked | `services/worker/jobs.py`, `test_consumer_changed_arguments_need_a_new_approval`, `test_the_requester_is_the_person_who_asked` |
| 5 | API `POST /runs` never called `start_run` | `POST /runs` and `POST /hermes/inventory/{area}/execute` store a catalogued tool and arguments (run.start grant). The worker runs `start_run` then `subscribe` | `test_consumer_end_to_end_external_approval_then_receipt` |
| 6 | Review: transport key on the API | The API passes a minimal environment to the worker and never reads the key file | `loop_hermes_bridge._worker_env` |
| 7 | Review: abuse and isolation | Per-tenant pending cap, queue rotation, secret-shaped value refusal in arguments and prompts, prompt length cap, session ownership, query throttle | `tests/test_hermes_inventory.py` |
| 8 | Review: messaging | Tenant-scoped storage, tenant and class scoped approval lookup, one send per approval (atomic claim), draft rows visible to the approver, byte-wise secret compares, body cap, WhatsApp number check, credential format check, no redirects, sanitised errors | `tests/test_messaging.py` |

## Telegram and WhatsApp

- Inbound: `POST /webhooks/telegram` checks `X-Telegram-Bot-Api-Secret-Token`. `GET/POST /webhooks/whatsapp` checks the verify token and `X-Hub-Signature-256`. Duplicates are ignored. Messages land in Inbox.
- Outbound: compose creates a pending approval bound to (recipient, SHA-256 of the text). A human approves that exact message. Send then calls only `api.telegram.org` or `graph.facebook.com` and returns a receipt. A replay returns the first receipt and never re-sends. A provider failure is reported, never receipted.
- Credential names (values never in git or chat): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
- 2026-10-14 owner direction: reuse Hermes's channels. Telegram uses the Hermes bot token (copied to `~/.config/papership/connectors.env`, never printed); send only, because registering a webhook would stop Hermes receiving (the API now needs an explicit takeover confirmation). WhatsApp uses the Hermes Baileys bridge on loopback through the SSH tunnel for send only (`WHATSAPP_BRIDGE_URL`; fixed `/send` path, loopback only, no redirects, approval then receipt). Incoming messages for both stay with Hermes. The Meta Cloud API path remains for inbound.
- Live evidence 2026-10-14: one approved Telegram send (message 24) and one approved WhatsApp send through the bridge, each with a receipt and a no-resend replay. The independent security review predates the bridge adapter and the takeover guard; A second independent re-review covered them: CONDITIONAL PASS for Hermes and messaging, no medium+ findings; the only blocker was the owner's temporary hook exception, which is not committed. Residual: the legacy job path without a Hermes request still subscribes without a declared tool; the VPS bridge is unauthenticated loopback HTTP, so any local process on the Mac with the tunnel up could reach `/send`.

## Residual risks and open items

- OT-107 (done 2026-10-14): live read and write-class runs completed through the gate against real Hermes. External-class tools were not run live. Hermes refused `write_file` by its own routing policy. Tool names declared in a run must be the live Hermes names (for example `todo_list`, not `todo`). Hermes defers most tools behind `tool_call({calls:[...]})`; the interceptor judges the inner tool and refuses unreadable or nested wrappers. `browser_vault_*`, `kanban_*`, `a2a_*`, `spotify`, `discord`, `yuanbao` and `manage_connections` stay uncatalogued and denied.
- OT-105 and OT-106: live Telegram and WhatsApp traffic needs credentials only the owner can create.
- Hermes-side tool scoping is Papership-enforced on the stream. A call seen mid-run has already started; the stop limits blast radius and the receipt records it. The prompt approval is the primary gate.
- A solo founder can approve their own request (accepted for a single seat).
- DNS rebinding cannot be prevented at the policy layer; resolution of private ranges is checked best-effort.
- Terminal and code tools stay `write` class and are gated by the prompt approval.
- A new Security pass is required before any row moves to `working`.
