import { useState } from "react";
import {
  useListParents,
  useCreateParent,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Phone, MapPin, Mail, Link2, GraduationCap } from "lucide-react";

const createSchema = z.object({
  userId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

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
          <p className="text-xs font-medium text-muted-foreground mb-2">Currently linked</p>
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
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Link a student</p>
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger data-testid="select-student-link">
            <SelectValue placeholder="Select student…" />
          </SelectTrigger>
          <SelectContent>
            {available.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName} {s.grade != null ? `(Grade ${s.grade})` : ""}
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
      <Button variant="outline" size="sm" className="w-full" onClick={onClose}>Done</Button>
    </div>
  );
}

export default function ParentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [linkParentId, setLinkParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: parentList, isLoading } = useListParents();
  const createParent = useCreateParent();

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { userId: "", phone: "", address: "" },
  });

  const onSubmit = (data: CreateFormData) => {
    createParent.mutate(
      {
        data: {
          phone: data.phone || undefined,
          address: data.address || undefined,
          userId: data.userId || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListParentsQueryKey() });
          setCreateOpen(false);
          form.reset();
          toast({ title: "Parent created" });
        },
        onError: () => toast({ title: "Failed to create parent", variant: "destructive" }),
      }
    );
  };

  const filtered = (parentList ?? []).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Parents</h1>
            <p className="text-muted-foreground text-sm">Manage parent accounts and link them to students</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="add-parent-button">
            <Plus className="w-4 h-4 mr-2" /> Add parent
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            data-testid="search-parents"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>)}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">{search ? "No parents match your search." : "No parents yet. Add one to get started."}</p>
              {!search && <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>Add first parent</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Card key={p.id} data-testid={`parent-${p.id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {p.fullName?.charAt(0)?.toUpperCase() ?? p.email?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{p.fullName ?? "No name"}</p>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLinkParentId(p.id)}
                    data-testid={`link-students-${p.id}`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Students
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create parent dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add parent</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} placeholder="555-0100" data-testid="input-parent-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} placeholder="123 Oak St" data-testid="input-parent-address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createParent.isPending} data-testid="submit-parent">
                  {createParent.isPending ? "Creating…" : "Create parent"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Link students dialog */}
      <Dialog open={!!linkParentId} onOpenChange={open => !open && setLinkParentId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Linked students</DialogTitle></DialogHeader>
          {linkParentId && (
            <StudentLinker parentId={linkParentId} onClose={() => setLinkParentId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
