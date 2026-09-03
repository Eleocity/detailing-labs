# FormaOps — Status

Last updated: 2026-09-03 (SMS transport + phone-number identity
resolution built: signature-verified Twilio webhook, phone → user →
business resolution, wired into the same `handleIncomingMessage()` the
web chat uses. Verified everything that can be verified without a real
Twilio account — signature crypto, identity resolution, and the full
agent pipeline against the real dev DB — but sending an actual SMS still
needs real `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/a number).

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
- **SMS transport + phone-number identity resolution.**
  `POST /api/webhooks/twilio-sms` (`server/_core/index.ts`, grouped with
  the existing Square/Urable webhooks): verifies the `X-Twilio-Signature`
  header with the official `twilio` package's `validateRequest` before
  touching anything else in the request — a failure rejects with 403, not
  a warn-and-continue. `server/formaops/agents/identity.ts`'s
  `resolvePhoneToBusinessUser()` matches the texting number against
  `users.phone` (last-10-digits comparison via `shared/brand.ts`'s
  `phoneDigits()`, so storage-format differences and a US country-code
  prefix don't cause a false miss), refuses to guess if a number matches
  more than one account, and confirms the matched user actually has a
  FormaOps membership on the business before proceeding. On success, calls
  the exact same channel-agnostic `handleIncomingMessage()` the web chat
  uses — no SMS-specific agent logic exists, by design (see
  `DECISIONS.md` open decision #2). `handleIncomingMessage()` (and
  `ManagerToolContext`) now takes an explicit `channel: "web_chat" |
  "sms"`, threaded down into every proposal tool's `source` field —
  `changeRequests.source` now genuinely distinguishes "proposed by
  texting the agent" from "proposed via the web chat panel" instead of
  both recording a generic `"ai_agent"`, closing a requirement
  `DECISIONS.md` had recorded but this code hadn't actually fulfilled
  until this same session caught the gap. Verified live: a services
  proposal sent through the exact non-HTTP pipeline the SMS webhook uses
  landed in the database with `source: "sms"`. Replies async via a shared
  `server/sms.ts` (`sendSMS()`, extracted from `reminders.ts`'s
  previously-duplicated copy — now one send implementation, not two) since
  the agent's LLM call can take longer than is safe to hold a synchronous
  Twilio webhook response open for; the immediate response is empty TwiML.
  An unrecognized number gets a plain reply explaining why, not silence.

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
  trace.
- **A real successful agent response, confirmed once billing credits were
  added.** Asked "what's the current price of Full Showroom Reset?" —
  the agent called `get_pricing` and answered "Sedan/base: $259.99; SUV:
  $269.99; Large: $359.99," matching the real database exactly (not a
  hallucinated number). Then asked it to "raise the base price of Full
  Showroom Reset to $264.99, it's a seasonal bump" — it correctly called
  `propose_pricing_change` with `{packageName: "Full Showroom Reset",
  newPrice: 264.99}` (no `newPriceSuv`/`newPriceLarge`, since neither was
  mentioned), and replied that the change is "now awaiting approval and
  not yet live" — the real ChangeRequest shows up correctly in "Awaiting
  Approval" with `YELLOW`/`OWNER` required, same as one submitted through
  the manual form. Left this one actually pending (not cleaned up like
  the throwaway test data elsewhere this session) since it's a real,
  legitimate proposal the owner can choose to approve or reject.
- **Found and fixed a real precision bug in the budget tracker while
  checking the usage ledger updated correctly.** `estimatedCostCents` was
  an `INT`, and `recordUsage()` rounded to a whole cent on every single
  write. A cheap model call costs a fraction of a cent (confirmed live:
  ~0.06-0.12 cents/call with `gpt-5-mini`), so each write started from an
  already-rounded-down integer and rounded straight back to it —
  confirmed by simulation that 20 real-sized calls in a row left the
  stored total at exactly 0 cents forever, when the true cost was over 1
  cent. This would have meant the $20/month hard cutoff almost never
  actually triggered in practice for normal usage, silently defeating the
  one thing it was built to guarantee. Fixed by changing the column to
  `DECIMAL(12,4)` (migration `0017_ai_usage_ledger_cost_precision.sql`)
  and removing the per-write rounding — cost now accumulates with real
  fractional precision. Backfilled the one existing (corrupted-by-the-bug)
  ledger row from its accurate token counts, then confirmed live: sent
  another real message and watched the stored cost move from `0.1234` to
  `0.1705`, an increase that exactly matches that call's actual token
  usage. 3 new regression tests in `budget.test.ts` (8 total) prove
  repeated small amounts now genuinely sum instead of getting rounded away
  every time.
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
  packages, or a name-based rename lookup miss). Full suite now 95/97
  (up from 88/90 — 5 new `services` tests + 3 new budget-precision
  regression tests; same 2 pre-existing environmental failures), `npm run
  check` clean, `npm run build` succeeds.
- **SMS transport built and verified as far as possible without a real
  Twilio account.** No `TWILIO_ACCOUNT_SID`/number exist in this working
  environment, so the actual HTTP round-trip through
  `/api/webhooks/twilio-sms` and a genuinely-delivered SMS reply are
  unverified — but everything else in the pipeline is:
  - **Signature verification, proven cryptographically correct**, not
    just plumbing-checked: 6 tests in `server/sms.test.ts` use the
    `twilio` package's own `getExpectedTwilioSignature()` to generate a
    real valid signature, then confirm `verifyTwilioSignature()` accepts
    it — and confirm it correctly rejects a forged signature, a valid
    signature replayed against tampered params (body swapped), a valid
    signature against the wrong URL, a missing signature header, and a
    request when no `TWILIO_AUTH_TOKEN` is configured at all.
  - **Identity resolution, verified against the real dev database.** Set
    a test phone number on the OWNER test account, then ran a script that
    calls `resolvePhoneToBusinessUser()` directly (the exact function the
    webhook calls) against the real DB: an unrecognized number correctly
    returns `{ok: false}`, and the real number — sent in a *different*
    format (`+12625550173`) than how it's stored (`(262) 555-0173`) —
    correctly resolved to the right user, proving the digit-normalization
    matching actually works, not just in isolation with pre-normalized
    test data. 6 more tests in `identity.test.ts` cover no-match,
    multiple-match (refuses to guess), no-membership, and
    not-a-phone-number cases with a mocked db.
  - **The full non-HTTP pipeline, run against the real dev DB and the
    real OpenAI key.** The same script then called `handleIncomingMessage()`
    with the resolved identity — exactly what the webhook does after
    identity resolution succeeds — and got a real, grounded reply:
    "Signature Detail — Sedan: $449.99, SUV: $529.99, Large: $649.99,"
    matching the actual database. This proves every piece downstream of
    "an HTTP request with a valid signature arrived" genuinely works.
  - **What's still unverified**: the live HTTP route itself (Express
    routing, header parsing, the empty-TwiML immediate response) and an
    actual SMS delivery via `sendSMS()` — both need real
    `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`, which
    don't exist here. Deliberately did not add a placeholder
    `TWILIO_AUTH_TOKEN` to `.env` to work around this, unlike earlier
    credential gaps this session — that file holds real secrets the owner
    manages directly, and unlike the empty `DATABASE_URL` placeholder
    created earlier (which the owner explicitly said yes to), adding one
    here wasn't asked for.
  - `reminders.ts`'s previously-duplicated `sendSMS()` was extracted to
    `server/sms.ts` in the process — one send implementation now, not two
    that could silently drift apart. Full suite now 107/109 (up from
    95/97 — 6 new signature tests + 6 new identity tests; same 2
    pre-existing environmental failures), `npm run check` clean, `npm run
    build` succeeds.

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
- **FormaOps Manager agent is fully verified for the web-chat channel**
  (real grounded answers, real correct proposals — see "Verified this
  session (2026-09-03)" above), and the **SMS transport is built and
  verified as far as possible without a real Twilio account** (signature
  crypto, identity resolution, and the full downstream pipeline all
  confirmed live — see above). What's left is genuinely just plugging in
  real Twilio credentials and confirming the live HTTP round-trip and an
  actual SMS delivery — no more code is anticipated to be needed for
  that, but it hasn't been proven yet. There's also no tracing/
  observability for the agent yet.

## NOT IMPLEMENTED

Everything in Phases 6-10 of `ROADMAP.md`, the untested parts of Phases
4-5 (see PARTIAL above), plus the untouched parts of Phase 2:

- No submitter-initiated cancellation
- No per-date hours override
- No `promotions`/`content`/`business_profile` executors
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
5. **RESOLVED this update.** `FORMAOPS_AGENT_MODEL`'s default
   (`"gpt-5-mini"`) is confirmed real and callable — used successfully in
   live testing. The budget cost-per-token defaults are still
   *unconfirmed against OpenAI's actual invoice* (only cross-checked
   against a few independent pricing-tracker sites during research, not
   OpenAI's own billing page) — low-stakes at this usage volume, but
   worth a real check before trusting the $20 cutoff at higher volume.
6. **RESOLVED this update.** `Services.tsx`'s included-items list now
   reads the DB `features` column when a matching package row has one,
   same as `Pricing.tsx`/`Booking.tsx` already did — see "Found and fixed
   a real, second instance of..." above.
7. **RESOLVED this update, was a real bug.** `aiUsageLedger.estimatedCostCents`
   was an `INT` rounded to a whole cent on every write, so fractional-cent
   costs (typical for a cheap model) could never accumulate — the
   $20/month cutoff would have almost never actually triggered. Fixed via
   `DECIMAL(12,4)` (migration `0017`) — see "Found and fixed a real
   precision bug..." above for the full account, including a live
   before/after confirmation.
8. **New this update, still open**: the SMS webhook's public-URL
   reconstruction for signature verification (`TWILIO_WEBHOOK_BASE_URL`,
   defaulting to `https://${BRAND.domain.live}`) has never been tested
   against a real reverse-proxy/tunnel topology — Railway's `x-forwarded-*`
   handling is already relied on elsewhere in this file for HTTPS
   redirects, so production should be fine, but local dev testing via a
   tunnel (ngrok or similar) will need `TWILIO_WEBHOOK_BASE_URL` set to
   the tunnel's actual public URL, not the default.

## NEXT RECOMMENDED WORK

1. **Add real Twilio credentials** (`TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, a phone number capable of receiving SMS) and
   confirm the same Twilio account already used for outbound reminders is
   the intended one (`DECISIONS.md` open decision #2). For local testing,
   also need a public tunnel (ngrok or similar) pointed at the dev
   server, since Twilio can't reach `localhost` directly — set
   `TWILIO_WEBHOOK_BASE_URL` to the tunnel's URL and configure that same
   URL as the number's "A message comes in" webhook in the Twilio
   console. This is the only remaining blocker on verifying SMS actually
   works — the code is built and verified everywhere else it can be (see
   "Verified this session (2026-09-03)" above).
2. **Cross-check the budget's cost-per-token defaults against OpenAI's
   actual billing page** once real usage has accrued there — the
   $20/month cutoff's accuracy depends on it, and it's only been
   cross-checked against third-party pricing trackers so far, not
   OpenAI's own invoice.
3. **Done**: a third executor (`services`) is wired — see WORKING above.
   `promotions`/`content`/`business_profile` remain, in that rough order
   of likely usefulness, but still no forcing product reason to pick one
   over the others yet.
