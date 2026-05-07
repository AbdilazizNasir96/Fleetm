import { Router } from "express";
import { db } from "@workspace/db";
import { incidents, users, vehicles, userTenants } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { upload, storageDriver, getUploadUrl, saveLocalFile, ensureUploadDir } from "../lib/upload";
import { sendEmail, buildIncidentAlertEmail } from "../lib/email";
import { logger } from "../lib/logger";
import {
  CreateIncidentBody,
  UpdateIncidentBody,
  GetIncidentParams,
  UpdateIncidentParams,
  ListIncidentsQueryParams,
} from "@workspace/api-zod";

void ensureUploadDir();

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
  const responseBody = {
    ...incident,
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    createdAt: incident.createdAt?.toISOString() ?? null,
  };
  res.status(201).json(responseBody);

  // Notify tenant admins — fire and forget
  (async () => {
    try {
      const [reporter] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, reportedBy));

      let vehiclePlate: string | null = null;
      if (parsed.data.vehicleId) {
        const [v] = await db
          .select({ licensePlate: vehicles.licensePlate })
          .from(vehicles)
          .where(eq(vehicles.id, parsed.data.vehicleId));
        vehiclePlate = v?.licensePlate ?? null;
      }

      const adminRows = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(userTenants)
        .innerJoin(users, eq(userTenants.userId, users.id))
        .where(and(eq(userTenants.tenantId, tenantId), eq(userTenants.role, "admin")));

      await Promise.allSettled(
        adminRows.map(admin => {
          const alert = buildIncidentAlertEmail({
            adminEmail: admin.email,
            adminName: admin.fullName ?? null,
            reporterName: reporter?.fullName ?? null,
            incidentType: incident.incidentType,
            description: incident.description,
            vehiclePlate,
            occurredAt: incident.occurredAt?.toISOString() ?? new Date().toISOString(),
            incidentId: incident.id,
          });
          return sendEmail(alert.to, alert.subject, alert.html);
        })
      );
    } catch (err) {
      logger.error({ err }, "Failed to send incident alert emails");
    }
  })();
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

router.post("/incidents/upload-url", async (req, res): Promise<void> => {
  const { fileName, contentType } = req.body as { fileName?: string; contentType?: string };
  if (!fileName || !contentType) {
    res.status(400).json({ error: "fileName and contentType are required" });
    return;
  }
  const tenantId = req.user!.tenantId;
  const blobName = `${tenantId}/${Date.now()}-${fileName}`;
  try {
    const result = await getUploadUrl(blobName, contentType);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to generate upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

if (storageDriver === "local") {
  router.post("/incidents/upload-local", upload.single("file"), async (req, res): Promise<void> => {
    const { blobName } = req.body as { blobName?: string };
    if (!blobName || !req.file) {
      res.status(400).json({ error: "blobName and file are required" });
      return;
    }
    try {
      await saveLocalFile(blobName, req.file.buffer);
      res.json({ blobUrl: `/api/uploads/${blobName}` });
    } catch (err) {
      req.log.error({ err }, "Failed to save local file");
      res.status(500).json({ error: "Failed to save file" });
    }
  });
}

export default router;
