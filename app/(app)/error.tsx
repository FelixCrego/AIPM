"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
      <p className="text-lg font-semibold text-rose-900">Something went wrong</p>
      <p className="mt-1 text-sm text-rose-700">The command center could not load this section.</p>
      <Button className="mt-4" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
