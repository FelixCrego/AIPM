import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  FolderKanban,
  Gauge,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const appNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/deployments", label: "Deployments", icon: Gauge },
  { href: "/developers", label: "Developers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];
