-- Removes EVERYTHING JobGrid added to a Supabase project (tables, functions,
-- types, storage buckets, seeded demo users). Run this against the temporary
-- dev project once a dedicated JobGrid project exists. It does not touch any
-- pre-existing objects (e.g. blog_posts).

-- Auth trigger first so user deletion doesn't fire it.
drop trigger if exists on_auth_user_created on auth.users;

-- Storage: objects, then policies, then buckets.
delete from storage.objects where bucket_id in ('cvs', 'voice', 'logos');
drop policy if exists "candidates manage own cvs" on storage.objects;
drop policy if exists "employers read applicant cvs" on storage.objects;
drop policy if exists "participants manage voice notes" on storage.objects;
drop policy if exists "owners manage logos" on storage.objects;
drop policy if exists "owners update logos" on storage.objects;
delete from storage.buckets where id in ('cvs', 'voice', 'logos');

-- Realtime publication entries.
alter publication supabase_realtime drop table public.messages;
alter publication supabase_realtime drop table public.chat_requests;
alter publication supabase_realtime drop table public.conversations;

-- Tables (cascade removes dependent triggers/policies/indexes).
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.chat_requests cascade;
drop table if exists public.applications cascade;
drop table if exists public.job_events cascade;
drop table if exists public.jobs cascade;
drop table if exists public.purchases cascade;
drop table if exists public.ad_products cascade;
drop table if exists public.api_keys cascade;
drop table if exists public.ats_connections cascade;
drop table if exists public.companies cascade;
drop table if exists public.candidate_profiles cascade;
drop table if exists public.profiles cascade;

-- Functions.
drop function if exists public.handle_new_user();
drop function if exists public.keep_profile_role();
drop function if exists public.record_apply_event();
drop function if exists public.record_chat_request_event();
drop function if exists public.handle_chat_request_decision();
drop function if exists public.touch_conversation();
drop function if exists public.run_auto_apply();
drop function if exists public.matched_jobs_for_me();
drop function if exists public.match_score(text[], text, public.work_type[], boolean, text[], text, public.work_type, boolean);
drop function if exists public.company_job_stats(uuid);
drop function if exists public.company_daily_events(uuid, int);
drop function if exists public.expire_overdue_jobs();

-- Types.
drop type if exists public.user_role;
drop type if exists public.job_status;
drop type if exists public.ad_tier;
drop type if exists public.work_type;
drop type if exists public.application_status;
drop type if exists public.application_source;
drop type if exists public.job_event_type;
drop type if exists public.chat_request_status;
drop type if exists public.message_kind;

-- Seeded demo users.
delete from auth.users where email in (
  'delivered@resend.dev',
  'delivered+medcare@resend.dev',
  'delivered+forge@resend.dev',
  'delivered+candidate@resend.dev'
);

-- Migration history entries added by JobGrid.
delete from supabase_migrations.schema_migrations
where name in (
  'jobgrid_core',
  'jobgrid_chat_and_matching',
  'jobgrid_integrations_analytics',
  'jobgrid_storage_realtime',
  'jobgrid_security_hardening'
);
