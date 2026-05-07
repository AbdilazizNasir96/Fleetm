import { useState } from "react";
import {
  usePortalListMyStudents,
  usePortalListStudentTrips,
  usePortalListIncidents,
  usePortalReportConcern,
  getPortalListStudentTripsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Layout } from "@/components/AuthGuard";
import { TripTracker } from "@/components/TripTracker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, CalendarClock, AlertTriangle, Navigation,
  ChevronRight, ChevronDown, MapPin, MessageSquarePlus,
} from "lucide-react";

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
      {status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

function StudentCard({ student }: { student: { id: string; firstName: string; lastName: string; schoolName?: string | null; grade?: number | null; specialNeeds?: string | null } }) {
  const [expanded, setExpanded] = useState(false);
  const { data: trips, isLoading: tripsLoading } = usePortalListStudentTrips(student.id, {
    query: { enabled: expanded, queryKey: getPortalListStudentTripsQueryKey(student.id) },
  });

  const activeTrip = trips?.find(t => t.status === "in_progress");

  return (
    <Card>
      <CardContent className="p-0">
        <button
          className="w-full flex items-center gap-4 p-5 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{student.firstName} {student.lastName}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {student.schoolName && (
                <span className="text-xs text-muted-foreground">{student.schoolName}</span>
              )}
              {student.grade != null && (
                <Badge variant="secondary" className="text-xs">Grade {student.grade}</Badge>
              )}
              {student.specialNeeds && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Special needs</Badge>
              )}
            </div>
          </div>
          {activeTrip && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs flex items-center gap-1">
              <Navigation className="w-3 h-3 animate-pulse" /> Live
            </Badge>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
            {/* Live tracking */}
            {activeTrip && (
              <TripTracker tripId={activeTrip.id} tripName={activeTrip.routeName ?? undefined} />
            )}

            {/* Trips */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent trips</p>
              {tripsLoading ? (
                <Skeleton className="h-20" />
              ) : !trips?.length ? (
                <p className="text-sm text-muted-foreground">No trips scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {trips.slice(0, 5).map(trip => (
                    <div key={trip.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-sm">
                      <CalendarClock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{trip.routeName ?? "Unknown route"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trip.scheduledStart).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalPage() {
  const [concernOpen, setConcernOpen] = useState(false);
  const [concernText, setConcernText] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: myStudents, isLoading } = usePortalListMyStudents();
  const { data: incidents } = usePortalListIncidents();
  const reportConcern = usePortalReportConcern();

  const handleReportConcern = () => {
    if (!concernText.trim()) return;
    reportConcern.mutate(
      { data: { description: concernText } },
      {
        onSuccess: () => {
          setConcernOpen(false);
          setConcernText("");
          toast({ title: "Concern submitted", description: "Our team will review and follow up." });
        },
        onError: () => toast({ title: "Failed to submit concern", variant: "destructive" }),
      }
    );
  };

  const openIncidents = incidents?.filter(i => !i.isResolved) ?? [];

  return (
    <Layout>
      <AppSidebar />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Children</h1>
            <p className="text-muted-foreground text-sm">Track your children's transport in real time</p>
          </div>
          <Button variant="outline" onClick={() => setConcernOpen(true)} data-testid="report-concern-button">
            <MessageSquarePlus className="w-4 h-4 mr-2" /> Report a concern
          </Button>
        </div>

        {/* Open incident banner */}
        {openIncidents.length > 0 && (
          <Card className="mb-4 border-amber-300 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {openIncidents.length} open incident{openIncidents.length > 1 ? "s" : ""} on routes your children ride.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(2).fill(0).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>)}
          </div>
        ) : !myStudents?.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No students linked to your account yet.</p>
              <p className="text-xs">Contact your school transportation administrator to link your children.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myStudents.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}

        {/* Recent incidents section */}
        {incidents && incidents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent incidents</h2>
            <div className="space-y-2">
              {incidents.slice(0, 5).map(inc => (
                <Card key={inc.id}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium capitalize">{inc.incidentType?.replace(/_/g, " ")}</p>
                        {inc.isResolved && <Badge variant="secondary" className="text-xs">Resolved</Badge>}
                      </div>
                      {inc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{inc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {inc.occurredAt ? new Date(inc.occurredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report concern dialog */}
      <Dialog open={concernOpen} onOpenChange={setConcernOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a concern</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Describe your concern and our team will review it promptly.</p>
            <Textarea
              value={concernText}
              onChange={e => setConcernText(e.target.value)}
              placeholder="e.g. Bus was 20 minutes late this morning…"
              rows={4}
              data-testid="concern-text"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcernOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReportConcern}
              disabled={!concernText.trim() || reportConcern.isPending}
              data-testid="submit-concern"
            >
              {reportConcern.isPending ? "Submitting…" : "Submit concern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
