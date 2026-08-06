# Urable Integration — What's Actually Proven vs. What's Assumed

This document is the honest record of what the Forma Auto Spa website can and
cannot do against the real Urable account today, and what the
`BookingProvider` abstraction (`server/booking/`) does about the gap.

**Read this before touching anything Urable-related.** The single biggest
risk in this integration is guessing at request/response shapes that Urable
doesn't actually support — this doc exists so nobody has to guess twice.

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

There is **no confirmed Jobs, Events, Orders, or Payments endpoint** in the
Urable public API as used by this account. Concretely, that means we do not
know:

- How to reserve real schedule capacity for an appointment.
- Whether creating something reserves capacity immediately or requires a
  second step.
- How assigned staff/labor duration are represented.
- How line items and computed invoices are created via API.
- How deposits/payments are associated with a job.
- How rescheduling or cancellation are represented.

**Nothing above is guessed at anywhere in this codebase.** Instead, booking
details are appended as a formatted note on the Urable customer record
(`appendBookingNoteToUrableCustomer` in `server/urable.ts`), which makes the
request visible to staff in the Urable dashboard without inventing a
schema Urable might not actually accept.

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
| `request-only` (default) | `RequestOnlyBookingProvider`       | Syncs customer + vehicle to Urable if configured, appends a booking note, returns status `requested`/`requires_review`. Never claims "confirmed". `getAvailability` returns `{supported: false}` gracefully — no availability grid is shown in this mode.                            |
| `urable-api`             | `UrableApiBookingProvider`         | Same customer/vehicle sync as above, but `getAvailability`, `updateBooking`, and `cancelBooking` throw `NotSupportedError` — there is no proven schema to call. `createBooking` still returns `requires_review`, not `confirmed`, because no schedule capacity is actually reserved. |
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

## Before implementing real Jobs/Events/Orders/Payments support

1. Get current Urable OpenAPI docs (or a support contact) and find the
   actual Jobs/Events/Orders/Payments resources, if they exist for this
   account's plan/API key scope.
2. Confirm: does creating a Job reserve capacity immediately, or is a
   separate Event required?
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
