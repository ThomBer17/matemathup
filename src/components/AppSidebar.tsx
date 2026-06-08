import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, BookOpen, User, LogOut, GraduationCap, LineChart, TrendingUp, Flag, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { StreakWidget } from "@/components/gamification/StreakWidget";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Temas", url: "/topics", icon: BookOpen },
  { title: "Mi progreso", url: "/progress", icon: TrendingUp },
  { title: "Plan de estudio", url: "/study", icon: CalendarDays },
  { title: "Explorar", url: "/explore", icon: LineChart },
  { title: "Perfil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold group-data-[collapsible=icon]:hidden">
            MateUp
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aprender</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/admin")}>
                    <Link to="/admin/reports" className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      <span>Reportes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <StreakWidget />
        </div>
        <div className="px-2 pb-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p className="truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="justify-start gap-2">
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Salir</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
