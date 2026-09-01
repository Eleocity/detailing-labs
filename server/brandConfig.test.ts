import { describe, expect, it } from "vitest";
import { BRAND, phoneDigits, absoluteUrl } from "../shared/brand";
import {
  PACKAGES,
  ADD_ONS,
  getActivePackages,
  getBookingEligiblePackages,
  getPackageByKey,
  resolvePackagePrice,
  dbVehiclePricingFromPackageRow,
} from "../shared/services";

describe("brand config", () => {
  it("has no leftover Detailing Labs branding in display fields", () => {
    expect(BRAND.displayName).toBe("Forma Auto Spa");
    expect(BRAND.shortName).not.toMatch(/detailing labs/i);
    expect(BRAND.seo.defaultTitle).not.toMatch(/detailing labs/i);
    expect(BRAND.seo.defaultDescription).not.toMatch(/detailing labs/i);
  });

  it("phoneDigits strips formatting", () => {
    expect(phoneDigits(BRAND.phone)).toBe("2622609474");
  });

  it("absoluteUrl joins a site URL and path without double slashes", () => {
    expect(absoluteUrl("https://example.com/", "/pricing")).toBe(
      "https://example.com/pricing"
    );
    expect(absoluteUrl("https://example.com", "pricing")).toBe(
      "https://example.com/pricing"
    );
  });

  it("uses the primary domain for canonical/OG purposes now that DNS cutover is complete", () => {
    expect(BRAND.domain.live).toBe(BRAND.domain.primary);
    expect(BRAND.domain.live).not.toBe(BRAND.domain.legacy);
  });
});

describe("service catalog", () => {
  it("has no duplicate internal keys", () => {
    const keys = PACKAGES.map(p => p.internalKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("quote-only services (ceramic, paint correction) are not booking-eligible with instant pricing", () => {
    const ceramic = getPackageByKey("ceramic-coating")!;
    const paintCorrection = getPackageByKey("paint-correction")!;
    expect(ceramic.requiresQuote).toBe(true);
    expect(ceramic.bookingEligible).toBe(false);
    expect(ceramic.pricingByVehicle).toBeNull();
    expect(paintCorrection.requiresQuote).toBe(true);
  });

  it("booking-eligible packages all have vehicle-tier pricing", () => {
    for (const pkg of getBookingEligiblePackages()) {
      expect(pkg.pricingByVehicle).not.toBeNull();
    }
  });

  it("getActivePackages excludes inactive packages", () => {
    expect(getActivePackages().every(p => p.isActive)).toBe(true);
  });

  it("no add-on carries the old brand name in its copy", () => {
    for (const addOn of ADD_ONS) {
      expect(addOn.name).not.toMatch(/detailing labs/i);
      expect(addOn.description).not.toMatch(/detailing labs/i);
    }
  });
});

describe("resolvePackagePrice", () => {
  it("uses the vehicle-size tier price for a known package when a size is given", () => {
    const price = resolvePackagePrice("Full Showroom Reset", 999, "large");
    const central = getPackageByKey("full-showroom-reset")!;
    expect(price).toBe(central.pricingByVehicle!.large);
    expect(price).not.toBe(999);
  });

  it("falls back to the flat price when no vehicle size is known yet", () => {
    expect(resolvePackagePrice("Full Showroom Reset", 199.99, "")).toBe(199.99);
  });

  it("falls back to the flat price for a package not in the static catalog (e.g. an admin-added custom package)", () => {
    expect(
      resolvePackagePrice("Spring Detailing Special", 149.99, "sedan")
    ).toBe(149.99);
  });

  it("falls back to the flat price for a quote-only package with no tier pricing", () => {
    expect(resolvePackagePrice("Ceramic Coating", 0, "sedan")).toBe(0);
  });

  it("charges different amounts for different vehicle sizes on the same package", () => {
    const sedan = resolvePackagePrice("The Signature Detail", 0, "sedan");
    const large = resolvePackagePrice("The Signature Detail", 0, "large");
    expect(large).toBeGreaterThan(sedan);
  });

  it("prefers a FormaOps-approved DB tier price over the static catalog value", () => {
    const dbTiers = dbVehiclePricingFromPackageRow({
      priceSedan: "259.99",
      priceSuv: null,
      priceLarge: null,
    });
    // sedan: DB has an approved override -> wins over the catalog's 229.99
    expect(
      resolvePackagePrice("Full Showroom Reset", 229.99, "sedan", dbTiers)
    ).toBe(259.99);
    // suv/large: DB has no override yet -> falls back to the catalog tier
    const central = getPackageByKey("full-showroom-reset")!;
    expect(
      resolvePackagePrice("Full Showroom Reset", 229.99, "suv", dbTiers)
    ).toBe(central.pricingByVehicle!.suv);
  });

  it("dbVehiclePricingFromPackageRow treats null/undefined tier columns as absent", () => {
    expect(
      dbVehiclePricingFromPackageRow({
        priceSedan: "259.99",
        priceSuv: undefined,
        priceLarge: null,
      })
    ).toEqual({ sedan: 259.99, suv: null, large: null });
  });
});
