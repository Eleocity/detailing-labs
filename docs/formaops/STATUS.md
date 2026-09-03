# FormaOps — Status

Last updated: 2026-09-03 (real OpenAI key confirmed working end-to-end —
blocked only on the account having no billing credits; third executor,
`services`, wired while waiting on that).

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
  category to `{schema, execute}`. Three are wired:
  - **pricing** (`executors/pricing.ts`) — updates `packages.price` and,
    for packages with tiered pricing, `priceSedan`/`priceSuv`/
    `priceLarge` too.
  - **hours** (`executors/hours.ts`) — upserts `siteContent`'s
    `hours_weekday`/`hours_weekend` row.
  - **services** (`executors/services.ts`, new) — adds or removes one line
    item from a package's `features` list (the included-services shown on
    `/pricing`, `/services`, and the booking wizard). Action-based
    (add/remove one item), not "replace the whole list," so a proposer
    never has to correctly restate every existing item to change one.
    Chosen over `promotions` as a judgment call while the owner was
    unavailable to pick (`DECISIONS.md` records the reasoning) — flag if
    `promotions` was actually wanted instead.
  Adding a further category's execution is "write an executor file, add
  one line to the registry" — `create()` and `decide()` in
  `changeRequests.ts` are fully generic over the registry, no
  per-category branching left. The FormaOps Manager agent's tools stay in
  sync with this registry by hand (`propose_services_change` was added to
  `agents/tools.ts` alongside the executor, not left to drift).
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
- **Phase 3 admin UI**: `/admin/change-requests`
  (`client/src/pages/admin/AdminChangeRequests.tsx`) — submit a pricing or
  hours change (package dropdown pulls live from the DB; vehicle-tier
  fields appear automatically for packages that have them), see what's
  awaiting approval, approve/reject, browse history. Gated by the existing
  legacy `users.role` admin check to even load the page, same as every
  other `/admin/*` page — the FormaOps-specific authorization (which
  business role can do what) is still enforced entirely server-side by
  `withPermissionCheck`; the UI does no client-side permission hiding and
  just surfaces whatever error a mutation returns (verified live: an
  owner's own self-approval attempt through this page surfaced the exact
  "You cannot approve or reject your own request" error, not a silent
  failure or a hidden button).
