/**
 * Tools for the FormaOps Manager agent (docs/formaops/AGENTS.md). Two reads
 * (get_pricing, get_hours) so the agent grounds a proposal in the real
 * current value instead of guessing, and two proposal tools that call the
 * EXACT SAME service functions the admin UI and tRPC router call
 * (server/formaops/changeRequests.ts) — no privileged shortcut for the
 * agent. Per AGENTS.md's non-negotiable boundary, there is deliberately no
 * approve/execute/deploy/SQL tool here: every proposal tool only ever
 * creates an AWAITING_APPROVAL row. A human still has to approve it before
 * anything real changes.
 */
import { z } from "zod";
import { tool } from "@openai/agents";
import { eq } from "drizzle-orm";
import { packages, siteContent } from "../../../drizzle/schema";
import * as changeRequestsService from "../changeRequests";

export interface ManagerToolContext {
  db: any;
  businessId: number;
  actingUserId: number;
  /** Recorded as the ChangeRequest's `source` — lets the audit trail (and
   *  a future admin UI) distinguish "proposed by texting the agent" from
   *  "proposed via the web chat panel," not just "some AI proposed this."
   *  See docs/formaops/DECISIONS.md open decision #2. */
  channel: "web_chat" | "sms";
}

/** Turns a thrown error (e.g. FORBIDDEN from a permission check) into a
 *  plain message the model can relay, instead of crashing the whole run —
 *  the SDK's default behavior is to rethrow, which would surface as an
 *  ugly failure instead of the agent explaining what went wrong. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildManagerTools(ctx: ManagerToolContext) {
  const getPricing = tool({
    name: "get_pricing",
    description:
      "List every active service package: its current price (including vehicle-size tiers, sedan/suv/large, where they exist) and its current list of included-service line items. Always call this before proposing a pricing OR services change so the proposal is grounded in the real current values — for a services change, checking the current list first avoids proposing to add a duplicate or remove something that isn't there.",
    parameters: z.object({}),
    execute: async () => {
      const rows = await ctx.db
        .select()
        .from(packages)
        .where(eq(packages.isActive, true));
      return rows.map((p: any) => ({
        name: p.name,
        price: Number(p.price),
        priceSedan: p.priceSedan != null ? Number(p.priceSedan) : null,
        priceSuv: p.priceSuv != null ? Number(p.priceSuv) : null,
        priceLarge: p.priceLarge != null ? Number(p.priceLarge) : null,
        includedFeatures: p.features ? JSON.parse(p.features) : [],
      }));
    },
    errorFunction: (_context, error) =>
      `Could not read current pricing: ${describeError(error)}`,
  });

  const getHours = tool({
    name: "get_hours",
    description:
      "Get the business's current standing weekday and weekend hours. Always call this before proposing an hours change.",
    parameters: z.object({}),
    execute: async () => {
      const rows = await ctx.db
        .select()
        .from(siteContent)
        .where(eq(siteContent.section, "contact"));
      const byKey = Object.fromEntries(
        rows.map((r: any) => [r.key, r.value])
      );
      return {
        hours_weekday: byKey.hours_weekday ?? null,
        hours_weekend: byKey.hours_weekend ?? null,
      };
    },
    errorFunction: (_context, error) =>
      `Could not read current hours: ${describeError(error)}`,
  });

  const proposePricingChange = tool({
    name: "propose_pricing_change",
    description:
      "Draft a pricing ChangeRequest for a human to review and approve. This does NOT change the live price — it only creates a pending request. newPriceSuv/newPriceLarge are null unless the person asked to change those specific tiers too.",
    parameters: z.object({
      packageName: z.string().describe("Exact package name, from get_pricing."),
      newPrice: z.number().positive().describe("New base/sedan price."),
      newPriceSuv: z.number().positive().nullable(),
      newPriceLarge: z.number().positive().nullable(),
      reasoning: z
        .string()
        .describe("One sentence explaining why, shown to whoever approves this."),
    }),
    execute: async args => {
      const proposedChange: Record<string, unknown> = {
        packageName: args.packageName,
        newPrice: args.newPrice,
      };
      if (args.newPriceSuv != null) proposedChange.newPriceSuv = args.newPriceSuv;
      if (args.newPriceLarge != null)
        proposedChange.newPriceLarge = args.newPriceLarge;

      const cr = await changeRequestsService.create(ctx.db, {
        businessId: ctx.businessId,
        submittedByUserId: ctx.actingUserId,
        actorType: "AI_SYSTEM",
        source: ctx.channel,
        category: "pricing",
        originalRequest: args.reasoning,
        proposedChange,
        reasoningSummary: args.reasoning,
      });
      return { changeRequestId: cr.id, status: cr.status };
    },
    errorFunction: (_context, error) =>
      `Could not propose this pricing change: ${describeError(error)}`,
  });

  const proposeServicesChange = tool({
    name: "propose_services_change",
    description:
      "Draft a ChangeRequest to add or remove one included-service line item from a package (e.g. 'add ceramic top coat to The Signature Detail'). This does NOT change the live package — it only creates a pending request.",
    parameters: z.object({
      packageName: z.string().describe("Exact package name, from get_pricing."),
      action: z.enum(["add", "remove"]),
      item: z.string().describe("The included-service line, exactly as it should read."),
      reasoning: z
        .string()
        .describe("One sentence explaining why, shown to whoever approves this."),
    }),
    execute: async args => {
      const cr = await changeRequestsService.create(ctx.db, {
        businessId: ctx.businessId,
        submittedByUserId: ctx.actingUserId,
        actorType: "AI_SYSTEM",
        source: ctx.channel,
        category: "services",
        originalRequest: args.reasoning,
        proposedChange: {
          packageName: args.packageName,
          action: args.action,
          item: args.item,
        },
        reasoningSummary: args.reasoning,
      });
      return { changeRequestId: cr.id, status: cr.status };
    },
    errorFunction: (_context, error) =>
      `Could not propose this services change: ${describeError(error)}`,
  });

  const proposeHoursChange = tool({
    name: "propose_hours_change",
    description:
      "Draft an hours ChangeRequest for a human to review and approve. This does NOT change the live hours — it only creates a pending request. Only covers standing weekday/weekend hours, not a specific date.",
    parameters: z.object({
      field: z.enum(["hours_weekday", "hours_weekend"]),
      newValue: z.string().min(1).max(200),
      reasoning: z
        .string()
        .describe("One sentence explaining why, shown to whoever approves this."),
    }),
    execute: async args => {
      const cr = await changeRequestsService.create(ctx.db, {
        businessId: ctx.businessId,
        submittedByUserId: ctx.actingUserId,
        actorType: "AI_SYSTEM",
        source: ctx.channel,
        category: "hours",
        originalRequest: args.reasoning,
        proposedChange: { field: args.field, newValue: args.newValue },
        reasoningSummary: args.reasoning,
      });
      return { changeRequestId: cr.id, status: cr.status };
    },
    errorFunction: (_context, error) =>
      `Could not propose this hours change: ${describeError(error)}`,
  });

  return [
    getPricing,
    getHours,
    proposePricingChange,
    proposeHoursChange,
    proposeServicesChange,
  ];
}
