import { Activity, Sparkles } from "lucide-react";

import { MobileNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";

export const TopHeader = ({ subtitle }: { subtitle?: string }) => {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <p className="text-sm font-semibold text-slate-900">DevPilot AI</p>
            <p className="text-xs text-slate-500">{subtitle ?? "AI Engineering Manager for software delivery"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-teal-600 text-white hover:bg-teal-600">
            <Sparkles className="h-3 w-3" />
            AI Active
          </Badge>
          <Badge variant="outline" className="gap-1 border-slate-300 text-slate-700">
            <Activity className="h-3 w-3" />
            Demo Mode Ready
          </Badge>
        </div>
      </div>
    </header>
  );
};
