"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompany } from "@/lib/actions/employer";
import type { Tables } from "@/lib/database.types";

export function CompanySettingsForm({ company }: { company: Tables<"companies"> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCompany(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company profile</CardTitle>
          <CardDescription>
            Shown on your ads. Branded and Premium ads use your logo and colour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" defaultValue={company.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={company.location} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" defaultValue={company.website ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_color">Brand colour</Label>
              <Input
                id="brand_color"
                name="brand_color"
                type="color"
                defaultValue={company.brand_color}
                className="h-10 w-20 p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={company.tagline} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">About</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={company.description}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save company"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
