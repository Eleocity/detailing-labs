/**
 * Service-area classification shared between client (for immediate UI
 * feedback) and server (for authoritative validation before a booking is
 * accepted). The database `serviceAreas` table (zipCodes + travelFee per
 * named area) is the operational source of truth; these are just the types
 * and a couple of pure helpers so both sides agree on what the categories
 * mean.
 */

export type ServiceAreaClassification =
  | "included" // no travel fee
  | "travel_fee" // covered, travel fee applies
  | "manual_review" // outside named areas but plausibly reachable — flag for staff
  | "outside_area"; // reject with a clear explanation

export interface ServiceAreaResult {
  classification: ServiceAreaClassification;
  travelFee: number;
  areaName: string | null;
  message: string;
}

/**
 * Zip codes within this distance (by simple numeric proximity, not real
 * geo-distance) of a known service area get "manual_review" instead of an
 * outright rejection, since a 5-digit zip alone can't tell us the real
 * distance. This is intentionally conservative — see docs/REBRAND_MIGRATION.md
 * for the note on eventually validating by real lat/lng radius instead.
 */
const MANUAL_REVIEW_ZIP_PROXIMITY = 25;

export interface ServiceAreaRecord {
  name: string;
  zipCodes: string[];
  travelFee: number;
  isActive: boolean;
}

export function classifyZip(
  zip: string,
  areas: ServiceAreaRecord[]
): ServiceAreaResult {
  const cleanZip = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) {
    return {
      classification: "manual_review",
      travelFee: 0,
      areaName: null,
      message:
        "We couldn't validate that ZIP code automatically — we'll confirm coverage before your appointment.",
    };
  }

  const activeAreas = areas.filter(a => a.isActive);

  // No service areas configured yet (fresh install / not set up by the
  // admin) — flag for manual review rather than rejecting every customer
  // outright. Rejecting everyone by default would be a launch-day trap.
  if (activeAreas.length === 0) {
    return {
      classification: "manual_review",
      travelFee: 0,
      areaName: null,
      message: "We'll confirm coverage for your area before your appointment.",
    };
  }

  // Exact-match areas with zero travel fee are the "included" area(s).
  const included = activeAreas.find(
    a => a.travelFee === 0 && a.zipCodes.includes(cleanZip)
  );
  if (included) {
    return {
      classification: "included",
      travelFee: 0,
      areaName: included.name,
      message: `Great news — ${cleanZip} is in our standard service area. No travel fee.`,
    };
  }

  // Exact-match areas with a travel fee.
  const travelFeeArea = activeAreas.find(
    a => a.travelFee > 0 && a.zipCodes.includes(cleanZip)
  );
  if (travelFeeArea) {
    return {
      classification: "travel_fee",
      travelFee: travelFeeArea.travelFee,
      areaName: travelFeeArea.name,
      message: `We cover ${cleanZip} with a $${travelFeeArea.travelFee.toFixed(2)} travel fee.`,
    };
  }

  // No exact match — check numeric proximity to any known zip as a coarse
  // "might be reachable" signal rather than an outright rejection.
  const zipNum = Number(cleanZip);
  const near = activeAreas.some(a =>
    a.zipCodes.some(
      z => Math.abs(Number(z) - zipNum) <= MANUAL_REVIEW_ZIP_PROXIMITY
    )
  );
  if (near) {
    return {
      classification: "manual_review",
      travelFee: 0,
      areaName: null,
      message:
        "That's just outside our standard coverage map — we'll double-check and confirm availability before your appointment.",
    };
  }

  return {
    classification: "outside_area",
    travelFee: 0,
    areaName: null,
    message:
      "That ZIP code is outside our current service area. Contact us directly and we may still be able to help for larger jobs.",
  };
}
