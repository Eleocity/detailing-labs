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

  it("createBooking falls back to failed_sync (not confirmed) when URABLE_API_KEY isn't set", async () => {
    const result = await provider.createBooking(sampleInput);
    expect(result.status).not.toBe("confirmed");
    expect(result.status).toBe("failed_sync");
  });

  it("createBooking reports confirmed with an externalJobId when Urable sync + job creation succeed", async () => {
    process.env.URABLE_API_KEY = "test-key";
    const originalFetch = global.fetch;
    global.fetch = (async (url: string, opts: any) => {
      const method = opts?.method ?? "GET";
      const body = opts?.body ? JSON.parse(opts.body) : undefined;
      const json = (data: unknown) =>
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      if (url.includes("/v1/customers?email=")) {
        return json({ success: true, data: [] }); // no existing customer
      }
      if (method === "POST" && url.endsWith("/v1/customers")) {
        expect(body.firstName).toBe("Test");
        return json({ success: true, data: { id: "cust_123" } });
      }
      if (method === "POST" && url.endsWith("/v1/items")) {
        expect(body.customerId).toBe("cust_123");
        return json({ success: true, data: { id: "veh_456" } });
      }
      if (method === "PATCH" && url.includes("/v1/customers/")) {
        return json({ success: true, data: { id: "cust_123" } }); // booking note append
      }
      if (
        method === "GET" &&
        url.includes("/v1/products") &&
        !body
      ) {
        return json({ success: true, data: [] }); // no existing catalog entry
      }
      if (method === "POST" && url.endsWith("/v1/products")) {
        expect(body.name).toBe("Premium Detail");
        expect(body.prices[0].value).toBe(19900);
        return json({ success: true, data: { id: "prod_789" } });
      }
      if (method === "POST" && url.endsWith("/v1/jobs")) {
        expect(body.customerId).toBe("cust_123");
        expect(body.itemIds).toEqual(["veh_456"]);
        expect(body.lineItems).toEqual([
          { productServiceId: "prod_789", quantity: 1 },
        ]);
        expect(body.type).toBe("field");
        expect(body.status).toBe("scheduled");
        return json({ success: true, data: { id: "job_999", num: 42 } });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as any;

    try {
      const result = await provider.createBooking({
        ...sampleInput,
        packageName: "Premium Detail",
        totalAmount: 199,
      });
      expect(result.status).toBe("confirmed");
      expect(result.externalJobId).toBe("job_999");
      expect(result.externalCustomerId).toBe("cust_123");
      expect(result.externalVehicleId).toBe("veh_456");
    } finally {
      global.fetch = originalFetch;
    }
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
