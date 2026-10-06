import { LayoutDashboard, Lightbulb, MessageSquare, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** The rail's navigation. Mock analytics routes are deliberately absent (spec §2). */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Practice",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "New interview", url: "/interview/setup", icon: Sparkles },
      { title: "Practice questions", url: "/dashboard/practice-questions", icon: MessageSquare },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Progress", url: "/dashboard/progress", icon: TrendingUp },
      { title: "Insights", url: "/dashboard/insights", icon: Lightbulb },
    ],
  },
];
