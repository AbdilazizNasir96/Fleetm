import { Router } from "express";
import { db } from "@workspace/db";
import { vehicles, drivers, students, routes, trips, incidents, tripLocations, auditLogs, users } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { tenants } from "@workspace/db";

const router = Router();

router.use(requireAuth);

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const [totalVehicles] = await db.select({ count: count() }).from(vehicles).where(eq(vehicles.tenantId, tenantId));
  const [activeVehicles] = await db.select({ count: count() }).from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, "active")));
  const [totalDrivers] = await db.select({ count: count() }).from(drivers).where(eq(drivers.tenantId, tenantId));
  const [totalStudents] = await db.select({ count: count() }).from(students).where(eq(students.tenantId, tenantId));
  const [totalRoutes] = await db.select({ count: count() }).from(routes).where(eq(routes.tenantId, tenantId));
  const [activeRoutes] = await db.select({ count: count() }).from(routes).where(and(eq(routes.tenantId, tenantId), eq(routes.isActive, true)));
  const [tripsToday] = await db.select({ count: count() }).from(trips).where(and(eq(trips.tenantId, tenantId), gte(trips.scheduledStart, startOfDay)));
  const [tripsInProgress] = await db.select({ count: count() }).from(trips).where(and(eq(trips.tenantId, tenantId), eq(trips.status, "in_progress")));
  const [openIncidents] = await db.select({ count: count() }).from(incidents).where(and(eq(incidents.tenantId, tenantId), eq(incidents.isResolved, false)));
  const [resolvedThisMonth] = await db.select({ count: count() }).from(incidents).where(and(eq(incidents.tenantId, tenantId), eq(incidents.isResolved, true), gte(incidents.createdAt, startOfMonth)));

  const [tenant] = await db.select({ plan: tenants.plan, trialEndsAt: tenants.trialEndsAt }).from(tenants).where(eq(tenants.id, tenantId));

  res.json({
    totalVehicles: Number(totalVehicles.count),
    activeVehicles: Number(activeVehicles.count),
    totalDrivers: Number(totalDrivers.count),
    totalStudents: Number(totalStudents.count),
    totalRoutes: Number(totalRoutes.count),
    activeRoutes: Number(activeRoutes.count),
    tripsToday: Number(tripsToday.count),
    tripsInProgress: Number(tripsInProgress.count),
    openIncidents: Number(openIncidents.count),
    resolvedIncidentsThisMonth: Number(resolvedThisMonth.count),
    tenantPlan: tenant?.plan ?? null,
    trialEndsAt: tenant?.trialEndsAt?.toISOString() ?? null,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      userId: auditLogs.userId,
      userName: users.fullName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(auditLogs.createdAt)
    .limit(20);

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? null,
  })));
});

router.get("/dashboard/trips-today", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
    .where(and(eq(trips.tenantId, tenantId), gte(trips.scheduledStart, startOfDay)));

  res.json(rows.map(t => ({
    ...t,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
    actualStart: t.actualStart?.toISOString() ?? null,
    actualEnd: t.actualEnd?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString() ?? null,
  })));
});

router.get("/dashboard/vehicle-status", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const vehicleRows = await db
    .select({
      vehicleId: vehicles.id,
      licensePlate: vehicles.licensePlate,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(eq(vehicles.tenantId, tenantId));

  // Find active trip for each vehicle
  const activeTrips = await db
    .select({
      vehicleId: trips.vehicleId,
      tripId: trips.id,
      driverName: users.fullName,
    })
    .from(trips)
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .leftJoin(users, eq(drivers.userId, users.id))
    .where(and(eq(trips.tenantId, tenantId), eq(trips.status, "in_progress")));

  const activeTripMap = Object.fromEntries(activeTrips.map(t => [t.vehicleId, t]));

  res.json(vehicleRows.map(v => ({
    vehicleId: v.vehicleId,
    licensePlate: v.licensePlate,
    status: v.status,
    currentTripId: activeTripMap[v.vehicleId]?.tripId ?? null,
    driverName: activeTripMap[v.vehicleId]?.driverName ?? null,
    lastLatitude: null,
    lastLongitude: null,
    lastSeenAt: null,
  })));
});

export default router;
