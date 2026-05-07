import { Router } from "express";
import { db } from "@workspace/db";
import { trips, tripPassengers, routes, drivers, vehicles, users, students, tripLocations } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { emitTripLocation } from "../lib/socket";
import {
  CreateTripBody,
  UpdateTripBody,
  GetTripParams,
  UpdateTripParams,
  AddPassengerParams,
  AddPassengerBody,
  UpdatePassengerParams,
  UpdatePassengerBody,
  ListTripsQueryParams,
} from "@workspace/api-zod";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

router.get("/trips", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const query = ListTripsQueryParams.safeParse(req.query);

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
    .where(eq(trips.tenantId, tenantId));

  let filtered = rows;
  if (query.success) {
    if (query.data.status) filtered = filtered.filter(t => t.status === query.data.status);
    if (query.data.driverId) filtered = filtered.filter(t => t.driverId === query.data.driverId);
    if (query.data.routeId) filtered = filtered.filter(t => t.routeId === query.data.routeId);
  }

  const passengerCounts = await db
    .select({ tripId: tripPassengers.tripId, count: count() })
    .from(tripPassengers)
    .groupBy(tripPassengers.tripId);

  const pcMap = Object.fromEntries(passengerCounts.map(p => [p.tripId, p.count]));

  res.json(filtered.map(t => ({
    ...t,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
    actualStart: t.actualStart?.toISOString() ?? null,
    actualEnd: t.actualEnd?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString() ?? null,
    passengerCount: pcMap[t.id] ?? 0,
  })));
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const data = {
    ...parsed.data,
    tenantId,
    scheduledStart: new Date(parsed.data.scheduledStart),
    scheduledEnd: parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : undefined,
  };
  const [trip] = await db.insert(trips).values(data).returning();
  res.status(201).json({
    ...trip,
    scheduledStart: trip.scheduledStart?.toISOString() ?? null,
    scheduledEnd: trip.scheduledEnd?.toISOString() ?? null,
    createdAt: trip.createdAt?.toISOString() ?? null,
  });
});

router.get("/trips/:tripId", async (req, res): Promise<void> => {
  const params = GetTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [trip] = await db
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
    .where(and(eq(trips.id, params.data.tripId), eq(trips.tenantId, tenantId)));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const passengerRows = await db
    .select({
      id: tripPassengers.id,
      tripId: tripPassengers.tripId,
      studentId: tripPassengers.studentId,
      boardedAt: tripPassengers.boardedAt,
      alightedAt: tripPassengers.alightedAt,
      notes: tripPassengers.notes,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
    })
    .from(tripPassengers)
    .leftJoin(students, eq(tripPassengers.studentId, students.id))
    .where(eq(tripPassengers.tripId, trip.id));

  res.json({
    ...trip,
    scheduledStart: trip.scheduledStart?.toISOString() ?? null,
    scheduledEnd: trip.scheduledEnd?.toISOString() ?? null,
    actualStart: trip.actualStart?.toISOString() ?? null,
    actualEnd: trip.actualEnd?.toISOString() ?? null,
    createdAt: trip.createdAt?.toISOString() ?? null,
    passengers: passengerRows.map(p => ({
      ...p,
      boardedAt: p.boardedAt?.toISOString() ?? null,
      alightedAt: p.alightedAt?.toISOString() ?? null,
      studentName: p.studentFirstName ? `${p.studentFirstName} ${p.studentLastName}` : null,
    })),
  });
});

router.patch("/trips/:tripId", async (req, res): Promise<void> => {
  const params = UpdateTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.actualStart) updateData.actualStart = new Date(parsed.data.actualStart);
  if (parsed.data.actualEnd) updateData.actualEnd = new Date(parsed.data.actualEnd);

  const [trip] = await db.update(trips)
    .set(updateData)
    .where(and(eq(trips.id, params.data.tripId), eq(trips.tenantId, tenantId)))
    .returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json({
    ...trip,
    scheduledStart: trip.scheduledStart?.toISOString() ?? null,
    scheduledEnd: trip.scheduledEnd?.toISOString() ?? null,
    actualStart: trip.actualStart?.toISOString() ?? null,
    actualEnd: trip.actualEnd?.toISOString() ?? null,
    createdAt: trip.createdAt?.toISOString() ?? null,
  });
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LocationBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).optional(),
  heading: z.number().int().min(0).max(359).optional(),
});

router.post("/trips/:tripId/location", async (req, res): Promise<void> => {
  const tripId = req.params["tripId"];
  if (!tripId || !UUID_RE.test(tripId)) {
    res.status(400).json({ error: "Invalid tripId" });
    return;
  }
  const parsed = LocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tenantId = req.user!.tenantId;
  const [trip] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.tenantId, tenantId)));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const { latitude, longitude, speedKmh, heading } = parsed.data;
  const [loc] = await db.insert(tripLocations).values({
    tripId,
    latitude,
    longitude,
    speedKmh: speedKmh !== undefined ? String(speedKmh) : undefined,
    heading,
  }).returning();

  const payload = {
    tripId,
    latitude,
    longitude,
    speedKmh,
    heading,
    recordedAt: loc.recordedAt.toISOString(),
  };

  emitTripLocation(payload);

  res.status(201).json(payload);
});

router.get("/trips/:tripId/location/latest", async (req, res): Promise<void> => {
  const tripId = req.params["tripId"];
  if (!tripId || !UUID_RE.test(tripId)) {
    res.status(400).json({ error: "Invalid tripId" });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [trip] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.tenantId, tenantId)));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const [loc] = await db
    .select()
    .from(tripLocations)
    .where(eq(tripLocations.tripId, tripId))
    .orderBy(desc(tripLocations.recordedAt))
    .limit(1);

  if (!loc) {
    res.json(null);
    return;
  }

  res.json({
    tripId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    speedKmh: loc.speedKmh ? Number(loc.speedKmh) : undefined,
    heading: loc.heading ?? undefined,
    recordedAt: loc.recordedAt.toISOString(),
  });
});

router.post("/trips/:tripId/passengers", async (req, res): Promise<void> => {
  const params = AddPassengerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddPassengerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [passenger] = await db.insert(tripPassengers).values({
    tripId: params.data.tripId,
    studentId: parsed.data.studentId,
    notes: parsed.data.notes,
  }).returning();
  res.status(201).json(passenger);
});

router.patch("/trips/:tripId/passengers/:passengerId", async (req, res): Promise<void> => {
  const params = UpdatePassengerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePassengerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.boardedAt) updateData.boardedAt = new Date(parsed.data.boardedAt);
  if (parsed.data.alightedAt) updateData.alightedAt = new Date(parsed.data.alightedAt);

  const [passenger] = await db.update(tripPassengers)
    .set(updateData)
    .where(and(eq(tripPassengers.id, params.data.passengerId), eq(tripPassengers.tripId, params.data.tripId)))
    .returning();
  if (!passenger) {
    res.status(404).json({ error: "Passenger not found" });
    return;
  }
  res.json({
    ...passenger,
    boardedAt: passenger.boardedAt?.toISOString() ?? null,
    alightedAt: passenger.alightedAt?.toISOString() ?? null,
  });
});

export default router;
