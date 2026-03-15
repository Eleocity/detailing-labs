import { eq, desc, count, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// Admin-only guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Safe user fields (no password hash or reset tokens)
const safeUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
  loginMethod: users.loginMethod,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastSignedIn: users.lastSignedIn,
};

export const usersRouter = router({
  // List all users with optional search + role filter
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["user", "admin", "all"]).default("all"),
        sortBy: z.enum(["createdAt", "lastSignedIn", "name", "email"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select(safeUserFields)
        .from(users)
        .orderBy(desc(users.createdAt));

      let filtered = rows;

      // Search filter
      if (input?.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
      }

      // Role filter
      if (input?.role && input.role !== "all") {
        filtered = filtered.filter((u) => u.role === input.role);
      }

      // Sort
      if (input?.sortBy) {
        const dir = input.sortDir === "asc" ? 1 : -1;
        filtered.sort((a, b) => {
          const av = a[input.sortBy as keyof typeof a];
          const bv = b[input.sortBy as keyof typeof b];
          if (av == null && bv == null) return 0;
          if (av == null) return dir;
          if (bv == null) return -dir;
          if (av < bv) return -dir;
          if (av > bv) return dir;
          return 0;
        });
      }

      return filtered;
    }),

  // Get a single user by ID
  getById: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select(safeUserFields)
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return result[0];
    }),

  // Update a user's profile (name, email, phone, role)
  update: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from removing their own admin role
      if (input.userId === ctx.user.id && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin role.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.role !== undefined) updateData.role = input.role;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(users).set(updateData).where(eq(users.id, input.userId));

      // Return updated user
      const updated = await db
        .select(safeUserFields)
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return updated[0];
    }),

  // Update a user's role only (convenience shortcut)
  setRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin role.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Generate a password reset link for a user (admin sends to user)
  sendPasswordReset: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db
        .update(users)
        .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
        .where(eq(users.id, input.userId));

      // In production, this token would be emailed to the user.
      // For now, return the reset URL so admin can copy/share it.
      return { success: true, token, message: "Reset token generated. Share the reset link with the user." };
    }),

  // Delete a user account
  delete: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Stats summary for the users dashboard
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalResult] = await db.select({ count: count() }).from(users);
    const [adminResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "admin"));
    const [recentResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));
    const [activeResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastSignedIn, sevenDaysAgo));

    return {
      total: totalResult?.count ?? 0,
      admins: adminResult?.count ?? 0,
      recentSignups: recentResult?.count ?? 0,
      activeLastWeek: activeResult?.count ?? 0,
    };
  }),
});
