import { describe, expect, it, vi, beforeEach } from "vitest";
import { classifyRisk, requiredApprovalRole } from "./formaops/policy";
import { requestChangePermissionFor } from "./formaops/permissions";
import {
  changeRequests as changeRequestsTable,
  packages as packagesTable,
  siteContent as siteContentTable,
} from "../drizzle/schema";

// ── Pure policy tests (no db) ───────────────────────────────────────────────

describe("policy.classifyRisk", () => {
  it("classifies every current category as YELLOW", () => {
    const categories = [
      "pricing",
      "hours",
      "services",
      "promotions",
      "content",
      "business_profile",
      "other",
    ] as const;
    for (const c of categories) {
      expect(classifyRisk(c)).toBe("YELLOW");
    }
  });
});

describe("policy.requiredApprovalRole", () => {
  it("requires OWNER approval for YELLOW (the only level reachable today)", () => {
    expect(requiredApprovalRole("YELLOW")).toBe("OWNER");
  });
});

describe("permissions.requestChangePermissionFor", () => {
  it("maps each category to its own <category>.request_change permission", () => {
    expect(requestChangePermissionFor("pricing")).toBe("pricing.request_change");
    expect(requestChangePermissionFor("hours")).toBe("hours.request_change");
    expect(requestChangePermissionFor("services")).toBe("services.request_change");
    expect(requestChangePermissionFor("promotions")).toBe("promotions.request_change");
    expect(requestChangePermissionFor("content")).toBe("content.request_change");
    expect(requestChangePermissionFor("business_profile")).toBe(
      "business_profile.request_change"
    );
  });

  it("maps the catch-all 'other' category to website.request_change", () => {
    expect(requestChangePermissionFor("other")).toBe("website.request_change");
  });
});

// ── changeRequests.ts authorization control flow ────────────────────────────
// permissions.ts / policy.ts are mocked here so these tests exercise
// changeRequests.ts's own guard sequence (permission check, self-approval
// block, status check, role check) in isolation — real DB-backed
// integration coverage requires DATABASE_URL, which this sandbox doesn't
// have (matches the existing pattern in server/detailing.test.ts).

vi.mock("./formaops/permissions", async () => {
  const actual = await vi.importActual<typeof import("./formaops/permissions")>(
    "./formaops/permissions"
  );
  return {
    ...actual,
    hasPermission: vi.fn(),
    getMembershipRole: vi.fn(),
  };
});

const CHANGE_REQUEST_ROW = {
  id: 1,
  businessId: 1,
  submittedByUserId: 10,
  source: "admin_dashboard",
  category: "pricing",
  riskLevel: "YELLOW",
  status: "AWAITING_APPROVAL",
  originalRequest: "Change ceramic coating from $999 to $1,199",
  proposedChange: { from: 999, to: 1199 },
  requiredApprovalRole: "OWNER",
  reasoningSummary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMockDb(row: Record<string, unknown> = CHANGE_REQUEST_ROW) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [row],
        }),
      }),
    }),
    insert: () => ({
      values: async () => [{ insertId: 1 }],
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
  };
}

