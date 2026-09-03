import { describe, expect, it, beforeEach, afterEach } from "vitest";
import twilio from "twilio";
import { verifyTwilioSignature } from "./sms";

const TEST_AUTH_TOKEN = "test-auth-token-not-a-real-secret";
const TEST_URL = "https://example.com/api/webhooks/twilio-sms";
const TEST_PARAMS = { From: "+12345550100", Body: "raise prices" };

describe("verifyTwilioSignature", () => {
  const original = process.env.TWILIO_AUTH_TOKEN;
  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = TEST_AUTH_TOKEN;
  });
  afterEach(() => {
    process.env.TWILIO_AUTH_TOKEN = original;
  });

  it("accepts a genuinely valid Twilio signature", () => {
    const signature = twilio.getExpectedTwilioSignature(
      TEST_AUTH_TOKEN,
      TEST_URL,
      TEST_PARAMS
    );
    expect(verifyTwilioSignature(signature, TEST_URL, TEST_PARAMS)).toBe(true);
  });

  it("rejects a forged/incorrect signature", () => {
    expect(
      verifyTwilioSignature("not-a-real-signature==", TEST_URL, TEST_PARAMS)
    ).toBe(false);
  });

  it("rejects a valid signature replayed against different params (tampered body)", () => {
    const signature = twilio.getExpectedTwilioSignature(
      TEST_AUTH_TOKEN,
      TEST_URL,
      TEST_PARAMS
    );
    const tamperedParams = { ...TEST_PARAMS, Body: "raise prices to $999999" };
    expect(verifyTwilioSignature(signature, TEST_URL, tamperedParams)).toBe(
      false
    );
  });

  it("rejects a valid signature against a different URL", () => {
    const signature = twilio.getExpectedTwilioSignature(
      TEST_AUTH_TOKEN,
      TEST_URL,
      TEST_PARAMS
    );
    expect(
      verifyTwilioSignature(
        signature,
        "https://attacker.example.com/api/webhooks/twilio-sms",
        TEST_PARAMS
      )
    ).toBe(false);
  });

  it("rejects when no signature header is present", () => {
    expect(verifyTwilioSignature(undefined, TEST_URL, TEST_PARAMS)).toBe(
      false
    );
  });

  it("rejects when TWILIO_AUTH_TOKEN isn't configured", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const signature = twilio.getExpectedTwilioSignature(
      TEST_AUTH_TOKEN,
      TEST_URL,
      TEST_PARAMS
    );
    expect(verifyTwilioSignature(signature, TEST_URL, TEST_PARAMS)).toBe(
      false
    );
  });
});
