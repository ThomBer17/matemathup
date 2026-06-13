import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  GraduationCap,
  TrendingUp,
  Flag,
  CalendarDays,
  BarChart3,
  Library,
  RotateCcw,
  Trophy,
  Wrench,
} from "lucide-react";
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
import { liveTools } from "@/lib/tools";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const aprender: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Temas", url: "/topics", icon: BookOpen },
  { title: "Teoría", url: "/theory", icon: Library },
  { title: "Repaso", url: "/review", icon: RotateCcw },
  { title: "Simulacro", url: "/exam", icon: Trophy },
];

const seguimiento: NavItem[] = [
  { title: "Mi progreso", url: "/progress", icon: TrendingUp },
  { title: "Plan de estudio", url: "/study", icon: CalendarDays },
];

// Las herramientas se derivan del registro único (solo las "live").
// Si superan el tope, el sidebar muestra las primeras + "Ver todas" → /tools,
// para mantenerse acotado y dejar el descubrimiento al hub.
const TOOLS_SIDEBAR_CAP = 4;
const toolItems: NavItem[] = liveTools.map((t) => ({
  title: t.title,
  url: t.to!,
  icon: t.icon,
}));
const herramientas: NavItem[] =
  toolItems.length > TOOLS_SIDEBAR_CAP
    ? [
        ...toolItems.slice(0, TOOLS_SIDEBAR_CAP - 1),
        { title: "Ver todas", url: "/tools", icon: Wrench },
      ]
    : toolItems;

const cuenta: NavItem[] = [{ title: "Perfil", url: "/profile", icon: User }];

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
            MatemathUp
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {(
          [
            { label: "Aprender", items: aprender },
            { label: "Seguimiento", items: seguimiento },
            { label: "Herramientas", items: herramientas },
          ] as const
        ).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cuenta.map((item) => {
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
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={path === "/admin/reports"}>
                      <Link to="/admin/reports" className="flex items-center gap-2">
                        <Flag className="h-4 w-4" />
                        <span>Reportes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={path === "/admin/analytics"}>
                      <Link to="/admin/analytics" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
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
