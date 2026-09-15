# Concept: A2A Agent Card registry + orchestrator

JobGrid prototype for **Agent-to-Agent (A2A)** discovery and routing.

## Protocol

Per [A2A agent discovery](https://a2a-protocol.org/latest/topics/agent-discovery/):

1. **Well-known URI** — `https://{domain}/.well-known/agent-card.json`
2. **Curated registry** — searchable catalog of cards (this concept)
3. **Direct / private** — hardcoded endpoints

Cards describe identity, skills, capabilities, auth, and service URL.

## Orchestration (“Google for agents”)

`/concepts/a2a-orchestrator` ranks up to **50** Agent Cards for a natural-language ask, shows a live mesh shortlist, and executes the best callable agent:

| Mode | Agents |
|---|---|
| Remote A2A | Echo Agent (`message/send`) |
| Remote MCP | OpenAgreements (`tools/call`) |
| Local concept handlers | Code Guardian, Payroll Copilot, Invoice Concierge, Hiring Knowledge, and others |

## JobGrid surfaces

| Surface | Path |
|---|---|
| Registry UI | `/concepts/a2a-registry` |
| Orchestrator UI | `/concepts/a2a-orchestrator` |
| Crawl API | `GET /api/concepts/a2a/crawl?mode=live\|seed&limit=50` |
| Orchestrate API | `POST /api/concepts/a2a/orchestrate` `{ "query": "…" }` |
| Chat proxy | `POST /api/concepts/a2a/chat` |
| JobGrid concept card | `/public/.well-known/agent-card.json` |

## Catalog

See `lib/a2a/seeded-cards.json` (50 cards) and the live crawl UI.
