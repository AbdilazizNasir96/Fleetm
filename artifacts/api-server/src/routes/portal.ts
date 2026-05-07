import { Router } from "express";
import { db } from "@workspace/db";
import {
  parents, studentParents, students, schools,
  trips, routes, vehicles, drivers, users, incidents, tripPassengers,
} from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

/** Resolve the parent record for the authenticated user. Returns 403 if not a parent. */
async function getMyParentId(userId: string, tenantId: string): Promise<string | null> {
  const [parent] = await db
    .select({ id: parents.id })
    .from(parents)
    .where(and(eq(parents.userId, userId), eq(parents.tenantId, tenantId)));
  return parent?.id ?? null;
}

/** Return student IDs linked to a parent. */
async function getMyStudentIds(parentId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: studentParents.studentId })
    .from(studentParents)
    .where(eq(studentParents.parentId, parentId));
  return rows.map(r => r.studentId);
}

// GET /portal/students — list my linked students
router.get("/portal/students", async (req, res): Promise<void> => {
  const { userId, tenantId } = req.user!;
  const parentId = await getMyParentId(userId, tenantId);
  if (!parentId) {
    res.status(403).json({ error: "No parent record found for this user" });
    return;
  }
  const studentIds = await getMyStudentIds(parentId);
  if (studentIds.length === 0) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      schoolId: students.schoolId,
      schoolName: students.schoolName,
      grade: students.grade,
      specialNeeds: students.specialNeeds,
      emergencyContact: students.emergencyContact,
    })
    .from(students)
    .where(and(inArray(students.id, studentIds), eq(students.tenantId, tenantId)));
  res.json(rows);
});

// GET /portal/students/:studentId/trips — trips for one of my students
router.get("/portal/students/:studentId/trips", async (req, res): Promise<void> => {
  const { userId, tenantId } = req.user!;
  const { studentId } = req.params;

  const parentId = await getMyParentId(userId, tenantId);
  if (!parentId) {
    res.status(403).json({ error: "No parent record found for this user" });
    return;
  }
  const studentIds = await getMyStudentIds(parentId);
  if (!studentIds.includes(studentId)) {
    res.status(403).json({ error: "Student not linked to your account" });
    return;
  }

  // Find trips this student is a passenger on
  const passengerRows = await db
    .select({ tripId: tripPassengers.tripId })
    .from(tripPassengers)
    .where(eq(tripPassengers.studentId, studentId));

  const tripIds = passengerRows.map(r => r.tripId).filter(Boolean) as string[];
  if (tripIds.length === 0) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      id: trips.id,
      tenantId: trips.tenantId,
      routeId: trips.routeId,
      vehicleId: trips.vehicleId,
      driverId: trips.driverId,
      scheduledStart: trips.scheduledStart,
      scheduledEnd: trips.scheduledEnd,
      actualStart: trips.actualStart,
      actualEnd: trips.actualEnd,
      status: trips.status,
      createdAt: trips.createdAt,
      routeName: routes.name,
      driverName: users.fullName,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(trips)
    .leftJoin(routes, eq(trips.routeId, routes.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .leftJoin(users, eq(drivers.userId, users.id))
    .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
    .where(and(inArray(trips.id, tripIds), eq(trips.tenantId, tenantId)))
    .orderBy(desc(trips.scheduledStart));

  res.json(rows.map(r => ({
    ...r,
    scheduledStart: r.scheduledStart?.toISOString?.() ?? r.scheduledStart,
    scheduledEnd: r.scheduledEnd?.toISOString?.() ?? r.scheduledEnd,
    actualStart: r.actualStart?.toISOString?.() ?? r.actualStart,
    actualEnd: r.actualEnd?.toISOString?.() ?? r.actualEnd,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  })));
});

// GET /portal/incidents — incidents related to my students' trips
router.get("/portal/incidents", async (req, res): Promise<void> => {
  const { userId, tenantId } = req.user!;
  const parentId = await getMyParentId(userId, tenantId);
  if (!parentId) {
    res.status(403).json({ error: "No parent record found for this user" });
    return;
  }
  const studentIds = await getMyStudentIds(parentId);
  if (studentIds.length === 0) {
    res.json([]);
    return;
  }

  // Find trips my students are on
  const passengerRows = await db
    .select({ tripId: tripPassengers.tripId })
    .from(tripPassengers)
    .where(inArray(tripPassengers.studentId, studentIds));

  const tripIds = [...new Set(passengerRows.map(r => r.tripId).filter(Boolean) as string[])];

  const incidentRows = tripIds.length > 0
    ? await db
        .select()
        .from(incidents)
        .where(and(eq(incidents.tenantId, tenantId), inArray(incidents.tripId, tripIds)))
        .orderBy(desc(incidents.occurredAt))
    : [];

  res.json(incidentRows.map(i => ({
    ...i,
    occurredAt: i.occurredAt?.toISOString() ?? null,
    createdAt: i.createdAt?.toISOString() ?? null,
  })));
});

// POST /portal/concerns — parent reports a concern
const ReportConcernBody = z.object({
  description: z.string().min(1),
  studentId: z.string().uuid().optional(),
});

router.post("/portal/concerns", async (req, res): Promise<void> => {
  const { userId, tenantId } = req.user!;
  const parsed = ReportConcernBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const parentId = await getMyParentId(userId, tenantId);
  if (!parentId) {
    res.status(403).json({ error: "No parent record found for this user" });
    return;
  }

  const [incident] = await db.insert(incidents).values({
    tenantId,
    reportedBy: userId,
    incidentType: "parent_concern",
    description: parsed.data.description,
    occurredAt: new Date(),
  }).returning();

  res.status(201).json({
    ...incident,
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    createdAt: incident.createdAt?.toISOString() ?? null,
  });
});

export default router;
