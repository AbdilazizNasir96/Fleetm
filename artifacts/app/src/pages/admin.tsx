import { useAdminGetPlatformStats, useAdminListTenants, useAdminListUsers, useAdminGetAuditLog } from "@workspace/api-client-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Truck, CalendarClock, GraduationCap, Building2 } from "lucide-react";

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !user.isSuperAdmin) setLocation("/dashboard");
  }, [user, setLocation]);

  const { data: stats, isLoading } = useAdminGetPlatformStats();

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Super Admin</h1>
            <p className="text-muted-foreground text-sm">Platform-wide statistics</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(7).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Tenants" value={stats?.totalTenants ?? 0} icon={Building2} />
              <StatCard label="Active Tenants" value={stats?.activeTenants ?? 0} icon={Building2} />
              <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
              <StatCard label="Trial Tenants" value={stats?.trialTenants ?? 0} icon={Building2} />
              <StatCard label="Total Vehicles" value={stats?.totalVehicles ?? 0} icon={Truck} />
              <StatCard label="Total Trips" value={stats?.totalTrips ?? 0} icon={CalendarClock} />
              <StatCard label="Total Students" value={stats?.totalStudents ?? 0} icon={GraduationCap} />
            </div>
            {stats?.planBreakdown && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Plans breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                      <div key={plan} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        <Badge variant="secondary" className="capitalize">{plan}</Badge>
                        <span className="font-semibold">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export function AdminTenantsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (user && !user.isSuperAdmin) setLocation("/dashboard"); }, [user, setLocation]);
  const { data: tenants, isLoading } = useAdminListTenants();

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">All Tenants</h1>
        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {tenants?.map(t => (
              <Card key={t.id} data-testid={`tenant-${t.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{t.name}</p>
                        <Badge variant="secondary" className="capitalize">{t.plan}</Badge>
                        {t.isDemo && <Badge variant="outline">Demo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.slug} · {t.billingStatus}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export function AdminUsersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (user && !user.isSuperAdmin) setLocation("/dashboard"); }, [user, setLocation]);
  const { data: allUsers, isLoading } = useAdminListUsers();

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">All Users</h1>
        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {allUsers?.map(u => (
              <Card key={u.id} data-testid={`user-${u.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {(u.fullName ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{u.fullName ?? u.email}</p>
                        {u.isSuperAdmin && <Badge variant="destructive" className="text-xs">Super Admin</Badge>}
                        {!u.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      {u.fullName && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{(u as any).tenantCount ?? 0} tenants</p>
                      <p className="text-xs text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export function AdminAuditLogPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (user && !user.isSuperAdmin) setLocation("/dashboard"); }, [user, setLocation]);
  const { data: logs, isLoading } = useAdminGetAuditLog();

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Platform Audit Log</h1>
        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : !logs?.length ? (
          <p className="text-muted-foreground text-center py-16">No audit log entries</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <Card key={log.id} data-testid={`audit-${log.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.superAdminName ?? "System"}
                        {log.targetTenantName ? ` → ${log.targetTenantName}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
