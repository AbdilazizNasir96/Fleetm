import { Router } from "express";
import { db } from "@workspace/db";
import { tenants, users, userTenants, invitations } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  UpdateCurrentTenantBody,
  UpdateUserRoleBody,
  UpdateUserRoleParams,
  GetUserParams,
  RemoveUserFromTenantParams,
  CreateInvitationBody,
  DeleteInvitationParams,
  AcceptInvitationBody,
} from "@workspace/api-zod";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { signToken } from "../lib/auth";
import { logger } from "../lib/logger";
import { sendEmail, buildInvitationEmail } from "../lib/email";

const router = Router();

router.use(requireAuth);

// Tenant
router.get("/tenants/current", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
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

router.patch("/tenants/current", async (req, res): Promise<void> => {
  const parsed = UpdateCurrentTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [tenant] = await db.update(tenants)
    .set(parsed.data)
    .where(eq(tenants.id, tenantId))
    .returning();
  res.json({
    ...tenant,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt?.toISOString() ?? null,
  });
});

// Users in tenant
router.get("/users", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: userTenants.role,
    })
    .from(userTenants)
    .innerJoin(users, eq(userTenants.userId, users.id))
    .where(eq(userTenants.tenantId, tenantId));

  res.json(rows.map(u => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt?.toISOString() ?? null,
  })));
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: userTenants.role,
    })
    .from(userTenants)
    .innerJoin(users, eq(userTenants.userId, users.id))
    .where(and(eq(userTenants.tenantId, tenantId), eq(users.id, params.data.userId)));

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    ...row,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  });
});

router.patch("/users/:userId", async (req, res): Promise<void> => {
  const params = UpdateUserRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  await db.update(userTenants)
    .set({ role: parsed.data.role })
    .where(and(eq(userTenants.tenantId, tenantId), eq(userTenants.userId, params.data.userId)));

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: userTenants.role,
    })
    .from(userTenants)
    .innerJoin(users, eq(userTenants.userId, users.id))
    .where(and(eq(userTenants.tenantId, tenantId), eq(users.id, params.data.userId)));

  res.json({
    ...row,
    lastLoginAt: row?.lastLoginAt?.toISOString() ?? null,
    createdAt: row?.createdAt?.toISOString() ?? null,
  });
});

router.delete("/users/:userId", async (req, res): Promise<void> => {
  const params = RemoveUserFromTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  await db.delete(userTenants)
    .where(and(eq(userTenants.tenantId, tenantId), eq(userTenants.userId, params.data.userId)));
  res.sendStatus(204);
});

// Invitations
router.get("/invitations", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db.select().from(invitations).where(eq(invitations.tenantId, tenantId));
  res.json(rows.map(i => ({
    ...i,
    expiresAt: i.expiresAt?.toISOString() ?? null,
    createdAt: i.createdAt?.toISOString() ?? null,
  })));
});

router.post("/invitations", async (req, res): Promise<void> => {
  const parsed = CreateInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tenantId = req.user!.tenantId;
  const inviterId = req.user!.userId;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invitation] = await db.insert(invitations).values({
    email: parsed.data.email,
    tenantId,
    role: parsed.data.role,
    tokenHash,
    expiresAt,
  }).returning();

  const [inviter] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, inviterId));

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  const inviteEmail = buildInvitationEmail({
    inviteeEmail: parsed.data.email,
    inviterName: inviter?.fullName ?? "Your administrator",
    tenantName: tenant?.name ?? "your organization",
    role: parsed.data.role,
    invitationToken: token,
  });

  sendEmail(inviteEmail.to, inviteEmail.subject, inviteEmail.html).catch(err =>
    logger.error({ err, email: parsed.data.email }, "Failed to send invitation email")
  );

  res.status(201).json({
    ...invitation,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    createdAt: invitation.createdAt?.toISOString() ?? null,
  });
});

router.delete("/invitations/:invitationId", async (req, res): Promise<void> => {
  const params = DeleteInvitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  await db.delete(invitations)
    .where(and(eq(invitations.id, params.data.invitationId), eq(invitations.tenantId, tenantId)));
  res.sendStatus(204);
});

// Accept invitation (no auth required)
const publicRouter = Router();

publicRouter.post("/invitations/accept", async (req, res): Promise<void> => {
  const parsed = AcceptInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token, password, fullName } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash));
  if (!invitation) {
    res.status(400).json({ error: "Invalid invitation token" });
    return;
  }
  if (invitation.expiresAt < new Date()) {
    res.status(400).json({ error: "Invitation has expired" });
    return;
  }

  let userId: string;
  const [existingUser] = await db.select().from(users).where(eq(users.email, invitation.email));

  if (existingUser) {
    userId = existingUser.id;
    // If the user was pre-created by the invite flow (no passwordHash yet), set their password now
    if (!existingUser.passwordHash) {
      if (!password) {
        res.status(400).json({ error: "Password required to activate your account" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await db.update(users)
        .set({ passwordHash, isActive: true, fullName: fullName ?? existingUser.fullName ?? null })
        .where(eq(users.id, existingUser.id));
    }
  } else {
    if (!password) {
      res.status(400).json({ error: "Password required for new account" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await db.insert(users).values({
      email: invitation.email,
      passwordHash,
      fullName: fullName ?? null,
      isActive: true,
      isSuperAdmin: false,
    }).returning();
    userId = newUser.id;
  }

  await db.insert(userTenants).values({
    userId,
    tenantId: invitation.tenantId,
    role: invitation.role,
  }).onConflictDoNothing();

  await db.delete(invitations).where(eq(invitations.id, invitation.id));

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invitation.tenantId));
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  const jwtToken = signToken({
    userId,
    tenantId: invitation.tenantId,
    role: invitation.role,
    isSuperAdmin: user.isSuperAdmin ?? false,
  });

  res.json({
    token: jwtToken,
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
    role: invitation.role,
  });
});

export { publicRouter };
export default router;
