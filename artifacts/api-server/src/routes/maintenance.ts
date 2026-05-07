import { Router } from "express";
import { db } from "@workspace/db";
import { maintenanceLogs, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateMaintenanceLogBody,
  UpdateMaintenanceLogBody,
  UpdateMaintenanceLogParams,
  DeleteMaintenanceLogParams,
  ListMaintenanceLogsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

router.get("/maintenance", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const query = ListMaintenanceLogsQueryParams.safeParse(req.query);

  const rows = await db
    .select({
      id: maintenanceLogs.id,
      tenantId: maintenanceLogs.tenantId,
      vehicleId: maintenanceLogs.vehicleId,
      maintenanceType: maintenanceLogs.maintenanceType,
      performedAt: maintenanceLogs.performedAt,
      costCents: maintenanceLogs.costCents,
      notes: maintenanceLogs.notes,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(maintenanceLogs)
    .leftJoin(vehicles, eq(maintenanceLogs.vehicleId, vehicles.id))
    .where(eq(maintenanceLogs.tenantId, tenantId));

  let filtered = rows;
  if (query.success && query.data.vehicleId) {
    filtered = filtered.filter(r => r.vehicleId === query.data.vehicleId);
  }

  res.json(filtered.map(r => ({
    ...r,
    performedAt: r.performedAt?.toISOString() ?? null,
  })));
});

router.post("/maintenance", async (req, res): Promise<void> => {
  const parsed = CreateMaintenanceLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [log] = await db.insert(maintenanceLogs).values({
    ...parsed.data,
    tenantId,
    performedAt: new Date(parsed.data.performedAt),
  }).returning();
  res.status(201).json({
    ...log,
    performedAt: log.performedAt?.toISOString() ?? null,
  });
});

router.patch("/maintenance/:logId", async (req, res): Promise<void> => {
  const params = UpdateMaintenanceLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMaintenanceLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.performedAt) updateData.performedAt = new Date(parsed.data.performedAt);

  const [log] = await db.update(maintenanceLogs)
    .set(updateData)
    .where(and(eq(maintenanceLogs.id, params.data.logId), eq(maintenanceLogs.tenantId, tenantId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Maintenance log not found" });
    return;
  }
  res.json({
    ...log,
    performedAt: log.performedAt?.toISOString() ?? null,
  });
});

router.delete("/maintenance/:logId", async (req, res): Promise<void> => {
  const params = DeleteMaintenanceLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [log] = await db.delete(maintenanceLogs)
    .where(and(eq(maintenanceLogs.id, params.data.logId), eq(maintenanceLogs.tenantId, tenantId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Maintenance log not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
