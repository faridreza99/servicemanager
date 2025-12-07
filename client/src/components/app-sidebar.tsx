import { Link, useLocation } from "wouter";
import {
  Home,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  ClipboardList,
  Briefcase,
  UserCheck,
  Bell,
  Shield,
  BarChart3,
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@shared/schema";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
}

function getMenuItems(role: UserRole): { main: MenuItem[]; secondary?: MenuItem[] } {
  if (role === "admin") {
    return {
      main: [
        { title: "Dashboard", url: "/admin", icon: Home },
        { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
        { title: "Users", url: "/admin/users", icon: Users },
        { title: "Services", url: "/admin/services", icon: Briefcase },
        { title: "Bookings", url: "/admin/bookings", icon: Calendar },
        { title: "Tasks", url: "/admin/tasks", icon: ClipboardList },
        { title: "Chats", url: "/admin/chats", icon: MessageSquare },
      ],
      secondary: [
        { title: "Notifications", url: "/admin/notifications", icon: Bell },
        { title: "Settings", url: "/admin/settings", icon: Settings },
      ],
    };
  }

  if (role === "staff") {
    return {
      main: [
        { title: "Dashboard", url: "/staff", icon: Home },
        { title: "My Tasks", url: "/staff/tasks", icon: ClipboardList },
        { title: "Chats", url: "/staff/chats", icon: MessageSquare },
      ],
      secondary: [
        { title: "Notifications", url: "/staff/notifications", icon: Bell },
      ],
    };
  }

  return {
    main: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Services", url: "/dashboard/services", icon: Briefcase },
      { title: "My Bookings", url: "/dashboard/bookings", icon: Calendar },
      { title: "Messages", url: "/dashboard/chats", icon: MessageSquare },
    ],
  };
}

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const { main, secondary } = getMenuItems(user.role);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <Shield className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-lg">IT Services</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondary && (
          <SidebarGroup>
            <SidebarGroupLabel>Other</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-xs text-muted-foreground">
          Logged in as {user.name}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
