/**
 * Marketing & automation email templates for Detailing Labs.
 * All templates use the same brand: dark bg, purple accent, clean layout.
 *
 * Templates:
 *   appointmentReminderEmail   — 24h and 2h before appointment
 *   reviewRequestEmail         — 2h after job completed
 *   winBackEmail               — 90 days since last booking
 *   coatingAnniversaryEmail    — 1 year after ceramic coating
 */

const BASE_URL = "https://detailinglabswi.com";
const PHONE    = process.env.CONTACT_PHONE || "(262) 260-9474";
const BIZ_EMAIL = process.env.CONTACT_EMAIL || "hello@detailinglabswi.com";
const YEAR     = new Date().getFullYear();

// ─── Shared HTML shell ────────────────────────────────────────────────────────

function shell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Detailing Labs</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#09090f;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">

        <!-- HEADER -->
        <tr><td style="background:#0e0e1c;border-radius:16px 16px 0 0;border:1px solid #1c1c30;border-bottom:none;padding:24px 40px;text-align:center">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Detailing Labs</p>
          <p style="margin:2px 0 0;color:#6b6b9a;font-size:12px;letter-spacing:0.5px">Professional Mobile Detailing · SE Wisconsin</p>
        </td></tr>

        <!-- PURPLE BAR -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#4f1d96,#7c3aed,#a78bfa);border-left:1px solid #1c1c30;border-right:1px solid #1c1c30"></td></tr>

        <!-- BODY -->
        <tr><td style="background:#0e0e1c;padding:40px;border:1px solid #1c1c30;border-top:none;border-bottom:none">
          ${body}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#070710;border-radius:0 0 16px 16px;border:1px solid #1c1c30;border-top:1px solid #181828;padding:20px 40px;text-align:center">
          <p style="margin:0 0 6px;color:#3a3a5a;font-size:12px">
            © ${YEAR} Detailing Labs · Sturtevant, WI ·
            <a href="${BASE_URL}" style="color:#5b21b6;text-decoration:none">detailinglabswi.com</a>
          </p>
          <p style="margin:0;color:#2a2a40;font-size:11px">
            You're receiving this because you booked with Detailing Labs. ·
            <a href="${BASE_URL}/unsubscribe?email={{EMAIL}}" style="color:#3a3a5a;text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string, color = "#7c3aed"): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px auto 0">
    <tr><td style="background:${color};border-radius:10px">
      <a href="${href}" style="display:inline-block;padding:15px 40px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px">${text}</a>
    </td></tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:12px 16px;color:#4a4a6a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:110px;vertical-align:top;border-bottom:1px solid #141428">${label}</td>
    <td style="padding:12px 16px;color:#d0d0f0;font-size:14px;font-weight:500;border-bottom:1px solid #141428">${value}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#080815;border-radius:10px;overflow:hidden;border:1px solid #1a1a2e;margin:24px 0">
    <tbody>${rows}</tbody>
  </table>`;
}

function divider(): string {
  return `<div style="height:1px;background:#141428;margin:28px 0"></div>`;
}

function contactLine(email: string): string {
  return `<p style="margin:0;color:#3a3a5a;font-size:12px;text-align:center">
    Questions? <a href="tel:${PHONE.replace(/\D/g,'')}" style="color:#5b21b6;text-decoration:none">${PHONE}</a>
    &nbsp;·&nbsp;
    <a href="mailto:${BIZ_EMAIL}" style="color:#5b21b6;text-decoration:none">${BIZ_EMAIL}</a>
  </p>`;
}

// ─── 1. Appointment Reminder (24h & 2h) ───────────────────────────────────────

export function appointmentReminderEmail(params: {
  customerFirstName: string;
  customerEmail:     string;
  bookingNumber:     string;
  packageName?:      string | null;
  appointmentDate:   Date;
  serviceAddress:    string;
  serviceCity?:      string | null;
  vehicleMake?:      string | null;
  vehicleModel?:     string | null;
  vehicleYear?:      number | null;
  hoursAway:         24 | 2;
}): { subject: string; html: string; text: string } {
  const dateStr = params.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
  const address = [params.serviceAddress, params.serviceCity].filter(Boolean).join(", ");
  const vehicle = [params.vehicleYear, params.vehicleMake, params.vehicleModel].filter(Boolean).join(" ");
  const is24 = params.hoursAway === 24;

  const subject = is24
    ? `Reminder: Your detail is tomorrow — ${dateStr}`
    : `Your Detailing Labs appointment is in 2 hours`;

  const preheader = is24
    ? `We'll be at ${address} tomorrow at ${timeStr}. Here's what to know.`
    : `We're on our way soon. Make sure your vehicle is accessible.`;

  const headline = is24
    ? `See you tomorrow, ${params.customerFirstName}.`
    : `Your appointment is in 2 hours.`;

  const subline = is24
    ? `Just a reminder that your detail is coming up tomorrow. Here are the details.`
    : `We'll be arriving soon. Make sure your vehicle is accessible at the address below.`;

  const checklist = is24 ? `
    <p style="margin:24px 0 10px;color:#a0a0c0;font-size:14px;font-weight:600">Before tomorrow</p>
    <ul style="margin:0;padding:0 0 0 20px;color:#7070a0;font-size:13px;line-height:2">
      <li>Make sure the vehicle is accessible at the address above</li>
      <li>You don't need to be home — just make sure we can get to the car</li>
      <li>We bring our own water and power — no hookups needed from you</li>
      <li>Questions? Call or text us anytime at ${PHONE}</li>
    </ul>` : `
    <div style="background:#0c0c20;border:1px solid #1c1c34;border-left:3px solid #7c3aed;border-radius:0 10px 10px 0;padding:16px 20px;margin:24px 0">
      <p style="margin:0 0 4px;color:#a78bfa;font-size:13px;font-weight:700">Quick checklist</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#7070a0;font-size:13px;line-height:2">
        <li>Vehicle is accessible at the address below</li>
        <li>Gates or entry codes are ready if needed</li>
        <li>We don't need water or power from you</li>
      </ul>
    </div>`;

  const body = `
    <p style="margin:0 0 6px;color:#e0e0ff;font-size:24px;font-weight:800">${headline}</p>
    <p style="margin:0 0 24px;color:#6b6b9a;font-size:14px;line-height:1.6">${subline}</p>

    ${detailTable(
      detailRow("Booking #", `<span style="font-family:monospace">${params.bookingNumber}</span>`) +
      detailRow("Service",   params.packageName ?? "Mobile Detailing") +
      detailRow("Date",      dateStr) +
      detailRow("Time",      timeStr) +
      detailRow("Location",  address) +
      (vehicle ? detailRow("Vehicle", vehicle) : "")
    )}

    ${checklist}

    ${btn("View Booking Details", `${BASE_URL}/booking/confirmation/${params.bookingNumber}`)}

    ${divider()}
    ${contactLine(params.customerEmail)}`;

  const text = `Hi ${params.customerFirstName},\n\n${headline}\n\nBooking #: ${params.bookingNumber}\nService: ${params.packageName ?? "Mobile Detailing"}\nDate: ${dateStr} at ${timeStr}\nLocation: ${address}${vehicle ? `\nVehicle: ${vehicle}` : ""}\n\nWe bring our own water and power — no hookups needed.\n\nQuestions? ${PHONE} · ${BIZ_EMAIL}\n\n— Detailing Labs\n\nUnsubscribe: ${BASE_URL}/unsubscribe?email=${encodeURIComponent(params.customerEmail)}`;

  return {
    subject,
    html: shell(preheader, body).replace("{{EMAIL}}", encodeURIComponent(params.customerEmail)),
    text,
  };
}

