# Rebrand Migration — Detailing Labs → Forma Auto Spa

Status: **code-complete for the website; domain cutover and external
accounts (Urable, Google Business, SendGrid, socials) are still pending
owner action.** The site is still deployed at `detailinglabswi.com` — see
"Domain migration" below before pointing DNS anywhere new.

## Why a `detailing-labs/` vs. repo-root split exists

This repo has an untracked, stale snapshot in the parent directory
(`d:\Detailing Labs\`, no git history, dated ~March 2026) alongside the real
git repo (`d:\Detailing Labs\detailing-labs\`, full history, GitHub remote
`Eleocity/detailing-labs`, current work). **All rebrand work happened
exclusively inside `detailing-labs/`** — the stale sibling was left
untouched. If that outer copy still exists, it is not part of this
migration and should be independently confirmed as safe to remove before
deleting it.

## Files changed (by category)

- **Brand config:** `shared/brand.ts` (new), `shared/services.ts` (new,
  centralizes package/add-on data previously duplicated across Pricing.tsx,
  Home.tsx, and a stale/mismatched copy in Services.tsx), `shared/serviceArea.ts`
  (new).
- **Visual identity:** `client/src/index.css` (palette: purple/violet hue
  ~295 → graphite + brass hue ~75; font: Syne → Fraunces for display type),
  `client/public/brand/forma-wordmark.svg` + `forma-icon.svg` (new
  placeholder logo assets — see "Logo" below).
- **Metadata:** `client/index.html`, `client/public/manifest.json`,
  `client/public/sitemap.xml`, `client/src/components/SEO.tsx` (title,
  description, Open Graph, Twitter Card, `localBusinessSchema` / `faqSchema`
  / `serviceSchema` / `breadcrumbSchema`).
- **Shared UI:** `SiteHeader.tsx`, `SiteFooter.tsx` (nav restructured — see
  "Navigation" below; logo, phone/email fallbacks, social links, rebrand
  notice line).
- **Pages:** Home, Services, Pricing, About, Contact, FAQ, Gallery, Blog,
  LocationPage, CustomerPortal, InvoiceDetail, auth pages (Login/Register/
  ForgotPassword/ResetPassword/AcceptInvite) — brand name, logo, phone/email
  fallback values, package name (`The Lab Grade Detail` → `The Signature
Detail`).
- **New pages:** `CeramicCoatings.tsx`, `PaintCorrection.tsx`,
  `MobileDetailing.tsx`, `ServiceArea.tsx` — previously these were only
  anchor tabs inside Pricing.tsx; the nav now requires dedicated URLs.
- **Admin:** `AdminLayout.tsx`, `AdminSiteEditor.tsx`, `AdminUrable.tsx`.
- **Server:** `email.ts` (templates), `routers/*.ts` (fallback contact
  values, new `checkServiceArea` procedure), `_core/index.ts`,
  `package.json` (npm package name), `DEPLOY.md`, `todo.md`.
- **Booking architecture (new):** `server/booking/` (BookingProvider
  abstraction — see `docs/URABLE_INTEGRATION.md`), `/book` route (canonical,
  alias of the existing wizard at `/booking`), honest status handling on
  `BookingConfirmation.tsx` (previously always said "Booking Confirmed!"
  regardless of actual sync status — that was a real bug, now fixed),
  service-area validation wired into the location step.
- **Database:** `drizzle/0012_forma_rebrand_content.sql` (fixes admin-edited
  `siteContent`/`businessSettings` rows that had the old brand name baked
  into stored copy — uses `REPLACE()`, so it's a no-op wherever the old name
  isn't present), `drizzle/0013_booking_provider_integration.sql`
  (provider-status columns, `integrationMappings`, `bookingDrafts`,
  `media.bookingDraftId`).
- **Tooling:** `scripts/check-legacy-brand.mjs` + `npm run check:legacy-brand`.

## Old → new URL map

No URL was removed or redirected to the homepage. The site's existing
structure was preserved; new pages were **added**, not substituted:

| Old                                                                                        | New / Status                                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/booking`                                                                                 | Still live (alias). `/book` is now the canonical link target everywhere in the UI, and carries the canonical `<link>` tag.                              |
| `/booking/confirmation/:id`                                                                | Still live (alias). `/book/confirmation/:id` is canonical going forward.                                                                                |
| `/pricing?tab=ceramic`                                                                     | Still works (tab still exists on Pricing.tsx). `/ceramic-coatings` is a new, more complete dedicated page and is the link target from nav/homepage now. |
| `/pricing?tab=paint`                                                                       | Still works. `/paint-correction` is the new dedicated page.                                                                                             |
| `/services`, `/pricing`, `/about`, `/gallery`, `/contact`, `/faq`, `/blog`, location pages | Unchanged URLs, content refreshed in place.                                                                                                             |
| _(new)_ `/mobile-detailing`, `/service-area`                                               | Net-new pages required by the nav spec — no prior URL to preserve.                                                                                      |

**No redirect rules were added**, because no URL was retired. `/booking` and
`/pricing?tab=X` remain fully functional; this avoids the exact anti-pattern
the brief warns against ("do not redirect every old page to the homepage").

## Domain migration (not yet executed)

The site is still served from `detailinglabswi.com`. `shared/brand.ts`
distinguishes:

- `BRAND.domain.legacy` / `BRAND.domain.live` = `detailinglabswi.com` (what's
  actually deployed right now — canonical tags, sitemap, and OG tags all
  point here on purpose).
- `BRAND.domain.primary` = `formaautospa.com` (**placeholder** — not
  registered, not deployed).

### Steps to execute the real cutover, when the domain exists

1. Register the real domain and update `shared/brand.ts` (`domain.primary`),
   `client/index.html` canonical/OG tags, `client/public/sitemap.xml`
   (all `<loc>` entries), `client/src/components/SEO.tsx` (`SITE_URL`).
2. In Railway: web service → Settings → Networking → add the custom domain,
   add the DNS records Railway shows.
3. Keep `detailinglabswi.com` pointed at the same Railway service (don't
   drop it) and add a server-side redirect from the old domain to the new
   one once the new domain's SSL is provisioned — **do not redirect
   path-by-path to the homepage; preserve the path** (e.g.
   `detailinglabswi.com/services` → `formaautospa.com/services`).
4. Update `EMAIL_FROM`/`URABLE_*` webhook URLs and SendGrid sender domain
   authentication for the new domain (see below).
5. Generate a real 1200×630 OG image and swap the temporary fallback (the
   old CloudFront logo, currently reused in `client/index.html` and
   `shared/brand.ts`'s `logo.ogImageAbsoluteUrl` so social previews don't
   404 — flagged with `TODO(rebrand)` comments at both call sites).

### DNS considerations

- Keep TTLs low (300s) during cutover.
- Don't deprovision the old domain's Railway binding until the new one is
  confirmed serving correctly — the guidance to "keep the old domain
  operational as a redirect after the new domain launches" is unmet until
  step 3 above is done.

### Search Console / analytics

- Add the new domain as a Search Console property; do **not** remove the
  old one until redirects are live and re-indexing has started.
- Submit the updated `sitemap.xml` (already pointing at the new page set)
  under the new property once the domain is live.
- Update the Meta Pixel (`client/index.html`) destination/verification if
  Meta requires domain re-verification.
- If using GA4/Umami (`VITE_ANALYTICS_*` env vars), no code change is
  needed — same site, same tracking ID, new domain is just another
  hostname.

### Email-domain changes

- `EMAIL_FROM` currently defaults to `noreply@detailinglabswi.com`
  (`server/email.ts`) — this is a **live, SendGrid-authenticated sender**.
  Do not change it until `noreply@formaautospa.com` (or similar) has
  completed SendGrid Sender Authentication, or transactional email
  (password resets, booking confirmations, invoices) will silently stop
  delivering.
- Same caution applies to `shared/brand.ts`'s `emailLive`/`emailFromLive`
  vs. `email`/`emailFrom` split — the `Live` variants are the real,
  deliverable addresses; the non-`Live` ones are aspirational placeholders
  on the new domain. Functional code paths (contact form replies, invoice
  sender, password reset) intentionally still use the `Live` variants.

### Urable branding changes

See `docs/URABLE_REBRAND_CHECKLIST.md` — none of this is executable from
the codebase.

## Rollback instructions

Everything in this migration is a normal set of commits on the
`rebrand/forma-auto-spa` branch, isolated from `main`:

1. `git log rebrand/forma-auto-spa` to review the commit history.
2. To fully roll back before merging: simply don't merge the branch, or
   `git checkout main` and continue from there — `main` was never modified.
3. If already merged and deployed: `git revert` the merge commit (preferred
   over `reset --hard` on a shared branch), then redeploy. The database
   migrations (`0012`, `0013`) are additive/idempotent — `0012` only
   rewrites rows that already contain the old brand string, and `0013` only
   adds new nullable columns/tables, so rolling back the application code
   does not require rolling back the database.
4. DNS/domain changes (once executed) are the one non-trivial rollback:
   keep the old domain's Railway binding alive through the whole rollout so
   reverting DNS is a same-day operation if needed.
