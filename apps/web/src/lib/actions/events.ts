"use server";

import { createClient } from "@/lib/supabase/server";

// Fire-and-forget analytics; anonymous inserts are allowed by RLS for
// impression/view/click events on active jobs.
export async function recordJobEvent(
  jobId: string,
  eventType: "impression" | "view" | "click"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("job_events").insert({
    job_id: jobId,
    event_type: eventType,
    actor_id: user?.id ?? null,
  });
}
