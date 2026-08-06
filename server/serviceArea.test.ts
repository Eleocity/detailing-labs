import { describe, expect, it } from "vitest";
import { classifyZip, type ServiceAreaRecord } from "../shared/serviceArea";

const AREAS: ServiceAreaRecord[] = [
  {
    name: "Included",
    zipCodes: ["53177", "53403"],
    travelFee: 0,
    isActive: true,
  },
  { name: "Travel Fee", zipCodes: ["53108"], travelFee: 25, isActive: true },
  { name: "Inactive", zipCodes: ["53999"], travelFee: 0, isActive: false },
];

describe("classifyZip", () => {
  it("classifies an exact no-fee match as included", () => {
    const result = classifyZip("53177", AREAS);
    expect(result.classification).toBe("included");
    expect(result.travelFee).toBe(0);
  });

  it("classifies an exact fee match as travel_fee with the configured amount", () => {
    const result = classifyZip("53108", AREAS);
    expect(result.classification).toBe("travel_fee");
    expect(result.travelFee).toBe(25);
  });

  it("ignores inactive service areas", () => {
    const result = classifyZip("53999", AREAS);
    expect(result.classification).not.toBe("included");
  });

  it("flags a numerically nearby unmatched zip for manual review, not rejection", () => {
    const result = classifyZip("53180", AREAS); // near 53177
    expect(result.classification).toBe("manual_review");
  });

  it("rejects a zip far outside any configured area", () => {
    const result = classifyZip("90210", AREAS);
    expect(result.classification).toBe("outside_area");
  });

  it("treats a malformed zip as manual_review rather than a hard rejection", () => {
    const result = classifyZip("abc", AREAS);
    expect(result.classification).toBe("manual_review");
  });

  it("flags for manual review (not a hard rejection) when no service areas are configured yet", () => {
    const result = classifyZip("53177", []);
    expect(result.classification).toBe("manual_review");
  });
});
