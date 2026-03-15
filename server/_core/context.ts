import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { getUserById, getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

/**
 * Try to decode the session cookie using both known JWT formats:
 *  1. New email/password format:  { userId: number, email: string, type: "session" }
 *  2. Legacy Manus OAuth format:  { openId: string, appId: string, name: string }
 *
 * Returns a resolved User or null.
 */
async function resolveUserFromCookie(cookieHeader: string | undefined): Promise<User | null> {
  if (!cookieHeader) return null;

  try {
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    // Decode without verifying first to inspect the payload shape
    // Then verify with our JWT_SECRET — works for both formats since the SDK
    // also uses JWT_SECRET (aliased as cookieSecret) to sign tokens.
    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
      payload = result.payload as Record<string, unknown>;
    } catch {
      // If verification fails entirely, the cookie is invalid
      return null;
    }

    // Format 1: email/password session  { userId: number, email: string }
    if (typeof payload.userId === "number") {
      const user = await getUserById(payload.userId);
      return user ?? null;
    }

    // Format 2: Manus OAuth session  { openId: string, appId: string }
    if (typeof payload.openId === "string" && payload.openId.length > 0) {
      const user = await getUserByOpenId(payload.openId);
      return user ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await resolveUserFromCookie(opts.req.headers.cookie);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
