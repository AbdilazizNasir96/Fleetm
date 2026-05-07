import { Router } from "express";
import { db } from "@workspace/db";
import { vehicles, maintenanceLogs } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateVehicleBody,
  UpdateVehicleBody,
  GetVehicleParams,
  UpdateVehicleParams,
  DeleteVehicleParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

router.get("/vehicles", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db.select().from(vehicles).where(eq(vehicles.tenantId, tenantId));
  res.json(rows);
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [vehicle] = await db.insert(vehicles).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(vehicle);
});

router.get("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [vehicle] = await db.select().from(vehicles).where(
    and(eq(vehicles.id, params.data.vehicleId), eq(vehicles.tenantId, tenantId))
  );
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const logs = await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.vehicleId, vehicle.id));
  res.json({ ...vehicle, maintenanceLogs: logs });
});

router.patch("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.lastMaintenanceAt === "string") {
    updateData.lastMaintenanceAt = new Date(parsed.data.lastMaintenanceAt);
  }
  const [vehicle] = await db.update(vehicles)
    .set(updateData)
    .where(and(eq(vehicles.id, params.data.vehicleId), eq(vehicles.tenantId, tenantId)))
    .returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(vehicle);
});

router.delete("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [vehicle] = await db.delete(vehicles)
    .where(and(eq(vehicles.id, params.data.vehicleId), eq(vehicles.tenantId, tenantId)))
    .returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
