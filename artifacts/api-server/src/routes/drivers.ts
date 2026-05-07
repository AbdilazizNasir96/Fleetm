import { Router } from "express";
import { db } from "@workspace/db";
import { drivers, users, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateDriverBody,
  UpdateDriverBody,
  GetDriverParams,
  UpdateDriverParams,
  DeleteDriverParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

router.get("/drivers", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: drivers.id,
      tenantId: drivers.tenantId,
      userId: drivers.userId,
      licenseNumber: drivers.licenseNumber,
      phone: drivers.phone,
      hireDate: drivers.hireDate,
      assignedVehicleId: drivers.assignedVehicleId,
      fullName: users.fullName,
      email: users.email,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(drivers)
    .leftJoin(users, eq(drivers.userId, users.id))
    .leftJoin(vehicles, eq(drivers.assignedVehicleId, vehicles.id))
    .where(eq(drivers.tenantId, tenantId));
  res.json(rows);
});

router.post("/drivers", async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [driver] = await db.insert(drivers).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(driver);
});

router.get("/drivers/:driverId", async (req, res): Promise<void> => {
  const params = GetDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [driver] = await db
    .select({
      id: drivers.id,
      tenantId: drivers.tenantId,
      userId: drivers.userId,
      licenseNumber: drivers.licenseNumber,
      phone: drivers.phone,
      hireDate: drivers.hireDate,
      assignedVehicleId: drivers.assignedVehicleId,
      fullName: users.fullName,
      email: users.email,
      vehicleLicensePlate: vehicles.licensePlate,
    })
    .from(drivers)
    .leftJoin(users, eq(drivers.userId, users.id))
    .leftJoin(vehicles, eq(drivers.assignedVehicleId, vehicles.id))
    .where(and(eq(drivers.id, params.data.driverId), eq(drivers.tenantId, tenantId)));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(driver);
});

router.patch("/drivers/:driverId", async (req, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [driver] = await db.update(drivers)
    .set(parsed.data)
    .where(and(eq(drivers.id, params.data.driverId), eq(drivers.tenantId, tenantId)))
    .returning();
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(driver);
});

router.delete("/drivers/:driverId", async (req, res): Promise<void> => {
  const params = DeleteDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [driver] = await db.delete(drivers)
    .where(and(eq(drivers.id, params.data.driverId), eq(drivers.tenantId, tenantId)))
    .returning();
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
