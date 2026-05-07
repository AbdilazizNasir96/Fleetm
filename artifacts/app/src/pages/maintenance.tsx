import { useState } from "react";
import { useListMaintenanceLogs, useCreateMaintenanceLog, useDeleteMaintenanceLog, useListVehicles, getListMaintenanceLogsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Wrench, Trash2, DollarSign } from "lucide-react";

const schema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  maintenanceType: z.string().optional(),
  performedAt: z.string().min(1, "Date is required"),
  costCents: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function MaintenancePage() {
  const [open, setOpen] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const { data: logs, isLoading } = useListMaintenanceLogs();
  const { data: vehicles } = useListVehicles();
  const createLog = useCreateMaintenanceLog();
  const deleteLog = useDeleteMaintenanceLog();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: "", maintenanceType: "", performedAt: new Date().toISOString().slice(0, 10), notes: "" },
  });

  const filtered = (logs ?? []).filter(l => vehicleFilter === "all" || l.vehicleId === vehicleFilter);

  const onSubmit = (data: FormData) => {
    const body: any = {
      vehicleId: data.vehicleId,
      performedAt: new Date(data.performedAt).toISOString(),
    };
    if (data.maintenanceType) body.maintenanceType = data.maintenanceType;
    if (data.costCents !== undefined) body.costCents = data.costCents;
    if (data.notes) body.notes = data.notes;

    createLog.mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Maintenance log added" });
        },
        onError: () => toast({ title: "Failed to add log", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this maintenance log?")) return;
    deleteLog.mutate(
      { logId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey() });
          toast({ title: "Log deleted" });
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
            <h1 className="text-2xl font-bold">Maintenance</h1>
            <p className="text-muted-foreground text-sm mt-1">Vehicle maintenance history</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-log" className="gap-2">
            <Plus className="w-4 h-4" />
            Add log
          </Button>
        </div>

        <div className="mb-4">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-48" data-testid="select-vehicle-filter">
              <SelectValue placeholder="Filter by vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No maintenance logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <Card key={log.id} data-testid={`maintenance-${log.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{log.vehicleLicensePlate ?? "Vehicle"}</p>
                        {log.maintenanceType && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded capitalize">{log.maintenanceType}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {log.performedAt ? new Date(log.performedAt).toLocaleDateString() : "—"}
                        </p>
                        {log.costCents !== null && log.costCents !== undefined && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            {(log.costCents / 100).toFixed(2)}
                          </span>
                        )}
                        {log.notes && <p className="text-xs text-muted-foreground truncate">{log.notes}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" data-testid={`button-delete-log-${log.id}`}
                      onClick={() => handleDelete(log.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add maintenance log</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField control={form.control} name="maintenanceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["oil_change", "tire_rotation", "brake_service", "inspection", "repair", "cleaning", "other"].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="performedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date performed</FormLabel>
                    <FormControl><Input {...field} type="date" data-testid="input-performedAt" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="costCents" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input {...field} type="number" min={0} step={0.01} data-testid="input-cost" className="pl-8"
                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-notes" rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createLog.isPending}>
                    {createLog.isPending ? "Saving..." : "Save log"}
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
