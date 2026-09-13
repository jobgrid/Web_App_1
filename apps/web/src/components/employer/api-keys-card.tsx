"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createApiKey, revokeApiKey } from "@/lib/actions/employer";
import { timeAgo } from "@/lib/format";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function ApiKeysCard({ apiKeys, mcpUrl }: { apiKeys: ApiKey[]; mcpUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createApiKey(name || "Default key");
      if (result.error) toast.error(result.error);
      else {
        setNewKey(result.plainKey ?? null);
        setName("");
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  function revoke(keyId: string) {
    startTransition(async () => {
      const result = await revokeApiKey(keyId);
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
          <KeyRound className="size-4" /> API keys — MCP & ATS access
        </CardTitle>
        <CardDescription>
          Use these keys to connect AI agents (via the MCP server at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{mcpUrl}</code>) and
          ATS systems to your account. Send as{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">Authorization: Bearer jg_live_…</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <Alert>
            <AlertTitle>Copy your new key — it won&apos;t be shown again</AlertTitle>
            <AlertDescription>
              <div className="mt-1 flex w-full items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                  {newKey}
                </code>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(newKey);
                    toast.success("Copied to clipboard");
                  }}
                  aria-label="Copy API key"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. JobAdder sync)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button onClick={create} disabled={pending}>
            <Plus className="size-4" /> Create key
          </Button>
        </div>

        <div className="space-y-2">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {apiKey.name}{" "}
                  {apiKey.revoked_at && (
                    <Badge variant="outline" className="ml-1 text-destructive">
                      revoked
                    </Badge>
                  )}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {apiKey.key_prefix}… · created {timeAgo(apiKey.created_at)}
                  {apiKey.last_used_at && ` · last used ${timeAgo(apiKey.last_used_at)}`}
                </p>
              </div>
              {!apiKey.revoked_at && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => revoke(apiKey.id)}
                  disabled={pending}
                  aria-label="Revoke key"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {apiKeys.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No API keys yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