// ─── 2. Review Request ────────────────────────────────────────────────────────

export function reviewRequestEmail(params: {
  customerFirstName: string;
  customerEmail:     string;
  bookingNumber:     string;
  packageName?:      string | null;
  vehicleMake?:      string | null;
  vehicleModel?:     string | null;
  vehicleYear?:      number | null;
}): { subject: string; html: string; text: string } {
  const vehicle = [params.vehicleYear, params.vehicleMake, params.vehicleModel].filter(Boolean).join(" ") || "your vehicle";
  const googleReviewUrl = `${BASE_URL}/review`; // redirect to Google review page

  const subject = `How did we do, ${params.customerFirstName}?`;
  const preheader = `Your ${params.packageName ?? "detail"} is done. 60 seconds is all it takes.`;

  const body = `
    <p style="margin:0 0 6px;color:#e0e0ff;font-size:24px;font-weight:800">How did we do?</p>
    <p style="margin:0 0 28px;color:#6b6b9a;font-size:14px;line-height:1.6">
      Thanks for choosing Detailing Labs for your ${params.packageName ?? "detail"} today, ${params.customerFirstName}.
      We hope ${vehicle} is looking exactly how you wanted it.
    </p>

    <!-- Stars CTA -->
    <div style="background:#0c0c20;border:1px solid #2a1f5a;border-radius:14px;padding:28px 32px;text-align:center;margin:0 0 24px">
      <p style="margin:0 0 6px;color:#a78bfa;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Leave a Review</p>
      <p style="margin:0 0 20px;color:#d0d0f0;font-size:22px">⭐⭐⭐⭐⭐</p>
      <p style="margin:0 0 20px;color:#7070a0;font-size:13px;line-height:1.6">
        If we earned it, a Google review helps other people in Southeast Wisconsin find us —
        and it genuinely means a lot to a small operation like ours.
        Takes about 60 seconds.
      </p>
      ${btn("Leave a Google Review →", googleReviewUrl, "#4f1d96")}
    </div>

    <p style="margin:24px 0 0;color:#4a4a6a;font-size:13px;line-height:1.7;text-align:center">
      Not satisfied with something? Don't leave a bad review — just reply to this email or call us at ${PHONE}
      and we'll make it right.
    </p>

    ${divider()}

    <!-- Book again CTA -->
    <p style="margin:0 0 8px;color:#8080a0;font-size:13px;text-align:center">Ready for your next detail?</p>
    ${btn("Book Again", `${BASE_URL}/booking`, "#1a1a3a")}

    ${divider()}
    ${contactLine(params.customerEmail)}`;

  const text = `Hi ${params.customerFirstName},\n\nThanks for choosing Detailing Labs today. We hope ${vehicle} is looking exactly how you wanted it.\n\nIf we did a good job, a quick Google review means the world to us:\n${googleReviewUrl}\n\nNot happy with something? Reply to this email or call us at ${PHONE} and we'll make it right.\n\n— Detailing Labs\n\nUnsubscribe: ${BASE_URL}/unsubscribe?email=${encodeURIComponent(params.customerEmail)}`;

  return {
    subject,
    html: shell(preheader, body).replace("{{EMAIL}}", encodeURIComponent(params.customerEmail)),
    text,
  };
}

