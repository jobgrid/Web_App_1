-- API keys (for the MCP server / ATS integrations) and analytics helpers

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.api_keys enable row level security;

create policy "owners manage api keys"
  on public.api_keys for all to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create index api_keys_company_idx on public.api_keys (company_id);

create table public.ats_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider text not null check (provider in ('jobadder', 'bullhorn', 'greenhouse', 'workable')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  settings jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, provider)
);

alter table public.ats_connections enable row level security;

create policy "owners manage ats connections"
  on public.ats_connections for all to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Analytics helpers (run as invoker; RLS on job_events limits to own jobs)
-- ---------------------------------------------------------------------------
create function public.company_job_stats(p_company_id uuid)
returns table (job_id uuid, views bigint, clicks bigint, applies bigint, chats bigint)
language sql
stable
set search_path = ''
as $$
  select j.id,
    count(e.id) filter (where e.event_type = 'view'),
    count(e.id) filter (where e.event_type = 'click'),
    count(e.id) filter (where e.event_type = 'apply'),
    count(e.id) filter (where e.event_type = 'chat_request')
  from public.jobs j
  left join public.job_events e on e.job_id = j.id
  where j.company_id = p_company_id
  group by j.id;
$$;

create function public.company_daily_events(p_company_id uuid, p_days int default 30)
returns table (day date, event_type public.job_event_type, total bigint)
language sql
stable
set search_path = ''
as $$
  select e.created_at::date, e.event_type, count(*)
  from public.job_events e
  join public.jobs j on j.id = e.job_id
  where j.company_id = p_company_id
    and e.created_at > now() - make_interval(days => p_days)
  group by 1, 2
  order by 1;
$$;

-- Expire jobs lazily: callable by anyone, only flips overdue rows.
create function public.expire_overdue_jobs()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs set status = 'expired', updated_at = now()
  where status = 'active' and expires_at <= now();
$$;
