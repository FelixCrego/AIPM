"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { appNavItems } from "./nav";

const NavLinks = ({ mobile = false }: { mobile?: boolean }) => {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", mobile ? "pt-4" : "pt-2")}>
      {appNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              active
                ? "border border-emerald-300/20 bg-white/[0.08] text-emerald-300 shadow-[0_0_24px_rgba(0,255,133,0.12)]"
                : "text-white/58 hover:bg-white/[0.05] hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export const SidebarNav = () => (
  <aside className="hidden w-72 shrink-0 border-r border-white/6 bg-black/24 p-5 backdrop-blur-xl md:flex md:flex-col">
    <div className="mb-8 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#00ff85,_#8b5cf6)] font-mono text-sm font-bold tracking-tight text-black">
        DP
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight text-white">DevPilot <span className="font-light text-white/35">AI</span></p>
        <p className="hud-label mt-1">Command Center</p>
      </div>
    </div>

    <div className="mb-4">
      <p className="hud-label mb-3">Command_Menu</p>
      <NavLinks />
    </div>

    <div className="command-panel mt-auto rounded-[1.2rem] p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(0,255,133,0.4)]" />
        <span className="hud-value text-emerald-300">System_Healthy</span>
      </div>
      <p className="text-xs leading-relaxed text-white/45">
        Synced with GitHub: moments ago
        <br />
        Vercel deploy intelligence online
      </p>
    </div>
  </aside>
);

export const MobileNav = () => (
  <Sheet>
    <SheetTrigger
      render={
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      }
    />
    <SheetContent side="left" className="w-80 border-white/8 bg-[#090b10]/96 text-white">
      <div className="mb-6 flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#00ff85,_#8b5cf6)] font-mono text-sm font-bold text-black">
          DP
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-white">DevPilot <span className="font-light text-white/35">AI</span></p>
          <p className="hud-label mt-1">Command Center</p>
        </div>
      </div>
      <NavLinks mobile />
    </SheetContent>
  </Sheet>
);
