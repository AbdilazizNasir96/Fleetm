import { useState } from "react";
import {
  useListParents,
  useCreateParent,
  useUpdateParent,
  useDeleteParent,
  useListParentStudents,
  useLinkStudentToParent,
  useListStudents,
  getListParentsQueryKey,
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
  Plus, Users, Phone, MapPin, Mail, Link2, GraduationCap,
  Pencil, Trash2, CheckCircle2,
} from "lucide-react";

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

const editSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

// ─── Student linker sub-dialog ──────────────────────────────────────────────

function StudentLinker({ parentId, onClose }: { parentId: string; onClose: () => void }) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const { data: allStudents } = useListStudents();
  const { data: linked } = useListParentStudents(parentId);
  const linkStudent = useLinkStudentToParent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const linkedIds = new Set((linked ?? []).map(s => s.id));
  const available = (allStudents ?? []).filter(s => !linkedIds.has(s.id));

  const handleLink = () => {
    if (!selectedStudentId) return;
    linkStudent.mutate(
      { parentId, data: { studentId: selectedStudentId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListParentsQueryKey() });
          setSelectedStudentId("");
          toast({ title: "Student linked to parent" });
        },
        onError: () => toast({ title: "Failed to link student", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      {linked && linked.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Linked students</p>
          <div className="space-y-1.5">
            {linked.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border text-sm">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                {s.firstName} {s.lastName}
                {s.grade != null && <Badge variant="secondary" className="ml-auto text-xs">Grade {s.grade}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Link another student</p>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger data-testid="select-student-link">
              <SelectValue placeholder="Select student…" />
            </SelectTrigger>
            <SelectContent>
              {available.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}{s.grade != null ? ` (Grade ${s.grade})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleLink}
            disabled={!selectedStudentId || linkStudent.isPending}
            data-testid="confirm-link-student"
          >
            <Link2 className="w-3.5 h-3.5 mr-1.5" /> Link student
          </Button>
        </div>
      )}
      {!available.length && !linked?.length && (
        <p className="text-sm text-muted-foreground">No students available to link.</p>
      )}
      <Button variant="outline" size="sm" className="w-full" onClick={onClose}>Done</Button>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ParentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [editParent, setEditParent] = useState<{ id: string; phone?: string | null; address?: string | null } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [linkParentId, setLinkParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: parentList, isLoading } = useListParents();
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const deleteParent = useDeleteParent();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListParentsQueryKey() });

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", fullName: "", phone: "", address: "" },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { phone: "", address: "" },
  });

  const openEdit = (p: NonNullable<typeof parentList>[number]) => {
    setEditParent({ id: p.id, phone: p.phone, address: p.address });
    editForm.reset({ phone: p.phone ?? "", address: p.address ?? "" });
  };

  const onCreateSubmit = (data: CreateFormData) => {
    createParent.mutate(
      {
        data: {
          email: data.email,
          fullName: data.fullName || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
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
          toast({ title: msg ?? "Failed to invite parent", variant: "destructive" });
        },
      }
    );
  };

  const onEditSubmit = (data: EditFormData) => {
    if (!editParent) return;
    updateParent.mutate(
      {
        parentId: editParent.id,
        data: { phone: data.phone || null, address: data.address || null },
      },
      {
        onSuccess: () => { invalidate(); setEditParent(null); toast({ title: "Parent updated" }); },
        onError: () => toast({ title: "Failed to update parent", variant: "destructive" }),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteParent.mutate(
      { parentId: deleteId },
      {
        onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Parent removed" }); },
        onError: () => toast({ title: "Failed to remove parent", variant: "destructive" }),
      }
    );
  };

  const filtered = (parentList ?? []).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Parents</h1>
            <p className="text-muted-foreground text-sm">
              Invite parents by email — they'll receive a link to set their password
            </p>
          </div>
          <Button onClick={() => { setInvitedEmail(null); setCreateOpen(true); }} data-testid="add-parent-button">
            <Plus className="w-4 h-4 mr-2" /> Invite parent
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
            placeholder="Search by name, email, phone or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            data-testid="search-parents"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                {search
                  ? "No parents match your search."
                  : "No parents yet. Invite a parent to get started."}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  Invite first parent
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Card key={p.id} data-testid={`parent-${p.id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {p.fullName?.charAt(0)?.toUpperCase() ??
                        p.email?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{p.fullName ?? <span className="text-muted-foreground italic">Name not set</span>}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {p.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {p.email}
                        </span>
                      )}
                      {p.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </span>
                      )}
                      {p.address && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {p.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLinkParentId(p.id)}
                      data-testid={`link-students-${p.id}`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Students
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                      data-testid={`edit-parent-${p.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(p.id)}
                      data-testid={`delete-parent-${p.id}`}
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

      {/* ── Invite parent dialog ── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite parent</DialogTitle>
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
                      <Input {...field} type="email" placeholder="parent@example.com" data-testid="input-parent-email" />
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
                      <Input {...field} placeholder="Jane Smith" data-testid="input-parent-fullname" />
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
                      <Input {...field} placeholder="555-0100" data-testid="input-parent-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Oak St, Springfield" data-testid="input-parent-address" />
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
                <Button type="submit" disabled={createParent.isPending} data-testid="submit-parent">
                  {createParent.isPending ? "Sending…" : "Send invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit parent dialog ── */}
      <Dialog open={!!editParent} onOpenChange={open => !open && setEditParent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit parent details</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="555-0100" data-testid="edit-parent-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Oak St" data-testid="edit-parent-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditParent(null)}>Cancel</Button>
                <Button type="submit" disabled={updateParent.isPending} data-testid="save-parent">
                  {updateParent.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Link students dialog ── */}
      <Dialog open={!!linkParentId} onOpenChange={open => !open && setLinkParentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Linked students</DialogTitle>
          </DialogHeader>
          {linkParentId && (
            <StudentLinker parentId={linkParentId} onClose={() => setLinkParentId(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove parent?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the parent record and unlinks them from all students. Their user account
              is not deleted.
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
