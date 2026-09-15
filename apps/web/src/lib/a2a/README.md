# Concept: A2A Agent Card discovery, QC, marketplace

JobGrid prototype for **Agent-to-Agent (A2A)** discovery, quality control, and listing.

## Protocol

Per [A2A agent discovery](https://a2a-protocol.org/latest/topics/agent-discovery/):

1. **Well-known URI** — `https://{domain}/.well-known/agent-card.json`
2. **GitHub** — public repos that ship `.well-known/agent-card.json` (code search + `github-index.json`)
3. **Registries** — `a2aregistry.org/api/agents` well-known URIs
4. **QC gate** — test the card **before** Connect or marketplace listing

## Quality control

`POST /api/concepts/a2a/qc` fetches the card (HTTPS only, no localhost/private IPs), rejects Jekyll/templates, and pings the agent with A2A `message/send` or MCP `initialize`.

| Result | What happens |
|---|---|
| **pass** | Connect is allowed; `list: true` adds the agent to the marketplace |
| **card_only** | Card parses but the live protocol ping failed — not listed |
| **fail** | Invalid/unsafe card — not listed |
| **local** | JobGrid catalog specialists (no public endpoint) |

## JobGrid surfaces

| Surface | Path |
|---|---|
| Accomplish marketplace | `/` and `/concepts/accomplish` |
| Registry UI | `/concepts/a2a-registry` |
| Orchestrator UI | `/concepts/a2a-orchestrator` |
| GitHub + QC crawl | `GET /api/concepts/a2a/crawl?mode=live\|seed` |
| QC | `POST /api/concepts/a2a/qc` `{ sourceUrl, url, name, list? }` |
| Marketplace list | `GET /api/concepts/a2a/marketplace` |
| Orchestrate API | `POST /api/concepts/a2a/orchestrate` |
| Chat proxy | `POST /api/concepts/a2a/chat` (allowlisted demos) |

Optional: set `GITHUB_TOKEN` so live GitHub code search can refresh the index. Without it, discovery uses `github-index.json`.
