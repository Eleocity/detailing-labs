# FormaOps — Roadmap

Phases as specified, with status. See `STATUS.md` for finer-grained detail
than this table.

| Phase | Name | Status |
|---|---|---|
| 0 | Discovery + Architecture | ✅ Done — `ARCHITECTURE-REVIEW.md` |
| 1 | Governance Foundation (roles, permissions, policy, ChangeRequest, approvals, audit) | ✅ Done — schema + `server/formaops/*` + tRPC router + tests |
| 2 | Structured Business Data (services/pricing/hours/promotions as DB-backed authoritative data, wired to approved ChangeRequests) | 🟡 Partial — `pricing`, `hours`, and `services` categories execute end-to-end and are visible across every page that shows them; `promotions`/`content`/`business_profile` still only reach `APPROVED` with no execution |
| 3 | Change Management UI (admin dashboard: pending approvals, ChangeRequest timeline) | ✅ Done — `/admin/change-requests` (`client/src/pages/admin/AdminChangeRequests.tsx`): submit pricing/hours/services changes, approve/reject, history. No client-side permission hiding — the server's checks are what actually enforce it, the UI just surfaces whatever it returns. |
| 4 | OpenAI Foundation (Agents SDK, FormaOps Manager, read-only tools, tracing) | 🟡 Partial — `@openai/agents` installed, `server/formaops/agents/{tools,manager,budget}.ts` built. **A real API key confirmed the request genuinely reaches OpenAI** — blocked only on the account having no billing credits (HTTP 429 "no credits remaining"), not a code issue. A real successful response is still unverified. No tracing/observability wired yet. |
| 5 | Conversational Operations (chat surface, ChangeRequest creation from conversation) | 🟡 Partial — web chat done and verified live; SMS transport (`/api/webhooks/twilio-sms`) and phone → user identity resolution are also built and verified as far as possible without a real Twilio account (signature crypto, identity matching, and the full downstream pipeline all confirmed live). **Blocked only on real Twilio credentials** to verify the actual HTTP round-trip and a delivered SMS — see `STATUS.md`. |
| 6 | Website Inspector (Playwright crawl, `WebsiteIssue`) | ⬜ Not started |
| 7 | Controlled Source Changes (sandbox, patch, tests, preview) | ⬜ Not started |
| 8 | Deployment Automation (deploy, verify, rollback) | ⬜ Not started |
| 9 | SMS (Twilio inbound, verified identity, approval-over-text) | 🟡 Partial — inbound transport + verified identity (phone → user → business) are built as part of Phase 5's work, since the owner asked for SMS to be first-class from day one, not bolted on later. "Approval-over-text" (approving a pending ChangeRequest by replying to a text) is not built — today SMS can only *propose* through the agent, same as web chat. |
| 10 | Safe Autonomy (scheduled inspection, GREEN auto-remediation) | ⬜ Not started |

## Done: pricing + hours + services vertical slices, and full page consistency

`changeRequests` execution now works end to end for three categories, via
a small executor registry (`server/formaops/executors/index.ts`) so
adding a further one is "write an executor, add one line," not more
branching in `changeRequests.ts`:

- **pricing** — `executors/pricing.ts`, updates `packages.price`.
- **hours** — `executors/hours.ts`, upserts the `siteContent` row for
  `hours_weekday`/`hours_weekend`. Deliberately narrow: this is "change our
  standing weekday/weekend hours," not the spec's own date-specific example
  ("change tomorrow's closing time to 3") — that needs a real per-date
  override concept that doesn't exist yet.
- **services** — `executors/services.ts`, adds/removes one line item from
  a package's `features` list. Action-based (add/remove one item, not
  "replace the whole list") so a proposer never has to correctly restate
  every existing item just to change one. Picked over `promotions` as a
  judgment call while the owner was unavailable — see `DECISIONS.md`.

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

**Page consistency, round two**: wiring `services` surfaced the same bug
class again — `Services.tsx` read the DB `price` but still showed
included-items from the static catalog, even though `Pricing.tsx` and
`Booking.tsx` already read `pkg.features` from the DB. Fixed the same way:
prefer the DB list when the package has one, fall back to the catalog
only when it doesn't.

**What this still does not cover** (see `STATUS.md` for full detail):
- `promotions`/`content`/`business_profile` categories have no
  executor — ChangeRequests in those categories still just reach `APPROVED`
  with no real-world effect.
- No per-date hours override — only the standing weekday/weekend strings.

## Next step (continuing Phase 2)

`promotions` (a homepage banner) is the next-simplest remaining category —
still not decided for you — see `DECISIONS.md`'s open
decisions.

## Explicitly not planned soon

Kubernetes, service mesh, Kafka, multiple databases, enterprise IAM — per
spec §8.11/§28, none of these are justified by anything in this repository
today.
