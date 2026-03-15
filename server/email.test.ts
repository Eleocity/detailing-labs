import { describe, it, expect } from "vitest";
import { passwordResetEmail, inviteEmail } from "./email";

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
});