// ─── 3. Win-Back (90 days since last booking) ─────────────────────────────────

export function winBackEmail(params: {
  customerFirstName: string;
  customerEmail:     string;
  lastServiceName?:  string | null;
  lastServiceDate?:  Date | null;
  vehicleMake?:      string | null;
  vehicleModel?:     string | null;
}): { subject: string; html: string; text: string } {
  const vehicle = [params.vehicleMake, params.vehicleModel].filter(Boolean).join(" ") || "your vehicle";
  const lastDateStr = params.lastServiceDate
    ? params.lastServiceDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "a few months ago";

  const subject = `It's been a while, ${params.customerFirstName} — time to bring back the shine`;
  const preheader = `${vehicle} is probably due. We're still in the neighborhood.`;

  const body = `
    <p style="margin:0 0 6px;color:#e0e0ff;font-size:24px;font-weight:800">It's been a while.</p>
    <p style="margin:0 0 28px;color:#6b6b9a;font-size:14px;line-height:1.7">
      Hi ${params.customerFirstName}, your last detail with us was back in ${lastDateStr}${params.lastServiceName ? ` (${params.lastServiceName})` : ""}.
      After a few months, most vehicles are ready for another round — and ${vehicle} probably is too.
    </p>

    <!-- Callout -->
    <div style="background:#0c0c20;border:1px solid #1c1c34;border-radius:14px;padding:28px 32px;margin:0 0 24px">
      <p style="margin:0 0 12px;color:#a78bfa;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">What a full detail gets you</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#8080a0;font-size:13px;line-height:2.2">
        <li>Complete interior reset — vacuumed, wiped, conditioned</li>
        <li>Exterior decontamination — iron fallout, tar, road grime removed</li>
        <li>Hydrophobic protection so water beads right off</li>
        <li>We come to you — no drop-off, no waiting rooms</li>
      </ul>
    </div>

    <p style="margin:0 0 4px;color:#6b6b9a;font-size:13px;text-align:center">Same-week availability on most dates.</p>
    ${btn("Book Your Next Detail", `${BASE_URL}/booking`)}

    ${divider()}

    <p style="margin:0;color:#4a4a6a;font-size:13px;line-height:1.6;text-align:center">
      Questions about which package is right? Call or text us at ${PHONE} — we'll sort it out in under two minutes.
    </p>

    ${divider()}
    ${contactLine(params.customerEmail)}`;

  const text = `Hi ${params.customerFirstName},\n\nYour last detail with us was ${lastDateStr}. After a few months, ${vehicle} is probably ready for another round.\n\nSame-week availability on most dates. Book at ${BASE_URL}/booking or call us at ${PHONE}.\n\n— Detailing Labs\n\nUnsubscribe: ${BASE_URL}/unsubscribe?email=${encodeURIComponent(params.customerEmail)}`;

  return {
    subject,
    html: shell(preheader, body).replace("{{EMAIL}}", encodeURIComponent(params.customerEmail)),
    text,
  };
}

