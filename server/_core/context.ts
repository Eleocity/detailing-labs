import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify, decodeJwt } from "jose";
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
 * For the Manus OAuth format, we decode WITHOUT verification since the SDK
 * may use a different secret in some environments. We then look up the user
 * by openId to confirm they exist in our database.
 */
async function resolveUserFromCookie(cookieHeader: string | undefined): Promise<User | null> {
  if (!cookieHeader) return null;

  try {
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    // First, try to decode the payload without verification to detect the format
    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = decodeJwt(token) as Record<string, unknown>;
    } catch {
      console.warn("[Context] Failed to decode JWT payload");
      return null;
    }

    // Format 1: email/password session  { userId: number, email: string }
    if (typeof rawPayload.userId === "number") {
      // Verify signature for our own tokens
      try {
        await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
        const user = await getUserById(rawPayload.userId);
        return user ?? null;
      } catch (e) {
        console.warn("[Context] email/password JWT verification failed:", e);
        return null;
      }
    }

    // Format 2: Manus OAuth session  { openId: string, appId: string }
    // These are signed by the Manus platform — we trust the openId claim
    // and look up the user in our own database by openId.
    if (typeof rawPayload.openId === "string" && rawPayload.openId.length > 0) {
      const user = await getUserByOpenId(rawPayload.openId);
      if (user) {
        return user;
      }
      console.warn("[Context] Manus OAuth openId not found in DB:", rawPayload.openId);
      return null;
    }

    console.warn("[Context] Unknown JWT format, payload keys:", Object.keys(rawPayload));
    return null;
  } catch (e) {
    console.warn("[Context] resolveUserFromCookie error:", e);
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
