# FormaOps — Status

Last updated: 2026-09-01 (tiered vehicle-size pricing gap closed —
`Booking.tsx` and `Pricing.tsx` now resolve prices from the same DB
columns a pricing ChangeRequest actually updates).

## WORKING

- Full Phase 1 governance foundation (schema, permissions, policy,
  ChangeRequest/approval lifecycle, audit log).
- **Hardening fix**: `server/formaops/trpc.ts`'s `withPermissionCheck()` —
  every one of the five `formaops` tRPC procedures runs its permission
  check as a tRPC middleware, structurally before the resolver. Also
  closed an unrelated gap found in the process: `list`/`get` previously had
  **no** permission check at all (any authenticated user could read any
  business's change requests) — now gated on `approvals.read`, which
  required adding that grant to OPERATIONS_MANAGER/MANAGER in the seed
  (the spec says Operations Managers can "view request status"; the
  original seed only gave `approvals.read` to OWNER).
- **Executor registry**: `server/formaops/executors/index.ts` maps a
  category to `{schema, execute}`. Two are wired:
  - **pricing** (`executors/pricing.ts`) — updates `packages.price` and,
    for packages with tiered pricing, `priceSedan`/`priceSuv`/
    `priceLarge` too.
  - **hours** (`executors/hours.ts`) — upserts `siteContent`'s
    `hours_weekday`/`hours_weekend` row.
  Adding a third category's execution is "write an executor file, add one
  line to the registry" — `create()` and `decide()` in `changeRequests.ts`
  are fully generic over the registry, no per-category branching left.
- Status transitions `AWAITING_APPROVAL → APPROVED → EXECUTING →
  COMPLETED`/`FAILED` are real for both wired categories. A failed
  execution (e.g. approving a price change for a package name that
  doesn't exist) surfaces as `FAILED` with the error recorded — `approve()`
  itself does not throw, since the approval genuinely did succeed.
- **Durability fix (required, not optional)**: `server/_core/index.ts`'s
  package seed used to wipe-and-reseed `packages` from hardcoded values on
  every server boot — which would have silently reverted every
  FormaOps-approved price change on the next deploy. Changed to
  insert-if-missing. Real, documented tradeoff in `DECISIONS.md` ADR-007:
  a source-code price edit in `shared/services.ts` no longer automatically
  reaches the DB row once it exists.
- **Page consistency fix**: `Services.tsx` and `Home.tsx` now show the DB
  package price (when a matching row exists) instead of a hardcoded
  catalog number. Found a real, subtle bug doing this: Home.tsx already
  queried the DB for *which* packages to list, but then displayed the
  price from a `VEHICLE_TIERS` lookup that silently overrode the DB value
  for any package with code-based tiered pricing — meaning it looked
  DB-driven but wasn't, for the price specifically. `/pricing`, `/services`,
  and the homepage now all agree after an approved pricing change.

## Verified this session

- `npm run check` — clean (same 9 pre-existing, unrelated errors as
  before any FormaOps work existed)
- `npm test` — 77/79 passing. `server/formaops.test.ts` alone: 19/19 (up
  from 11 at the end of the last session — 8 new tests covering
  permission-middleware behavior, pricing validation/execution, and hours
  validation/execution). The 2 failures (`server/email.test.ts`) are
  pre-existing and environmental (no `SENDGRID_API_KEY`/`EMAIL_FROM` in
  this sandbox).
- `npm run build` — succeeds.
- **Real live-database verification (new this update).** A separate
  Railway MySQL dev database was provisioned; `DATABASE_URL` set locally
  in a gitignored `.env`. `scripts/migrate.mjs` run against it end to end
  through `0014_formaops_governance_foundation.sql`. Two real bugs were
  found and fixed doing this — both were latent in the migration runner
  itself, not FormaOps-specific (see `DECISIONS.md` for detail):
  - `scripts/migrate.mjs`'s statement splitter silently dropped every
    statement after the first in a multi-statement migration file
    whenever the drizzle-kit breakpoint marker was glued to the front of
    the next statement (the common case) — with **zero error reported**.
    Only caught by directly querying `SHOW TABLES` rather than trusting
    the script's own "✅ Applied" output. Fixed to match the
    already-correct logic `server/_core/index.ts` uses for
    auto-migrate-on-boot (which production actually runs).
  - That fix exposed migration `0006` conflicting with `0005` on a fresh
    database (`0006` was a historical patch for `0005` having silently
    failed via the same bug, in production's real history). Rewritten as
    a documented no-op — safe because migrations are tracked by filename
    only, not content hash, so production (which already has `0006`
    marked applied) is unaffected.
  - Both fixes have positive blast radius beyond FormaOps: any future
    multi-statement migration in this repo now actually applies in full
    when run via the manual script, and a fresh database can bootstrap
    from empty without manual intervention.
  - **Full pipeline exercised for real**, not mocked: registered two real
    users through the actual `/register` UI (Playwright), granted one
    `OWNER` and one `OPERATIONS_MANAGER` via direct SQL (no admin UI
    exists yet to do this any other way). As Ops Manager, created a real
    pricing `ChangeRequest` (Full Showroom Reset $229.99 → $259.99) via
    an authenticated tRPC call — came back `AWAITING_APPROVAL` /
    `YELLOW` / `requiredApprovalRole: OWNER`. Ops Manager's own attempt
    to approve it correctly failed `FORBIDDEN` (self-approval block). As
    Owner, approved it — response showed `COMPLETED`
    (`APPROVED → EXECUTING → COMPLETED` ran synchronously in one call).
    Confirmed directly in the database: `packages.price` is now
    `259.99`, and `auditEvents` has exactly the 3 expected rows
    (`change_request.created` → `change_request.approved` →
    `change_request.executed`, the last one's metadata correctly showing
    `{before: 229.99, after: 259.99}`).
  - Screenshotted `/`, `/services`, and `/pricing?tab=detailing` (Sedan
    selected) against the live dev server after the change. `/services`
    and `/` correctly show **$259.99** for Full Showroom Reset — this is
    the DB-price-with-catalog-fallback path actually exercising the
    DB-price branch for the first time (previously only the fallback
    branch had ever been exercised — this closes former Known Issue #1).
    `/pricing`'s Sedan-tier checkout price at that point still showed the
    **old** $229.99 — the documented tiered-pricing ceiling, confirmed
    live rather than theoretical. **This has since been fixed** — see
    "Tiered pricing gap closed" immediately below, re-verified live after
    the fix: `/pricing` with Sedan selected now also shows $259.99.

- **Tiered pricing gap closed.** `packages` now has `priceSedan`/
  `priceSuv`/`priceLarge` columns (migration
  `0015_package_vehicle_tier_pricing.sql`, backfilled from each tiered
  package's current price so the already-approved Full Showroom Reset
  change was preserved, not reset). `resolvePackagePrice()` in
  `shared/services.ts` now checks the DB tier columns first, falling back
  to the static catalog only when a DB tier is unset — both `Booking.tsx`
  (the actual checkout price) and `Pricing.tsx` (the tier display) call
  the same function with the same precedence, so they can no longer
  disagree. The `pricing` executor (`executors/pricing.ts`) now accepts
  optional `newPriceSuv`/`newPriceLarge` alongside the existing
  `newPrice` (still the base/sedan price) — a ChangeRequest can update
  just the base price (existing behavior, unchanged) or all three tiers
  in one approval. A package with no existing tiered pricing never gets
  tier columns invented, even if suv/large values are supplied. Re-ran
  the full migration against the live dev DB and re-screenshotted
  `/pricing` with Sedan selected: now shows $259.99, matching `/services`
  and `/` — the inconsistency is gone. 5 new tests cover the executor's
  tiered-update paths and `resolvePackagePrice`'s DB-preference order
  (`server/formaops.test.ts`: 19→22, `server/brandConfig.test.ts`: 14→16);
  full suite now 82/84 (up from 77/79 — same 2 pre-existing environmental
  failures), `npm run check` still clean, `npm run build` still succeeds.

## PARTIAL

- **Two categories, not five.** `services`, `promotions`, `content`,
  `business_profile` still have no executor — approving one of those is
  indistinguishable from before any of this session's work.
- **Hours execution is narrow by design**: only the standing
  weekday/weekend strings. No per-date override (the spec's own "change
  tomorrow's closing time to 3" example is NOT representable yet — see
  `executors/hours.ts`'s header comment).
- **Residual security gap unchanged from last session**: a future
  procedure could still be written without `withPermissionCheck`,
  bypassing the guarantee. See `SECURITY.md` "Residual gap."

## NOT IMPLEMENTED

Everything in Phases 3-10 of `ROADMAP.md`, plus the untouched parts of
Phase 2:

- No admin UI — `changeRequests` are reachable only via direct tRPC calls
- No submitter-initiated cancellation
- No per-date hours override
- No `services`/`promotions`/`content`/`business_profile` executors
- No OpenAI dependency, no chat, no SMS, no website inspector, no
  code-change pipeline, no deployment automation

## KNOWN ISSUES

1. **RESOLVED (previous update).** `DATABASE_URL` is now configured (a
   dedicated Railway dev database, gitignored `.env`). The full pipeline
   has been verified live end to end — see "Verified this session" above.
2. `MANAGER` role still has identical grants to `OPERATIONS_MANAGER`
   (unchanged — no code path distinguishes them yet).
3. **RESOLVED this update.** `packages` now carries `priceSedan`/
   `priceSuv`/`priceLarge` (migration `0015`), and `resolvePackagePrice()`
   checks those before falling back to the static catalog. Approving a
   pricing ChangeRequest for a tiered package now reaches the actual
   checkout price on `/book`, not just the flat price on `/services`/`/`.
   Re-screenshotted `/pricing` with Sedan selected after the fix: $259.99,
   matching every other page. See "Tiered pricing gap closed" above.
4. `addOns` still has the same wipe-and-reseed durability bug `packages`
   had — deliberately not fixed, since no executor writes to it yet (see
   `DECISIONS.md` ADR-007's closing note).

## NEXT RECOMMENDED WORK

Wire a third executor. `ROADMAP.md` suggests `services` or `promotions` as
next-simplest but doesn't pick one — that's a real product-priority
question (which kind of change does the business actually want to make
through FormaOps first?), not an engineering judgment call, so it's left
for `DECISIONS.md`'s open list rather than assumed.
