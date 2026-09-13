"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Cable, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectAts, syncAts } from "@/lib/actions/employer";
import type { Tables } from "@/lib/database.types";
import { timeAgo } from "@/lib/format";

const PROVIDERS = [
  { id: "jobadder", name: "JobAdder", description: "Sync live job ads from JobAdder." },
  { id: "bullhorn", name: "Bullhorn", description: "Import open JobOrders from Bullhorn." },
] as const;

export function AtsConnectionsCard({
  connections,
}: {
  connections: Tables<"ats_connections">[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]));

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cable className="size-4" /> ATS integrations
        </CardTitle>
        <CardDescription>
          Connect your applicant tracking system and import jobs as drafts.
          Connections start in demo mode; add OAuth credentials for live sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROVIDERS.map((provider) => {
          const connection = byProvider.get(provider.id);
          const connected = connection?.status === "connected";
          return (
            <div
              key={provider.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {provider.name}
                  {connected ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {provider.description}
                  {connection?.last_synced_at &&
                    ` · last synced ${timeAgo(connection.last_synced_at)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {connected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(() => syncAts(provider.id))}
                    disabled={pending}
                  >
                    <RefreshCw className="size-3.5" /> Sync now
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => run(() => connectAts(provider.id))}
                    disabled={pending}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
