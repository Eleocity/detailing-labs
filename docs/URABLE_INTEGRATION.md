# Urable Integration — What's Actually Proven vs. What's Assumed

This document is the honest record of what the Forma Auto Spa website can and
cannot do against the real Urable account today, and what the
`BookingProvider` abstraction (`server/booking/`) does about the gap.

**Read this before touching anything Urable-related.** The single biggest
risk in this integration is guessing at request/response shapes that Urable
doesn't actually support — this doc exists so nobody has to guess twice.

## Update 2026-09-06 — Jobs is a real, documented endpoint

Everything below this note originally said there was no public Jobs
endpoint. That was true when it was written, but it undersold the actual
API: **`https://app.urable.com/docs/openapi.yaml` is a real, complete,
current OpenAPI 3.0.3 spec** (the interactive docs at
`https://app.urable.com/docs/` render it with Scalar — view-source /
`curl` shows only the shell, but the browser-rendered page links straight
to the raw spec). It documents `Jobs`, `Events`, `Orders`, and `Payments`
as real resources, not just `Customers` and `Items`.

`POST /v1/jobs` (scope `jobs:write`) creates a Job with `customerId`,
`industry`, `itemIds` (the vehicle Item(s) the job is for), `type`
(`shop`/`field`), `location` (required for `field` jobs, defaulting to the
customer's), `start`/`end` (Unix ms), and `lineItems` (each referencing an
existing `productServiceId` + `quantity` — **not** the vehicle Item). A Job
defaults to `status: "scheduled"`, and setting `start`/`end` puts it
directly on the account's calendar — **no separate Event is needed** for a
service appointment. This answers the "does creating a Job reserve capacity
immediately" question this doc used to flag as unknown: yes, at the
schema level. There's still no atomic conflict/double-booking check
documented anywhere in the spec, so two customers picking the same
self-generated slot (see the Known Gaps note on availability, below) can
still both land real Jobs at the same time — this is a pre-existing risk of
the whole booking flow (no availability endpoint exists to check against
either), not something the Jobs endpoint makes worse.

