/**
 * Centralized service/package/add-on catalog for Forma Auto Spa.
 *
 * This is the single source of truth for package names, pricing, and
 * descriptions used across the marketing site (Home, Services, Pricing) and
 * the booking wizard. Previously this data was duplicated with slight drift
 * between pages — this file replaces those separate copies.
 *
 * The database (`packages` / `addOns` tables, editable via Admin → Site
 * Editor) is the operational source of truth when populated — these are the
 * FALLBACK values shown before the database has rows, and they also define
 * the richer metadata (recommendedFor, included items, vehicle-tier pricing,
 * booking eligibility) that the current `packages` table schema doesn't yet
 * carry as structured columns (it stores `features` as a JSON string and a
 * single flat `price`).
 *
 * Urable product/service identifiers are intentionally NOT included here —
 * this file is imported by client code and must never carry Urable IDs.
 * Server-side Urable product mapping lives in server/urableProductMap.ts.
 */

export type VehicleSize = "sedan" | "suv" | "large";

export const VEHICLE_SIZE_LABELS: Record<VehicleSize, string> = {
  sedan: "Sedan / Coupe",
  suv: "Small SUV / Truck",
  large: "Large SUV / Minivan",
};

export interface ServicePackage {
  /** Stable internal key — used for booking-wizard eligibility lookups and
   *  (server-side only) Urable product mapping. Not a display value. */
  internalKey: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  /** Vehicle-size pricing. Absent for quote-only services (ceramic, paint correction). */
  pricingByVehicle: Record<VehicleSize, number> | null;
  /** Flat "from" price shown when vehicle size isn't yet known. */
  fromPrice: number;
  durationMinutes: number;
  included: string[];
  recommendedFor: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Can a customer select this directly in the booking wizard's Package step? */
  bookingEligible: boolean;
  /** True when this service requires a quote/inspection rather than instant pricing. */
  requiresQuote: boolean;
}

export const PACKAGES: ServicePackage[] = [
  {
    internalKey: "exterior-decon-shield",
    name: "Exterior Decon & Shield",
    shortDescription:
      "Total decontamination and 3-month hydrophobic protection.",
    fullDescription:
      "A full exterior reset: hand wash, wheel and tire deep clean, iron and bug/tar removal, finished with a hydrophobic spray wax that beads water for months.",
    pricingByVehicle: { sedan: 129.99, suv: 149.99, large: 199.99 },
    fromPrice: 129.99,
    durationMinutes: 120,
    included: [
      "Signature hand wash",
      "Wheel & tire deep clean",
      "Iron remover treatment",
      "Bug & tar removal",
      "Hydrophobic spray wax (3-month protection)",
    ],
    recommendedFor:
      "Seasonal refresh, pre-event prep, or maintaining a clean car between full details.",
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    bookingEligible: true,
    requiresQuote: false,
  },
  {
    internalKey: "interior-deep-refresh",
    name: "Interior Deep Refresh",
    shortDescription: "Complete cabin sanitization and restoration.",
    fullDescription:
      "Every interior surface addressed: compressed-air blowout, full vacuum, dash and door detailing, UV protectant, and streak-free glass — the cabin reset before a long-term detail or resale.",
    pricingByVehicle: { sedan: 129.99, suv: 149.99, large: 199.99 },
    fromPrice: 129.99,
    durationMinutes: 120,
    included: [
      "Compressed air blowout",
      "Deep vacuum (all surfaces)",
      "Dash / console / door scrub",
      "UV protectant treatment",
      "Streak-free interior glass",
      "Floor mat restoration",
    ],
    recommendedFor:
      "Used car buyers, pet owners, or anyone whose cabin needs a proper reset.",
    isPopular: false,
    isActive: true,
    sortOrder: 2,
    bookingEligible: true,
    requiresQuote: false,
  },
  {
    internalKey: "full-showroom-reset",
    name: "Full Showroom Reset",
    shortDescription:
      "Total vehicle transformation, inside and out — our most popular package.",
    fullDescription:
      "Everything in Exterior Decon & Shield and Interior Deep Refresh, combined at a lower total cost than booking separately. The default choice for a like-new experience in one visit.",
    pricingByVehicle: { sedan: 229.99, suv: 269.99, large: 359.99 },
    fromPrice: 229.99,
    durationMinutes: 240,
    included: [
      "Everything in Exterior Decon & Shield",
      "Everything in Interior Deep Refresh",
      "Best value — save vs. booking separately",
      "Like-new vehicle experience inside and out",
    ],
    recommendedFor:
      "First-time clients, pre-sale prep, or when you want the full treatment in one visit.",
    isPopular: true,
    isActive: true,
    sortOrder: 3,
    bookingEligible: true,
    requiresQuote: false,
  },
  {
    internalKey: "signature-detail",
    name: "The Signature Detail",
    shortDescription:
      "Our most intensive single-day service — paint-corrected, decontaminated, and coated.",
    fullDescription:
      "Everything in Full Showroom Reset, plus iron and fallout decontamination, clay bar treatment, a single-stage paint correction pass, and a ceramic spray sealant for a finish that outlasts a standard detail.",
    pricingByVehicle: { sedan: 449.99, suv: 529.99, large: 649.99 },
    fromPrice: 449.99,
    durationMinutes: 480,
    included: [
      "Everything in Full Showroom Reset",
      "Iron & fallout decontamination",
      "Clay bar paint decontamination",
      "1-stage paint correction (swirl & scratch reduction)",
      "Ceramic spray sealant (6-month protection)",
      "Before & after photo documentation",
    ],
    recommendedFor:
      "High-end vehicles, neglected paint, or when only the highest possible result will do.",
    isPopular: false,
    isActive: true,
    sortOrder: 4,
    bookingEligible: true,
    requiresQuote: false,
  },
  {
    internalKey: "ceramic-coating",
    name: "Ceramic Coating",
    shortDescription:
      "Multi-year hydrophobic paint protection, custom-quoted to your vehicle's condition.",
    fullDescription:
      "Full paint decontamination and correction, followed by a professional-grade ceramic coating application. Pricing depends on vehicle size and the correction needed before coating, so every job starts with an assessment.",
    pricingByVehicle: null,
    fromPrice: 0,
    durationMinutes: 480,
    included: [
      "Full paint decontamination & wash",
      "Paint correction (1 or 2 stage based on condition)",
      "Professional-grade ceramic coating application",
      "Multi-year protection warranty",
      "Hydrophobic finish",
      "Before & after photo documentation",
      "Aftercare kit & maintenance guide",
    ],
    recommendedFor:
      "Owners who want long-term protection and are keeping the vehicle for years.",
    isPopular: false,
    isActive: true,
    sortOrder: 5,
    bookingEligible: false,
    requiresQuote: true,
  },
  {
    internalKey: "paint-correction",
    name: "Paint Correction",
    shortDescription:
      "Swirl marks, light scratches, and oxidation removed — quoted after we see your paint.",
    fullDescription:
      "Machine polishing to remove swirl marks, buffer trails, light scratches, water-spot etching, and oxidation, corrected to the finish level your clear coat can support. Also the required prep step before any ceramic coating.",
    pricingByVehicle: null,
    fromPrice: 0,
    durationMinutes: 240,
    included: [
      "Paint inspection & consultation",
      "Machine compounding / polishing",
      "Swirl and light scratch correction",
      "Oxidation and haze removal",
      "Finish inspection under detail lighting",
    ],
    recommendedFor:
      "Vehicles with visible swirl marks, dull paint, or as prep before ceramic coating.",
    isPopular: false,
    isActive: true,
    sortOrder: 6,
    bookingEligible: false,
    requiresQuote: true,
  },
];

