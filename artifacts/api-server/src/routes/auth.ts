import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { users, userTenants, tenants } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import {
  RegisterUserBody,
  LoginUserBody,
  SwitchTenantBody,
} from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, fullName, tenantName, tenantSlug } = parsed.data;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const [existingTenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, tenantSlug));
  if (existingTenant) {
    res.status(409).json({ error: "Tenant slug already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db.insert(users).values({
    email,
    passwordHash,
    fullName,
    isActive: true,
    isSuperAdmin: false,
  }).returning();

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [newTenant] = await db.insert(tenants).values({
    name: tenantName,
    slug: tenantSlug,
    plan: "trial",
    billingStatus: "active",
    trialEndsAt,
  }).returning();

  await db.insert(userTenants).values({
    userId: newUser.id,
    tenantId: newTenant.id,
    role: "admin",
  });

  const token = signToken({
    userId: newUser.id,
    tenantId: newTenant.id,
    role: "admin",
    isSuperAdmin: false,
  });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      isActive: newUser.isActive,
      isSuperAdmin: newUser.isSuperAdmin,
      createdAt: newUser.createdAt?.toISOString() ?? null,
    },
    tenant: {
      id: newTenant.id,
      name: newTenant.name,
      slug: newTenant.slug,
      plan: newTenant.plan,
      billingStatus: newTenant.billingStatus,
      trialEndsAt: newTenant.trialEndsAt?.toISOString() ?? null,
      isDemo: newTenant.isDemo,
      createdAt: newTenant.createdAt?.toISOString() ?? null,
    },
    role: "admin",
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const userTenantList = await db
    .select({ tenantId: userTenants.tenantId, role: userTenants.role })
    .from(userTenants)
    .where(eq(userTenants.userId, user.id));

  let activeTenantId = userTenantList[0]?.tenantId ?? "";
  let activeRole = userTenantList[0]?.role ?? "admin";

  if (!activeTenantId && !user.isSuperAdmin) {
    res.status(401).json({ error: "No tenant access" });
    return;
  }

  let activeTenant = null;
  if (activeTenantId) {
    const [t] = await db.select().from(tenants).where(eq(tenants.id, activeTenantId));
    activeTenant = t;
  }

  const token = signToken({
    userId: user.id,
    tenantId: activeTenantId,
    role: activeRole,
    isSuperAdmin: user.isSuperAdmin ?? false,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt?.toISOString() ?? null,
    },
    tenant: activeTenant ? {
      id: activeTenant.id,
      name: activeTenant.name,
      slug: activeTenant.slug,
      plan: activeTenant.plan,
      billingStatus: activeTenant.billingStatus,
      trialEndsAt: activeTenant.trialEndsAt?.toISOString() ?? null,
      isDemo: activeTenant.isDemo,
      createdAt: activeTenant.createdAt?.toISOString() ?? null,
    } : null,
    role: activeRole,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { userId, tenantId } = req.user!;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const userTenantRows = await db
    .select({
      tenantId: userTenants.tenantId,
      role: userTenants.role,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(userTenants)
    .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(eq(userTenants.userId, userId));

  let currentTenant = null;
  let currentRole = null;

  if (tenantId) {
    const [ct] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    currentTenant = ct ? {
      id: ct.id,
      name: ct.name,
      slug: ct.slug,
      plan: ct.plan,
      billingStatus: ct.billingStatus,
      trialEndsAt: ct.trialEndsAt?.toISOString() ?? null,
      isDemo: ct.isDemo,
      createdAt: ct.createdAt?.toISOString() ?? null,
    } : null;
    currentRole = userTenantRows.find(r => r.tenantId === tenantId)?.role ?? null;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt?.toISOString() ?? null,
    },
    tenants: userTenantRows.map(r => ({
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      role: r.role,
    })),
    currentTenant,
    currentRole,
  });
});

router.post("/auth/switch-tenant", requireAuth, async (req, res): Promise<void> => {
  const parsed = SwitchTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tenantId } = parsed.data;
  const userId = req.user!.userId;
  const isSuperAdmin = req.user!.isSuperAdmin;

  let role = "admin";

  if (!isSuperAdmin) {
    const [membership] = await db
      .select({ role: userTenants.role })
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

    if (!membership) {
      res.status(403).json({ error: "No access to this tenant" });
      return;
    }
    role = membership.role;
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  const token = signToken({
    userId,
    tenantId,
    role,
    isSuperAdmin: isSuperAdmin,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt?.toISOString() ?? null,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      billingStatus: tenant.billingStatus,
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      isDemo: tenant.isDemo,
      createdAt: tenant.createdAt?.toISOString() ?? null,
    },
    role,
  });
});

export default router;
