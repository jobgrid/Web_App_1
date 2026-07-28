import type { Metadata } from "next";

import { CvUploadCard } from "@/components/candidate/cv-upload-card";
import { ProfileForm } from "@/components/candidate/profile-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile & CV" };

export default async function CandidateProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {welcome && !candidateProfile?.cv_path && (
        <Alert>
          <AlertTitle>Welcome to JobGrid 👋</AlertTitle>
          <AlertDescription>
            Upload your CV below — we&apos;ll extract your skills with AI and show
            you every job you match with, instantly.
          </AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile & CV</h1>
        <p className="text-sm text-muted-foreground">
          Your CV powers your match scores, applications and auto-apply.
        </p>
      </div>
      <CvUploadCard
        cvFilename={candidateProfile?.cv_filename ?? null}
        updatedAt={candidateProfile?.updated_at ?? null}
      />
      {candidateProfile && <ProfileForm profile={candidateProfile} />}
    </div>
  );
}