export interface ServiceAddOn {
  internalKey: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  /** Vehicle-condition answers that should suggest this add-on during booking. */
  suggestFor?: Array<"petHair" | "excessiveSoil" | "odor" | "stains">;
}

export const ADD_ONS: ServiceAddOn[] = [
  {
    internalKey: "pet-hair-removal",
    name: "Pet Hair Removal",
    description: "Starting at $49",
    price: 49.99,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 1,
    suggestFor: ["petHair"],
  },
  {
    internalKey: "odor-elimination",
    name: "Odor Elimination Treatment",
    description: "Interior deodorizer treatment",
    price: 49.99,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 2,
    suggestFor: ["odor"],
  },
  {
    internalKey: "engine-bay-detail",
    name: "Engine Bay Detail",
    description: "Degreased & detailed engine bay",
    price: 49.99,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 3,
  },
  {
    internalKey: "headlight-restoration",
    name: "Headlight Restoration",
    description: "Restore clarity & UV protection",
    price: 99.99,
    durationMinutes: 45,
    isActive: true,
    sortOrder: 4,
  },
  {
    internalKey: "seat-extraction-front",
    name: "Seat Extraction — Front Only",
    description: "$50–$75 depending on condition",
    price: 49.99,
    durationMinutes: 45,
    isActive: true,
    sortOrder: 5,
    suggestFor: ["stains"],
  },
  {
    internalKey: "seat-extraction-full",
    name: "Seat Extraction — Full Vehicle",
    description: "$100–$150 all rows",
    price: 99.99,
    durationMinutes: 90,
    isActive: true,
    sortOrder: 6,
    suggestFor: ["stains"],
  },
  {
    internalKey: "seat-extraction-spot",
    name: "Seat Extraction — Per Seat (Spot)",
    description: "$25 per seat spot treatment",
    price: 24.99,
    durationMinutes: 20,
    isActive: true,
    sortOrder: 7,
    suggestFor: ["stains"],
  },
];

export function getActivePackages(): ServicePackage[] {
  return PACKAGES.filter(p => p.isActive).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function getBookingEligiblePackages(): ServicePackage[] {
  return getActivePackages().filter(p => p.bookingEligible);
}

export function getActiveAddOns(): ServiceAddOn[] {
  return ADD_ONS.filter(a => a.isActive).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function getPackageByKey(
  internalKey: string
): ServicePackage | undefined {
  return PACKAGES.find(p => p.internalKey === internalKey);
}

/**
 * Resolves the price to charge for a package + vehicle size. Prefers the
 * centralized tier pricing here (the same numbers shown on the marketing
 * pages) when the package name matches a known catalog entry; falls back to
 * a flat price (e.g. the database row's single `price` column) for packages
 * added through the admin that aren't in this static catalog, so a custom
 * package never fails to price at all.
 *
 * Matches by package *name*, not internalKey, because the operational
 * source of truth for packages is the `packages` DB table (editable via
 * Admin → Site Editor), which only has a name — not this file's stable
 * keys. If an admin renames a package to something not in PACKAGES, pricing
 * gracefully falls back to the flat price rather than erroring.
 */
export function resolvePackagePrice(
  packageName: string,
  fallbackFlatPrice: number,
  vehicleSize: VehicleSize | ""
): number {
  const central = PACKAGES.find(p => p.name === packageName);
  if (central?.pricingByVehicle && vehicleSize) {
    return central.pricingByVehicle[vehicleSize];
  }
  return fallbackFlatPrice;
}
