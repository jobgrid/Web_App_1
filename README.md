# JobGrid — the AI job board

Hyper-modern, chat-first job board (inspired by Boss Zhipin, priced far below
Seek). Candidates upload a CV, get AI match scores on every live job, and apply
one-by-one, in batches, or automatically. Employers post Basic / Branded /
Premium ads with expiry dates, watch live analytics, and chat with candidates
in real time (text + voice notes) after accepting a chat request.

**Stack:** Next.js 16 (App Router) + shadcn/ui on Vercel · Supabase (Postgres,
Auth, Storage, Realtime) · Resend (email) · Expo (mobile) · MCP server for AI
agents / ATS integrations (JobAdder, Bullhorn).

## Repository layout

| Path | What it is |
|---|---|
| `apps/web` | Next.js web app (marketing, candidate, employer, chat, MCP server at `/api/mcp`) |
| `apps/mobile` | Expo (React Native) app — matched jobs, apply, chat request, realtime chat |
| `supabase/migrations` | Full database schema: tables, RLS policies, matching + analytics functions, storage buckets, realtime |

## Key features

- **Candidates** — CV upload (PDF/text) parsed with AI (falls back to a
  heuristic parser), skill profile, match score on every job
  (`matched_jobs_for_me()` SQL function), single apply, batch apply, and
  auto-apply (DB trigger applies to new jobs above the candidate's threshold).
- **Employers** — company profile with branding, post-job wizard with three ad
  tiers (Basic $49/30d, Branded $99/45d, Premium $199/60d — first Basic ad
  free), credit packs (5 → 15% off, 10 → 25% off), expiry + extend, applicant
  pipeline (statuses, CV download), analytics dashboard (views / clicks /
  applies / chats, per-day chart, per-job table).
- **Chat (Boss-style)** — candidate sends a chat request → employer receives an
  email (Resend) → accept unlocks a realtime conversation (Supabase Realtime)
  → text messages + recorded voice notes, working across web and mobile.
- **MCP server** — `POST /api/mcp` (Streamable HTTP). Public tools:
  `search_jobs`, `get_job`. Employer tools (Bearer `jg_live_…` API keys created
  in Settings): `post_job`, `list_applications`, `update_application_status`,
  `get_job_analytics`.
- **ATS integrations** — adapter framework in `apps/web/src/lib/ats` with
  JobAdder and Bullhorn connectors (demo mode works out of the box; add OAuth
  credentials in the connection settings for live sync). Imported jobs land as
  drafts and are published with credits.

## Local development

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in values
pnpm dev                                        # web on http://localhost:3000

cd apps/mobile && npm install && npm start      # Expo (scan QR with Expo Go)
```

## Environment variables (see `apps/web/.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | for MCP writes | Service key for API-key-authenticated MCP/ATS tools |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://jobgrid.ai` in production |
| `RESEND_API_KEY` | recommended | Chat-request / application email notifications |
| `EMAIL_FROM` | recommended | e.g. `JobGrid <notifications@jobgrid.ai>` (domain must be verified in Resend) |
| `AI_GATEWAY_API_KEY` | optional | LLM-based CV parsing via Vercel AI Gateway (heuristic fallback without it) |
| `STRIPE_SECRET_KEY` | future | Checkout currently runs in demo mode |

## Database

Migrations live in `supabase/migrations` and are already applied to the linked
Supabase project. To move to a dedicated project later:
`supabase db push` against the new project, then update the env vars.

Everything is protected with row-level security; the anon key is safe to ship
in clients (web + mobile).
