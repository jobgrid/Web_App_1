"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { updateCandidateProfile } from "@/lib/actions/candidate";
import type { Tables } from "@/lib/database.types";

export function ProfileForm({ profile }: { profile: Tables<"candidate_profiles"> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [autoApply, setAutoApply] = useState(profile.auto_apply);
  const [minScore, setMinScore] = useState(profile.auto_apply_min_score);
  const [openToRemote, setOpenToRemote] = useState(profile.open_to_remote);
  const [skills, setSkills] = useState(profile.skills.join(", "));

  function handleSubmit(formData: FormData) {
    formData.set("skills", skills);
    if (openToRemote) formData.set("open_to_remote", "on");
    if (autoApply) formData.set("auto_apply", "on");
    formData.set("auto_apply_min_score", String(minScore));
    startTransition(async () => {
      const result = await updateCandidateProfile(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  const skillList = skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Everything here feeds directly into your match scores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                name="headline"
                defaultValue={profile.headline}
                placeholder="Senior Frontend Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={profile.location}
                placeholder="Sydney, NSW"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="React, TypeScript, Machine Learning"
            />
            {skillList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skillList.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Open to remote work</p>
              <p className="text-xs text-muted-foreground">
                Remote jobs will score higher for you.
              </p>
            </div>
            <Switch checked={openToRemote} onCheckedChange={setOpenToRemote} />
          </div>

          <Separator />

          <div className="space-y-4 rounded-lg border border-primary/20 bg-accent/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Auto-apply</p>
                <p className="text-xs text-muted-foreground">
                  Automatically apply the moment a new job clears your match threshold.
                </p>
              </div>
              <Switch checked={autoApply} onCheckedChange={setAutoApply} />
            </div>
            {autoApply && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Minimum match score</Label>
                  <span className="font-mono font-semibold text-primary">{minScore}%</span>
                </div>
                <Slider
                  min={50}
                  max={100}
                  step={5}
                  value={[minScore]}
                  onValueChange={([value]) => setMinScore(value)}
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
