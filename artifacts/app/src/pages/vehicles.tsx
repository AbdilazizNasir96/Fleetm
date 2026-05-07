import { useState } from "react";
import { Link } from "wouter";
import { useListVehicles, useCreateVehicle, useDeleteVehicle, getListVehiclesQueryKey } from "@workspace/api-client-react";
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
import { Plus, Truck, Trash2, ChevronRight } from "lucide-react";

const schema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  status: z.string().default("active"),
});

type FormData = z.infer<typeof schema>;

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    maintenance: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
      {status ?? "—"}
    </span>
  );
}

export default function VehiclesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: vehicles, isLoading } = useListVehicles();
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { licensePlate: "", capacity: 40, status: "active" },
  });

  const filtered = vehicles?.filter(v =>
    v.licensePlate.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const onSubmit = (data: FormData) => {
    createVehicle.mutate(
      { data: { ...data, capacity: data.capacity } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Vehicle added" });
        },
        onError: () => toast({ title: "Failed to add vehicle", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string, plate: string) => {
    if (!confirm(`Delete vehicle ${plate}?`)) return;
    deleteVehicle.mutate(
      { vehicleId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          toast({ title: "Vehicle deleted" });
        },
        onError: () => toast({ title: "Failed to delete vehicle", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Vehicles</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your fleet</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-vehicle" className="gap-2">
            <Plus className="w-4 h-4" />
            Add vehicle
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search by license plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No vehicles found</p>
            <p className="text-sm">Add your first vehicle to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vehicle) => (
              <Card key={vehicle.id} data-testid={`vehicle-${vehicle.id}`} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{vehicle.licensePlate}</p>
                        <StatusBadge status={vehicle.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Capacity: {vehicle.capacity} · Odometer: {vehicle.currentOdometer ?? "—"} km</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-vehicle-${vehicle.id}`}
                        onClick={() => handleDelete(vehicle.id, vehicle.licensePlate)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/vehicles/${vehicle.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`link-vehicle-${vehicle.id}`}>
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
            <DialogHeader>
              <DialogTitle>Add vehicle</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>License plate</FormLabel>
                    <FormControl><Input {...field} data-testid="input-licensePlate" placeholder="ABC-1234" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (seats)</FormLabel>
                    <FormControl><Input {...field} type="number" data-testid="input-capacity" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createVehicle.isPending}>
                    {createVehicle.isPending ? "Adding..." : "Add vehicle"}
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
