import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveProviderName, NotSupportedError } from "./booking";
import { RequestOnlyBookingProvider } from "./booking/providers/requestOnlyProvider";
import { UrableApiBookingProvider } from "./booking/providers/urableApiProvider";
import { UrableVirtualShopBookingProvider } from "./booking/providers/urableVirtualShopProvider";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.URABLE_API_KEY;
  delete process.env.URABLE_VIRTUAL_SHOP_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("resolveProviderName", () => {
  it("defaults to request-only when BOOKING_PROVIDER is unset", () => {
    delete process.env.BOOKING_PROVIDER;
    expect(resolveProviderName()).toBe("request-only");
  });

  it("defaults to request-only on an unrecognized value rather than throwing", () => {
    process.env.BOOKING_PROVIDER = "totally-not-a-real-provider";
    expect(resolveProviderName()).toBe("request-only");
  });

  it("accepts each documented value", () => {
    for (const name of ["urable-api", "urable-virtual-shop", "request-only"]) {
      process.env.BOOKING_PROVIDER = name;
      expect(resolveProviderName()).toBe(name);
    }
  });
});

const sampleInput = {
  bookingNumber: "FA-TEST123",
  customer: {
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
    phone: "2625550100",
  },
  vehicle: { year: 2022, make: "Honda", model: "Civic" },
  appointmentDate: new Date().toISOString(),
  durationMinutes: 120,
  serviceAddress: "123 Main St",
};

describe("RequestOnlyBookingProvider", () => {
  const provider = new RequestOnlyBookingProvider();

  it("getAvailability degrades gracefully instead of throwing", async () => {
    const result = await provider.getAvailability({
      date: "2026-09-01",
      durationMinutes: 120,
    });
    expect(result.supported).toBe(false);
  });

  it("createBooking never reports a confirmed status without Urable actually confirming", async () => {
    const result = await provider.createBooking(sampleInput);
    expect(result.status).not.toBe("confirmed");
    expect(["requested", "requires_review"]).toContain(result.status);
  });

  it("cancelBooking succeeds locally without requiring an external job", async () => {
    const result = await provider.cancelBooking(
      "no-external-id",
      "customer request"
    );
    expect(result.status).toBe("cancelled");
  });
});

describe("UrableApiBookingProvider", () => {
  const provider = new UrableApiBookingProvider();

  it("throws NotSupportedError for getAvailability (no proven Urable endpoint)", async () => {
    await expect(
      provider.getAvailability({ date: "2026-09-01", durationMinutes: 120 })
    ).rejects.toThrow(NotSupportedError);
  });

  it("throws NotSupportedError for updateBooking and cancelBooking", async () => {
    await expect(provider.updateBooking("ext-id", {})).rejects.toThrow(
      NotSupportedError
    );
    await expect(provider.cancelBooking("ext-id")).rejects.toThrow(
      NotSupportedError
    );
  });

  it("createBooking never claims confirmed status (no Jobs API to reserve capacity)", async () => {
    const result = await provider.createBooking(sampleInput);
    expect(result.status).not.toBe("confirmed");
  });
});

describe("UrableVirtualShopBookingProvider", () => {
  const provider = new UrableVirtualShopBookingProvider();

  it("throws NotSupportedError for getAvailability, updateBooking, and cancelBooking", async () => {
    await expect(
      provider.getAvailability({ date: "2026-09-01", durationMinutes: 120 })
    ).rejects.toThrow(NotSupportedError);
    await expect(provider.updateBooking("ext-id", {})).rejects.toThrow(
      NotSupportedError
    );
    await expect(provider.cancelBooking("ext-id")).rejects.toThrow(
      NotSupportedError
    );
  });

  it("fails gracefully (not a thrown error) when URABLE_VIRTUAL_SHOP_URL isn't configured", async () => {
    const result = await provider.createBooking(sampleInput);
    expect(result.status).toBe("failed_sync");
  });

  it("builds a handoff URL with the booking reference but no PII when configured", async () => {
    process.env.URABLE_VIRTUAL_SHOP_URL = "https://shop.urable.com/forma";
    const result = await provider.createBooking({
      ...sampleInput,
      attribution: { utm_source: "google", utm_medium: "cpc" },
    });
    expect(result.status).toBe("awaiting_scheduling");
    expect(result.handoffUrl).toContain("ref=FA-TEST123");
    expect(result.handoffUrl).toContain("utm_source=google");
    expect(result.handoffUrl).not.toContain("test%40example.com");
    expect(result.handoffUrl).not.toContain("2625550100");
  });
});
