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
  /** Primary tagline — from the official brand playbook. */
  tagline: "Refined. Protected. Ready.",
  /** Approved secondary lines, usable in rotation for section subheads, ads, etc. */
  secondaryTaglines: [
    "Precision care for every finish.",
    "Professional auto care, shaped around your vehicle.",
    "Restore the look. Protect the finish.",
    "A higher standard of automotive care.",
  ],
  /** Approved ~50-word company description — for About-page-length copy, not meta descriptions (too long). */
  approvedDescription:
    "Forma Auto Spa provides professional interior and exterior automotive detailing, protection, and maintenance services. Every vehicle moves through a documented inspection, service process, and quality-control review so customers receive consistent workmanship, clear communication, and a finish they can feel confident driving away in.",
  /** Approved elevator pitch — longer form, for About page / press-style copy. */
  elevatorPitch:
    "Forma Auto Spa is a premium automotive detailing and protection company built around consistency. We combine professional products, trained technicians, documented inspections, and final quality control to deliver a cleaner vehicle and a better ownership experience — without the guesswork common in traditional detailing.",

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
    /**
     * Still resolves and was previously indexed — kept only as a redirect
     * target (see server/_core/index.ts domain-canonicalization middleware)
     * so old bookmarks/search results 301 through to `live` instead of
     * breaking. Never used to build a customer-facing URL.
     */
    legacy: "detailinglabswi.com",
    /** Same as `live` — DNS cutover is complete, both point at the same domain. */
    primary: "formaautospa.com",
    /**
     * The canonical domain. Cutover confirmed live 2026-08-07 (formaautospa.com
     * resolves via Cloudflare and serves this same app — verified via
     * /api/health). Canonical URLs, sitemap entries, and OG tags all build
     * from this value.
     *
     * NOTE: this covers the WEB domain only. `emailLive`/`emailFromLive`
     * below are intentionally still on the legacy domain — flipping outbound
     * email requires confirming SendGrid sender-domain authentication for
     * formaautospa.com first (unverified as of this cutover; MX records show
     * only registrar email-forwarding, which says nothing about SendGrid
     * send-auth). Don't flip `email`/`emailFrom` until that's confirmed.
     */
    live: "formaautospa.com",
  },

  /**
   * Operating hours — single source of truth. Before this, four different
   * hour ranges existed simultaneously (SEO structured data, DB-seeded
   * "hours_weekday"/"hours_weekend", DB-seeded hero "trust_availability",
   * and Contact page's hardcoded fallback), none agreeing with each other.
   * TODO(business-owner): confirm these are the actual desired hours. Picked
   * as canonical because the DB-seeded `hours_weekday`/`hours_weekend`
   * values were the ones actually live in production (siteContent rows are
   * insert-if-missing, so whatever was seeded first is what's been showing
   * on /contact) — the other three were reconciled to match, not the other
   * way around.
   */
  hours: {
    weekday: "Mon–Fri: 9:00 AM – 5:00 PM",
    weekend: "Sat–Sun: 9:00 AM – 5:00 PM",
    /** Compact form for badges/trust strips (same hours as above, terser). */
    short: "Mon–Sun, 9am–5pm",
    /** Structured-data-friendly form for schema.org OpeningHoursSpecification. */
    schema: [
      { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "17:00" },
      { days: ["Saturday", "Sunday"], opens: "09:00", closes: "17:00" },
    ],
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
  // All four values below are `null` (not placeholder URLs) because each was
  // verified and found unsafe to publish rather than merely unconfirmed:
  //  - instagram.com/formaautospa is a REAL, active, unrelated business (an
  //    auto spa in Kłodzko, Poland) — linking it would send customers to a
  //    stranger's page, not just a dead link.
  //  - facebook.com/formaautospa and tiktok.com/@formaautospa could not be
  //    verified as Forma's real accounts.
  //  - the Google review short-link (g.page/r/detailing-labs/review) is dead
  //    — it 302s to plain google.com, and its slug is the old business name
  //    besides.
  // Every consumer (SiteFooter, Home, Contact, SEO's `sameAs`) must treat
  // `null` as "omit this button/field entirely," never fall back to a guess.
  // Fill in real values here the moment the actual accounts/listing exist.
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
    tiktok: null as string | null,
    googleReviewUrl: null as string | null,
  },

  // ── Logo / brand assets ──────────────────────────────────────────────────
  // Centralized paths so every component/email/metadata tag points here
  // instead of hardcoding a URL. Swap the files in client/public/brand/
  // to update branding everywhere at once. Real logo (as of the brand
  // playbook handoff) — cropped to content bounds from the source renders,
  // solid black background (fine everywhere in this app: it's a 100%
  // dark-theme site, Carbon Black #050505 throughout).
  logo: {
    wordmark: "/brand/forma-wordmark.png",
    icon: "/brand/forma-icon.png",
    /**
     * Absolute URL used in email templates and OG tags. This is the real
     * wordmark, not a perfect 1200x630 OG composition (it's a wide, short
     * crop) — social platforms generally letterbox/crop-fit an off-ratio
     * image acceptably, and real Forma branding beats the old fallback.
     * TODO(rebrand): commission a proper 1200x630 OG image when there's
     * time for one.
     */
    ogImageAbsoluteUrl: (siteUrl: string) => `${siteUrl}/brand/forma-wordmark.png`,
  },

  // ── SEO defaults ─────────────────────────────────────────────────────────
  seo: {
    defaultTitle: "Forma Auto Spa — Automotive Care, Refined",
    // Short enough for a meta description tag — see `approvedDescription`
    // above for the full ~50-word brand-playbook version (About page, etc).
    defaultDescription:
      "Professional interior and exterior detailing, protection, and ceramic coatings in Racine & Kenosha County, WI. Documented process, consistent results.",
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
   * Rebrand transition notice. No longer rendered anywhere by default — the
   * cutover is complete (formaautospa.com is the live canonical domain), so
   * permanently showing "Detailing Labs is now Forma Auto Spa" on every page
   * footer forever would itself be the last stray customer-facing mention of
   * the old name. Kept only in case a one-time transition banner is ever
   * needed again (e.g. a returning-customer-facing legacy-domain redirect
   * notice) — not imported by any component today.
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