`lineItems[].productServiceId` references **Products & Services**
(`/v1/products`) — a resource distinct from `Items`. This matters because
the existing admin catalog-sync panel (`syncItemToUrable` in
`server/urable.ts`) pushes packages to `/v1/items` instead, which is the
wrong resource for this purpose — a pre-existing mismatch, not fixed as
part of this change (out of scope; the sync panel may serve some other
purpose today that isn't broken by leaving it alone). `server/urable.ts`
now has a separate, correctly-targeted `findOrCreateUrableProductService`
that hits `/v1/products` for exactly this need.

**What this update implemented:** `UrableApiBookingProvider.createBooking`
(only that provider — `RequestOnlyBookingProvider` is untouched and stays
conservative) now creates a real Job after the existing customer/vehicle
sync, and reports `status: "confirmed"` with a real `externalJobId` when it
succeeds. Falls back to the previous `requires_review` (customer/vehicle
synced, no Job) if a package name or total amount is missing, or if the Job
request itself fails — never fails the local booking. Job pricing comes
from whatever price is currently stored on the referenced Products &
Services catalog entry (created fresh at the booking's current total if one
doesn't exist yet for that package name) — not from a price sent with the
line item, since the API doesn't accept one. That means the Urable invoice
can drift from the exact locally-quoted total (add-ons aren't represented
as separate priced line items, and a later local price change won't
retroactively update an already-created catalog entry). Forma's own
`bookings` table remains the authoritative billing record; the Job exists
to make the appointment visible on Urable's calendar for ops, not to
duplicate billing.

**Not yet done:** this was verified against the documented schema, not
against a live call — no API key with `jobs:write` existed at the time this
was written (see the brief that prompted this: a key named "Forma website
/book sync" needs creating with `customers:read`, `customers:write`,
`items:write`, `products:read`, `products:write`, `jobs:write`). Once that
key exists and `URABLE_API_KEY` + `BOOKING_PROVIDER=urable-api` are set on
Railway, a real test booking on `/book` is the actual proof — check that it
creates a visible Job on Urable's calendar and that `bookings.urableJobId`
gets populated. Real `PATCH`/`DELETE /v1/jobs/{id}` endpoints exist too
(reschedule/cancel), but `updateBooking`/`cancelBooking` still throw
`NotSupportedError` — wiring those up wasn't part of this task and deserves
its own pass (e.g. confirming what `status: canceled` should actually mean
for a job with money already collected).

## What's proven (built against the live account, in `server/urable.ts`)

- **Base URL:** `https://app.urable.com/api`
- **Auth:** `Authorization: Bearer <URABLE_API_KEY>` header. Key lives only
  server-side (`process.env.URABLE_API_KEY`), never sent to the browser.
- **Customers** (`/v1/customers`): find by email (`GET ?email=`), create
  (`POST`), update (`PATCH /:id`). Payload uses `firstName`/`lastName`,
  `phoneNumbers: [{label, value}]`, `emails: [{label, value}]`,
  `locations: [{label, value}]`, `notes`, `origin`.
- **Items** (`/v1/items`) — in Urable's automotive-industry data model, an
  "Item" represents a _vehicle_, not a line-item/product. Create
  (`POST`) with `customerId`, `type: "automotive"`, `name`,
  `vins: [{label, value}]`, `licensePlates: [{label, value}]`, `notes`.
  Also reused (confusingly) for the admin catalog-sync panel to push
  services/packages as generic named items with a `price`.
- **Dedup:** customers are matched by email before creating a new one, so
  repeat bookings from the same email don't create duplicate Urable
  customers. (Phone-based matching is not yet implemented — see Known Gaps.)

## What's NOT proven — and therefore not implemented

Jobs is now real and used (see the 2026-09-06 update above) for creation
only. Events, Orders, and Payments are documented in the OpenAPI spec too,
but nothing in this codebase calls them yet, and the following are still
genuinely unknown because no live call has confirmed them:

- How assigned staff/labor duration are best represented for this account's
  workflow (Job has `userIds`, unused here).
- How deposits/payments actually get associated with a job in practice
  (`POST /v1/payments` exists in the spec — do NOT build a parallel Stripe
  flow until this is verified; see the Deposits section of the original
  task brief: a successful payment alone must never be treated as a
  confirmed appointment unless schedule capacity is also reserved).
- How rescheduling or cancellation should be represented for a job that may
  already have money collected (`PATCH`/`DELETE /v1/jobs/{id}` exist in the
  spec, but `updateBooking`/`cancelBooking` still throw `NotSupportedError`
  — see the note above).
- Whether creating a Job reliably avoids double-booking in practice — the
  spec documents no conflict check, so this needs a real test, not just a
  schema read.

**Nothing above is guessed at anywhere in this codebase.** Where a
capability isn't verified, the fallback is `NotSupportedError` (thrown
explicitly, never swallowed) or, for `request-only` mode, a formatted note
on the Urable customer record (`appendBookingNoteToUrableCustomer` in
`server/urable.ts`) — never an invented request shape.

## The BookingProvider abstraction (`server/booking/`)

```ts
interface BookingProvider {
  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  updateBooking(
    externalId: string,
    input: UpdateBookingInput
  ): Promise<UpdateBookingResult>;
  cancelBooking(
    externalId: string,
    reason?: string
  ): Promise<CancelBookingResult>;
}
```

Selected via the `BOOKING_PROVIDER` env var (`server/booking/index.ts`):

| Value                    | Class                              | Behavior                                                                                                                                                                                                                                                                             |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request-only` (default) | `RequestOnlyBookingProvider`       | Syncs customer + vehicle to Urable if configured, appends a booking note, returns status `requested`/`requires_review`. Never claims "confirmed" — deliberately does not create a Job even though the endpoint exists. `getAvailability` returns `{supported: false}` gracefully — no availability grid is shown in this mode. |
| `urable-api`             | `UrableApiBookingProvider`         | Same customer/vehicle sync, then creates a real Job (`POST /v1/jobs`) and returns `confirmed` with `externalJobId` when that succeeds — falls back to `requires_review` if a package/total is missing or the Job request fails. `getAvailability`, `updateBooking`, and `cancelBooking` still throw `NotSupportedError` (no proven availability check; update/cancel endpoints exist but aren't wired up yet). |
| `urable-virtual-shop`    | `UrableVirtualShopBookingProvider` | Best-effort pre-sync of customer/vehicle, then hands off to `URABLE_VIRTUAL_SHOP_URL` with the local booking reference and `utm_*` attribution in the query string (no PII in the URL). Returns status `awaiting_scheduling` with a `handoffUrl`.                                    |

An unset or unrecognized `BOOKING_PROVIDER` value falls back to
`request-only` (logged as a warning) — the only mode proven end-to-end, so a
misconfiguration degrades to "works safely," not "breaks silently."

### `NotSupportedError`

Thrown, never swallowed into a generic failure, whenever an operation would
require guessing at an unproven Urable schema. Callers (see
`server/routers/bookings.ts`) catch it, log which provider/operation was
unsupported, and mark the booking `failed_sync` with a customer-safe message
— the local booking record is always the fallback source of truth.

## Where this is wired in today

`server/routers/bookings.ts` → `create` mutation calls
`getBookingProvider().createBooking(...)` after the booking row is inserted
locally (non-blocking). The result's `status`/`message`/external IDs are
written to new `bookings` columns (`providerName`, `providerStatus`,
`providerMessage`, `externalEventId` — see
`drizzle/0013_booking_provider_integration.sql`), which
`BookingConfirmation.tsx` reads to show an honest status instead of an
unconditional "Confirmed!" (that was a real bug in the pre-rebrand page —
fixed as part of this work).

## Integration mapping (`integrationMappings` table)

Local `customerId`/`vehicleId`/`bookingId` ↔ Urable `customer`/`vehicle`/
`job`/`event`/`order` IDs, plus `syncStatus`, `lastSyncedAt`, `lastError`,
and an `idempotencyKey`. Today only the simpler `customers.urableId` /
`bookings.urableJobId` columns are actually written to (pre-existing
pattern, left in place to avoid a risky mid-flight schema cutover); the
richer `integrationMappings` table is in place and ready for the admin sync
panel / a future retry-queue to use once there's a second write path that
needs it (e.g. reconciling failed syncs).

## Before implementing real Events/Orders/Payments support (Jobs is done — see above)

1. Get current Urable OpenAPI docs (`https://app.urable.com/docs/openapi.yaml`
   — fetch it directly; the rendered docs page alone won't show it without a
   JS-executing client) and find the actual resource, confirming it applies
   to this account's plan/API key scope.
