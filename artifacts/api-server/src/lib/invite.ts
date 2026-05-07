import crypto from "node:crypto";
import { db } from "@workspace/db";
import { users, userTenants, tenants, invitations } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendEmail, buildInvitationEmail } from "./email";
import { logger } from "./logger";

export interface InviteUserOpts {
  email: string;
  fullName?: string | null;
  role: string;
  tenantId: string;
  inviterUserId: string;
}

export interface InviteUserResult {
  userId: string;
  isNewUser: boolean;
  invitationToken: string;
}

/**
 * Find or create a user by email, upsert their tenant membership,
 * create an invitation token and fire the invitation email async.
 * Returns the userId and raw token (so the caller can build the link).
 */
export async function inviteUser(opts: InviteUserOpts): Promise<InviteUserResult> {
  const { email, fullName, role, tenantId, inviterUserId } = opts;

  // 1. Find or create user
  let userId: string;
  let isNewUser = false;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({ email, fullName: fullName ?? null, isActive: false, isSuperAdmin: false })
      .returning({ id: users.id });
    userId = created.id;
    isNewUser = true;
  }

  // 2. Upsert tenant membership
  await db
    .insert(userTenants)
    .values({ userId, tenantId, role })
    .onConflictDoNothing();

  // 3. Create invitation record
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(invitations).values({ email, tenantId, role, tokenHash, expiresAt });

  // 4. Fire invitation email async
  const [inviter] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, inviterUserId));

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  const inviteEmail = buildInvitationEmail({
    inviteeEmail: email,
    inviterName: inviter?.fullName ?? "Your administrator",
    tenantName: tenant?.name ?? "your organization",
    role,
    invitationToken: rawToken,
  });

  sendEmail(inviteEmail.to, inviteEmail.subject, inviteEmail.html).catch(err =>
    logger.error({ err, email }, "Failed to send invitation email")
  );

  return { userId, isNewUser, invitationToken: rawToken };
}
