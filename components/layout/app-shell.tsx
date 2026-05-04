import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(0,255,133,0.12),_transparent_60%)]" />
      <div className="pointer-events-none absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
