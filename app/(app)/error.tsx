"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="command-panel rounded-[1.35rem] border border-rose-400/20 bg-rose-500/10 p-6">
      <p className="text-lg font-semibold text-rose-100">Something went wrong</p>
      <p className="mt-1 text-sm text-rose-100/72">The command center could not load this section.</p>
      <Button className="mt-4" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
