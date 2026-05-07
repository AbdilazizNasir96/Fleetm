import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { tenants, users, userTenants, vehicles, trips, students, platformAuditLog } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireSuperAdmin } from "../lib/auth";
import {
  AdminCreateTenantBody,
  AdminUpdateTenantBody,
  AdminGetTenantParams,
  AdminUpdateTenantParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireSuperAdmin);

router.get("/admin/tenants", async (_req, res): Promise<void> => {
  const rows = await db.select().from(tenants);
  res.json(rows.map(t => ({
    ...t,
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString() ?? null,
  })));
});

router.post("/admin/tenants", async (req, res): Promise<void> => {
  const parsed = AdminCreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, slug, plan, isDemo, adminEmail, adminPassword, adminFullName } = parsed.data;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [tenant] = await db.insert(tenants).values({
    name,
    slug,
    plan: plan ?? "trial",
    isDemo: isDemo ?? false,
    trialEndsAt,
  }).returning();

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const [adminUser] = await db.insert(users).values({
      email: adminEmail,
      passwordHash,
      fullName: adminFullName ?? null,
      isActive: true,
      isSuperAdmin: false,
    }).returning();
    await db.insert(userTenants).values({
      userId: adminUser.id,
      tenantId: tenant.id,
      role: "admin",
    });
  }

  res.status(201).json({
    ...tenant,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt?.toISOString() ?? null,
  });
});

router.get("/admin/tenants/:tenantId", async (req, res): Promise<void> => {
  const params = AdminGetTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, params.data.tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json({
    ...tenant,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt?.toISOString() ?? null,
  });
});

router.patch("/admin/tenants/:tenantId", async (req, res): Promise<void> => {
  const params = AdminUpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AdminUpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.trialEndsAt) updateData.trialEndsAt = new Date(parsed.data.trialEndsAt);

  const [tenant] = await db.update(tenants)
    .set(updateData)
    .where(eq(tenants.id, params.data.tenantId))
    .returning();
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json({
    ...tenant,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt?.toISOString() ?? null,
  });
});

router.get("/admin/platform-stats", async (_req, res): Promise<void> => {
  const [totalTenants] = await db.select({ count: count() }).from(tenants);
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalVehicles] = await db.select({ count: count() }).from(vehicles);
  const [totalTrips] = await db.select({ count: count() }).from(trips);
  const [totalStudents] = await db.select({ count: count() }).from(students);

  const tenantRows = await db.select({ plan: tenants.plan, billingStatus: tenants.billingStatus }).from(tenants);
  const activeTenants = tenantRows.filter(t => t.billingStatus === "active").length;
  const trialTenants = tenantRows.filter(t => t.plan === "trial").length;

  const planBreakdown: Record<string, number> = {};
  for (const t of tenantRows) {
    planBreakdown[t.plan ?? "trial"] = (planBreakdown[t.plan ?? "trial"] ?? 0) + 1;
  }

  res.json({
    totalTenants: Number(totalTenants.count),
    activeTenants,
    trialTenants,
    totalUsers: Number(totalUsers.count),
    totalVehicles: Number(totalVehicles.count),
    totalTrips: Number(totalTrips.count),
    totalStudents: Number(totalStudents.count),
    planBreakdown,
  });
});

router.get("/admin/users", async (_req, res): Promise<void> => {
  const rows = await db.select().from(users);
  const tenantCounts = await db
    .select({ userId: userTenants.userId, count: count() })
    .from(userTenants)
    .groupBy(userTenants.userId);
  const tcMap = Object.fromEntries(tenantCounts.map(t => [t.userId, Number(t.count)]));

  res.json(rows.map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    isActive: u.isActive,
    isSuperAdmin: u.isSuperAdmin ?? false,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt?.toISOString() ?? null,
    tenantCount: tcMap[u.id] ?? 0,
  })));
});

router.get("/admin/audit-log", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: platformAuditLog.id,
      action: platformAuditLog.action,
      superAdminUserId: platformAuditLog.superAdminUserId,
      superAdminName: users.fullName,
      targetTenantId: platformAuditLog.targetTenantId,
      targetTenantName: tenants.name,
      targetUserId: platformAuditLog.targetUserId,
      metadata: platformAuditLog.metadata,
      createdAt: platformAuditLog.createdAt,
    })
    .from(platformAuditLog)
    .leftJoin(users, eq(platformAuditLog.superAdminUserId, users.id))
    .leftJoin(tenants, eq(platformAuditLog.targetTenantId, tenants.id))
    .orderBy(platformAuditLog.createdAt)
    .limit(100);

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? null,
  })));
});

export default router;
