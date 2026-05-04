import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7,_#f8fafc_35%,_#f0fdfa_70%,_#ecfeff_100%)]">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};