- **FormaOps Manager agent (Phase 4/5 groundwork)**:
  `server/formaops/agents/{tools,manager,budget}.ts`. `handleIncomingMessage()`
  is a single channel-agnostic entry point — a future SMS webhook and the
  current web chat panel both call it identically, so the agent can't
  behave differently per channel by construction, not by later discipline
  (`DECISIONS.md` open decision #2 required this). Tools: `get_pricing`/
  `get_hours` (read-only) and `propose_pricing_change`/
  `propose_hours_change`, which call the exact same
  `changeRequestsService.create()` the admin UI and tRPC router call — no
  privileged shortcut, and no approve/execute/deploy/SQL tool exists for
  it to call, per `AGENTS.md`'s boundary. `budget.ts` enforces the
  $20/month cutoff (`DECISIONS.md` open decision #1): checked before every
  run via a new `aiUsageLedger` table (migration
  `0016_ai_usage_ledger.sql`, one row per business per calendar month),
  not just logged after. `handleIncomingMessage` never throws — every
  failure (budget exceeded, OpenAI error, unusable output) degrades to a
  reply pointing at `/admin/change-requests`, which never calls OpenAI, so
  a broken agent never blocks real work. Wired into the admin UI as an
  "Ask the AI" chat panel on `/admin/change-requests` via a new
  `formaops.agent.chat` tRPC mutation, gated on "is this user a member of
  this business at all" (not a specific permission — the real
  category-specific permission is still enforced deeper, inside
  `changeRequestsService.create()`, exactly when a tool tries to actually
  propose something).

## Verified this session (2026-09-03)

- **Real `OPENAI_API_KEY` confirmed working end-to-end, blocked only on
  billing.** Restarted the dev server to pick up the new env var (env
  vars aren't hot-reloaded by `tsx watch` — only file changes are; editing
  `.env` alone left the running process on its old, empty environment).
  Sent a real message through the live "Ask the AI" panel — the request
  genuinely reached OpenAI (not a config error) and OpenAI rejected it
  with **"You have no credits remaining"** (HTTP 429, an account/billing
  issue, not a bug). `handleIncomingMessage`'s error handling worked
  exactly as designed: the raw OpenAI error was caught and shown as a
  clean, readable message in the chat log, not a crash or a raw stack
  trace. **Still unverified**: an actual successful agent response — that
  needs the OpenAI account to have billing/credits added at
  platform.openai.com, not any further code change here.
- **Third executor wired: `services`.** `server/formaops/executors/services.ts`
  adds/removes one `features` line item on a package; registered in
  `executors/index.ts`; a matching `propose_services_change` tool added to
  the agent (`agents/tools.ts`); a third "Services change" tab added to
  `/admin/change-requests`'s form. 5 new tests
  (`server/formaops.test.ts`: 22→27) cover validation, add, remove, the
  add-already-present/remove-already-absent no-op cases, and the
  package-not-found FAILED path. Full pipeline verified live against the
  real dev DB: submitted "add Interior UV protectant treatment to The
  Signature Detail" through the actual admin form (not a script), approved
  it as a second real OWNER account, confirmed `packages.features` in the
  database actually gained the new line and the audit trail's `before`/
  `after` metadata is correct, and confirmed `/pricing` (which has no cap
  on the rendered feature list) shows the new item live.
- **Found and fixed a real, second instance of the "looks DB-driven but
  isn't" bug class** (same class as the `VEHICLE_TIERS` bug found earlier
  this session in `Home.tsx`): `Services.tsx` already read the DB `price`
  for its package cards, but its included-items list still came from the
  static `shared/services.ts` catalog even though `Pricing.tsx` and
  `Booking.tsx` both already read `pkg.features` from the DB. Once the
  `services` executor made that DB column real, this became a genuine gap
  — an approved services change would silently not show on `/services`
  while showing everywhere else. Fixed the same way the price gap was
  fixed: prefer the DB `features` list when the package has one, fall back
  to the static catalog's `included` only when it doesn't (quote-only
  packages, or a name-based rename lookup miss). Full suite now 93/95
  (up from 88/90 — the 5 new `services` tests; same 2 pre-existing
  environmental failures), `npm run check` clean, `npm run build`
  succeeds.

## Verified this session (2026-09-01)

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

