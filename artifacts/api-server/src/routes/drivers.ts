import { Router } from "express";
import { db } from "@workspace/db";
import { drivers, users, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { inviteUser } from "../lib/invite";
import {
  CreateDriverBody,
  UpdateDriverBody,
  GetDriverParams,
  UpdateDriverParams,
  DeleteDriverParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

async function driverWithDetails(tenantId: string, driverId: string) {
  const [row] = await db
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
    .where(and(eq(drivers.id, driverId), eq(drivers.tenantId, tenantId)));
  return row ?? null;
}

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
  const inviterId = req.user!.userId;
  const { email, fullName, licenseNumber, phone, hireDate, assignedVehicleId } = parsed.data;

  // Prevent duplicate driver record for the same email in this tenant
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existingUser) {
    const [existingDriver] = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(and(eq(drivers.userId, existingUser.id), eq(drivers.tenantId, tenantId)));
    if (existingDriver) {
      res.status(409).json({ error: "A driver record already exists for this email in this tenant" });
      return;
    }
  }

  // Invite (find-or-create user, upsert tenant membership, send email)
  const { userId } = await inviteUser({
    email,
    fullName: fullName ?? null,
    role: "driver",
    tenantId,
    inviterUserId: inviterId,
  });

  // Create driver record
  const [inserted] = await db
    .insert(drivers)
    .values({
      userId,
      tenantId,
      licenseNumber,
      phone: phone ?? null,
      hireDate: hireDate ?? null,
      assignedVehicleId: assignedVehicleId ?? null,
    })
    .returning({ id: drivers.id });

  const driver = await driverWithDetails(tenantId, inserted.id);
  res.status(201).json({
    ...driver,
    invitationSent: true,
    message: `Invitation sent to ${email}. They will be able to set their password and log in.`,
  });
});

router.get("/drivers/:driverId", async (req, res): Promise<void> => {
  const params = GetDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const driver = await driverWithDetails(tenantId, params.data.driverId);
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
  const [updated] = await db.update(drivers)
    .set(parsed.data)
    .where(and(eq(drivers.id, params.data.driverId), eq(drivers.tenantId, tenantId)))
    .returning({ id: drivers.id });
  if (!updated) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  const driver = await driverWithDetails(tenantId, updated.id);
  res.json(driver);
});

router.delete("/drivers/:driverId", async (req, res): Promise<void> => {
  const params = DeleteDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [deleted] = await db.delete(drivers)
    .where(and(eq(drivers.id, params.data.driverId), eq(drivers.tenantId, tenantId)))
    .returning({ id: drivers.id });
  if (!deleted) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
