import { useState } from "react";
import {
  useListSchools,
  useCreateSchool,
  useUpdateSchool,
  useDeleteSchool,
  getListSchoolsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

export default function SchoolsPage() {
  const [open, setOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<{ id: string } & FormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: schoolList, isLoading } = useListSchools();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const deleteSchool = useDeleteSchool();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSchoolsQueryKey() });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", contactPhone: "", contactEmail: "" },
  });

  const openCreate = () => {
    form.reset({ name: "", address: "", contactPhone: "", contactEmail: "" });
    setEditSchool(null);
    setOpen(true);
  };

  const openEdit = (s: NonNullable<typeof schoolList>[number]) => {
    form.reset({
      name: s.name,
      address: s.address ?? "",
      contactPhone: s.contactPhone ?? "",
      contactEmail: s.contactEmail ?? "",
    });
    setEditSchool({ id: s.id, ...form.getValues() });
    setOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const clean = {
      name: data.name,
      address: data.address || undefined,
      contactPhone: data.contactPhone || undefined,
      contactEmail: data.contactEmail || undefined,
    };
    if (editSchool) {
      updateSchool.mutate(
        { schoolId: editSchool.id, data: clean },
        {
          onSuccess: () => { invalidate(); setOpen(false); toast({ title: "School updated" }); },
          onError: () => toast({ title: "Failed to update school", variant: "destructive" }),
        }
      );
    } else {
      createSchool.mutate(
        { data: clean },
        {
          onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "School created" }); },
          onError: () => toast({ title: "Failed to create school", variant: "destructive" }),
        }
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteSchool.mutate(
      { schoolId: deleteId },
      {
        onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "School deleted" }); },
        onError: () => toast({ title: "Failed to delete school", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Schools</h1>
            <p className="text-muted-foreground text-sm">Manage schools and districts in your tenant</p>
          </div>
          <Button onClick={openCreate} data-testid="add-school-button">
            <Plus className="w-4 h-4 mr-2" /> Add school
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>)}
          </div>
        ) : !schoolList?.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 opacity-30" />
              <p className="text-sm">No schools yet. Add one to link students to schools.</p>
              <Button variant="outline" size="sm" onClick={openCreate}>Add first school</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schoolList.map(s => (
              <Card key={s.id} data-testid={`school-${s.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        {s.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {s.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {s.contactPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {s.contactPhone}
                      </p>
                    )}
                    {s.contactEmail && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {s.contactEmail}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSchool ? "Edit school" : "Add school"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>School name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Lincoln Elementary" data-testid="input-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} placeholder="123 Main St, Springfield" data-testid="input-address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact phone</FormLabel>
                    <FormControl><Input {...field} placeholder="555-0100" data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl><Input {...field} placeholder="admin@school.edu" data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="submit-school" disabled={createSchool.isPending || updateSchool.isPending}>
                  {editSchool ? "Save changes" : "Create school"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete school?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the school record. Students linked to this school will have their school association cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
