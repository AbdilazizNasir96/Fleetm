import { useState } from "react";
import { Link } from "wouter";
import { useListStudents, useCreateStudent, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, GraduationCap, Trash2, ChevronRight } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  schoolName: z.string().optional(),
  grade: z.coerce.number().min(0).max(12).optional(),
  emergencyContact: z.string().optional(),
  specialNeeds: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function StudentsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: students, isLoading } = useListStudents({ search });
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", schoolName: "", emergencyContact: "" },
  });

  const filtered = students?.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.schoolName ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const onSubmit = (data: FormData) => {
    const body: any = { firstName: data.firstName, lastName: data.lastName };
    if (data.schoolName) body.schoolName = data.schoolName;
    if (data.grade !== undefined) body.grade = data.grade;
    if (data.emergencyContact) body.emergencyContact = data.emergencyContact;
    if (data.specialNeeds) body.specialNeeds = data.specialNeeds;

    createStudent.mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Student added" });
        },
        onError: () => toast({ title: "Failed to add student", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the system?`)) return;
    deleteStudent.mutate(
      { studentId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast({ title: "Student removed" });
        },
        onError: () => toast({ title: "Failed to remove student", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground text-sm mt-1">{students?.length ?? 0} students enrolled</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-student" className="gap-2">
            <Plus className="w-4 h-4" />
            Add student
          </Button>
        </div>

        <div className="mb-4">
          <Input placeholder="Search by name or school..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" className="max-w-xs" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No students found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Card key={s.id} data-testid={`student-${s.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{s.firstName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.schoolName ? `${s.schoolName}` : ""}
                        {s.grade !== null && s.grade !== undefined ? ` · Grade ${s.grade}` : ""}
                        {s.specialNeeds ? " · Special needs" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" data-testid={`button-delete-student-${s.id}`}
                        onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/students/${s.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`link-student-${s.id}`}>
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
            <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-firstName" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-lastName" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="schoolName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <FormControl><Input {...field} data-testid="input-schoolName" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade (optional)</FormLabel>
                    <FormControl><Input {...field} type="number" min={0} max={12} data-testid="input-grade" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency contact</FormLabel>
                    <FormControl><Input {...field} data-testid="input-emergencyContact" placeholder="Name: +1 555 0000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="specialNeeds" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special needs (optional)</FormLabel>
                    <FormControl><Input {...field} data-testid="input-specialNeeds" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createStudent.isPending}>
                    {createStudent.isPending ? "Adding..." : "Add student"}
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
