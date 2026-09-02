import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import {
  changeRequests,
  CHANGE_REQUEST_CATEGORIES,
  CHANGE_REQUEST_STATUSES,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { requireFormaOpsDb, withPermissionCheck } from "../formaops/trpc";
import {
  getMembershipRole,
  requestChangePermissionFor,
} from "../formaops/permissions";
import * as changeRequestsService from "../formaops/changeRequests";
import { handleIncomingMessage } from "../formaops/agents/manager";

const createInput = z.object({
  businessId: z.number().int().positive(),
  source: z.string().min(1).max(40),
  category: z.enum(CHANGE_REQUEST_CATEGORIES),
  originalRequest: z.string().min(1).max(4000),
  proposedChange: z.record(z.string(), z.unknown()),
  reasoningSummary: z.string().max(2000).optional(),
});

const listInput = z.object({
  businessId: z.number().int().positive(),
  status: z.enum(CHANGE_REQUEST_STATUSES).optional(),
});

const idInput = z.object({ id: z.number().int().positive() });
const decideInput = idInput.extend({ note: z.string().max(2000).optional() });

export const formaopsRouter = router({
  changeRequests: router({
    // Permission is dynamic here (depends on `category`), computed straight
    // from the parsed input — no lookup needed since businessId is a
    // direct input field for creation.
    create: withPermissionCheck(createInput, async input => ({
      businessId: input.businessId,
      permission: requestChangePermissionFor(input.category),
    }))
      .mutation(async ({ ctx, input }) => {
        return changeRequestsService.create(ctx.db, {
          businessId: input.businessId,
          submittedByUserId: ctx.user.id,
          actorType: "HUMAN",
          source: input.source,
          category: input.category,
          originalRequest: input.originalRequest,
          proposedChange: input.proposedChange,
          reasoningSummary: input.reasoningSummary,
        });
      }),

    list: withPermissionCheck(listInput, async input => ({
      businessId: input.businessId,
      permission: "approvals.read",
    }))
      .query(async ({ ctx, input }) => {
        const conditions = [eq(changeRequests.businessId, input.businessId)];
        if (input.status) conditions.push(eq(changeRequests.status, input.status));
        return ctx.db
          .select()
          .from(changeRequests)
          .where(and(...conditions))
          .orderBy(desc(changeRequests.createdAt))
          .limit(200);
      }),

    // businessId isn't a direct input field here — it's derived by looking
    // the ChangeRequest up first. That lookup happens inside `resolve`,
    // before the permission check, so a caller who fails the permission
    // check still can't distinguish "wrong business" from "doesn't exist"
    // (both look like FORBIDDEN/NOT_FOUND from a not-yet-authorized caller).
    get: withPermissionCheck(idInput, async (input, db) => {
      const cr = await changeRequestsService.getByIdOrThrow(db, input.id);
      return { businessId: cr.businessId, permission: "approvals.read" };
    }).query(async ({ ctx, input }) => {
      return changeRequestsService.getByIdOrThrow(ctx.db, input.id);
    }),

    approve: withPermissionCheck(decideInput, async (input, db) => {
      const cr = await changeRequestsService.getByIdOrThrow(db, input.id);
      return { businessId: cr.businessId, permission: "approvals.act" };
    }).mutation(async ({ ctx, input }) => {
      return changeRequestsService.approve(ctx.db, {
        changeRequestId: input.id,
        actingUserId: ctx.user.id,
        actorType: "HUMAN",
        note: input.note,
      });
    }),

    reject: withPermissionCheck(decideInput, async (input, db) => {
      const cr = await changeRequestsService.getByIdOrThrow(db, input.id);
      return { businessId: cr.businessId, permission: "approvals.act" };
    }).mutation(async ({ ctx, input }) => {
      return changeRequestsService.reject(ctx.db, {
        changeRequestId: input.id,
        actingUserId: ctx.user.id,
        actorType: "HUMAN",
        note: input.note,
      });
    }),
  }),

  agent: router({
    // Not gated by withPermissionCheck's single-permission model, since
    // "can talk to the agent" isn't itself one FormaOps permission — the
    // real category-specific permission (e.g. pricing.request_change) is
    // still enforced deeper, inside changeRequestsService.create(), the
    // exact moment a tool actually tries to propose something (see
    // formaops/agents/tools.ts). This check is a coarser, earlier gate:
    // are you even a recognized staff member of this business at all,
    // so a customer account can't burn AI budget talking to an internal
    // ops tool it has no reason to reach.
    chat: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          message: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!process.env.OPENAI_API_KEY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The AI agent isn't configured yet (missing OPENAI_API_KEY).",
          });
        }
        const db = await requireFormaOpsDb();
        const role = await getMembershipRole(db, input.businessId, ctx.user.id);
        if (!role) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You're not a member of this business.",
          });
        }
        return handleIncomingMessage({
          db,
          businessId: input.businessId,
          actingUserId: ctx.user.id,
          text: input.message,
        });
      }),
  }),
});
