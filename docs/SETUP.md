# JobGrid setup — Supabase, Vercel, MCP

## 1. MCP servers (`.mcp.json` + `.cursor/mcp.json`)

Both files configure the same two servers so any MCP client (Cursor, Claude
Code, agents) picks them up from the repo:

- **Supabase** — `https://mcp.supabase.com/mcp?project_ref=…`
  Replace `YOUR_JOBGRID_PROJECT_REF` with the ref of the dedicated JobGrid
  project (the `xxxx` in `https://xxxx.supabase.co`). Scoping to the ref keeps
  agents away from other projects in the account. First use triggers an OAuth
  flow in the browser — sign in with the account that owns the JobGrid project.
- **Vercel** — `https://mcp.vercel.com` (OAuth on first use). Once the Vercel
  project exists you can scope it too: `https://mcp.vercel.com/<team>/<project>`.

## 2. Point the app at the dedicated Supabase project

1. Run the migrations, in order, against the new project (SQL editor, or
   `supabase link --project-ref <ref> && supabase db push`):
   everything in `supabase/migrations/`.
2. Optionally run `supabase/seed.sql` for demo users/companies/jobs
   (demo password: `JobGridDemo1!`).
3. Update env vars (`apps/web/.env.local` locally, Vercel project settings in
   production):
   - `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>`
   - `SUPABASE_SECRET_KEY=<secret key>` (Settings → API keys; server-only —
     powers the MCP employer tools and ATS sync)
4. Supabase Auth settings for the new project:
   - Authentication → URL Configuration: Site URL `https://jobgrid.ai`,
     add `https://jobgrid.ai/auth/callback` (and localhost) to redirect URLs.
   - Authentication → Email: either disable "Confirm email" while testing, or
     configure custom SMTP (Resend SMTP works) — the built-in mailer is limited
     to ~2 emails/hour.
   - Enable leaked-password protection (Auth → Passwords).
5. Clean up the temporary dev schema in the old project: run
   `supabase/teardown.sql` (empty the `cvs`/`voice`/`logos` storage buckets
   from the dashboard first).

## 3. Vercel project

- Import the GitHub repo, set **Root Directory = `apps/web`** (framework:
  Next.js). pnpm is detected automatically from the lockfile.
- Add the env vars from `apps/web/.env.example` (Supabase keys, site URL,
  `RESEND_API_KEY`, `EMAIL_FROM`, optional `AI_GATEWAY_API_KEY`).
- Point `jobgrid.ai` / `www.jobgrid.ai` at the project (Domains tab).

## 4. Resend (email notifications)

- Add and verify the `jobgrid.ai` domain (or a subdomain like
  `notifications.jobgrid.ai`) in Resend, then set
  `EMAIL_FROM="JobGrid <notifications@jobgrid.ai>"`.
- The app sends: chat-request notification (employer), chat-accepted
  notification (candidate), new-application notification (employer).

## 5. Cloud Agent secrets (for agents working on this repo)

Add in Cursor Dashboard → Cloud Agents → Secrets, repo-scoped:

- `SUPABASE_SECRET_KEY` — secret API key of the JobGrid project
- `SUPABASE_DB_URL` — Postgres connection string (lets agents run
  migrations with `psql`/CLI without MCP auth)
- `RESEND_API_KEY` — for testing email flows
- `AI_GATEWAY_API_KEY` — optional, enables LLM-based CV parsing
