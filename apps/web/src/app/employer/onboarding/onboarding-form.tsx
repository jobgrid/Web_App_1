"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany } from "@/lib/actions/employer";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createCompany, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" placeholder="Acme Robotics" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" name="tagline" placeholder="Robots that work for people" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Sydney, NSW" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" placeholder="https://acme.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand_color">Brand colour (for Branded & Premium ads)</Label>
        <Input
          id="brand_color"
          name="brand_color"
          type="color"
          defaultValue="#6366f1"
          className="h-10 w-20 p-1"
        />
      </div>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create company"}
      </Button>
    </form>
  );
}
