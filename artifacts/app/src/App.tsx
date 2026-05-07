import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import VehiclesPage from "@/pages/vehicles";
import DriversPage from "@/pages/drivers";
import RoutesPage from "@/pages/routes";
import StudentsPage from "@/pages/students";
import TripsPage from "@/pages/trips";
import IncidentsPage from "@/pages/incidents";
import MaintenancePage from "@/pages/maintenance";
import TeamPage from "@/pages/team";
import TripDetailPage from "@/pages/trip-detail";
import { AdminDashboardPage, AdminTenantsPage, AdminUsersPage, AdminAuditLogPage } from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/vehicles" component={VehiclesPage} />
      <Route path="/drivers" component={DriversPage} />
      <Route path="/routes" component={RoutesPage} />
      <Route path="/students" component={StudentsPage} />
      <Route path="/trips" component={TripsPage} />
      <Route path="/trips/:tripId" component={TripDetailPage} />
      <Route path="/incidents" component={IncidentsPage} />
      <Route path="/maintenance" component={MaintenancePage} />
      <Route path="/team" component={TeamPage} />
      <Route path="/admin" component={AdminDashboardPage} />
      <Route path="/admin/tenants" component={AdminTenantsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/audit-log" component={AdminAuditLogPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
