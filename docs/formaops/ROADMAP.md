# FormaOps — Roadmap

Phases as specified, with status. See `STATUS.md` for finer-grained detail
than this table.

| Phase | Name | Status |
|---|---|---|
| 0 | Discovery + Architecture | ✅ Done — `ARCHITECTURE-REVIEW.md` |
| 1 | Governance Foundation (roles, permissions, policy, ChangeRequest, approvals, audit) | ✅ Done — schema + `server/formaops/*` + tRPC router + tests |
| 2 | Structured Business Data (services/pricing/hours/promotions as DB-backed authoritative data, wired to approved ChangeRequests) | 🟡 Partial — `pricing` and `hours` categories execute end-to-end and are visible across every page that shows them; `services`/`promotions`/`content`/`business_profile` still only reach `APPROVED` with no execution |
| 3 | Change Management UI (admin dashboard: pending approvals, ChangeRequest timeline) | ⬜ Not started |
| 4 | OpenAI Foundation (Agents SDK, FormaOps Manager, read-only tools, tracing) | ⬜ Not started — no `openai` dependency in this repo yet |
| 5 | Conversational Operations (chat surface, ChangeRequest creation from conversation) | ⬜ Not started |
| 6 | Website Inspector (Playwright crawl, `WebsiteIssue`) | ⬜ Not started |
| 7 | Controlled Source Changes (sandbox, patch, tests, preview) | ⬜ Not started |
| 8 | Deployment Automation (deploy, verify, rollback) | ⬜ Not started |
| 9 | SMS (Twilio inbound, verified identity, approval-over-text) | ⬜ Not started (Twilio is already used for outbound appointment reminders — inbound/two-way is new) |
| 10 | Safe Autonomy (scheduled inspection, GREEN auto-remediation) | ⬜ Not started |

## Done: pricing + hours vertical slices, and full page consistency

`changeRequests` execution now works end to end for two categories, via a
small executor registry (`server/formaops/executors/index.ts`) so adding a
third is "write an executor, add one line," not more branching in
`changeRequests.ts`:

- **pricing** — `executors/pricing.ts`, updates `packages.price`.
- **hours** — `executors/hours.ts`, upserts the `siteContent` row for
  `hours_weekday`/`hours_weekend`. Deliberately narrow: this is "change our
  standing weekday/weekend hours," not the spec's own date-specific example
  ("change tomorrow's closing time to 3") — that needs a real per-date
  override concept that doesn't exist yet.

Required fixing a real durability bug along the way: the `packages` table
was wiped and reseeded from hardcoded values on every server boot, which
would have silently reverted any approved price change on the next deploy
— see `DECISIONS.md` ADR-007. Status transitions
AWAITING_APPROVAL → APPROVED → EXECUTING → COMPLETED/FAILED are real now for
both categories, not reserved-but-unused enum values.

**Page consistency (the other half of this work)**: `Services.tsx` and
`Home.tsx` previously read pricing straight from the `shared/services.ts`
code constant — Home.tsx was *partly* DB-driven already (it queried
`trpc.bookings.getPackages` for which packages to list) but still displayed
a hardcoded price via a `VEHICLE_TIERS` lookup that silently overrode the
DB value it had just fetched. Both pages now show the DB's price when a
matching row exists, falling back to the catalog only when it doesn't
(empty DB, or a quote-only package with no DB row at all, e.g. Ceramic
Coating). `/pricing`, `/services`, and the homepage all agree now.

**Tiered pricing (also closed)**: `packages` now has `priceSedan`/
`priceSuv`/`priceLarge` columns (migration `0015`), and `resolvePackagePrice()`
checks them before the static catalog. The `pricing` executor can update the
base price alone (unchanged default behavior) or all three tiers in one
approval. `Booking.tsx`'s actual checkout price and `Pricing.tsx`'s tier
display now resolve through the same function, so they can't disagree.

**What this still does not cover** (see `STATUS.md` for full detail):
- `services`/`promotions`/`content`/`business_profile` categories have no
  executor — ChangeRequests in those categories still just reach `APPROVED`
  with no real-world effect.
- No admin UI exists — approving still requires a direct tRPC call.
- No per-date hours override — only the standing weekday/weekend strings.

## Next step (continuing Phase 2)

Wire a third category. `services` (add/remove an `included` line item) or
`promotions` (a homepage banner) are the next-simplest — both are closer to
`hours` (a single-field text update) than to `pricing` (a numeric update
with real downstream math). Not decided for you — see `DECISIONS.md`'s open
decisions.

## Explicitly not planned soon

Kubernetes, service mesh, Kafka, multiple databases, enterprise IAM — per
spec §8.11/§28, none of these are justified by anything in this repository
today.
