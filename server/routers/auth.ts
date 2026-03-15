import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

async function signSession(userId: number, email: string): Promise<string> {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ userId, email, type: "session" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());
}

async function verifySession(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    const { userId, email } = payload as Record<string, unknown>;
    if (typeof userId !== "number" || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}

function generateResetToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export const authRouter = router({
  // ── Register ────────────────────────────────────────────────────────────────
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      await db.createUser({
        name: input.name,
        email: input.email,
        passwordHash,
        role: "user",
      });

      const user = await db.getUserByEmail(input.email);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const token = await signSession(user.id, user.email!);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  // ── Login ────────────────────────────────────────────────────────────────────
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      await db.updateLastSignedIn(user.id);
      const token = await signSession(user.id, user.email!);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  // ── Logout ───────────────────────────────────────────────────────────────────
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // ── Me (current user) ────────────────────────────────────────────────────────
  me: publicProcedure.query(async ({ ctx }) => {
    if (ctx.user) return ctx.user;
    // Also try reading from our own JWT cookie if Manus SDK didn't populate ctx.user
    try {
      const { parse: parseCookieHeader } = await import("cookie");
      const cookieHeader = ctx.req.headers.cookie;
      const cookies = parseCookieHeader(cookieHeader ?? "");
      const token = cookies[COOKIE_NAME];
      if (!token) return null;
      const session = await verifySession(token);
      if (!session) return null;
      const user = await db.getUserById(session.userId);
      return user ?? null;
    } catch {
      return null;
    }
  }),

  // ── Forgot Password ──────────────────────────────────────────────────────────
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      // Always return success to prevent email enumeration
      if (!user) return { success: true };

      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
      await db.setResetToken(user.id, token, expiresAt);

      // In production, send this via email (Sendgrid, Resend, etc.)
      // For now, log it to the server console so you can test the flow
      console.log(`[Password Reset] Token for ${input.email}: ${token}`);
      console.log(`[Password Reset] Reset URL: /reset-password?token=${token}`);

      return { success: true };
    }),

  // ── Reset Password ───────────────────────────────────────────────────────────
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByResetToken(input.token);
      if (!user || !user.resetTokenExpiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link is invalid or has expired.",
        });
      }
      if (new Date() > user.resetTokenExpiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link has expired. Please request a new one.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      await db.updateUserPassword(user.id, passwordHash);

      // Auto-login after reset
      const token = await signSession(user.id, user.email!);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true };
    }),

  // ── Change Password (authenticated) ─────────────────────────────────────────
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set on this account." });
      }
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }
      const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
      await db.updateUserPassword(user.id, passwordHash);
      return { success: true };
    }),
});

// Export verifySession so context.ts can use it
export { verifySession };
