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
              "inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
  <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/80 p-4 backdrop-blur md:block">
    <div className="mb-6 rounded-xl bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">DevPilot AI</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">Engineering Command Center</p>
    </div>
    <NavLinks />
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
    <SheetContent side="left" className="w-72">
      <div className="mb-6 rounded-xl bg-gradient-to-br from-amber-50 to-teal-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">DevPilot AI</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">Engineering Command Center</p>
      </div>
      <NavLinks mobile />
    </SheetContent>
  </Sheet>
);
