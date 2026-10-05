import {
  Bot,
  Building2,
  ClipboardCheck,
  FileBarChart,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";

const staffRoles = ["admin", "manager", "employee"];

export const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", path: "/", icon: LayoutDashboard, roles: staffRoles },
      { label: "Clients", path: "/clients", icon: Building2, roles: staffRoles },
      { label: "Websites", path: "/websites", icon: Globe2, roles: staffRoles },
      { label: "Client portal", path: "/portal", icon: Gauge, roles: ["client"] },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "SEO performance", path: "/seo-dashboard", icon: Gauge, roles: staffRoles },
      { label: "Keywords", path: "/keywords", icon: KeyRound, roles: staffRoles },
      { label: "Technical audits", path: "/audits", icon: ClipboardCheck, roles: staffRoles },
      { label: "AI analyst", path: "/ai", icon: Bot, roles: staffRoles },
    ],
  },
  {
    label: "Delivery",
    items: [
      { label: "Tasks and alerts", path: "/tasks", icon: ListChecks, roles: staffRoles },
      { label: "Reports", path: "/reports", icon: FileBarChart, roles: ["admin", "manager"] },
    ],
  },
];

export function navigationForRole(role) {
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length);
}

export function titleForPath(pathname) {
  const item = navigationGroups.flatMap((group) => group.items).find(({ path }) => path === pathname);
  return item?.label ?? "Workspace";
}
