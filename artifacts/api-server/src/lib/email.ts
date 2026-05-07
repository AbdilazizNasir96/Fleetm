import { logger } from "./logger";

const FROM_EMAIL = process.env["SENDGRID_FROM_EMAIL"] || "noreply@digivantsolutions.com";
const FROM_NAME = "Digivant Solutions";
const APP_URL =
  process.env["APP_URL"] ||
  (process.env["REPLIT_DOMAINS"]
    ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
    : "http://localhost:80");

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env["NODE_ENV"] === "development" && !process.env["SENDGRID_API_KEY"]) {
    logger.info(
      { to, subject },
      `[DEV EMAIL] ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`
    );
    return;
  }

  if (process.env["SENDGRID_API_KEY"]) {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env["SENDGRID_API_KEY"]);
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
    });
    return;
  }

  throw new Error("No email provider configured. Set SENDGRID_API_KEY or run in development mode.");
}

// ── Template helpers ──────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#2563EB;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🚌 Digivant Solutions</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
            ${body}
            <hr style="border:none;border-top:1px solid #b8d4ff;margin:32px 0;" />
            <p style="font-size:12px;color:#a1a1aa;margin:0;text-align:center;">
              Digivant Solutions · School Transport Command Center<br />
              You received this email because an action was taken on your account.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563EB;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;margin:24px 0;">${text}</a>`;
}

function h1(text: string): string {
  return `<h1 style="font-size:24px;font-weight:700;color:#0A2540;margin:0 0 8px;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="font-size:15px;color:#3f3f46;line-height:1.6;margin:12px 0;">${text}</p>`;
}

function muted(text: string): string {
  return `<p style="font-size:13px;color:#a1a1aa;margin:8px 0;">${text}</p>`;
}

// ── Email builders ────────────────────────────────────────────────────────────

export function buildInvitationEmail(opts: {
  inviteeEmail: string;
  inviterName: string;
  tenantName: string;
  role: string;
  invitationToken: string;
}): SendEmailOptions {
  const acceptUrl = `${APP_URL}/accept-invitation?token=${opts.invitationToken}`;
  const roleLabel = opts.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const html = layout(
    `You're invited to join ${opts.tenantName} on Digivant Solutions`,
    `
    ${h1(`You've been invited to join ${opts.tenantName}`)}
    ${p(`<strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.tenantName}</strong> on Digivant Solutions as a <strong>${roleLabel}</strong>.`)}
    ${p("Click the button below to accept your invitation and set up your account. This link expires in 7 days.")}
    <div style="text-align:center;">
      ${button("Accept Invitation", acceptUrl)}
    </div>
    ${muted(`Or copy and paste this URL: ${acceptUrl}`)}
    ${muted("If you didn't expect this invitation, you can safely ignore this email.")}
    `
  );


  return { to: opts.inviteeEmail, subject: `You're invited to join ${opts.tenantName} on Digivant Solutions`, html };
}

export function buildWelcomeEmail(opts: {
  email: string;
  fullName: string | null;
  tenantName: string;
}): SendEmailOptions {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const firstName = opts.fullName?.split(" ")[0] ?? "there";

  const html = layout(
    `Welcome to Digivant Solutions`,
    `
    ${h1(`Welcome aboard, ${firstName}! 🎉`)}
    ${p(`Your organisation <strong>${opts.tenantName}</strong> is now set up on Digivant Solutions. You're on a <strong>14-day free trial</strong> with full access to every feature.`)}
    <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="font-size:14px;color:#3f3f46;margin:0 0 10px;font-weight:600;">Get started in minutes:</p>
      <ul style="font-size:14px;color:#3f3f46;margin:0;padding-left:20px;line-height:2;">
        <li>Add your vehicles and drivers</li>
        <li>Create routes and stops</li>
        <li>Register students and assign them to routes</li>
        <li>Start a trip and track it live</li>
      </ul>
    </div>
    <div style="text-align:center;">
      ${button("Go to Dashboard", dashboardUrl)}
    </div>
    ${muted("Questions? Reply to this email — we're here to help.")}
    `
  );

  return { to: opts.email, subject: `Welcome to Digivant Solutions — ${opts.tenantName} is ready`, html };
}

export function buildIncidentAlertEmail(opts: {
  adminEmail: string;
  adminName: string | null;
  reporterName: string | null;
  incidentType: string;
  description: string | null;
  vehiclePlate: string | null;
  occurredAt: string;
  incidentId: string;
}): SendEmailOptions {
  const incidentUrl = `${APP_URL}/incidents`;
  const typeLabel = opts.incidentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const firstName = opts.adminName?.split(" ")[0] ?? "Admin";

  const html = layout(
    `Incident Alert: ${typeLabel}`,
    `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:14px;font-weight:700;color:#dc2626;margin:0;">⚠️ New Incident Reported</p>
    </div>
    ${h1(`${typeLabel} Incident`)}
    ${p(`Hi ${firstName}, a new incident has been reported on your fleet.`)}
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;width:40%;">Reported by</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:500;">${opts.reporterName ?? "Unknown"}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;">Type</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:500;">${typeLabel}</td></tr>
      ${opts.vehiclePlate ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:500;">${opts.vehiclePlate}</td></tr>` : ""}
      <tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;">Occurred at</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:500;">${new Date(opts.occurredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:#71717a;vertical-align:top;">Description</td><td style="padding:10px 0;font-size:14px;color:#18181b;">${opts.description ?? "No description provided"}</td></tr>
    </table>
    <div style="text-align:center;">
      ${button("View Incident", incidentUrl)}
    </div>
    `
  );

  return {
    to: opts.adminEmail,
    subject: `[Alert] ${typeLabel} incident reported on your fleet`,
    html,
  };
}
