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

export function bookingConfirmationEmail(booking: {
  bookingNumber: string;
  customerFirstName: string;
  customerLastName: string;
  packageName?: string | null;
  appointmentDate: Date;
  serviceAddress: string;
  serviceCity?: string | null;
  serviceState?: string | null;
  totalAmount?: string | null;
  phone: string;
}): { subject: string; html: string; text: string } {
  const dateStr = booking.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeStr = booking.appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
  const address = [booking.serviceAddress, booking.serviceCity, booking.serviceState].filter(Boolean).join(", ");
  const total = booking.totalAmount ? `$${Number(booking.totalAmount).toFixed(2)}` : null;

  return {
    subject: `Booking Confirmed — ${booking.bookingNumber} | Detailing Labs`,
    text: `Hi ${booking.customerFirstName},\n\nYour booking is confirmed. Here are your details:\n\nBooking #: ${booking.bookingNumber}\nService: ${booking.packageName ?? "Mobile Detailing"}\nDate: ${dateStr} at ${timeStr}\nLocation: ${address}\n${total ? `Total: ${total}\n` : ""}\nQuestions? Call or text us at ${booking.phone}.\n\nWe'll show up ready — no water or power hookup needed from you.\n\n— Detailing Labs`,
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
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Professional Mobile Detailing — Racine County, WI</p>
        </td></tr>
        <!-- Confirmation badge -->
        <tr><td style="padding:32px 40px 0;text-align:center">
          <div style="display:inline-block;background:#16a34a20;border:1px solid #16a34a40;border-radius:100px;padding:8px 20px;margin-bottom:20px">
            <span style="color:#4ade80;font-size:13px;font-weight:600">✓ Booking Confirmed</span>
          </div>
          <p style="margin:0 0 4px;color:#e2e8f0;font-size:22px;font-weight:700">You're all set, ${booking.customerFirstName}.</p>
          <p style="margin:0;color:#94a3b8;font-size:14px">We'll see you on ${dateStr}.</p>
        </td></tr>
        <!-- Details -->
        <tr><td style="padding:28px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;overflow:hidden;border:1px solid #2a2a4a">
            ${[
              ["Booking #", `<span style="font-family:monospace;font-size:13px">${booking.bookingNumber}</span>`],
              ["Service", booking.packageName ?? "Mobile Detailing"],
              ["Date", dateStr],
              ["Time", timeStr],
              ["Location", address],
              ...(total ? [["Total", `<strong style="color:#a78bfa">${total}</strong>`]] : []),
            ].map(([label, value], i) => `
              <tr style="${i > 0 ? "border-top:1px solid #1e293b" : ""}">
                <td style="padding:14px 20px;color:#64748b;font-size:13px;width:120px;vertical-align:top">${label}</td>
                <td style="padding:14px 20px;color:#e2e8f0;font-size:13px;font-weight:500">${value}</td>
              </tr>`).join("")}
          </table>
        </td></tr>
        <!-- What to expect -->
        <tr><td style="padding:0 40px 28px">
          <p style="margin:0 0 12px;color:#e2e8f0;font-size:15px;font-weight:600">What to expect</p>
          <ul style="margin:0;padding:0 0 0 20px;color:#94a3b8;font-size:14px;line-height:1.8">
            <li>We'll arrive at your location with all equipment — no water or power hookup needed from you.</li>
            <li>Make sure the vehicle is accessible at the address you provided.</li>
            <li>You don't need to be present for the full appointment.</li>
          </ul>
        </td></tr>
        <!-- Questions -->
        <tr><td style="padding:0 40px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1b4b;border-radius:10px;border:1px solid #3730a3;padding:20px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0 0 4px;color:#c4b5fd;font-size:13px;font-weight:600">Need to reschedule or have questions?</p>
              <p style="margin:0;color:#a5b4fc;font-size:13px">Call or text us at <a href="tel:${booking.phone.replace(/\D/g, "")}" style="color:#818cf8;text-decoration:none">${booking.phone}</a> and we'll take care of you.</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#111827;text-align:center">
          <p style="margin:0;color:#475569;font-size:12px">© ${new Date().getFullYear()} Detailing Labs · Sturtevant, WI · <a href="https://detailinglabswi.com" style="color:#6d28d9;text-decoration:none">detailinglabswi.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function invoiceEmail(params: {
  invoiceNumber: string;
  customerFirstName: string;
  packageName: string;
  appointmentDate: Date;
  serviceAddress: string;
  lineItems: { name: string; qty: number; price: number }[];
  subtotal: number;
  travelFee: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  phone: string;
  businessEmail: string;
}): { subject: string; html: string; text: string } {
  const dateStr = params.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const lineRows = params.lineItems.map(item =>
    `<tr style="border-top:1px solid #1e293b">
      <td style="padding:12px 20px;color:#e2e8f0;font-size:13px">${item.name}</td>
      <td style="padding:12px 20px;color:#94a3b8;font-size:13px;text-align:center">${item.qty}</td>
      <td style="padding:12px 20px;color:#e2e8f0;font-size:13px;text-align:right;font-weight:600">$${item.price.toFixed(2)}</td>
    </tr>`
  ).join("");

  const textLines = params.lineItems.map(i => `  ${i.name} x${i.qty} — $${i.price.toFixed(2)}`).join("\n");

  return {
    subject: `Invoice ${params.invoiceNumber} — Detailing Labs`,
    text: `Hi ${params.customerFirstName},\n\nHere is your invoice from Detailing Labs.\n\nInvoice #: ${params.invoiceNumber}\nDate of Service: ${dateStr}\nLocation: ${params.serviceAddress}\n\nItems:\n${textLines}\n\nSubtotal: $${params.subtotal.toFixed(2)}${params.travelFee > 0 ? `\nTravel Fee: $${params.travelFee.toFixed(2)}` : ""}${params.taxAmount > 0 ? `\nTax: $${params.taxAmount.toFixed(2)}` : ""}\nTotal: $${params.totalAmount.toFixed(2)}\n${params.notes ? `\nNotes: ${params.notes}\n` : ""}\nQuestions? Call or text us at ${params.phone} or email ${params.businessEmail}.\n\nThank you for choosing Detailing Labs.\n— Detailing Labs`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a">
        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:28px 40px">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Detailing Labs</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Professional Mobile Detailing — Racine County, WI</p>
        </td></tr>
        <!-- Title row -->
        <tr><td style="padding:32px 40px 0">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Invoice</p>
          <p style="margin:0 0 4px;color:#e2e8f0;font-size:24px;font-weight:700">${params.invoiceNumber}</p>
          <p style="margin:0;color:#64748b;font-size:13px">${dateStr} · ${params.serviceAddress}</p>
        </td></tr>
        <!-- Line items -->
        <tr><td style="padding:24px 40px 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;overflow:hidden;border:1px solid #2a2a4a">
            <tr style="background:#1e293b">
              <th style="padding:10px 20px;text-align:left;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Description</th>
              <th style="padding:10px 20px;text-align:center;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:50px">Qty</th>
              <th style="padding:10px 20px;text-align:right;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:80px">Price</th>
            </tr>
            ${lineRows}
            ${params.travelFee > 0 ? `<tr style="border-top:1px solid #1e293b"><td style="padding:12px 20px;color:#94a3b8;font-size:13px">Travel Fee</td><td style="padding:12px 20px;color:#94a3b8;font-size:13px;text-align:center">1</td><td style="padding:12px 20px;color:#e2e8f0;font-size:13px;text-align:right;font-weight:600">$${params.travelFee.toFixed(2)}</td></tr>` : ""}
            ${params.taxAmount > 0 ? `<tr style="border-top:1px solid #1e293b"><td style="padding:12px 20px;color:#94a3b8;font-size:13px">Tax</td><td style="padding:12px 20px;color:#94a3b8;font-size:13px;text-align:center">1</td><td style="padding:12px 20px;color:#e2e8f0;font-size:13px;text-align:right;font-weight:600">$${params.taxAmount.toFixed(2)}</td></tr>` : ""}
            <!-- Total row -->
            <tr style="border-top:2px solid #2a2a4a;background:#1e293b">
              <td colspan="2" style="padding:16px 20px;color:#e2e8f0;font-size:14px;font-weight:700">Total</td>
              <td style="padding:16px 20px;text-align:right;color:#a78bfa;font-size:18px;font-weight:800">$${params.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
        ${params.notes ? `
        <!-- Notes -->
        <tr><td style="padding:20px 40px 0">
          <div style="background:#0f172a;border:1px solid #2a2a4a;border-radius:10px;padding:16px 20px">
            <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Notes</p>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6">${params.notes}</p>
          </div>
        </td></tr>` : ""}
        <!-- Contact -->
        <tr><td style="padding:24px 40px">
          <div style="background:#1e1b4b;border:1px solid #3730a3;border-radius:10px;padding:16px 20px">
            <p style="margin:0 0 4px;color:#c4b5fd;font-size:13px;font-weight:600">Questions about this invoice?</p>
            <p style="margin:0;color:#a5b4fc;font-size:13px">
              Call or text <a href="tel:${params.phone.replace(/\D/g, "")}" style="color:#818cf8;text-decoration:none">${params.phone}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${params.businessEmail}" style="color:#818cf8;text-decoration:none">${params.businessEmail}</a>
            </p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#111827;text-align:center">
          <p style="margin:0;color:#475569;font-size:12px">© ${new Date().getFullYear()} Detailing Labs · Sturtevant, WI · <a href="https://detailinglabswi.com" style="color:#6d28d9;text-decoration:none">detailinglabswi.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png";

function emailBase(headerExtra: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0a0a12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;-webkit-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0a0a12;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">

        <!-- LOGO HEADER -->
        <tr><td style="background:#0d0d1a;border-radius:16px 16px 0 0;border:1px solid #1e1e3a;border-bottom:none;padding:28px 40px;text-align:center">
          <img src="${LOGO_URL}" alt="Detailing Labs" width="140" style="height:auto;display:block;margin:0 auto">
        </td></tr>

        <!-- PURPLE ACCENT BAR -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#5b21b6,#7c3aed,#8b5cf6);border-left:1px solid #1e1e3a;border-right:1px solid #1e1e3a"></td></tr>

        ${headerExtra}

        <!-- BODY -->
        <tr><td style="background:#0d0d1a;padding:0 40px 32px;border:1px solid #1e1e3a;border-top:none;border-bottom:none">
          ${body}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#080810;border-radius:0 0 16px 16px;border:1px solid #1e1e3a;border-top:1px solid #1a1a30;padding:20px 40px;text-align:center">
          <p style="margin:0 0 4px;color:#4a4a6a;font-size:12px">© ${new Date().getFullYear()} Detailing Labs · Sturtevant, WI</p>
          <p style="margin:0"><a href="https://detailinglabswi.com" style="color:#6d28d9;font-size:12px;text-decoration:none">detailinglabswi.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invoiceEmailV2(params: {
  invoiceNumber: string;
  customerFirstName: string;
  packageName: string;
  appointmentDate: Date;
  serviceAddress: string;
  lineItems: { name: string; qty: number; price: number }[];
  subtotal: number;
  travelFee: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  phone: string;
  businessEmail: string;
  paymentUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const dateStr = params.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const lineRows = params.lineItems.map(item => `
    <tr>
      <td style="padding:12px 0;color:#c8c8e8;font-size:14px;border-bottom:1px solid #1a1a30">${item.name}</td>
      <td style="padding:12px 0;color:#6b6b8a;font-size:14px;text-align:center;border-bottom:1px solid #1a1a30">${item.qty}</td>
      <td style="padding:12px 0;color:#c8c8e8;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #1a1a30">$${item.price.toFixed(2)}</td>
    </tr>`).join("");

  const header = `
    <tr><td style="background:#0d0d1a;padding:32px 40px 0;border:1px solid #1e1e3a;border-top:none;border-bottom:none">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>
            <p style="margin:0 0 4px;color:#7c3aed;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Invoice</p>
            <p style="margin:0;color:#f0f0ff;font-size:26px;font-weight:800;letter-spacing:-0.5px">${params.invoiceNumber}</p>
          </td>
          <td style="text-align:right;vertical-align:top">
            <p style="margin:0;color:#6b6b8a;font-size:12px">${dateStr}</p>
          </td>
        </tr>
      </table>
      <div style="height:1px;background:#1a1a30;margin:20px 0 0"></div>
    </td></tr>`;

  const body = `
    <p style="margin:24px 0 8px;color:#a0a0c0;font-size:14px">Hi <strong style="color:#e0e0ff">${params.customerFirstName}</strong>, here is your invoice from Detailing Labs.</p>
    <p style="margin:0 0 24px;color:#6b6b8a;font-size:13px">${params.serviceAddress}</p>

    <!-- Line items table -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      <thead>
        <tr>
          <th style="padding:8px 0;color:#4a4a6a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-align:left;border-bottom:2px solid #1e1e3a">Description</th>
          <th style="padding:8px 0;color:#4a4a6a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-align:center;border-bottom:2px solid #1e1e3a;width:50px">Qty</th>
          <th style="padding:8px 0;color:#4a4a6a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-align:right;border-bottom:2px solid #1e1e3a;width:80px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
        ${params.travelFee > 0 ? `<tr><td style="padding:12px 0;color:#c8c8e8;font-size:14px;border-bottom:1px solid #1a1a30">Travel Fee</td><td style="padding:12px 0;color:#6b6b8a;font-size:14px;text-align:center;border-bottom:1px solid #1a1a30">1</td><td style="padding:12px 0;color:#c8c8e8;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #1a1a30">$${params.travelFee.toFixed(2)}</td></tr>` : ""}
        ${params.taxAmount > 0 ? `<tr><td style="padding:12px 0;color:#c8c8e8;font-size:14px;border-bottom:1px solid #1a1a30">Tax</td><td style="padding:12px 0;color:#6b6b8a;font-size:14px;text-align:center;border-bottom:1px solid #1a1a30">1</td><td style="padding:12px 0;color:#c8c8e8;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #1a1a30">$${params.taxAmount.toFixed(2)}</td></tr>` : ""}
      </tbody>
    </table>

    <!-- Total -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:4px">
      <tr>
        <td style="padding:16px 20px;background:#13133a;border-radius:10px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color:#a0a0c0;font-size:14px;font-weight:700">Total Due</td>
              <td style="text-align:right;color:#a78bfa;font-size:24px;font-weight:800">$${params.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${params.notes ? `<p style="margin:20px 0 0;padding:16px;background:#0f0f20;border-left:3px solid #5b21b6;border-radius:0 8px 8px 0;color:#8080a0;font-size:13px;line-height:1.6">${params.notes}</p>` : ""}

    ${params.paymentUrl ? `
    <!-- Pay Now button -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px auto 0">
      <tr><td style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border-radius:10px">
        <a href="${params.paymentUrl}" style="display:inline-block;padding:16px 48px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px">
          Pay $${params.totalAmount.toFixed(2)} Now →
        </a>
      </td></tr>
    </table>
    <p style="text-align:center;margin:12px 0 0;color:#4a4a6a;font-size:12px">Secure payment powered by Square</p>
    ` : ""}

    <!-- Divider -->
    <div style="height:1px;background:#1a1a30;margin:28px 0"></div>

    <!-- Contact -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="color:#4a4a6a;font-size:13px">
          Questions? <a href="tel:${params.phone.replace(/\D/g, "")}" style="color:#7c3aed;text-decoration:none">${params.phone}</a>
          &nbsp;·&nbsp;
          <a href="mailto:${params.businessEmail}" style="color:#7c3aed;text-decoration:none">${params.businessEmail}</a>
        </td>
      </tr>
    </table>`;

  const text = `Hi ${params.customerFirstName},\n\nHere is your invoice from Detailing Labs.\n\nInvoice #: ${params.invoiceNumber}\nDate: ${dateStr}\nLocation: ${params.serviceAddress}\n\n${params.lineItems.map(i => `${i.name} — $${i.price.toFixed(2)}`).join("\n")}${params.travelFee > 0 ? `\nTravel Fee — $${params.travelFee.toFixed(2)}` : ""}${params.taxAmount > 0 ? `\nTax — $${params.taxAmount.toFixed(2)}` : ""}\n\nTotal: $${params.totalAmount.toFixed(2)}\n${params.paymentUrl ? `\nPay online: ${params.paymentUrl}\n` : ""}\n${params.notes ? `Notes: ${params.notes}\n` : ""}\nQuestions? ${params.phone} · ${params.businessEmail}\n\n— Detailing Labs`;

  return { subject: `Invoice ${params.invoiceNumber} — $${params.totalAmount.toFixed(2)} | Detailing Labs`, html: emailBase(header, body), text };
}

export function receiptEmail(params: {
  invoiceNumber: string;
  customerFirstName: string;
  packageName: string;
  serviceAddress: string;
  lineItems: { name: string; qty: number; price: number }[];
  totalAmount: number;
  paidAt: Date;
  phone: string;
  businessEmail: string;
}): { subject: string; html: string; text: string } {
  const paidStr = params.paidAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const lineRows = params.lineItems.map(item => `
    <tr>
      <td style="padding:10px 0;color:#c8c8e8;font-size:14px;border-bottom:1px solid #1a1a30">${item.name}</td>
      <td style="padding:10px 0;color:#c8c8e8;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #1a1a30">$${item.price.toFixed(2)}</td>
    </tr>`).join("");

  const header = `
    <tr><td style="background:#0d0d1a;padding:32px 40px 0;border:1px solid #1e1e3a;border-top:none;border-bottom:none">
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;text-align:center;width:100%">
        <tr><td style="text-align:center">
          <div style="display:inline-block;background:#14532d;border:1px solid #166534;border-radius:50%;width:52px;height:52px;line-height:52px;font-size:26px;margin-bottom:12px">✓</div>
          <p style="margin:0 0 4px;color:#4ade80;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Payment Received</p>
          <p style="margin:0;color:#f0f0ff;font-size:28px;font-weight:800">$${params.totalAmount.toFixed(2)}</p>
          <p style="margin:4px 0 0;color:#6b6b8a;font-size:13px">${paidStr}</p>
        </td></tr>
      </table>
      <div style="height:1px;background:#1a1a30;margin:24px 0 0"></div>
    </td></tr>`;

  const body = `
    <p style="margin:24px 0 4px;color:#a0a0c0;font-size:14px">Hi <strong style="color:#e0e0ff">${params.customerFirstName}</strong>, thank you — payment confirmed.</p>
    <p style="margin:0 0 24px;color:#6b6b8a;font-size:13px">Invoice <span style="color:#7c3aed;font-family:monospace">${params.invoiceNumber}</span> · ${params.serviceAddress}</p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      <tbody>${lineRows}</tbody>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:4px">
      <tr>
        <td style="padding:16px 20px;background:#0a1f0f;border:1px solid #166534;border-radius:10px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="color:#4ade80;font-size:14px;font-weight:700">Paid</td>
              <td style="text-align:right;color:#4ade80;font-size:24px;font-weight:800">$${params.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="height:1px;background:#1a1a30;margin:28px 0"></div>
    <p style="margin:0;color:#4a4a6a;font-size:13px">
      Questions? <a href="tel:${params.phone.replace(/\D/g, "")}" style="color:#7c3aed;text-decoration:none">${params.phone}</a>
      &nbsp;·&nbsp;
      <a href="mailto:${params.businessEmail}" style="color:#7c3aed;text-decoration:none">${params.businessEmail}</a>
    </p>`;

  return {
    subject: `Receipt — $${params.totalAmount.toFixed(2)} paid | Detailing Labs`,
    html: emailBase(header, body),
    text: `Hi ${params.customerFirstName},\n\nPayment confirmed. Thank you!\n\nInvoice #: ${params.invoiceNumber}\nPaid: ${paidStr}\nAmount: $${params.totalAmount.toFixed(2)}\nLocation: ${params.serviceAddress}\n\n${params.lineItems.map(i => `${i.name} — $${i.price.toFixed(2)}`).join("\n")}\n\nQuestions? ${params.phone} · ${params.businessEmail}\n\n— Detailing Labs`,
  };
}
