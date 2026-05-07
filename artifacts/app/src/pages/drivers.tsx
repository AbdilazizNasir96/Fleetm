import { useState } from "react";
import { useListDrivers, useCreateDriver, useDeleteDriver, useListVehicles, getListDriversQueryKey } from "@workspace/api-client-react";
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
import { Plus, Users, Trash2, Phone, CreditCard } from "lucide-react";

const schema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  phone: z.string().optional(),
  hireDate: z.string().optional(),
  assignedVehicleId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DriversPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: drivers, isLoading } = useListDrivers();
  const { data: vehicles } = useListVehicles();
  const createDriver = useCreateDriver();
  const deleteDriver = useDeleteDriver();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { licenseNumber: "", phone: "", hireDate: "", assignedVehicleId: "" },
  });

  const filtered = drivers?.filter(d =>
    (d.licenseNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.fullName ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const onSubmit = (data: FormData) => {
    const body: any = { licenseNumber: data.licenseNumber };
    if (data.phone) body.phone = data.phone;
    if (data.hireDate) body.hireDate = data.hireDate;
    if (data.assignedVehicleId && data.assignedVehicleId !== "none") body.assignedVehicleId = data.assignedVehicleId;

    createDriver.mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Driver added" });
        },
        onError: () => toast({ title: "Failed to add driver", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this driver?")) return;
    deleteDriver.mutate(
      { driverId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
          toast({ title: "Driver deleted" });
        },
        onError: () => toast({ title: "Failed to delete driver", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Drivers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your driver roster</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-driver" className="gap-2">
            <Plus className="w-4 h-4" />
            Add driver
          </Button>
        </div>

        <div className="mb-4">
          <Input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" className="max-w-xs" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drivers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((driver) => (
              <Card key={driver.id} data-testid={`driver-${driver.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(driver.fullName ?? driver.licenseNumber ?? "D").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{driver.fullName ?? "Unnamed driver"}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="w-3 h-3" />
                          {driver.licenseNumber}
                        </span>
                        {driver.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {driver.phone}
                          </span>
                        )}
                        {driver.vehicleLicensePlate && (
                          <span className="text-xs text-muted-foreground">Bus: {driver.vehicleLicensePlate}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-delete-driver-${driver.id}`}
                      onClick={() => handleDelete(driver.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
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
            <DialogHeader><DialogTitle>Add driver</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>License number</FormLabel>
                    <FormControl><Input {...field} data-testid="input-licenseNumber" placeholder="DL-12345" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl><Input {...field} data-testid="input-phone" placeholder="+1 555 0000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hireDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire date (optional)</FormLabel>
                    <FormControl><Input {...field} type="date" data-testid="input-hireDate" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assignedVehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign vehicle (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vehicles?.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createDriver.isPending}>
                    {createDriver.isPending ? "Adding..." : "Add driver"}
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
