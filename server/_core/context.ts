import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify, decodeJwt } from "jose";
import { getUserById } from "../db";

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
 * Decodes the session cookie's JWT: { userId: number, email: string, type: "session" }
 */
async function resolveUserFromCookie(cookieHeader: string | undefined): Promise<User | null> {
  if (!cookieHeader) return null;

  try {
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = decodeJwt(token) as Record<string, unknown>;
    } catch {
      console.warn("[Context] Failed to decode JWT payload");
      return null;
    }

    if (typeof rawPayload.userId !== "number") {
      console.warn("[Context] Unknown JWT format, payload keys:", Object.keys(rawPayload));
      return null;
    }

    try {
      await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
      const user = await getUserById(rawPayload.userId);
      return user ?? null;
    } catch (e) {
      console.warn("[Context] JWT verification failed:", e);
      return null;
    }
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
