-- JobGrid core schema: identities, companies, products, jobs, applications, events

create type public.user_role as enum ('candidate', 'employer');
create type public.job_status as enum ('draft', 'active', 'expired', 'closed');
create type public.ad_tier as enum ('basic', 'branded', 'premium');
create type public.work_type as enum ('full_time', 'part_time', 'contract', 'casual', 'internship');
create type public.application_status as enum ('submitted', 'viewed', 'shortlisted', 'rejected', 'hired');
create type public.application_source as enum ('manual', 'batch', 'auto');
create type public.job_event_type as enum ('impression', 'view', 'click', 'apply', 'chat_request');

-- ---------------------------------------------------------------------------
-- Profiles (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'candidate',
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Role is set once at signup and cannot be changed afterwards.
create function public.keep_profile_role()
returns trigger
language plpgsql
as $$
begin
  new.role := old.role;
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.keep_profile_role();

-- Created automatically from auth signup metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'candidate');
  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  if v_role = 'candidate' then
    insert into public.candidate_profiles (user_id) values (new.id);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Candidate profiles
-- ---------------------------------------------------------------------------
create table public.candidate_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text not null default '',
  location text not null default '',
  cv_path text,
  cv_filename text,
  cv_text text,
  skills text[] not null default '{}',
  years_experience int,
  desired_min_salary int,
  preferred_work_types public.work_type[] not null default '{}',
  open_to_remote boolean not null default true,
  auto_apply boolean not null default false,
  auto_apply_min_score int not null default 75 check (auto_apply_min_score between 50 and 100),
  updated_at timestamptz not null default now()
);

alter table public.candidate_profiles enable row level security;

create policy "candidates manage own profile"
  on public.candidate_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Companies (single owner in v1)
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  website text,
  logo_url text,
  brand_color text not null default '#6366f1',
  tagline text not null default '',
  description text not null default '',
  location text not null default '',
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "companies are publicly readable"
  on public.companies for select using (true);

create policy "owners insert companies"
  on public.companies for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owners update companies"
  on public.companies for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners delete companies"
  on public.companies for delete to authenticated
  using (owner_id = (select auth.uid()));

create index companies_owner_idx on public.companies (owner_id);

-- ---------------------------------------------------------------------------
-- Ad products & purchases (credits model)
-- ---------------------------------------------------------------------------
create table public.ad_products (
  code text primary key,
  name text not null,
  description text not null default '',
  tier public.ad_tier not null,
  price_cents int not null,
  compare_at_cents int,
  duration_days int not null,
  features jsonb not null default '[]',
  sort int not null default 0
);

alter table public.ad_products enable row level security;

create policy "ad products are publicly readable"
  on public.ad_products for select using (true);

insert into public.ad_products (code, name, description, tier, price_cents, compare_at_cents, duration_days, features, sort) values
  ('basic', 'Basic Ad', 'A clean, effective listing that gets you in front of matched candidates fast.', 'basic', 4900, 32500, 30, '["Live for 30 days", "AI candidate matching", "Real-time chat with applicants", "Performance dashboard"]', 1),
  ('branded', 'Branded Ad', 'Stand out with your logo, brand colour and rich highlights on every card.', 'branded', 9900, 64500, 45, '["Everything in Basic", "Live for 45 days", "Company logo & brand colour", "Key selling-point highlights", "Priority in matched feeds"]', 2),
  ('premium', 'Premium Ad', 'Maximum reach. Pinned placement, featured badge and top billing in search.', 'premium', 19900, 138500, 60, '["Everything in Branded", "Live for 60 days", "Pinned to top of search", "Featured badge", "2x AI match boost", "Batch candidate invites"]', 3);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  product_code text not null references public.ad_products (code),
  quantity int not null check (quantity > 0),
  credits_remaining int not null check (credits_remaining >= 0),
  unit_price_cents int not null,
  total_cents int not null,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "owners manage purchases"
  on public.purchases for all to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create index purchases_company_idx on public.purchases (company_id);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null,
  slug text not null unique,
  description text not null default '',
  highlights text[] not null default '{}',
  category text not null default 'Other',
  location text not null default '',
  is_remote boolean not null default false,
  work_type public.work_type not null default 'full_time',
  salary_min int,
  salary_max int,
  salary_period text not null default 'year' check (salary_period in ('year', 'day', 'hour')),
  currency text not null default 'AUD',
  skills text[] not null default '{}',
  tier public.ad_tier not null default 'basic',
  status public.job_status not null default 'draft',
  external_ref text,
  source text not null default 'jobgrid',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "active jobs are publicly readable"
  on public.jobs for select
  using (
    (status = 'active' and expires_at > now())
    or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "owners insert jobs"
  on public.jobs for insert to authenticated
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create policy "owners update jobs"
  on public.jobs for update to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create policy "owners delete jobs"
  on public.jobs for delete to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create index jobs_company_idx on public.jobs (company_id);
create index jobs_status_idx on public.jobs (status, expires_at);
create index jobs_skills_idx on public.jobs using gin (skills);

-- ---------------------------------------------------------------------------
-- Job events (analytics)
-- ---------------------------------------------------------------------------
create table public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs (id) on delete cascade,
  event_type public.job_event_type not null,
  actor_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.job_events enable row level security;

-- Anyone (including anonymous visitors) can record view/click events on active jobs.
create policy "anyone records view events"
  on public.job_events for insert
  with check (
    event_type in ('impression', 'view', 'click')
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'active')
  );

create policy "owners read job events"
  on public.job_events for select to authenticated
  using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_id and c.owner_id = (select auth.uid())
    )
  );

create index job_events_job_idx on public.job_events (job_id, event_type, created_at);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  status public.application_status not null default 'submitted',
  source public.application_source not null default 'manual',
  match_score int,
  cover_note text not null default '',
  cv_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

alter table public.applications enable row level security;

create policy "candidates read own applications"
  on public.applications for select to authenticated
  using (candidate_id = (select auth.uid()));

create policy "candidates create own applications"
  on public.applications for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'active' and j.expires_at > now())
  );

create policy "employers read applications for their jobs"
  on public.applications for select to authenticated
  using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_id and c.owner_id = (select auth.uid())
    )
  );

create policy "employers update applications for their jobs"
  on public.applications for update to authenticated
  using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_id and c.owner_id = (select auth.uid())
    )
  );

create index applications_job_idx on public.applications (job_id);
create index applications_candidate_idx on public.applications (candidate_id);

-- Applying also records an analytics event.
create function public.record_apply_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.job_events (job_id, event_type, actor_id, metadata)
  values (new.job_id, 'apply', new.candidate_id, jsonb_build_object('source', new.source));
  return new;
end;
$$;

create trigger on_application_created
  after insert on public.applications
  for each row execute function public.record_apply_event();
