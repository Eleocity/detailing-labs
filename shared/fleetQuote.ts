/**
 * Shared field definitions for the /commercial fleet-quote form — single
 * source of truth for the option lists and labels so the client form, the
 * server's input validation, and the owner-notification email never drift.
 */

export const FLEET_VEHICLE_TYPES = [
  "cars",
  "suvs",
  "vans",
  "light_trucks",
  "other",
] as const;
export type FleetVehicleType = (typeof FLEET_VEHICLE_TYPES)[number];
export const FLEET_VEHICLE_TYPE_LABELS: Record<FleetVehicleType, string> = {
  cars: "Cars",
  suvs: "SUVs",
  vans: "Vans",
  light_trucks: "Light Trucks",
  other: "Other",
};

export const FLEET_OPPORTUNITY_TYPES = [
  "dealership",
  "contractor_fleet",
  "property_management",
  "other",
] as const;
export type FleetOpportunityType = (typeof FLEET_OPPORTUNITY_TYPES)[number];
export const FLEET_OPPORTUNITY_TYPE_LABELS: Record<
  FleetOpportunityType,
  string
> = {
  dealership: "Dealership / Used-Car Lot",
  contractor_fleet: "Contractor / Service Fleet",
  property_management: "Property Management",
  other: "Other",
};

export const FLEET_FREQUENCIES = [
  "one_time",
  "weekly",
  "biweekly",
  "monthly",
  "not_sure",
] as const;
export type FleetFrequency = (typeof FLEET_FREQUENCIES)[number];
export const FLEET_FREQUENCY_LABELS: Record<FleetFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  not_sure: "Not sure",
};
