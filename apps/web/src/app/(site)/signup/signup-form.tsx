"use client";

import { useActionState, useState } from "react";
import { Briefcase, UserRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function SignupForm({ defaultRole }: { defaultRole: "candidate" | "employer" }) {
  const [role, setRole] = useState<"candidate" | "employer">(defaultRole);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { value: "candidate", label: "I'm looking for a job", icon: UserRound },
            { value: "employer", label: "I'm hiring", icon: Briefcase },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
              role === option.value
                ? "border-primary bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <option.icon className="size-5" />
            {option.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">{role === "employer" ? "Your name" : "Full name"}</Label>
        <Input id="full_name" name="full_name" placeholder="Alex Chen" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
