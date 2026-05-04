"use client";

import { Activity, Command, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";

const viewLabels: Record<string, string> = {
  "/dashboard": "DASHBOARD",
  "/projects": "PROJECTS",
  "/repositories": "REPOSITORIES",
  "/issues": "ISSUES",
  "/pull-requests": "PULL_REQUESTS",
  "/deployments": "DEPLOYMENTS",
  "/developers": "DEVELOPERS",
  "/settings": "SETTINGS",
};

export const TopHeader = ({ subtitle }: { subtitle?: string }) => {
  const pathname = usePathname();
  const activeView =
    Object.entries(viewLabels).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ??
    "COMMAND_CENTER";

  return (
    <header className="sticky top-0 z-20 border-b border-white/6 bg-black/24 px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <MobileNav />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="hud-label">ORG:</span>
              <span className="hud-value text-white/82">DEVPILOT_INTERNAL</span>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <span className="hud-label">ACTIVE_VIEW:</span>
              <span className="hud-value text-violet-300">{activeView}</span>
            </div>
            <p className="mt-2 text-sm text-white/62">{subtitle ?? "AI Engineering Manager for software delivery"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-pill hidden items-center gap-2 rounded-full px-4 py-2 text-xs text-white/48 md:inline-flex">
            <Search className="h-3.5 w-3.5" />
            <span className="font-mono">Cmd + K</span>
            <Command className="h-3.5 w-3.5 text-white/28" />
          </div>
          <Badge className="gap-1 bg-emerald-300 text-black hover:bg-emerald-300">
            <Sparkles className="h-3 w-3" />
            AI Active
          </Badge>
          <Badge variant="outline" className="gap-1 border-white/10 text-white/72">
            <Activity className="h-3 w-3" />
            Live Sync Ready
          </Badge>
        </div>
      </div>
    </header>
  );
};
