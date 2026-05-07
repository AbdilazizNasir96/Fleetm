import { Router } from "express";
import { db } from "@workspace/db";
import { incidents, users, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateIncidentBody,
  UpdateIncidentBody,
  GetIncidentParams,
  UpdateIncidentParams,
  ListIncidentsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

router.get("/incidents", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const query = ListIncidentsQueryParams.safeParse(req.query);

  const rows = await db
    .select({
      id: incidents.id,
      tenantId: incidents.tenantId,
      tripId: incidents.tripId,
      vehicleId: incidents.vehicleId,
      reportedBy: incidents.reportedBy,
      incidentType: incidents.incidentType,
      description: incidents.description,
      latitude: incidents.latitude,
      longitude: incidents.longitude,
      occurredAt: incidents.occurredAt,
      isResolved: incidents.isResolved,
      resolutionNotes: incidents.resolutionNotes,
      mediaUrls: incidents.mediaUrls,
      createdAt: incidents.createdAt,
      reporterName: users.fullName,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(incidents)
    .leftJoin(users, eq(incidents.reportedBy, users.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .where(eq(incidents.tenantId, tenantId));

  let filtered = rows;
  if (query.success) {
    if (query.data.isResolved !== undefined && query.data.isResolved !== null) {
      const isResolved = query.data.isResolved === "true";
      filtered = filtered.filter(i => i.isResolved === isResolved);
    }
    if (query.data.incidentType) {
      filtered = filtered.filter(i => i.incidentType === query.data.incidentType);
    }
    if (query.data.vehicleId) {
      filtered = filtered.filter(i => i.vehicleId === query.data.vehicleId);
    }
  }

  res.json(filtered.map(i => ({
    ...i,
    occurredAt: i.occurredAt?.toISOString() ?? null,
    createdAt: i.createdAt?.toISOString() ?? null,
  })));
});

router.post("/incidents", async (req, res): Promise<void> => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const reportedBy = req.user!.userId;
  const { latitude, longitude, occurredAt, ...rest } = parsed.data;
  const [incident] = await db.insert(incidents).values({
    ...rest,
    tenantId,
    reportedBy,
    latitude,
    longitude,
    occurredAt: new Date(occurredAt),
  }).returning();
  res.status(201).json({
    ...incident,
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    createdAt: incident.createdAt?.toISOString() ?? null,
  });
});

router.get("/incidents/:incidentId", async (req, res): Promise<void> => {
  const params = GetIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [incident] = await db
    .select({
      id: incidents.id,
      tenantId: incidents.tenantId,
      tripId: incidents.tripId,
      vehicleId: incidents.vehicleId,
      reportedBy: incidents.reportedBy,
      incidentType: incidents.incidentType,
      description: incidents.description,
      latitude: incidents.latitude,
      longitude: incidents.longitude,
      occurredAt: incidents.occurredAt,
      isResolved: incidents.isResolved,
      resolutionNotes: incidents.resolutionNotes,
      mediaUrls: incidents.mediaUrls,
      createdAt: incidents.createdAt,
      reporterName: users.fullName,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(incidents)
    .leftJoin(users, eq(incidents.reportedBy, users.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .where(and(eq(incidents.id, params.data.incidentId), eq(incidents.tenantId, tenantId)));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json({
    ...incident,
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    createdAt: incident.createdAt?.toISOString() ?? null,
  });
});

router.patch("/incidents/:incidentId", async (req, res): Promise<void> => {
  const params = UpdateIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [incident] = await db.update(incidents)
    .set(parsed.data)
    .where(and(eq(incidents.id, params.data.incidentId), eq(incidents.tenantId, tenantId)))
    .returning();
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json({
    ...incident,
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    createdAt: incident.createdAt?.toISOString() ?? null,
  });
});

export default router;
