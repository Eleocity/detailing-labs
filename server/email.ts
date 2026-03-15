/**
 * Email helper using SendGrid.
 * All outgoing transactional emails go through this module.
 */

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@detailinglabswi.com";

  if (!apiKey) {
    console.warn("[Email] SENDGRID_API_KEY not set — email not sent.");
    return false;
  }

  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: "Detailing Labs" },
    subject,
    content: [
      ...(text ? [{ type: "text/plain", value: text }] : []),
      { type: "text/html", value: html },
    ],
  };

  try {
    const res = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] SendGrid error:", res.status, err);
      return false;
    }

    console.log(`[Email] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    return false;
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function passwordResetEmail(resetUrl: string, userName: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your Detailing Labs password",
    text: `Hi ${userName},\n\nClick the link below to reset your password. This link expires in 24 hours.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— Detailing Labs`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a">
        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:28px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Detailing Labs</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Premium Mobile Auto Detailing</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 8px;color:#e2e8f0;font-size:20px;font-weight:600">Reset your password</p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6">
            Hi ${userName}, we received a request to reset the password for your Detailing Labs account.
            Click the button below to choose a new password. This link expires in <strong style="color:#e2e8f0">24 hours</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td style="background:#7c3aed;border-radius:8px">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                Reset Password →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6">
            Or copy and paste this URL into your browser:
          </p>
          <p style="margin:0 0 24px;color:#7c3aed;font-size:12px;word-break:break-all">${resetUrl}</p>
          <hr style="border:none;border-top:1px solid #2a2a4a;margin:24px 0">
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
            If you didn't request a password reset, you can safely ignore this email. Your password will not change.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#111827;text-align:center">
          <p style="margin:0;color:#475569;font-size:12px">© ${new Date().getFullYear()} Detailing Labs. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function inviteEmail(inviteUrl: string, inviterName: string, role: string): { subject: string; html: string; text: string } {
  const roleLabel = role === "admin" ? "Admin" : "Team Member";
  return {
    subject: `You've been invited to join Detailing Labs`,
    text: `Hi,\n\n${inviterName} has invited you to join Detailing Labs as a ${roleLabel}.\n\nClick the link below to accept your invitation and set up your account. This link expires in 72 hours.\n\n${inviteUrl}\n\n— Detailing Labs`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a">
        <tr><td style="background:#7c3aed;padding:28px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Detailing Labs</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Premium Mobile Auto Detailing</p>
        </td></tr>
        <tr><td style="padding:40px">
          <p style="margin:0 0 8px;color:#e2e8f0;font-size:20px;font-weight:600">You're invited!</p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6">
            <strong style="color:#e2e8f0">${inviterName}</strong> has invited you to join Detailing Labs as a
            <strong style="color:#7c3aed">${roleLabel}</strong>.
            Click the button below to accept your invitation and set up your account.
            This link expires in <strong style="color:#e2e8f0">72 hours</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td style="background:#7c3aed;border-radius:8px">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                Accept Invitation →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#64748b;font-size:13px">Or copy this URL:</p>
          <p style="margin:0 0 24px;color:#7c3aed;font-size:12px;word-break:break-all">${inviteUrl}</p>
          <hr style="border:none;border-top:1px solid #2a2a4a;margin:24px 0">
          <p style="margin:0;color:#64748b;font-size:13px">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#111827;text-align:center">
          <p style="margin:0;color:#475569;font-size:12px">© ${new Date().getFullYear()} Detailing Labs. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
