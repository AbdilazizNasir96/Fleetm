import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSwitchTenant, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api";
import {
  LayoutDashboard, Truck, Route, Users, GraduationCap, CalendarClock,
  AlertTriangle, Wrench, UserCog, Shield, ChevronDown, LogOut, Bus
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/trips", label: "Trips", icon: CalendarClock },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/team", label: "Team", icon: UserCog },
];

const adminNavItems = [
  { href: "/admin", label: "Platform Stats", icon: Shield },
  { href: "/admin/tenants", label: "Tenants", icon: Users },
  { href: "/admin/users", label: "All Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: Shield },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, currentTenant, tenants, logout, login } = useAuth();
  const queryClient = useQueryClient();
  const switchTenant = useSwitchTenant();

  const handleSwitchTenant = (tenantId: string) => {
    switchTenant.mutate(
      { data: { tenantId } },
      {
        onSuccess: (data) => {
          setAuthToken(data.token);
          login(data.token, data.user as any, data.tenant as any, data.role);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
      }
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col bg-sidebar border-r border-sidebar-border z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Bus className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sidebar-foreground font-bold text-sm truncate">ProjectTnW</p>
          <p className="text-sidebar-foreground/50 text-xs truncate">Transport Platform</p>
        </div>
      </div>

      {/* Tenant switcher */}
      {tenants.length > 0 && (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                data-testid="tenant-switcher"
                className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-9 px-2 text-xs"
              >
                <span className="truncate font-medium">{currentTenant?.name ?? "Select tenant"}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="start">
              {tenants.map((t) => (
                <DropdownMenuItem
                  key={t.tenantId}
                  onClick={() => handleSwitchTenant(t.tenantId)}
                  data-testid={`tenant-option-${t.tenantId}`}
                  className="cursor-pointer"
                >
                  <span className="flex-1 truncate">{t.tenantName}</span>
                  <Badge variant="secondary" className="ml-2 text-xs capitalize">{t.role}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <a
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </a>
            </Link>
          );
        })}

        {user?.isSuperAdmin && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Super Admin</p>
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-3 border-t border-sidebar-border pt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sidebar-primary-foreground">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.fullName ?? user?.email}</p>
            <p className="text-sidebar-foreground/40 text-xs truncate capitalize">{currentTenant ? "admin" : "no tenant"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          data-testid="logout-button"
          onClick={logout}
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 px-2 text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
