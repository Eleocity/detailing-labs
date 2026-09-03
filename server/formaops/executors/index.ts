/**
 * Executor registry — maps a ChangeRequest category to the schema its
 * proposedChange must satisfy and the function that applies it. Adding a
 * new category's execution is meant to be exactly: write an executor file,
 * add one line here. Categories with no entry (promotions, content,
 * business_profile as of Phase 2) simply stay at APPROVED/REJECTED
 * with no real-world effect — see docs/formaops/STATUS.md.
 */
import type { ZodType } from "zod";
import type { ChangeRequestCategory } from "../../../drizzle/schema";
import { pricingChangeSchema, executePricingChange } from "./pricing";
import { hoursChangeSchema, executeHoursChange } from "./hours";
import { servicesChangeSchema, executeServicesChange } from "./services";

export interface Executor<T = any> {
  schema: ZodType<T>;
  execute: (db: any, change: T) => Promise<{ before: unknown; after: unknown }>;
}

export const EXECUTORS: Partial<Record<ChangeRequestCategory, Executor>> = {
  pricing: { schema: pricingChangeSchema, execute: executePricingChange },
  hours: { schema: hoursChangeSchema, execute: executeHoursChange },
  services: { schema: servicesChangeSchema, execute: executeServicesChange },
};
