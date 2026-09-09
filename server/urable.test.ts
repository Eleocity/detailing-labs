import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createUrableVehicle } from "./urable";

/**
 * Regression coverage for a real production bug (booking FA-MTQSJOEK-J4N):
 * Urable's ItemInput.vins/licensePlates are plain string arrays, not the
 * {label, value} shape Customer's phoneNumbers/emails/locations use. Sending
 * the labeled-value shape here 400s ("licensePlates must be a string"),
 * which silently skipped vehicle + Job creation for any booking with a
 * plate. See docs/URABLE_INTEGRATION.md and the OpenAPI ItemInput schema.
 */
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  process.env.URABLE_API_KEY = "test-key";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
});

describe("createUrableVehicle", () => {
  it("sends vins and licensePlates as plain string arrays, not {label, value} objects", async () => {
    let capturedBody: any;
    global.fetch = (async (_url: string, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(
        JSON.stringify({ success: true, data: { id: "veh_1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    const id = await createUrableVehicle({
      urableCustomerId: "cust_1",
      year: 2022,
      make: "Honda",
      model: "Civic",
      vin: "1HGCM82633A123456",
      plate: "TEST123",
    });

    expect(id).toBe("veh_1");
    expect(capturedBody.vins).toEqual(["1HGCM82633A123456"]);
    expect(capturedBody.licensePlates).toEqual(["TEST123"]);
  });

  it("omits vins/licensePlates entirely when not provided", async () => {
    let capturedBody: any;
    global.fetch = (async (_url: string, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(
        JSON.stringify({ success: true, data: { id: "veh_2" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    await createUrableVehicle({
      urableCustomerId: "cust_1",
      year: 2022,
      make: "Honda",
      model: "Civic",
    });

    expect(capturedBody.vins).toBeUndefined();
    expect(capturedBody.licensePlates).toBeUndefined();
  });

  it("returns null (not a throw) when Urable rejects the request", async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: "licensePlates must be a string",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )) as any;

    const id = await createUrableVehicle({
      urableCustomerId: "cust_1",
      year: 2022,
      make: "Honda",
      model: "Civic",
      plate: "TEST123",
    });
    expect(id).toBeNull();
  });
});
