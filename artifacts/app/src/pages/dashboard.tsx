import { useGetDashboardSummary, useGetRecentActivity, useGetTripsToday, useGetVehicleStatus } from "@workspace/api-client-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck, Users, Route, GraduationCap, CalendarClock, AlertTriangle,
  TrendingUp, Clock
} from "lucide-react";

function StatCard({ label, value, icon: Icon, sublabel }: { label: string; value: number | string; icon: any; sublabel?: string }) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    maintenance: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
      {status ?? "—"}
    </span>
  );
}

export default function DashboardPage() {
  const { currentTenant } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: tripsToday, isLoading: tripsLoading } = useGetTripsToday();
  const { data: vehicleStatus, isLoading: vehiclesLoading } = useGetVehicleStatus();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{currentTenant?.name ?? "Dashboard"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Operations overview for today</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryLoading ? (
            Array(8).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>)
          ) : (
            <>
              <StatCard label="Vehicles" value={summary?.totalVehicles ?? 0} icon={Truck} sublabel={`${summary?.activeVehicles ?? 0} active`} />
              <StatCard label="Drivers" value={summary?.totalDrivers ?? 0} icon={Users} />
              <StatCard label="Students" value={summary?.totalStudents ?? 0} icon={GraduationCap} />
              <StatCard label="Routes" value={summary?.totalRoutes ?? 0} icon={Route} sublabel={`${summary?.activeRoutes ?? 0} active`} />
              <StatCard label="Trips Today" value={summary?.tripsToday ?? 0} icon={CalendarClock} sublabel={`${summary?.tripsInProgress ?? 0} in progress`} />
              <StatCard label="Open Incidents" value={summary?.openIncidents ?? 0} icon={AlertTriangle} />
              <StatCard label="Incidents Resolved" value={summary?.resolvedIncidentsThisMonth ?? 0} icon={TrendingUp} sublabel="this month" />
              <StatCard label="Plan" value={summary?.tenantPlan ?? "—"} icon={Clock} sublabel={summary?.trialEndsAt ? `Trial ends ${new Date(summary.trialEndsAt).toLocaleDateString()}` : undefined} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's trips */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Today's Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : !tripsToday?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No trips scheduled today</p>
                ) : (
                  <div className="space-y-2">
                    {tripsToday.map((trip) => (
                      <div
                        key={trip.id}
                        data-testid={`trip-today-${trip.id}`}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{trip.routeName ?? "Route"}</p>
                          <p className="text-xs text-muted-foreground">{trip.driverName ?? "—"} · {trip.vehicleLicensePlate ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {trip.scheduledStart ? new Date(trip.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </span>
                          <StatusBadge status={trip.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Vehicle status */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Vehicle Status</CardTitle>
              </CardHeader>
              <CardContent>
                {vehiclesLoading ? (
                  <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : !vehicleStatus?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No vehicles</p>
                ) : (
                  <div className="space-y-2">
                    {vehicleStatus.map((v) => (
                      <div key={v.vehicleId} data-testid={`vehicle-status-${v.vehicleId}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.licensePlate}</p>
                          {v.driverName && <p className="text-xs text-muted-foreground truncate">{v.driverName}</p>}
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent activity */}
        {!activityLoading && activity && activity.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activity.slice(0, 10).map((item) => (
                  <div key={item.id} data-testid={`activity-${item.id}`} className="flex items-center gap-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <p className="text-sm text-foreground flex-1">{item.action}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
