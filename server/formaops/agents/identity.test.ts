import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../permissions", async () => {
  const actual = await vi.importActual<typeof import("../permissions")>(
    "../permissions"
  );
  return { ...actual, getMembershipRole: vi.fn() };
});

function makeMockDb(userRows: { id: number; phone: string | null }[]) {
  return {
    select: () => ({
      from: async () => userRows,
    }),
  };
}

describe("resolvePhoneToBusinessUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves a match regardless of formatting differences (parens/dashes vs E.164)", async () => {
    const permissions = await import("../permissions");
    (permissions.getMembershipRole as any).mockResolvedValue("OWNER");
    const { resolvePhoneToBusinessUser } = await import("./identity");

    const db = makeMockDb([{ id: 1, phone: "(262) 260-9474" }]);
    const result = await resolvePhoneToBusinessUser(db, 1, "+12622609474");

    expect(result).toEqual({ ok: true, identity: { userId: 1, businessId: 1 } });
  });

  it("fails when no user has a matching phone number", async () => {
    const { resolvePhoneToBusinessUser } = await import("./identity");
    const db = makeMockDb([{ id: 1, phone: "2622609474" }]);

    const result = await resolvePhoneToBusinessUser(db, 1, "+19998887777");

    expect(result).toEqual({ ok: false, reason: "phone number not recognized" });
  });

  it("refuses to guess when a phone number matches more than one account", async () => {
    const { resolvePhoneToBusinessUser } = await import("./identity");
    const db = makeMockDb([
      { id: 1, phone: "2622609474" },
      { id: 2, phone: "+12622609474" }, // same number, different formatting
    ]);

    const result = await resolvePhoneToBusinessUser(db, 1, "2622609474");

    expect(result).toEqual({
      ok: false,
      reason: "phone number matches more than one account",
    });
  });

  it("fails when the matched user has no membership on this business", async () => {
    const permissions = await import("../permissions");
    (permissions.getMembershipRole as any).mockResolvedValue(null);
    const { resolvePhoneToBusinessUser } = await import("./identity");

    const db = makeMockDb([{ id: 1, phone: "2622609474" }]);
    const result = await resolvePhoneToBusinessUser(db, 1, "2622609474");

    expect(result).toEqual({ ok: false, reason: "not a member of this business" });
  });

  it("rejects an input that isn't a recognizable phone number without querying the db", async () => {
    const { resolvePhoneToBusinessUser } = await import("./identity");
    const db = makeMockDb([]);

    const result = await resolvePhoneToBusinessUser(db, 1, "12345");

    expect(result).toEqual({
      ok: false,
      reason: "not a recognizable phone number",
    });
  });

  it("ignores users with no phone on file", async () => {
    const { resolvePhoneToBusinessUser } = await import("./identity");
    const db = makeMockDb([{ id: 1, phone: null }]);

    const result = await resolvePhoneToBusinessUser(db, 1, "2622609474");

    expect(result).toEqual({ ok: false, reason: "phone number not recognized" });
  });
});