// ─── 4. Coating Anniversary (1 year after ceramic) ───────────────────────────

export function coatingAnniversaryEmail(params: {
  customerFirstName: string;
  customerEmail:     string;
  bookingNumber:     string;
  coatingDate:       Date;
  vehicleMake?:      string | null;
  vehicleModel?:     string | null;
  vehicleYear?:      number | null;
}): { subject: string; html: string; text: string } {
  const vehicle = [params.vehicleYear, params.vehicleMake, params.vehicleModel].filter(Boolean).join(" ") || "your vehicle";
  const coatingDateStr = params.coatingDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const subject = `One year since your ceramic coating — time for an inspection`;
  const preheader = `${vehicle}'s coating is a year old. Here's what to know.`;

  const body = `
    <p style="margin:0 0 6px;color:#e0e0ff;font-size:24px;font-weight:800">One year strong.</p>
    <p style="margin:0 0 28px;color:#6b6b9a;font-size:14px;line-height:1.7">
      Hi ${params.customerFirstName}, it's been just about a year since we applied the ceramic coating to ${vehicle} back in ${coatingDateStr}.
      Your coating is still protecting your paint — but this is a great time for a quick inspection and maintenance detail to keep it performing at its best.
    </p>

    <!-- What's included -->
    <div style="background:#0c0c20;border:1px solid #1c1c34;border-radius:14px;padding:28px 32px;margin:0 0 24px">
      <p style="margin:0 0 12px;color:#f59e0b;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Annual coating maintenance</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#8080a0;font-size:13px;line-height:2.2">
        <li>Decontamination wash to remove bonded contaminants</li>
        <li>Coating inspection — we check for any failure points</li>
        <li>Top-coat booster application to restore hydrophobics</li>
        <li>Helps maximize the lifespan of your existing coating</li>
      </ul>
    </div>

    <p style="margin:0 0 4px;color:#6b6b9a;font-size:13px;text-align:center">Reach out to schedule your annual maintenance.</p>
    ${btn("Book Maintenance Detail", `${BASE_URL}/booking`)}

    <p style="margin:24px 0 0;color:#4a4a6a;font-size:13px;text-align:center;line-height:1.6">
      Not sure what you need? Call or text us at ${PHONE} — we'll look up your job history and advise.
    </p>

    ${divider()}
    ${contactLine(params.customerEmail)}`;

  const text = `Hi ${params.customerFirstName},\n\nIt's been a year since we applied the ceramic coating to ${vehicle} (${coatingDateStr}). Now is a great time for a maintenance detail to keep your coating performing at its best.\n\nBook at ${BASE_URL}/booking or call us at ${PHONE}.\n\n— Detailing Labs\n\nUnsubscribe: ${BASE_URL}/unsubscribe?email=${encodeURIComponent(params.customerEmail)}`;

  return {
    subject,
    html: shell(preheader, body).replace("{{EMAIL}}", encodeURIComponent(params.customerEmail)),
    text,
  };
}
