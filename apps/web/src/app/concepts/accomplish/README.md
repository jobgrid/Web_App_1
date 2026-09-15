# Phase 0 — Accomplish (UI/UX prototype)

Consumer experience prototype: **outcome → understand → discover → assemble team**.

## Open

Local only (do not rely on Vercel for this concept):

```
http://localhost:3000/concepts/accomplish
```

Cloned from Fynco `cursor/accomplish-phase0-ux-d232` into JobGrid.

## Screens

1. **Home** — Google-simple prompt (“What do you want to accomplish?”)
2. **Magic** — animated understanding / capability reveal / network search
3. **Team** — proposed AI specialists from real A2A Agent Cards
4. **Workspace** — prototype chat (no real multi-agent execution yet)

Secondary browse: `/concepts/a2a-registry` (Discover).

## Data rules

- Agent name / description / skills / provider come from Agent Cards (catalog seeds plus GitHub/registry cards that **pass QC**).
- GitHub discovery: `.well-known/agent-card.json` (see `lib/a2a/github-index.json`).
- Connect runs QC first; only passing agents are listed on the marketplace.
- Pricing lives only in `lib/a2a/mock-pricing.ts` and is labeled prototype in the UI.
- Never invent Agent Card fields.

## API

`POST /api/concepts/accomplish` `{ "goal": "…", "preference": "best"|"free"|"fastest"|"quality" }`

QC: `POST /api/concepts/a2a/qc` `{ "sourceUrl", "url", "name", "list": true }`
