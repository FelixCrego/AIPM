"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { GitBranch, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type IntegrationStatus = {
  github: {
    connected: boolean;
    mode: string;
  };
};

export function GitHubOAuthControl() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/integrations/status", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; integrations?: IntegrationStatus }
          | null;

        if (!cancelled && payload?.ok && payload.integrations) {
          setStatus(payload.integrations);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const connected = status?.github.connected ?? false;

  return (
    <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">GitHub OAuth</p>
          <p className="text-xs text-white/54">
            Connect with GitHub OAuth to list repositories, create repositories, and write completion records.
          </p>
        </div>
        {loading ? (
          <Badge variant="outline">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking
          </Badge>
        ) : (
          <Badge variant={connected ? "secondary" : "outline"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        )}
      </div>

      <Button type="button" variant={connected ? "outline" : "default"} onClick={() => signIn("github", { callbackUrl: "/settings" })}>
        <GitBranch className="h-4 w-4" />
        {connected ? "Reconnect GitHub" : "Connect GitHub"}
      </Button>
    </div>
  );
}
