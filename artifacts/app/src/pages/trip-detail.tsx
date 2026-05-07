import { useParams, useLocation } from "wouter";
import {
  useGetTrip,
  useUpdateTrip,
  useAddPassenger,
  useUpdatePassenger,
  useListStudents,
  getGetTripQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { TripTracker } from "@/components/TripTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowLeft, CalendarClock, Truck, Route, Users,
  UserCheck, Clock, CheckCircle2, XCircle, UserPlus,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  scheduled: [{ label: "Start trip", next: "in_progress" }],
  in_progress: [
    { label: "Complete trip", next: "completed" },
    { label: "Cancel trip", next: "cancelled" },
  ],
  completed: [],
  cancelled: [],
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
      {status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function formatDt(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: trip, isLoading } = useGetTrip(tripId!);
  const { data: students } = useListStudents();
  const updateTrip = useUpdateTrip();
  const addPassenger = useAddPassenger();
  const updatePassenger = useUpdatePassenger();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId!) });

  const handleStatusChange = (next: string) => {
    const body: Record<string, string> = { status: next };
    if (next === "in_progress") body.actualStart = new Date().toISOString();
    if (next === "completed") body.actualEnd = new Date().toISOString();
    updateTrip.mutate(
      { tripId: tripId!, data: body },
      {
        onSuccess: () => { invalidate(); toast({ title: "Trip status updated" }); },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
      }
    );
  };

  const handleAddPassenger = () => {
    if (!selectedStudentId) return;
    addPassenger.mutate(
      { tripId: tripId!, data: { studentId: selectedStudentId, notes: notes || undefined } },
      {
        onSuccess: () => {
          setAddOpen(false);
          setSelectedStudentId("");
          setNotes("");
          invalidate();
          toast({ title: "Passenger added" });
        },
        onError: () => toast({ title: "Failed to add passenger", variant: "destructive" }),
      }
    );
  };

  const handleBoard = (passengerId: string) => {
    updatePassenger.mutate(
      { tripId: tripId!, passengerId, data: { boardedAt: new Date().toISOString() } },
      { onSuccess: () => { invalidate(); toast({ title: "Marked as boarded" }); } }
    );
  };

  const handleAlight = (passengerId: string) => {
    updatePassenger.mutate(
      { tripId: tripId!, passengerId, data: { alightedAt: new Date().toISOString() } },
      { onSuccess: () => { invalidate(); toast({ title: "Marked as alighted" }); } }
    );
  };

  const transitions = STATUS_TRANSITIONS[trip?.status ?? "scheduled"] ?? [];
  const alreadyAdded = new Set((trip?.passengers ?? []).map(p => p.studentId).filter(Boolean));

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/trips")} data-testid="back-to-trips">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Trip Details</h1>
            <p className="text-muted-foreground text-sm">
              {isLoading ? "Loading…" : trip?.routeName ?? "Unknown route"}
            </p>
          </div>
          {trip && <div className="ml-auto"><StatusBadge status={trip.status} /></div>}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-40" /></CardContent></Card>)}
          </div>
        ) : !trip ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Trip not found.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column */}
            <div className="space-y-4 lg:col-span-2">
              {/* Info card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Trip Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow icon={Route} label="Route" value={trip.routeName} />
                  <InfoRow icon={Truck} label="Vehicle" value={trip.vehicleLicensePlate} />
                  <InfoRow icon={Users} label="Driver" value={trip.driverName} />
                  <InfoRow icon={CalendarClock} label="Scheduled start" value={formatDt(trip.scheduledStart)} />
                  <InfoRow icon={CalendarClock} label="Scheduled end" value={formatDt(trip.scheduledEnd)} />
                  {trip.actualStart && <InfoRow icon={Clock} label="Actual start" value={formatDt(trip.actualStart)} />}
                  {trip.actualEnd && <InfoRow icon={CheckCircle2} label="Actual end" value={formatDt(trip.actualEnd)} />}
                </CardContent>
              </Card>

              {/* Status actions */}
              {transitions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex gap-2 flex-wrap">
                    {transitions.map(t => (
                      <Button
                        key={t.next}
                        onClick={() => handleStatusChange(t.next)}
                        disabled={updateTrip.isPending}
                        variant={t.next === "cancelled" ? "destructive" : "default"}
                        size="sm"
                        data-testid={`status-action-${t.next}`}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Passengers */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Passengers
                    <Badge variant="secondary">{trip.passengers.length}</Badge>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddOpen(true)}
                    data-testid="add-passenger-button"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {trip.passengers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No passengers yet</p>
                  ) : (
                    <div className="space-y-2">
                      {trip.passengers.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border"
                          data-testid={`passenger-${p.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{p.studentName ?? "Unknown student"}</p>
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                            <div className="flex gap-3 mt-1">
                              {p.boardedAt && (
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Boarded {new Date(p.boardedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                              {p.alightedAt && (
                                <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Alighted {new Date(p.alightedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          </div>
                          {trip.status === "in_progress" && (
                            <div className="flex gap-1.5">
                              {!p.boardedAt && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBoard(p.id)}>
                                  Board
                                </Button>
                              )}
                              {p.boardedAt && !p.alightedAt && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAlight(p.id)}>
                                  Alight
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column — live tracking */}
            <div className="space-y-4">
              <TripTracker
                tripId={tripId!}
                tripName={trip.routeName ?? undefined}
              />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total passengers</span>
                    <span className="font-semibold">{trip.passengers.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Boarded</span>
                    <span className="font-semibold text-green-600">
                      {trip.passengers.filter(p => p.boardedAt).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alighted</span>
                    <span className="font-semibold text-blue-600">
                      {trip.passengers.filter(p => p.alightedAt).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={trip.status} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Add passenger dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add passenger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger data-testid="select-student">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {(students ?? [])
                    .filter(s => !alreadyAdded.has(s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {`${s.firstName} ${s.lastName}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special notes for this passenger…"
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddPassenger}
              disabled={!selectedStudentId || addPassenger.isPending}
              data-testid="confirm-add-passenger"
            >
              {addPassenger.isPending ? "Adding…" : "Add passenger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
