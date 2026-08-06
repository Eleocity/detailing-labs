import type { BookingProvider } from "./types";
import { RequestOnlyBookingProvider } from "./providers/requestOnlyProvider";
import { UrableApiBookingProvider } from "./providers/urableApiProvider";
import { UrableVirtualShopBookingProvider } from "./providers/urableVirtualShopProvider";

export * from "./types";

export type BookingProviderName =
  | "urable-api"
  | "urable-virtual-shop"
  | "request-only";

let cached: { name: BookingProviderName; instance: BookingProvider } | null =
  null;

/**
 * Resolves the active BookingProvider from the BOOKING_PROVIDER env var.
 * Defaults to "request-only" — the only mode proven to work end-to-end
 * against the real Urable account — so a missing/typo'd env var fails safe
 * rather than silently claiming capabilities (like live availability) that
 * aren't actually implemented.
 */
export function getBookingProvider(): BookingProvider {
  const name = resolveProviderName();
  if (cached && cached.name === name) return cached.instance;

  const instance: BookingProvider =
    name === "urable-api"
      ? new UrableApiBookingProvider()
      : name === "urable-virtual-shop"
        ? new UrableVirtualShopBookingProvider()
        : new RequestOnlyBookingProvider();

  cached = { name, instance };
  return instance;
}

export function resolveProviderName(): BookingProviderName {
  const raw = (process.env.BOOKING_PROVIDER ?? "").trim();
  if (
    raw === "urable-api" ||
    raw === "urable-virtual-shop" ||
    raw === "request-only"
  )
    return raw;
  if (raw) {
    console.warn(
      `[booking] Unrecognized BOOKING_PROVIDER="${raw}" — falling back to "request-only".`
    );
  }
  return "request-only";
}
