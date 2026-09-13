-- Advisor-driven hardening: pin search_path, lock down internal functions,
-- and remove the broad listing policy from the public logos bucket.

alter function public.match_score(text[], text, public.work_type[], boolean, text[], text, public.work_type, boolean)
  set search_path = '';
alter function public.keep_profile_role() set search_path = '';

-- Trigger + maintenance functions are internal; nobody should call them over the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.keep_profile_role() from public, anon, authenticated;
revoke execute on function public.record_apply_event() from public, anon, authenticated;
revoke execute on function public.record_chat_request_event() from public, anon, authenticated;
revoke execute on function public.handle_chat_request_decision() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;
revoke execute on function public.run_auto_apply() from public, anon, authenticated;
revoke execute on function public.expire_overdue_jobs() from public, anon, authenticated;

-- Public buckets serve objects by URL without a SELECT policy; the broad policy
-- only enabled listing, which we don't want.
drop policy "logos are publicly readable" on storage.objects;
