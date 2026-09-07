import { describe, it, expect } from "vitest";
import {
  passwordResetEmail,
  inviteEmail,
  fleetQuoteEmail,
  bookingConfirmationEmail,
} from "./email";

/**
 * Validates SendGrid configuration and email template generation.
 * Live network calls are skipped in sandbox (no outbound access to SendGrid).
 * The actual email sending is validated in production.
 */
describe("SendGrid configuration", () => {
  it("SENDGRID_API_KEY is set and has correct format", () => {
    const key = process.env.SENDGRID_API_KEY;
    expect(key, "SENDGRID_API_KEY must be set").toBeTruthy();
    expect(key!.startsWith("SG."), "SendGrid API keys start with 'SG.'").toBe(true);
  });

  it("EMAIL_FROM is set and is a valid email address", () => {
    const from = process.env.EMAIL_FROM;
    expect(from, "EMAIL_FROM must be set").toBeTruthy();
    expect(from).toMatch(/@/);
  });
});

describe("Email templates", () => {
  it("passwordResetEmail generates correct subject and contains reset URL", () => {
    const url = "https://example.com/reset-password?token=abc123";
    const result = passwordResetEmail(url, "John Doe");
    expect(result.subject).toContain("Reset");
    expect(result.html).toContain(url);
    expect(result.text).toContain(url);
    expect(result.text).toContain("John Doe");
  });

  it("inviteEmail generates correct subject and contains invite URL", () => {
    const url = "https://example.com/invite?token=xyz789";
    const result = inviteEmail(url, "Jane Admin", "admin");
    expect(result.subject).toContain("invited");
    expect(result.html).toContain(url);
    expect(result.text).toContain("Jane Admin");
    expect(result.html).toContain("Admin");
  });

  it("inviteEmail uses correct role label for user role", () => {
    const result = inviteEmail("https://example.com/invite?token=abc", "Boss", "user");
    expect(result.html).toContain("Team Member");
  });

  it("fleetQuoteEmail includes company, contact details, and readable labels", () => {
    const result = fleetQuoteEmail({
      companyName: "Acme Landscaping",
      contactName: "Jamie Smith",
      phone: "(262) 555-0100",
      email: "jamie@acme.example",
      city: "Racine, WI",
      vehicleCount: "8",
      vehicleTypes: ["vans", "light_trucks"],
      opportunityType: "contractor_fleet",
      frequency: "monthly",
      notes: "Need service before spring season.",
      ownerEmail: "owner@example.com",
    });
    expect(result.subject).toContain("Acme Landscaping");
    expect(result.html).toContain("Jamie Smith");
    expect(result.html).toContain("jamie@acme.example");
    expect(result.html).toContain("Vans, Light Trucks");
    expect(result.html).toContain("Contractor / Service Fleet");
    expect(result.html).toContain("Monthly");
    expect(result.html).toContain("Need service before spring season.");
    expect(result.text).toContain("Acme Landscaping");
  });

  it("bookingConfirmationEmail shows the appointment in America/Chicago regardless of server timezone", () => {
    // 2026-09-07T14:00:00Z is 9:00 AM CDT — this is the exact instant a
    // correctly-encoded "9:00 AM Sep 7" wizard booking now produces (see
    // shared/bookingTimeZone.ts and docs/BOOKING_TIMEZONE_FIX.md). Without
    // an explicit timeZone, Node formats this using the server process's
    // own timezone (UTC on Railway), which would show "2:00 PM" instead.
    const result = bookingConfirmationEmail({
      bookingNumber: "FA-TEST123",
      customerFirstName: "Jamie",
      customerLastName: "Tester",
      appointmentDate: new Date("2026-09-07T14:00:00.000Z"),
      serviceAddress: "123 Main St",
      phone: "(262) 260-9474",
    });
    expect(result.text).toContain("9:00 AM CT");
    expect(result.html).toContain("9:00 AM CT");
    expect(result.text).not.toContain("2:00 PM");
  });
});
