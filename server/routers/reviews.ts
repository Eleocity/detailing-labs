/**
 * Reviews router — fetches live Google Places data server-side.
 *
 * Required Railway env var:
 *   GOOGLE_PLACES_API_KEY  — a server-side API key with Places API enabled
 *   GOOGLE_PLACE_ID        — your Google Business Place ID (from your review link)
 *
 * The client polls this every ~5 minutes via tRPC to display live review count.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// Simple in-memory cache — avoids hammering Places API on every page load
let _cache: { rating: number; count: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchPlacesData(): Promise<{ rating: number; count: number } | null> {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) return null;

  // Use cached data if fresh
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return { rating: _cache.rating, count: _cache.count };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${apiKey}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      console.error("[Reviews] Places API error:", res.status);
      return null;
    }

    const data = await res.json() as {
      status: string;
      result?: { rating?: number; user_ratings_total?: number };
    };

    if (data.status !== "OK" || !data.result) {
      console.error("[Reviews] Places API status:", data.status);
      return null;
    }

    const rating = data.result.rating ?? 5.0;
    const count  = data.result.user_ratings_total ?? 0;

    _cache = { rating, count, fetchedAt: Date.now() };
    return { rating, count };
  } catch (err: any) {
    console.error("[Reviews] Places fetch failed:", err?.message);
    return null;
  }
}

export const reviewsRouter = router({
  /**
   * Returns live Google review count and rating.
   * Falls back to null if env vars not set or Places API fails.
   * Cached for 10 minutes server-side.
   */
  getPlacesStats: publicProcedure.query(async () => {
    const data = await fetchPlacesData();
    if (!data) return null;
    return {
      rating:      Math.round(data.rating * 10) / 10,
      count:       data.count,
      displayText: `${data.rating.toFixed(1)} · ${data.count} reviews on Google`,
    };
  }),

  /**
   * Admin: force refresh the Places cache.
   */
  refreshCache: protectedProcedure.mutation(async () => {
    _cache = null;
    const data = await fetchPlacesData();
    return { success: true, data };
  }),
});
