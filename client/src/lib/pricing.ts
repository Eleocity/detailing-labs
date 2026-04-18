/**
 * SINGLE SOURCE OF TRUTH for all package names, pricing, features, and metadata.
 * Import from this file everywhere — never hardcode pricing in components.
 */

export const PACKAGES = [
  {
    id:        1,
    slug:      "exterior-decon-shield",
    name:      "Exterior Decon & Shield",
    tagline:   "Deep clean + 3-month protection",
    bestFor:   "Seasonal refresh, pre-event prep, or maintaining a clean car between full details",
    duration:  "~2 hours",
    durationMins: 120,
    pricing: {
      sedan: 129.99,
      suv:   149.99,
      large: 199.99,
    },
    features: [
      "Signature hand wash",
      "Wheel & tire deep clean",
      "Iron remover decontamination",
      "Bug & tar removal",
      "Hydrophobic spray wax (3-month protection)",
      "Exterior glass cleaning",
      "Tire dressing",
      "Door jamb cleaning",
    ],
    isPopular: false,
  },
  {
    id:        2,
    slug:      "interior-deep-refresh",
    name:      "Interior Deep Refresh",
    tagline:   "Full cabin reset — surfaces, glass, mats",
    bestFor:   "Used car buyers, pet owners, or anyone whose cabin needs a proper reset",
    duration:  "~2 hours",
    durationMins: 120,
    pricing: {
      sedan: 129.99,
      suv:   149.99,
      large: 199.99,
    },
    features: [
      "Compressed air blowout",
      "Deep vacuum (seats, carpets, trunk)",
      "Dash, console & door panel scrub",
      "UV protectant treatment",
      "Streak-free interior glass",
      "Floor mat restoration",
    ],
    isPopular: false,
  },
  {
    id:        3,
    slug:      "full-showroom-reset",
    name:      "Full Showroom Reset",
    tagline:   "Complete interior + exterior in one visit",
    bestFor:   "First-time clients, pre-sale prep, or when you want the full treatment in one visit",
    duration:  "~4 hours",
    durationMins: 240,
    pricing: {
      sedan: 229.99,
      suv:   269.99,
      large: 359.99,
    },
    features: [
      "Everything in Exterior Decon & Shield",
      "Everything in Interior Deep Refresh",
      "Best value — save vs. booking separately",
    ],
    isPopular: true,
  },
  {
    id:        4,
    slug:      "lab-grade-detail",
    name:      "The Lab Grade Detail",
    tagline:   "Paint-corrected, decontaminated, and ceramic-sealed",
    bestFor:   "High-end vehicles, neglected paint, or when only the highest possible result will do",
    duration:  "~6–8 hours",
    durationMins: 480,
    pricing: {
      sedan: 449.99,
      suv:   529.99,
      large: 649.99,
    },
    features: [
      "Everything in Full Showroom Reset",
      "Iron X iron & fallout decontamination",
      "Clay bar paint decontamination",
      "1-stage paint correction (swirl & scratch reduction)",
      "Ceramic spray sealant (6-month protection)",
      "Before & after photo documentation",
    ],
    isPopular: false,
  },
] as const;

export const ADD_ONS = [
  { name: "Pet Hair Removal",                  price: 49.99,  description: "Starting at $49 — varies by severity" },
  { name: "Odor Elimination Treatment",        price: 49.99,  description: "Interior deodorizer + ozone treatment" },
  { name: "Engine Bay Detail",                 price: 49.99,  description: "Degreased & detailed engine bay" },
  { name: "Headlight Restoration",             price: 99.99,  description: "Restores clarity + UV protection film" },
  { name: "Seat Extraction — Front Only",      price: 49.99,  description: "Hot water extraction, front seats" },
  { name: "Seat Extraction — Full Vehicle",    price: 99.99,  description: "Hot water extraction, all rows" },
  { name: "Seat Extraction — Spot Treatment",  price: 24.99,  description: "Per-seat spot cleaning" },
] as const;

export type VehicleSize = "sedan" | "suv" | "large";

export const VEHICLE_SIZE_LABELS: Record<VehicleSize, string> = {
  sedan: "Sedan / Coupe",
  suv:   "Small SUV / Truck",
  large: "Large SUV / Minivan",
};

export const VEHICLE_SIZE_OPTIONS = [
  { id: "sedan" as VehicleSize, label: "Sedan",  sub: "Coupe" },
  { id: "suv"   as VehicleSize, label: "SUV",    sub: "Small / Truck" },
  { id: "large" as VehicleSize, label: "SUV",    sub: "Large / Minivan" },
];

/** Lowest price across all vehicle sizes for a given package */
export function packageFromPrice(name: string): number {
  const pkg = PACKAGES.find(p => p.name === name);
  return pkg ? Math.min(...Object.values(pkg.pricing)) : 0;
}
