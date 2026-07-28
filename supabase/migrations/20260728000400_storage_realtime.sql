-- Storage buckets and realtime publication

insert into storage.buckets (id, name, public) values
  ('cvs', 'cvs', false),
  ('voice', 'voice', false),
  ('logos', 'logos', true);

-- CVs: candidates own their folder (cvs/<user_id>/...)
create policy "candidates manage own cvs"
  on storage.objects for all to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Employers can read the CV attached to an application for one of their jobs.
create policy "employers read applicant cvs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'cvs'
    and exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      where c.owner_id = (select auth.uid()) and a.cv_path = storage.objects.name
    )
  );

-- Voice notes live under voice/<conversation_id>/... and are restricted to participants.
create policy "participants manage voice notes"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'voice'
    and exists (
      select 1 from public.conversations conv
      where conv.id::text = (storage.foldername(name))[1]
        and (
          conv.candidate_id = (select auth.uid())
          or exists (select 1 from public.companies c where c.id = conv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  )
  with check (
    bucket_id = 'voice'
    and exists (
      select 1 from public.conversations conv
      where conv.id::text = (storage.foldername(name))[1]
        and (
          conv.candidate_id = (select auth.uid())
          or exists (select 1 from public.companies c where c.id = conv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

-- Logos: public read, owner writes under logos/<company_id>/...
create policy "logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "owners manage logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1] and c.owner_id = (select auth.uid())
    )
  );

create policy "owners update logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1] and c.owner_id = (select auth.uid())
    )
  );

-- Realtime for chat
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_requests;
alter publication supabase_realtime add table public.conversations;
