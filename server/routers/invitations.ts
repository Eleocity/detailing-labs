import { eq, desc, and, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { userInvitations, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { sendEmail, inviteEmail } from "../email";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const invitationsRouter = router({
  // Admin: send an invitation email
  send: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["user", "admin", "employee"]).default("user"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists." });
      }

      // Expire any existing pending invites for this email
      await db
        .update(userInvitations)
        .set({ status: "expired" })
        .where(and(eq(userInvitations.email, input.email), eq(userInvitations.status, "pending")));

      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      await db.insert(userInvitations).values({
        email: input.email,
        role: input.role,
        token,
        invitedBy: ctx.user.id,
        status: "pending",
        expiresAt,
      });

      const inviteUrl = `${input.origin}/invite?token=${token}`;
      const inviterName = ctx.user.name || "The Detailing Labs team";
      const emailContent = inviteEmail(inviteUrl, inviterName, input.role);

      const sent = await sendEmail({
        to: input.email,
        ...emailContent,
      });

      return { success: true, inviteUrl, emailSent: sent };
    }),

  // Public: look up an invitation by token (for the accept page)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [invite] = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.token, input.token))
        .limit(1);

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      }

      if (invite.status === "accepted") {
        throw new TRPCError({ code: "CONFLICT", message: "This invitation has already been accepted." });
      }

      if (invite.status === "expired" || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has expired." });
      }

      return { email: invite.email, role: invite.role, token: invite.token };
    }),

  // Public: accept an invitation and create account
  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(2),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [invite] = await db
        .select()
        .from(userInvitations)
        .where(and(eq(userInvitations.token, input.token), eq(userInvitations.status, "pending")))
        .limit(1);

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found or already used." });
      }

      if (invite.expiresAt < new Date()) {
        await db.update(userInvitations).set({ status: "expired" }).where(eq(userInvitations.id, invite.id));
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has expired." });
      }

      // Check email not already taken
      const existing = await db.select().from(users).where(eq(users.email, invite.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(input.password, 12);

      const [result] = await db.insert(users).values({
        name: input.name,
        email: invite.email,
        passwordHash,
        loginMethod: "email",
        role: invite.role,
        lastSignedIn: new Date(),
      });

      // Mark invite as accepted
      await db.update(userInvitations).set({
        status: "accepted",
        acceptedAt: new Date(),
      }).where(eq(userInvitations.id, invite.id));

      // Create session cookie
      const jose = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const userId = (result as any).insertId;
      const token2 = await new jose.SignJWT({ userId, role: invite.role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secret);

      const { getSessionCookieOptions } = await import("../_core/cookies");
      const cookieOpts = getSessionCookieOptions(ctx.req);
      const { COOKIE_NAME } = await import("../../shared/const");
      ctx.res.cookie(COOKIE_NAME, token2, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return { success: true };
    }),

  // Admin: list all invitations
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Auto-expire stale invitations
    await db
      .update(userInvitations)
      .set({ status: "expired" })
      .where(and(eq(userInvitations.status, "pending"), lt(userInvitations.expiresAt, new Date())));

    return db.select().from(userInvitations).orderBy(desc(userInvitations.createdAt)).limit(100);
  }),

  // Admin: revoke a pending invitation
  revoke: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(userInvitations)
        .set({ status: "expired" })
        .where(and(eq(userInvitations.id, input.id), eq(userInvitations.status, "pending")));

      return { success: true };
    }),

  // Admin: resend an invitation
  resend: adminProcedure
    .input(z.object({ id: z.number(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [invite] = await db.select().from(userInvitations).where(eq(userInvitations.id, input.id)).limit(1);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });

      // Refresh token and expiry
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await db.update(userInvitations).set({ token, expiresAt, status: "pending" }).where(eq(userInvitations.id, input.id));

      const inviteUrl = `${input.origin}/invite?token=${token}`;
      const inviterName = ctx.user.name || "The Detailing Labs team";
      const emailContent = inviteEmail(inviteUrl, inviterName, invite.role);

      const sent = await sendEmail({ to: invite.email, ...emailContent });

      return { success: true, inviteUrl, emailSent: sent };
    }),
});
