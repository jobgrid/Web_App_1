import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
