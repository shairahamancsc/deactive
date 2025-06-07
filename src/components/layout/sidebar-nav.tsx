
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserPlus, ListChecks, BrainCircuit, LayoutDashboard } from "lucide-react"; // Added LayoutDashboard
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Changed label and icon
  { href: "/laborers/add", label: "Add Laborer", icon: UserPlus },
  { href: "/daily-entry", label: "Daily Entry", icon: ListChecks },
  { href: "/work-analysis", label: "Work Analysis", icon: BrainCircuit },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && pathname !== "/dashboard")}
              className="w-full justify-start"
              tooltip={item.label}
            >
              <span>
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                )}
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
