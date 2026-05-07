import { useState } from "react";
import { Link } from "wouter";
import { useListRoutes, useCreateRoute, useDeleteRoute, getListRoutesQueryKey } from "@workspace/api-client-react";
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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Route, Trash2, ChevronRight, MapPin } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Route name is required"),
  description: z.string().optional(),
  direction: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function RoutesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: routes, isLoading } = useListRoutes();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", direction: "", isActive: true },
  });

  const filtered = routes?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const onSubmit = (data: FormData) => {
    createRoute.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoutesQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Route created" });
        },
        onError: () => toast({ title: "Failed to create route", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete route "${name}"?`)) return;
    deleteRoute.mutate(
      { routeId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoutesQueryKey() });
          toast({ title: "Route deleted" });
        },
        onError: () => toast({ title: "Failed to delete route", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Routes</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage bus routes and stops</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-add-route" className="gap-2">
            <Plus className="w-4 h-4" />
            Add route
          </Button>
        </div>

        <div className="mb-4">
          <Input placeholder="Search routes..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" className="max-w-xs" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No routes found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((route) => (
              <Card key={route.id} data-testid={`route-${route.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Route className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{route.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${route.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {route.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {route.description && <p className="text-xs text-muted-foreground truncate">{route.description}</p>}
                        {route.direction && <span className="text-xs text-muted-foreground capitalize">{route.direction}</span>}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {(route as any).stopCount ?? 0} stops
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" data-testid={`button-delete-route-${route.id}`}
                        onClick={() => handleDelete(route.id, route.name)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/routes/${route.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`link-route-${route.id}`}>
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
            <DialogHeader><DialogTitle>Create route</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-name" placeholder="Route 1 - Northside" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl><Input {...field} data-testid="input-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-direction"><SelectValue placeholder="Select direction" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="circular">Circular</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Active</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-isActive" /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit" disabled={createRoute.isPending}>
                    {createRoute.isPending ? "Creating..." : "Create route"}
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