- **FormaOps Manager agent — built, typechecked, NOT run against a real
  OpenAI key.** No `OPENAI_API_KEY` exists in this working environment.
  What was actually verified: `npm run check` and `npm run build` both
  stay clean with `@openai/agents` installed and the SDK's `tool`/`Agent`/
  `run`/`errorFunction`/`result.state.usage` APIs used as documented
  (confirmed against the SDK's own docs and source, not assumed from
  training knowledge, since model/pricing/API details shift); 6 new tests
  for `budget.ts`'s pure logic (cutoff threshold, insert-vs-update
  running-total math) all pass; and, live in a real browser logged in as
  the OWNER test account, the "Ask the AI" panel on `/admin/change-requests`
  correctly sent a message, called `formaops.agent.chat`, and displayed
  the graceful `PRECONDITION_FAILED` error ("The AI agent isn't configured
  yet (missing OPENAI_API_KEY)") in the chat log — no crash, no raw stack
  trace. **What was NOT verified**: that the agent actually calls OpenAI
  successfully, that its instructions produce sensible tool calls, that
  `gpt-5-mini` (the default model) is a real, currently-callable model ID,
  or that the budget cost-per-token defaults are accurate for whatever
  model actually gets used. All of that needs a real `OPENAI_API_KEY`.

## PARTIAL

- **Three categories, not five.** `promotions`, `content`,
  `business_profile` still have no executor — approving one of those is
  indistinguishable from before any of this session's work.
- **Hours execution is narrow by design**: only the standing
  weekday/weekend strings. No per-date override (the spec's own "change
  tomorrow's closing time to 3" example is NOT representable yet — see
  `executors/hours.ts`'s header comment).
- **Residual security gap unchanged from last session**: a future
  procedure could still be written without `withPermissionCheck`,
  bypassing the guarantee. See `SECURITY.md` "Residual gap."
- **FormaOps Manager agent's plumbing is confirmed live** (a real message
  genuinely reached OpenAI and the response — an error — was handled
  correctly) **but a real successful response is still unverified**,
  blocked on the OpenAI account having no billing credits. Not a code
  problem — see "Verified this session (2026-09-03)" above.

## NOT IMPLEMENTED

Everything in Phases 6-10 of `ROADMAP.md`, the untested/SMS parts of
Phases 4-5 (see PARTIAL above), plus the untouched parts of Phase 2:

- No submitter-initiated cancellation
- No per-date hours override
- No `promotions`/`content`/`business_profile` executors
- No SMS transport or phone-number → user identity mapping (needs Twilio
  inbound credentials — see `DECISIONS.md` open decision #2)
- No tracing/observability for the agent
- No website inspector, no code-change pipeline, no deployment automation

## KNOWN ISSUES

1. **RESOLVED (previous update).** `DATABASE_URL` is now configured (a
   dedicated Railway dev database, gitignored `.env`). The full pipeline
   has been verified live end to end — see "Verified this session" above.
2. `MANAGER` role still has identical grants to `OPERATIONS_MANAGER`
   (unchanged — no code path distinguishes them yet).
3. **RESOLVED (previous update).** `packages` now carries `priceSedan`/
   `priceSuv`/`priceLarge` (migration `0015`), and `resolvePackagePrice()`
   checks those before falling back to the static catalog. Approving a
   pricing ChangeRequest for a tiered package now reaches the actual
   checkout price on `/book`, not just the flat price on `/services`/`/`.
   Re-screenshotted `/pricing` with Sedan selected after the fix: $259.99,
   matching every other page. See "Tiered pricing gap closed" above.
4. `addOns` still has the same wipe-and-reseed durability bug `packages`
   had — deliberately not fixed, since no executor writes to it yet (see
   `DECISIONS.md` ADR-007's closing note).
5. **Still open**: `FORMAOPS_AGENT_MODEL` defaults to `"gpt-5-mini"` and
   the budget cost-per-token defaults assume that model's published
   pricing — neither has been confirmed against a live OpenAI account
   (blocked on the same missing billing credits as the rest of live agent
   testing). Verify both (or override via `FORMAOPS_AGENT_MODEL` /
   `FORMAOPS_AGENT_INPUT_COST_CENTS_PER_1M` /
   `FORMAOPS_AGENT_OUTPUT_COST_CENTS_PER_1M`) once credits are added,
   before relying on the $20/month cutoff being accurate.
6. **RESOLVED this update.** `Services.tsx`'s included-items list now
   reads the DB `features` column when a matching package row has one,
   same as `Pricing.tsx`/`Booking.tsx` already did — see "Found and fixed
   a real, second instance of..." above.

## NEXT RECOMMENDED WORK

1. **Add billing credits to the OpenAI account** at
   platform.openai.com/settings/organization/billing — this is the only
   remaining blocker on verifying the agent actually works, not a code
   change. Confirmed working end-to-end otherwise (see "Verified this
   session (2026-09-03)" above).
2. Once verified, wire real Twilio inbound SMS (needs
   `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/a number capable of receiving
   SMS, and a public webhook URL — a local dev server can't receive
   Twilio's webhook without a tunnel). Confirm the same Twilio account
   already used for outbound reminders is the intended one first
   (`DECISIONS.md` open decision #2), and design phone-number → user
   identity resolution (not built yet).
3. **Done**: a third executor (`services`) is wired — see WORKING above.
   `promotions`/`content`/`business_profile` remain, in that rough order
   of likely usefulness, but still no forcing product reason to pick one
   over the others yet.
