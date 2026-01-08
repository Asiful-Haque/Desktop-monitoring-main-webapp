"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CheckSquare,
  Image,
  Users,
  BarChart3,
  Settings,
  Home,
  CalendarDays,
  DollarSign,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/adminDashboard", icon: Home, roles: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead", "Freelancer"] },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, roles: ["Developer", "Admin", "Project Manager", "Team Lead", "Freelancer"] },
  { title: "Meetings", url: "/meetings", icon: Calendar, roles: ["Developer", "Admin", "Project Manager", "Team Lead"] },
  { title: "Screenshots", url: "/gallery", icon: Image, roles: ["Admin", "Project Manager", "CEO"] },
  { title: "Team", url: "/team", icon: Users, roles: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead"] },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["Admin", "Project Manager"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["Admin"] },
  { title: "Time Sheet", url: "/time-sheet", icon: CalendarDays, roles: ["Developer","Admin", "Freelancer"] },
  { title: "Payroll", url: "/payroll", icon: DollarSign, roles: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead", "Freelancer"] },
  { title: "Manual Time", url: "/manual-time", icon: Clock, roles: ["Developer", "Freelancer"] },
  { title: "Attendance", url: "/attendance", icon: Clock, roles: ["Admin", "Developer", "Freelancer"] },
  { title: "Leave", url: "/leave", icon: CalendarDays, roles: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead", "Freelancer"] },
];

export function AppSidebar({ user }) {
    const { open } = useSidebar();
    const pathname = usePathname(); 

  const filteredItems = navigationItems.filter(
    (item) => user && user.role && item.roles.includes(user.role)
  );
  console.log("user role is :", user );

  const getNavCls = (url) =>
    url === pathname
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar className={open ? "w-64" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className={getNavCls(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