2. Confirm: does creating it reserve capacity immediately, or is a separate
   step required? (Answered for Jobs: yes, directly — see above.)
3. Confirm the deposit/payment association mechanism — do NOT build a
   parallel Stripe flow until this is verified (see the Deposits section of
   the main task brief: a successful payment alone must never be treated as
   a confirmed appointment unless schedule capacity is also reserved).
4. Add exactly one new provider method per verified capability, backed by
   the real response shape — not the shape that seems reasonable.
5. Keep `NotSupportedError` for everything still unverified.

## Known gaps / follow-ups

- **Phone-based dedup:** customer matching is email-only today. If a repeat
  customer books with a different email, a duplicate Urable customer can be
  created. Normalized phone matching (per the task brief's "do not create
  duplicate Urable customers" requirement) is not yet implemented.
- **Webhooks:** `server/routers/urable.ts` has a webhook parser
  (`parseUrableWebhook`) but no confirmed list of event types Urable
  actually sends — treat any webhook handling as provisional until Urable's
  webhook payloads are verified against real traffic.
- **Availability UI:** since no provider currently supports real
  `getAvailability`, the booking wizard's date/time step should present
  itself as a _preferred_ time, not a live availability grid, in every
  mode. (The existing `/booking` wizard generates its own slot list
  client-side — that's a self-managed preference list, not real Urable
  availability. Don't read it as a live calendar.)
