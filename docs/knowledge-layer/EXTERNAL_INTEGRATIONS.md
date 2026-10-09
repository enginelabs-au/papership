# External integrations

Papership federates these systems. It does not reimplement them. Native files and APIs stay canonical (KL-D8).

## In the product today

| Integration | Code | Boundary |
|---|---|---|
| Hermes runtime | `services/worker/adapter/hermes_client.py`, `services/api/app/loop_hermes_bridge.py`, `hermes_health.py` | API probes health and capabilities. Loop stages start a worker subprocess. The API process does not hold `HERMES_API_SERVER_KEY`. Pin `HERMES_VERSION_PIN`. Read tools only for live `accepted`. Write and external remain unauthorized (D-25) |
| GitHub App | `services/api/app/github_app.py`, `github_grants.py` | Reads pulls and installation permissions. Opening a pull is dry-run unless reauth and `repo.change` intersect installation permissions. Local app name `papership-dev`. The Hermes VPS does not hold `GITHUB_APP_*` |
| Gmail and Slack | `services/api/app/oauth.py`, `connectors.py` | OAuth start and callback exist. Tokens are sealed in `connections.token_blob`. Send is approval-then-receipt and still dry-run. Do not copy Hermes environment into these clients |
| Capability catalogue | `store.py` seed, `packages/contracts/src/capabilities.ts`, `docs/capabilities.md` | 43 domains. The markdown file is the human source. The API does not parse it at runtime. This is not the Papership Registry |
| Packs | `packages/contracts/src/packs.ts`, pack tables | Declarative install and trust verdicts `none`, `pending`, `accepted`, `refused`. Execution stays behind `ENGINE_PACK_EXECUTION_ENABLED` |
| Vercel | `vercel.json` | Builds `@papership/web` only. No Knowledge Layer backend on Vercel. Do not edit the Engine Labs marketing project |
| Model providers | Worker and Hermes host | Separate destination. Not called by the web app |

Telegram and WhatsApp are catalogue rows. They are not Papership send paths.

## Federated later, not built

| Source | Phase | Rule |
|---|---|---|
| Agent Skills (`SKILL.md`) | KL-P3 discovery, KL-P2 reference | Reference the skill. Do not fork the standard |
| MCP servers | KL-P3 | Reference capability and trust. Do not build a second protocol |
| Other plugins | KL-P3 | Same as MCP |
| Other agent runtimes (Cursor, Claude Code, Codex, OpenCode, custom) | KL-P6 consumers, KL-P15 resolve | They call `POST /knowledge/plans`, `GET /knowledge/plans/{plan_id}`, and `GET /knowledge/plans/{plan_id}/signals`. The payload is identifiers and enums, not a copy of the graph. Papership does not embed their agents and does not ship an SDK |
| Local and private files | KL-P8 Desktop Bridge | Resolved on the machine. Not uploaded by default |
| Publisher catalogues | KL-P13 | Two example pointers, `example-skill` and `example-mcp`, are listed on Materials. They are not installable. Skill and MCP standards stay outside Papership. Live catalogues are not connected. |

## Compatibility target

Conceptual compatibility includes OpenAI, Anthropic, Gemini, local models, future models, Codex, Claude Code, Cursor, OpenCode, Agent Skills, MCP, plugins, Git repositories, cloud runtimes, and custom agents. KL-P0 does not add SDKs for that list. The Knowledge API (KL-P6) is the single machine contract.

## Operator boundaries that stay

- Charges off.
- Hermes write and external `accepted` unauthorized.
- Marketing site `www.enginelabs.com.au` is out of this repository's deploy scope.
- ERA-15 destroy scripts stay list-only.
