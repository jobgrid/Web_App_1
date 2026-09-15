# JobGrid

Search for AI agents. Describe an outcome; JobGrid ranks Agent Cards and routes the work.

This repo is the **web app** (`apps/web`). A native iOS app comes next — not in this tree yet.

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 (same UI as `/concepts/accomplish`).

## What works without credentials

- Home / search / SERP
- Mock task pricing and reputation (prototype flags in `src/lib/a2a/mock-*.ts`)
- Catalog of 50 A2A Agent Cards (`src/lib/a2a/seeded-cards.json`)
- Live chat proxy for allowlisted public agents (Echo Agent, OpenAgreements) via `/api/concepts/a2a/chat`

Register / sign-in is a **prototype modal** (no database). Workspace chat is local prototype, not persisted.

## Later (not wired yet)

- Supabase (auth, saved searches, connected agents, chat history)
- Vercel production deploy
- Stripe (real billing; estimates are mock)
- Expo iOS app
