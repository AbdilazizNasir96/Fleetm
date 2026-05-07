import { useState } from "react";
import { useListIncidents, useCreateIncident, useUpdateIncident, useListVehicles, getListIncidentsQueryKey } from "@workspace/api-client-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";

const schema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  description: z.string().optional(),
  occurredAt: z.string().min(1, "Date/time is required"),
  vehicleId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const incidentTypes = ["accident", "breakdown", "delay", "medical", "security", "behavior", "other"];

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    accident: "bg-red-100 text-red-700",
    breakdown: "bg-orange-100 text-orange-700",
    delay: "bg-yellow-100 text-yellow-700",
    medical: "bg-purple-100 text-purple-700",
    security: "bg-blue-100 text-blue-700",
    behavior: "bg-pink-100 text-pink-700",
    other: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] ?? "bg-gray-100 text-gray-700"}`}>
      {type}
    </span>
  );
}

export default function IncidentsPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const { data: incidents, isLoading } = useListIncidents();
  const { data: vehicles } = useListVehicles();
  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { incidentType: "", description: "", occurredAt: new Date().toISOString().slice(0, 16) },
  });

  const filtered = (incidents ?? []).filter(i => {
    if (filter === "open") return !i.isResolved;
    if (filter === "resolved") return i.isResolved;
    return true;
  });

  const onSubmit = (data: FormData) => {
    const body: any = {
      incidentType: data.incidentType,
      occurredAt: new Date(data.occurredAt).toISOString(),
    };
    if (data.description) body.description = data.description;
    if (data.vehicleId && data.vehicleId !== "none") body.vehicleId = data.vehicleId;

    createIncident.mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Incident reported" });
        },
        onError: () => toast({ title: "Failed to report incident", variant: "destructive" }),
      }
    );
  };

  const handleResolve = (id: string) => {
    updateIncident.mutate(
      { incidentId: id, data: { isResolved: true, resolutionNotes: "Resolved" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          toast({ title: "Incident marked as resolved" });
        },
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Incidents</h1>
            <p className="text-muted-foreground text-sm mt-1">Report and track incidents</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-report-incident" className="gap-2">
            <Plus className="w-4 h-4" />
            Report incident
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {(["all", "open", "resolved"] as const).map(f => (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((incident) => (
              <Card key={incident.id} data-testid={`incident-${incident.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${incident.isResolved ? "bg-green-100" : "bg-red-100"}`}>
                      {incident.isResolved
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <AlertTriangle className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={incident.incidentType} />
                        {incident.vehicleLicensePlate && (
                          <span className="text-xs text-muted-foreground">{incident.vehicleLicensePlate}</span>
                        )}
                        {incident.isResolved && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Resolved</span>
                        )}
                      </div>
                      {incident.description && (
                        <p className="text-sm text-foreground mt-1 line-clamp-2">{incident.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {incident.occurredAt ? new Date(incident.occurredAt).toLocaleString() : "—"}
                        {incident.reporterName ? ` · ${incident.reporterName}` : ""}
                      </p>
                    </div>
                    {!incident.isResolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-resolve-${incident.id}`}
                        onClick={() => handleResolve(incident.id)}
                        className="flex-shrink-0 text-xs h-8"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Report incident</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="incidentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {incidentTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="occurredAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>When it occurred</FormLabel>
                    <FormControl><Input {...field} type="datetime-local" data-testid="input-occurredAt" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-description" rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createIncident.isPending}>
                    {createIncident.isPending ? "Reporting..." : "Report incident"}
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
