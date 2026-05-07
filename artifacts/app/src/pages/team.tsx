import { useState } from "react";
import { useListUsers, useCreateInvitation, useDeleteInvitation, useUpdateUserRole, useRemoveUserFromTenant, useListInvitations, getListUsersQueryKey, getListInvitationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserCog, Mail, Trash2, Clock } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["admin", "dispatcher", "driver", "parent"]),
});

type InviteData = z.infer<typeof inviteSchema>;

export default function TeamPage() {
  const [open, setOpen] = useState(false);
  const { data: users, isLoading } = useListUsers();
  const { data: invitations } = useListInvitations();
  const createInvitation = useCreateInvitation();
  const deleteInvitation = useDeleteInvitation();
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveUserFromTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "dispatcher" },
  });

  const onInvite = (data: InviteData) => {
    createInvitation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Invitation sent" });
        },
        onError: () => toast({ title: "Failed to send invitation", variant: "destructive" }),
      }
    );
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate(
      { userId, data: { role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "Role updated" });
        },
      }
    );
  };

  const handleRemove = (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this organization?`)) return;
    removeUser.mutate(
      { userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "User removed" });
        },
      }
    );
  };

  const handleDeleteInvitation = (id: string) => {
    deleteInvitation.mutate(
      { invitationId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey() });
          toast({ title: "Invitation cancelled" });
        },
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your organization members</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-invite" className="gap-2">
            <Plus className="w-4 h-4" />
            Invite member
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Members ({users?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !users?.length ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No members yet</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} data-testid={`member-${user.id}`} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {(user.fullName ?? user.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.fullName ?? user.email}</p>
                      {user.fullName && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                    </div>
                    <Select
                      value={user.role ?? ""}
                      onValueChange={(val) => handleRoleChange(user.id, val)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["admin", "dispatcher", "driver", "parent"].map(r => (
                          <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      data-testid={`button-remove-${user.id}`}
                      onClick={() => handleRemove(user.id, user.fullName ?? user.email ?? "user")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {invitations && invitations.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Pending invitations</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} data-testid={`invitation-${inv.id}`} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      data-testid={`button-cancel-invite-${inv.id}`}
                      onClick={() => handleDeleteInvitation(inv.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" data-testid="input-email" placeholder="colleague@school.edu" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="dispatcher">Dispatcher</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createInvitation.isPending}>
                    {createInvitation.isPending ? "Sending..." : "Send invitation"}
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
