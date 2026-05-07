import { useState } from "react";
import {
  useListDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useListVehicles,
  getListDriversQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Users, Phone, CreditCard, Bus, Mail,
  Pencil, Trash2, CheckCircle2,
} from "lucide-react";

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  fullName: z.string().optional(),
  licenseNumber: z.string().min(1, "License number is required"),
  phone: z.string().optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

const editSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  phone: z.string().optional(),
  assignedVehicleId: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

// ─── Main page ──────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [editDriver, setEditDriver] = useState<{
    id: string;
    licenseNumber: string;
    phone?: string | null;
    assignedVehicleId?: string | null;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: drivers, isLoading } = useListDrivers();
  const { data: vehicles } = useListVehicles();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", fullName: "", licenseNumber: "", phone: "" },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { licenseNumber: "", phone: "", assignedVehicleId: "" },
  });

  const openEdit = (d: NonNullable<typeof drivers>[number]) => {
    setEditDriver({
      id: d.id,
      licenseNumber: d.licenseNumber,
      phone: d.phone,
      assignedVehicleId: d.assignedVehicleId,
    });
    editForm.reset({
      licenseNumber: d.licenseNumber,
      phone: d.phone ?? "",
      assignedVehicleId: d.assignedVehicleId ?? "__none__",
    });
  };

  const filtered = (drivers ?? []).filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.licenseNumber ?? "").toLowerCase().includes(q) ||
      (d.fullName ?? "").toLowerCase().includes(q) ||
      (d.email ?? "").toLowerCase().includes(q) ||
      (d.phone ?? "").toLowerCase().includes(q)
    );
  });

  const onCreateSubmit = (data: CreateFormData) => {
    createDriver.mutate(
      {
        data: {
          email: data.email,
          fullName: data.fullName || undefined,
          licenseNumber: data.licenseNumber,
          phone: data.phone || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setCreateOpen(false);
          setInvitedEmail(data.email);
          createForm.reset();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ title: msg ?? "Failed to invite driver", variant: "destructive" });
        },
      }
    );
  };

  const onEditSubmit = (data: EditFormData) => {
    if (!editDriver) return;
    updateDriver.mutate(
      {
        driverId: editDriver.id,
        data: {
          licenseNumber: data.licenseNumber,
          phone: data.phone || undefined,
          assignedVehicleId:
            data.assignedVehicleId && data.assignedVehicleId !== "__none__"
              ? data.assignedVehicleId
              : null,
        },
      },
      {
        onSuccess: () => { invalidate(); setEditDriver(null); toast({ title: "Driver updated" }); },
        onError: () => toast({ title: "Failed to update driver", variant: "destructive" }),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteDriver.mutate(
      { driverId: deleteId },
      {
        onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Driver removed" }); },
        onError: () => toast({ title: "Failed to remove driver", variant: "destructive" }),
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
            <p className="text-muted-foreground text-sm">
              Invite drivers by email — they'll receive a link to set their password
            </p>
          </div>
          <Button
            onClick={() => { setInvitedEmail(null); setCreateOpen(true); }}
            data-testid="button-add-driver"
          >
            <Plus className="w-4 h-4 mr-2" /> Invite driver
          </Button>
        </div>

        {invitedEmail && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Invitation sent to <strong>{invitedEmail}</strong>. They'll receive an email to set their
              password and log in.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <Input
            placeholder="Search by name, email, license or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                {search ? "No drivers match your search." : "No drivers yet. Invite your first driver."}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  Invite first driver
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(driver => (
              <Card key={driver.id} data-testid={`driver-${driver.id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(driver.fullName ?? driver.email ?? driver.licenseNumber ?? "D").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {driver.fullName ?? <span className="text-muted-foreground italic text-sm">Name not set</span>}
                      </p>
                      {driver.vehicleLicensePlate && (
                        <Badge variant="secondary" className="text-xs">
                          <Bus className="w-2.5 h-2.5 mr-1" />
                          {driver.vehicleLicensePlate}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {driver.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {driver.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {driver.licenseNumber}
                      </span>
                      {driver.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(driver)}
                      data-testid={`edit-driver-${driver.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(driver.id)}
                      data-testid={`delete-driver-${driver.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Invite driver dialog ── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite driver</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="driver@example.com" data-testid="input-driver-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Smith" data-testid="input-driver-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DL-12345" data-testid="input-licenseNumber" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 555 0000" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                An invitation email will be sent so they can set their password and activate their account.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createDriver.isPending} data-testid="button-submit">
                  {createDriver.isPending ? "Sending…" : "Send invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit driver dialog ── */}
      <Dialog open={!!editDriver} onOpenChange={open => !open && setEditDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit driver</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DL-12345" data-testid="edit-licenseNumber" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 555 0000" data-testid="edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="assignedVehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned vehicle</FormLabel>
                    <Select value={field.value ?? "__none__"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-vehicle">
                          <SelectValue placeholder="No vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No vehicle</SelectItem>
                        {(vehicles ?? []).map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.licensePlate}{v.capacity ? ` (cap. ${v.capacity})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
                <Button type="submit" disabled={updateDriver.isPending} data-testid="save-driver">
                  {updateDriver.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the driver record only. The user account is not deleted and they can
              still log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
