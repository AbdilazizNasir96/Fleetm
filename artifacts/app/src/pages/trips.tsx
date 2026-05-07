import { useState } from "react";
import { Link } from "wouter";
import { useListTrips, useCreateTrip, useListRoutes, useListVehicles, useListDrivers, getListTripsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarClock, ChevronRight, Users } from "lucide-react";

const schema = z.object({
  routeId: z.string().min(1, "Route is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().min(1, "Driver is required"),
  scheduledStart: z.string().min(1, "Start time is required"),
  scheduledEnd: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
      {status?.replace("_", " ") ?? "—"}
    </span>
  );
}

export default function TripsPage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: trips, isLoading } = useListTrips();
  const { data: routes } = useListRoutes();
  const { data: vehicles } = useListVehicles();
  const { data: drivers } = useListDrivers();
  const createTrip = useCreateTrip();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { routeId: "", vehicleId: "", driverId: "", scheduledStart: "", scheduledEnd: "" },
  });

  const filtered = (trips ?? []).filter(t => statusFilter === "all" || t.status === statusFilter);

  const onSubmit = (data: FormData) => {
    const body: any = {
      routeId: data.routeId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      scheduledStart: new Date(data.scheduledStart).toISOString(),
    };
    if (data.scheduledEnd) body.scheduledEnd = new Date(data.scheduledEnd).toISOString();

    createTrip.mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Trip scheduled" });
        },
        onError: () => toast({ title: "Failed to schedule trip", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Trips</h1>
            <p className="text-muted-foreground text-sm mt-1">Schedule and track trips</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-trip" className="gap-2">
            <Plus className="w-4 h-4" />
            Schedule trip
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {["all", "scheduled", "in_progress", "completed", "cancelled"].map(s => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No trips found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((trip) => (
              <Card key={trip.id} data-testid={`trip-${trip.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{(trip as any).routeName ?? "Route"}</p>
                        <StatusBadge status={trip.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trip.scheduledStart ? new Date(trip.scheduledStart).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        {(trip as any).driverName ? ` · ${(trip as any).driverName}` : ""}
                        {(trip as any).vehicleLicensePlate ? ` · ${(trip as any).vehicleLicensePlate}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {(trip as any).passengerCount ?? 0}
                      </span>
                      <Link href={`/trips/${trip.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`link-trip-${trip.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule trip</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="routeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-route"><SelectValue placeholder="Select route" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-driver"><SelectValue placeholder="Select driver" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {drivers?.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName ?? d.licenseNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="scheduledStart" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled start</FormLabel>
                    <FormControl><Input {...field} type="datetime-local" data-testid="input-scheduledStart" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="scheduledEnd" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled end (optional)</FormLabel>
                    <FormControl><Input {...field} type="datetime-local" data-testid="input-scheduledEnd" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createTrip.isPending}>
                    {createTrip.isPending ? "Scheduling..." : "Schedule trip"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