describe("changeRequests.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when the submitter lacks the request_change permission", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(false);
    const { create } = await import("./formaops/changeRequests");

    await expect(
      create(makeMockDb(), {
        businessId: 1,
        submittedByUserId: 10,
        actorType: "HUMAN",
        source: "admin_dashboard",
        category: "pricing",
        originalRequest: "Change ceramic coating price",
        proposedChange: { packageName: "The Signature Detail", newPrice: 1199 },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("succeeds and returns the created row when the submitter has permission", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    const { create } = await import("./formaops/changeRequests");

    const result = await create(makeMockDb(), {
      businessId: 1,
      submittedByUserId: 10,
      actorType: "HUMAN",
      source: "admin_dashboard",
      category: "pricing",
      originalRequest: "Change ceramic coating price",
      proposedChange: { packageName: "The Signature Detail", newPrice: 1199 },
    });

    expect(result.status).toBe("AWAITING_APPROVAL");
  });
});

describe("changeRequests.approve", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks self-approval before checking any permission", async () => {
    const permissions = await import("./formaops/permissions");
    const { approve } = await import("./formaops/changeRequests");

    await expect(
      approve(makeMockDb(), {
        changeRequestId: 1,
        actingUserId: CHANGE_REQUEST_ROW.submittedByUserId, // same as submitter
        actorType: "HUMAN",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Never even reached the permission check — proves the self-approval
    // guard runs first, not as a fallback after a failed permission check.
    expect(permissions.hasPermission).not.toHaveBeenCalled();
  });

  it("rejects approval of a request that isn't AWAITING_APPROVAL", async () => {
    const { approve } = await import("./formaops/changeRequests");
    const decidedRow = { ...CHANGE_REQUEST_ROW, status: "APPROVED" };

    await expect(
      approve(makeMockDb(decidedRow), {
        changeRequestId: 1,
        actingUserId: 999, // a different user, so this isn't the self-approval case
        actorType: "HUMAN",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("denies approval from a user without approvals.act or the wrong role", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(false);
    (permissions.getMembershipRole as any).mockResolvedValue("OPERATIONS_MANAGER");
    const { approve } = await import("./formaops/changeRequests");

    await expect(
      approve(makeMockDb(), {
        changeRequestId: 1,
        actingUserId: 999,
        actorType: "HUMAN",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("approves when the acting user holds approvals.act and matches the required role", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const result = await approve(makeMockDb(), {
      changeRequestId: 1,
      actingUserId: 999,
      actorType: "HUMAN",
    });

    // The mock db's select always returns CHANGE_REQUEST_ROW verbatim (it
    // doesn't simulate the UPDATE mutating what a later SELECT returns) —
    // this test's job is confirming approve() reaches the end without
    // throwing once every guard passes, not re-deriving persistence.
    expect(result.id).toBe(CHANGE_REQUEST_ROW.id);
    expect(permissions.hasPermission).toHaveBeenCalledWith(
      expect.anything(),
      CHANGE_REQUEST_ROW.businessId,
      999,
      "approvals.act"
    );
  });
});

describe("changeRequests.reject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("also blocks self-rejection", async () => {
    const { reject } = await import("./formaops/changeRequests");

    await expect(
      reject(makeMockDb(), {
        changeRequestId: 1,
        actingUserId: CHANGE_REQUEST_ROW.submittedByUserId,
        actorType: "HUMAN",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── Phase 2: pricing validation + execution ─────────────────────────────────

describe("changeRequests.create — pricing validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a pricing category with a malformed proposedChange", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    const { create } = await import("./formaops/changeRequests");

    await expect(
      create(makeMockDb(), {
        businessId: 1,
        submittedByUserId: 10,
        actorType: "HUMAN",
        source: "admin_dashboard",
        category: "pricing",
        originalRequest: "Change ceramic coating price",
        proposedChange: { newPrice: 1199 }, // missing packageName
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not loosely-validate a category with no registered executor", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    const { create } = await import("./formaops/changeRequests");

    // "promotions" has no executor/schema yet — any object is currently accepted.
    const result = await create(makeMockDb({ ...CHANGE_REQUEST_ROW, category: "promotions" }), {
      businessId: 1,
      submittedByUserId: 10,
      actorType: "HUMAN",
      source: "admin_dashboard",
      category: "promotions",
      originalRequest: "Add a spring discount banner to the homepage",
      proposedChange: { anything: "goes for now" },
    });
    expect(result.status).toBe("AWAITING_APPROVAL");
  });

  it("rejects an hours category with a malformed proposedChange", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    const { create } = await import("./formaops/changeRequests");

    await expect(
      create(makeMockDb(), {
        businessId: 1,
        submittedByUserId: 10,
        actorType: "HUMAN",
        source: "admin_dashboard",
        category: "hours",
        originalRequest: "Change our weekday hours",
        proposedChange: { field: "not_a_real_field", newValue: "9-5" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

/**
 * A mock db that distinguishes `.from(changeRequests)` / `.from(packages)` /
 * `.from(siteContent)` by table identity, and records every
 * `.update().set()` call and every `.insert(siteContent).values()` call —
 * needed to actually prove execution transitions status through
 * EXECUTING → COMPLETED/FAILED and applies the change, not just that
 * approve() doesn't throw.
 */
function makeExecutionMockDb(opts: {
  changeRequestRow: Record<string, unknown>;
  packageRow: Record<string, unknown> | null;
  siteContentRow?: Record<string, unknown> | null;
}) {
  const setCalls: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const insertedSiteContent: Array<Record<string, unknown>> = [];
  return {
    setCalls,
    insertedSiteContent,
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => {
            if (table === packagesTable) {
              return opts.packageRow ? [opts.packageRow] : [];
            }
            if (table === siteContentTable) {
              return opts.siteContentRow ? [opts.siteContentRow] : [];
            }
            return [opts.changeRequestRow];
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        if (table === siteContentTable) insertedSiteContent.push(values);
        return [{ insertId: 1 }];
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => {
        setCalls.push({ table, values });
        return { where: async () => undefined };
      },
    }),
  };
}

describe("changeRequests.approve — pricing execution", () => {
  beforeEach(() => vi.clearAllMocks());

  const approvedChangeRequestRow = {
    ...CHANGE_REQUEST_ROW,
    proposedChange: { packageName: "The Signature Detail", newPrice: 1199 },
  };

  it("executes the price change and completes when the package exists", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedChangeRequestRow,
      packageRow: { id: 2, name: "The Signature Detail", price: "449.99" },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "COMPLETED"]);

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(packageUpdate?.values.price).toBe("1199.00");
  });

  it("keeps priceSedan in sync with a tiered package's base price, leaving suv/large untouched when not specified", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: {
        ...CHANGE_REQUEST_ROW,
        proposedChange: { packageName: "Full Showroom Reset", newPrice: 259.99 },
      },
      packageRow: {
        id: 1,
        name: "Full Showroom Reset",
        price: "229.99",
        priceSedan: "229.99",
        priceSuv: "269.99",
        priceLarge: "359.99",
      },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(packageUpdate?.values).toEqual({
      price: "259.99",
      priceSedan: "259.99",
    });
  });

  it("updates all three tiers when newPriceSuv/newPriceLarge are specified", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: {
        ...CHANGE_REQUEST_ROW,
        proposedChange: {
          packageName: "Full Showroom Reset",
          newPrice: 259.99,
          newPriceSuv: 299.99,
          newPriceLarge: 389.99,
        },
      },
      packageRow: {
        id: 1,
        name: "Full Showroom Reset",
        price: "229.99",
        priceSedan: "229.99",
        priceSuv: "269.99",
        priceLarge: "359.99",
      },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(packageUpdate?.values).toEqual({
      price: "259.99",
      priceSedan: "259.99",
      priceSuv: "299.99",
      priceLarge: "389.99",
    });
  });

  it("never invents tiered pricing for a package that doesn't already have it, even if suv/large are supplied", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: {
        ...CHANGE_REQUEST_ROW,
        proposedChange: {
          packageName: "Ceramic Coating",
          newPrice: 699,
          newPriceSuv: 799,
          newPriceLarge: 899,
        },
      },
      packageRow: { id: 5, name: "Ceramic Coating", price: "650.00" }, // no priceSedan — flat only
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(packageUpdate?.values).toEqual({ price: "699.00" });
  });

  it("marks the request FAILED (without throwing) when the package doesn't exist", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedChangeRequestRow,
      packageRow: null, // no matching package
    });

    // approve() must resolve, not reject — the approval itself succeeded.
    await expect(
      approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" })
    ).resolves.toBeDefined();

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "FAILED"]);
  });

  it("does not attempt execution for a category with no registered executor", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: { ...CHANGE_REQUEST_ROW, category: "promotions" },
      packageRow: null,
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED"]); // no EXECUTING/COMPLETED — nothing to execute yet
  });
});

describe("changeRequests.approve — hours execution", () => {
  beforeEach(() => vi.clearAllMocks());

  const approvedHoursChangeRequestRow = {
    ...CHANGE_REQUEST_ROW,
    category: "hours",
    proposedChange: { field: "hours_weekday", newValue: "Mon–Fri: 8:00 AM – 6:00 PM" },
  };

  it("upserts the siteContent row and completes when no row exists yet", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedHoursChangeRequestRow,
      packageRow: null,
      siteContentRow: null, // no existing hours_weekday row
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "COMPLETED"]);
    expect(db.insertedSiteContent).toEqual([
      { section: "contact", key: "hours_weekday", value: "Mon–Fri: 8:00 AM – 6:00 PM" },
    ]);
  });

  it("updates the existing siteContent row when one is already there", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedHoursChangeRequestRow,
      packageRow: null,
      siteContentRow: { id: 7, section: "contact", key: "hours_weekday", value: "Mon–Fri: 9:00 AM – 5:00 PM" },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "COMPLETED"]);

    const siteContentUpdate = db.setCalls.find(c => c.table === siteContentTable);
    expect(siteContentUpdate?.values.value).toBe("Mon–Fri: 8:00 AM – 6:00 PM");
  });
});

describe("changeRequests.create — services validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a services category with a malformed proposedChange", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    const { create } = await import("./formaops/changeRequests");

    await expect(
      create(makeMockDb(), {
        businessId: 1,
        submittedByUserId: 10,
        actorType: "HUMAN",
        source: "admin_dashboard",
        category: "services",
        originalRequest: "Add ceramic top coat to the Signature Detail",
        proposedChange: { action: "sprinkle", item: "Ceramic top coat" }, // invalid action
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("changeRequests.approve — services execution", () => {
  beforeEach(() => vi.clearAllMocks());

  const approvedAddChangeRequestRow = {
    ...CHANGE_REQUEST_ROW,
    category: "services",
    proposedChange: {
      packageName: "The Signature Detail",
      action: "add",
      item: "Ceramic top coat",
    },
  };

  it("adds a new feature line and completes", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedAddChangeRequestRow,
      packageRow: {
        id: 2,
        name: "The Signature Detail",
        features: JSON.stringify(["Clay bar decontamination"]),
      },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "COMPLETED"]);

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(JSON.parse(packageUpdate!.values.features as string)).toEqual([
      "Clay bar decontamination",
      "Ceramic top coat",
    ]);
  });

  it("removes a feature line and completes", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: {
        ...CHANGE_REQUEST_ROW,
        category: "services",
        proposedChange: {
          packageName: "The Signature Detail",
          action: "remove",
          item: "Clay bar decontamination",
        },
      },
      packageRow: {
        id: 2,
        name: "The Signature Detail",
        features: JSON.stringify(["Clay bar decontamination", "Ceramic top coat"]),
      },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(JSON.parse(packageUpdate!.values.features as string)).toEqual([
      "Ceramic top coat",
    ]);
  });

  it("adding an item that's already present is a harmless no-op, not a failure", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedAddChangeRequestRow,
      packageRow: {
        id: 2,
        name: "The Signature Detail",
        features: JSON.stringify(["Ceramic top coat"]),
      },
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "COMPLETED"]);

    const packageUpdate = db.setCalls.find(c => c.table === packagesTable);
    expect(JSON.parse(packageUpdate!.values.features as string)).toEqual([
      "Ceramic top coat",
    ]);
  });

  it("marks FAILED when the package doesn't exist", async () => {
    const permissions = await import("./formaops/permissions");
    (permissions.hasPermission as any).mockResolvedValue(true);
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { approve } = await import("./formaops/changeRequests");

    const db = makeExecutionMockDb({
      changeRequestRow: approvedAddChangeRequestRow,
      packageRow: null,
    });

    await approve(db, { changeRequestId: 1, actingUserId: 999, actorType: "HUMAN" });

    const statusesSet = db.setCalls
      .filter(c => c.table === changeRequestsTable)
      .map(c => c.values.status);
    expect(statusesSet).toEqual(["APPROVED", "EXECUTING", "FAILED"]);
  });
});
