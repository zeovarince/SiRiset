import {
  Award,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Home,
  MessagesSquare,
  NotebookPen,
  RefreshCcw,
  Route,
  Search,
  ShieldCheck,
  Stamp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/roles";

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  search: Search,
  route: Route,
  notebook: NotebookPen,
  "file-chart": FileBarChart,
  award: Award,
  briefcase: Briefcase,
  users: Users,
  stamp: Stamp,
  messages: MessagesSquare,
  "clipboard-check": ClipboardCheck,
  "shield-check": ShieldCheck,
  refresh: RefreshCcw,
  graduation: GraduationCap,
  "bar-chart": BarChart3,
  "clipboard-list": ClipboardList,
};

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}
