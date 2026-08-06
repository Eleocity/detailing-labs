# Urable Account Rebrand Checklist (Owner Action Required)

None of the items below can be changed from this repository — they live
inside the Urable account itself. Work through this list when you're ready
to complete the Forma Auto Spa rebrand on the Urable side. Check items off
as you go; nothing here blocks the website launch, but customers will see a
mismatch (Urable emails/portal still saying "Detailing Labs") until it's
done.

- [ ] **Business display name** — Settings → Business Profile → rename to
      "Forma Auto Spa".
- [ ] **Logo** — upload the final Forma Auto Spa logo (replace the
      placeholder SVGs at `client/public/brand/forma-*.svg` in this repo
      with the same final files once designed, so the website and Urable
      match).
- [ ] **Brand colors** — if Urable's customer-facing surfaces (Virtual Shop,
      invoices, quote templates) support custom theming, match the palette
      in `client/src/index.css` (`:root` block) — graphite background,
      brass/gold accent (`oklch(0.72 0.11 75)` ≈ `#c99a4e`).
- [ ] **Virtual Shop branding** — if `BOOKING_PROVIDER=urable-virtual-shop`
      is ever used, the Virtual Shop page itself needs Forma branding before
      customers are handed off to it (see `docs/URABLE_INTEGRATION.md` for
      how the handoff URL is built).
- [ ] **Customer portal branding** — same as above, for any Urable-hosted
      customer-facing portal.
- [ ] **Email sender name** — update Urable's transactional email sender
      display name from "Detailing Labs" to "Forma Auto Spa".
- [ ] **Automated SMS messages** — update any Urable-triggered SMS templates
      (appointment reminders, etc.) that mention the old name.
- [ ] **Automated email messages** — same, for Urable-triggered emails (as
      distinct from this repo's own `server/email.ts` templates, which are
      already updated).
- [ ] **Quote templates** — rename business references inside quote PDFs/pages.
- [ ] **Invoice templates** — same, for Urable-generated invoices (as
      distinct from this repo's own invoice emails in `server/email.ts`).
- [ ] **Service names** — if services/packages are also defined inside
      Urable's own catalog (separate from this site's `packages`/`addOns`
      tables — see `shared/services.ts`), rename them to match: Exterior
      Decon & Shield, Interior Deep Refresh, Full Showroom Reset, The
      Signature Detail, Ceramic Coating, Paint Correction.
- [ ] **Add-on names** — match `shared/services.ts`'s `ADD_ONS` list.
- [ ] **Locations** — update the business location name/address if it
      references the old brand or an outdated address.
- [ ] **Business hours** — confirm they match what's shown on the website
      (`siteContent` table, section `contact`, keys `hours_weekday` /
      `hours_weekend` — editable via Admin → Site Editor).
- [ ] **Booking rules** — lead time, cancellation window, etc. — confirm
      they match the copy on the website (e.g. the "cancel up to 24 hours
      before, no charge" line on the homepage mid-page CTA).
- [ ] **Employee availability** — not touched by this rebrand; confirm it's
      still accurate.
- [ ] **Deposits** — do not build a separate deposit/payment system on the
      website until Urable's own deposit workflow is verified (see the
      Deposits section of `docs/URABLE_INTEGRATION.md` and the main task
      brief). If Urable has deposit rules configured, verify they still
      make sense post-rebrand.
- [ ] **Cancellation policy** — confirm Urable-side policy text matches
      website copy.
- [ ] **Intake questions** — if Urable has its own intake/condition
      questions separate from this site's booking wizard, reconcile with
      the vehicle-condition questions added to `/book` (pet hair, stains,
      odors, paint condition, etc.).
- [ ] **Customer-facing policies** (privacy, terms) — confirm consistency
      between Urable and the website's (currently placeholder) policy links
      in `SiteFooter.tsx`.
- [ ] **API key name and scopes** — if the `URABLE_API_KEY` was created
      under a name referencing "Detailing Labs," consider rotating/renaming
      it. Confirm its scopes still cover Customers + Items (the only
      confirmed-working resources — see `docs/URABLE_INTEGRATION.md`).
- [ ] **Webhook settings** — if webhooks are configured, verify the target
      URL still matches `https://<live-domain>/api/webhooks/urable` after
      any domain cutover (`AdminUrable.tsx` shows the current expected URL,
      sourced from `BRAND.domain.live`).
- [ ] **Website and social links stored in Urable** — update any
      website/Instagram/Facebook/TikTok links Urable stores about the
      business to match `shared/brand.ts`'s `social` block, once those
      accounts are actually renamed (see below).

## Related external accounts (also not executable from this repo)

- [ ] **Google Business Profile** — rename from Detailing Labs to Forma Auto
      Spa. Until this happens, `BRAND.social.googleReviewUrl` in
      `shared/brand.ts` intentionally still points at the old
      `g.page/r/detailing-labs/review` link (a working link beats a broken
      one) — update it once the profile is renamed.
- [ ] **Instagram / Facebook / TikTok** — either rename existing handles or
      create new ones, then update `shared/brand.ts`'s `social` block
      (currently placeholder URLs like `instagram.com/formaautospa`, marked
      `PLACEHOLDER` in comments).
- [ ] **SendGrid** — authenticate the new sending domain before switching
      `EMAIL_FROM` away from `noreply@detailinglabswi.com` (see
      `docs/REBRAND_MIGRATION.md`, "Email-domain changes").
- [ ] **Existing testimonials** (`client/src/pages/Home.tsx`, `testimonials`
      array) — these could not be verified against a live review source
      from within this task. Confirm they're real customer reviews (and
      ideally link out to the actual Google review) or replace them with
      verified ones — do not leave unverifiable quotes live indefinitely.
