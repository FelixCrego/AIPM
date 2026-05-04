"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export const AsyncActionButton = ({
  endpoint,
  method = "POST",
  payload,
  label,
  pendingLabel,
  onSuccess,
}: {
  endpoint: string;
  method?: "POST" | "GET";
  payload?: unknown;
  label: string;
  pendingLabel?: string;
  onSuccess?: () => void;
}) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAction = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(payload ?? {}) : undefined,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed: ${response.status}`);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button onClick={runAction} disabled={pending}>
        {pending ? pendingLabel ?? "Running..." : label}
      </Button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
};
