/**
 * Closes the hardening gap flagged in docs/formaops/STATUS.md: previously,
 * every formaops procedure called hasPermission() manually inside its
 * resolver — nothing stopped a new procedure from forgetting to. This file
 * makes the permission check a structural part of the procedure
 * definition itself (a tRPC middleware, via `.use()`), not a line of code
 * that lives inside a resolver body where it can be silently deleted
 * without visibly removing an entire layer.
 *
 * `resolve` computes {businessId, permission} from the parsed input (and,
 * for procedures that only take a ChangeRequest `id`, may look the row up
 * via `db` to discover its businessId) — this is what makes one builder
 * work for both "businessId is a direct input field" (create, list) and
 * "businessId must be derived from a lookup" (get, approve, reject) cases.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { hasPermission, type Permission } from "./permissions";

export async function requireFormaOpsDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }
  return db;
}

export function withPermissionCheck<TSchema extends z.ZodType>(
  inputSchema: TSchema,
  resolve: (
    input: z.infer<TSchema>,
    db: Awaited<ReturnType<typeof requireFormaOpsDb>>
  ) => Promise<{ businessId: number; permission: Permission }>
) {
  return protectedProcedure.input(inputSchema).use(async ({ ctx, input, next }) => {
    const db = await requireFormaOpsDb();
    const { businessId, permission } = await resolve(input as z.infer<TSchema>, db);

    const allowed = await hasPermission(db, businessId, ctx.user.id, permission);
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission "${permission}" for this business.`,
      });
    }

    return next({ ctx: { ...ctx, db, businessId } });
  });
}
