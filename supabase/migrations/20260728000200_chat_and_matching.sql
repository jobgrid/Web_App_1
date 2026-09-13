-- JobGrid chat (Boss-style: request -> accept -> unlocked conversation) and AI matching

create type public.chat_request_status as enum ('pending', 'accepted', 'declined');
create type public.message_kind as enum ('text', 'voice', 'system');

-- ---------------------------------------------------------------------------
-- Chat requests
-- ---------------------------------------------------------------------------
create table public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  message text not null default '',
  status public.chat_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (candidate_id, company_id, job_id)
);

alter table public.chat_requests enable row level security;

create policy "participants read chat requests"
  on public.chat_requests for select to authenticated
  using (
    candidate_id = (select auth.uid())
    or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "candidates create chat requests"
  on public.chat_requests for insert to authenticated
  with check (candidate_id = (select auth.uid()));

create policy "employers decide chat requests"
  on public.chat_requests for update to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

create index chat_requests_company_idx on public.chat_requests (company_id, status);
create index chat_requests_candidate_idx on public.chat_requests (candidate_id);

-- ---------------------------------------------------------------------------
-- Conversations (created automatically when a request is accepted)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  chat_request_id uuid not null unique references public.chat_requests (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "participants read conversations"
  on public.conversations for select to authenticated
  using (
    candidate_id = (select auth.uid())
    or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create index conversations_candidate_idx on public.conversations (candidate_id);
create index conversations_company_idx on public.conversations (company_id);

-- Accepting a request unlocks the conversation. Trigger runs as owner so no
-- direct insert policy on conversations is needed (they are system-created).
create function public.handle_chat_request_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    new.decided_at := now();
    insert into public.conversations (chat_request_id, job_id, candidate_id, company_id)
    values (new.id, new.job_id, new.candidate_id, new.company_id);
  elsif new.status = 'declined' and old.status = 'pending' then
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger on_chat_request_decided
  before update of status on public.chat_requests
  for each row execute function public.handle_chat_request_decision();

-- Recording a chat_request analytics event.
create function public.record_chat_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.job_id is not null then
    insert into public.job_events (job_id, event_type, actor_id)
    values (new.job_id, 'chat_request', new.candidate_id);
  end if;
  return new;
end;
$$;

create trigger on_chat_request_created
  after insert on public.chat_requests
  for each row execute function public.record_chat_request_event();

-- ---------------------------------------------------------------------------
-- Messages (text + voice notes)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text not null default '',
  audio_path text,
  duration_seconds int,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

create policy "participants read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id
        and (
          conv.candidate_id = (select auth.uid())
          or exists (select 1 from public.companies c where c.id = conv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id
        and (
          conv.candidate_id = (select auth.uid())
          or exists (select 1 from public.companies c where c.id = conv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

create policy "participants mark messages read"
  on public.messages for update to authenticated
  using (
    exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id
        and (
          conv.candidate_id = (select auth.uid())
          or exists (select 1 from public.companies c where c.id = conv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

create index messages_conversation_idx on public.messages (conversation_id, created_at);

create function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------------
-- Matching: score = skills (60) + location (15) + work type (15) + remote (10)
-- ---------------------------------------------------------------------------
create function public.match_score(
  p_candidate_skills text[],
  p_candidate_location text,
  p_candidate_work_types public.work_type[],
  p_open_to_remote boolean,
  p_job_skills text[],
  p_job_location text,
  p_job_work_type public.work_type,
  p_job_is_remote boolean
)
returns int
language sql
immutable
as $$
  select least(100, (
    coalesce((
      select round(60.0 * count(*) / greatest(array_length(p_job_skills, 1), 1))
      from unnest(p_job_skills) js
      where exists (select 1 from unnest(p_candidate_skills) cs where lower(cs) = lower(js))
    ), 0)
    + case
        when p_candidate_location <> '' and p_job_location <> ''
          and (position(lower(split_part(p_candidate_location, ',', 1)) in lower(p_job_location)) > 0
               or position(lower(split_part(p_job_location, ',', 1)) in lower(p_candidate_location)) > 0)
        then 15
        when p_job_is_remote and p_open_to_remote then 10
        else 0
      end
    + case
        when array_length(p_candidate_work_types, 1) is null then 8
        when p_job_work_type = any (p_candidate_work_types) then 15
        else 0
      end
    + case when p_job_is_remote and p_open_to_remote then 10 else 0 end
  ))::int;
$$;

-- Matched feed for the signed-in candidate.
create function public.matched_jobs_for_me()
returns table (job_id uuid, score int)
language sql
stable
set search_path = ''
as $$
  select j.id, public.match_score(
    cp.skills, cp.location, cp.preferred_work_types, cp.open_to_remote,
    j.skills, j.location, j.work_type, j.is_remote
  ) as score
  from public.jobs j
  cross join public.candidate_profiles cp
  where cp.user_id = (select auth.uid())
    and j.status = 'active'
    and j.expires_at > now()
  order by score desc, j.tier desc, j.published_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Auto-apply: when a job goes live, candidates who opted in are applied
-- automatically when their match score clears their threshold.
-- ---------------------------------------------------------------------------
create function public.run_auto_apply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    insert into public.applications (job_id, candidate_id, status, source, match_score, cover_note, cv_path)
    select new.id, cp.user_id, 'submitted', 'auto',
      public.match_score(cp.skills, cp.location, cp.preferred_work_types, cp.open_to_remote,
                         new.skills, new.location, new.work_type, new.is_remote),
      'Auto-applied by JobGrid AI matching.', cp.cv_path
    from public.candidate_profiles cp
    where cp.auto_apply
      and cp.cv_path is not null
      and public.match_score(cp.skills, cp.location, cp.preferred_work_types, cp.open_to_remote,
                             new.skills, new.location, new.work_type, new.is_remote) >= cp.auto_apply_min_score
    on conflict (job_id, candidate_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_job_activated
  after insert or update of status on public.jobs
  for each row execute function public.run_auto_apply();
