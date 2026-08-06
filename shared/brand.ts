/**
 * Central brand configuration for Forma Auto Spa.
 *
 * This is the single source of truth for company identity, contact info,
 * service area, social links, logo paths, and SEO defaults. It is imported
 * by both client and server code, so it must stay free of `process.env` /
 * `import.meta.env` reads — secrets and runtime env config belong in
 * server/_core/env.ts instead.
 *
 * PLACEHOLDER VALUES are marked below. Replace them once real assets/accounts
 * exist — see docs/REBRAND_MIGRATION.md and docs/URABLE_REBRAND_CHECKLIST.md.
 */

export const BRAND = {
  // ── Identity ─────────────────────────────────────────────────────────────
  legalName: "Forma Auto Spa", // PLACEHOLDER: confirm registered legal entity name/suffix (LLC, etc.)
  displayName: "Forma Auto Spa",
  shortName: "Forma",
  tagline: "Refined automotive care, delivered with precision.",

  // ── Contact ──────────────────────────────────────────────────────────────
  phone: "(262) 260-9474",
  phoneHref: "tel:+12622609474",
  email: "hello@formaautospa.com", // PLACEHOLDER: aspirational — not a live inbox yet
  emailFrom: "noreply@formaautospa.com", // PLACEHOLDER: requires SendGrid sender domain auth
  /**
   * The inbox that actually receives mail today. Functional fallback
   * defaults (contact forms, notification emails, "reply to" addresses)
   * should use THIS, not `email`, until the new domain's mailbox and
   * SendGrid sender authentication are live — otherwise messages silently
   * bounce. Swap callers from `emailLive`/`emailFromLive` to `email`/
   * `emailFrom` as the last step of the email migration (see
   * docs/REBRAND_MIGRATION.md).
   */
  emailLive: "hello@detailinglabswi.com",
  emailFromLive: "noreply@detailinglabswi.com",

  // ── Domains ──────────────────────────────────────────────────────────────
  domain: {
    /** Still live and indexed — keep serving/redirecting through launch + beyond. */
    legacy: "detailinglabswi.com",
    /** PLACEHOLDER — replace with the real domain once purchased. */
    primary: "formaautospa.com",
    /**
     * The domain actually deployed right now. Canonical URLs, sitemap
     * entries, and OG tags must point here, NOT at `primary`, until DNS
     * cutover happens — `primary` isn't registered/live yet. Flip this to
     * `primary` as the last step of go-live (see docs/REBRAND_MIGRATION.md),
     * ideally driven by a `VITE_SITE_URL` / `PUBLIC_SITE_URL` env var instead
     * of a code change.
     */
    live: "detailinglabswi.com",
  },

  // ── Service area ─────────────────────────────────────────────────────────
  serviceArea: {
    headquartersCity: "Sturtevant",
    headquartersState: "WI",
    headquartersLat: 42.7261,
    headquartersLng: -87.7829,
    primaryRegionLabel: "Racine County & Kenosha County, WI",
    towns: [
      "Sturtevant",
      "Racine",
      "Kenosha",
      "Mount Pleasant",
      "Caledonia",
      "Oak Creek",
      "Wind Point",
      "Burlington",
      "Franksville",
    ],
    summary:
      "Serving Racine County, Kenosha County, and surrounding Southeast Wisconsin communities.",
  },

  // ── Social ───────────────────────────────────────────────────────────────
  social: {
    instagram: "https://www.instagram.com/formaautospa", // PLACEHOLDER: create/rename handle
    facebook: "https://facebook.com/formaautospa", // PLACEHOLDER: create/rename page
    tiktok: "https://tiktok.com/@formaautospa", // PLACEHOLDER: create/rename handle
    /**
     * Google Business Profile review link. This lives on the Google account,
     * not this repo — renaming the business on Google is an external step
     * (see docs/URABLE_REBRAND_CHECKLIST.md). Keeping the existing link live
     * until the profile itself is renamed avoids a dead link in production.
     */
    googleReviewUrl: "https://g.page/r/detailing-labs/review", // PLACEHOLDER: update after GBP rename
  },

  // ── Logo / brand assets ──────────────────────────────────────────────────
  // Centralized paths so every component/email/metadata tag points here
  // instead of hardcoding a URL. Swap the files in client/public/brand/
  // to update branding everywhere at once.
  logo: {
    wordmarkSvg: "/brand/forma-wordmark.svg",
    iconSvg: "/brand/forma-icon.svg",
    /**
     * Absolute URL used in email templates and OG tags. No real 1200x630
     * Forma social-share image exists yet (SVGs aren't reliably rendered by
     * social crawlers), so this intentionally falls back to the old but
     * still-live logo image rather than link to something that 404s.
     * TODO(rebrand): replace with a real Forma OG image, then drop the
     * siteUrl param (it'll just be a static CDN URL).
     */
    ogImageAbsoluteUrl: (_siteUrl: string) =>
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png",
  },

  // ── SEO defaults ─────────────────────────────────────────────────────────
  seo: {
    defaultTitle: "Forma Auto Spa — Premium Mobile Auto Detailing",
    defaultDescription:
      "Forma Auto Spa is a premium mobile detailing studio serving Racine County, Kenosha County, and surrounding Southeast Wisconsin communities. Interior detailing, exterior detailing, paint correction, and ceramic coatings — we come to you.",
    keywords:
      "mobile auto detailing, car detailing Racine, ceramic coating Kenosha, paint correction Wisconsin, mobile detailing Southeast Wisconsin, auto detailing near me",
  },

  // ── Booking ──────────────────────────────────────────────────────────────
  booking: {
    /** Prefix for locally-generated booking reference numbers. */
    numberPrefix: "FA",
    /** Canonical booking route. Legacy /booking stays mounted as an alias. */
    primaryPath: "/book",
    legacyPath: "/booking",
  },

  /**
   * Rebrand transition notice — shown in a small number of places (footer,
   * legacy-domain landing) per the migration plan. Not meant for prominent
   * placement; the goal is continuity, not distraction.
   */
  rebrandNotice: "Detailing Labs is now Forma Auto Spa.",
} as const;

export type Brand = typeof BRAND;

// ── Small formatting helpers used across client + server ────────────────────

/** Strips a formatted phone string down to digits, e.g. for `tel:` hrefs. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Builds an absolute site URL for a given path, given the current request/site origin. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
