# FormaOps — Architecture Decision Records

## ADR-001 — FormaOps runtime boundary

**Context**: Spec §9 proposes a monorepo (`apps/`, `packages/`) with
FormaOps as an independently-deployable app from day one.

**Options considered**: (A) same process/repo, (B) monorepo split now, (C)
fully separate service now, (D) staged — same process now, split when a
concrete capability needs it.

**Decision**: D. See `ARCHITECTURE-REVIEW.md` §4-6 for the full comparison.

**Reasoning**: The current app is a single small Express process. Zero
FormaOps code existed before this ADR. Building a monorepo before a single
ChangeRequest row exists means paying distributed-system tax with nothing
yet to isolate.

**Consequences**: Same-process blast radius accepted as a tracked risk
(`SECURITY.md`). A worker split is deferred to Phase 4, at which point real
code (an OpenAI agent doing long-running work) justifies it.

**Alternatives rejected**: B (over-built for current scale, high migration
cost with zero present benefit), C (same, plus a new trust boundary to
design before anything exists to protect).

---

## ADR-002 — Database ownership

**Context**: Spec §8.5 asks whether FormaOps should share the existing DB,
use separate roles, or go through an internal API.

**Decision**: Share the existing MySQL instance and Drizzle schema file.
Same DB role as the app, for now.

**Reasoning**: No second service exists to justify a separate connection or
role yet (see ADR-001). A narrower DB role is meaningful once a
lower-privilege process (a worker) exists to hold it — introducing one today
would be enforced by nothing, since the only process that would use it is
the same process that already has full access.

**Consequences**: Revisit when Phase 4's worker exists — give it a MySQL
user limited to the tables it actually needs.

**Alternatives rejected**: internal API layer — adds latency and a new
failure mode for zero isolation benefit while everything is one process.

---

## ADR-003 — Background job architecture

**Context**: Spec §8.6 asks whether a queue/worker system (e.g. BullMQ +
Redis) is needed now.

**Decision**: No. Extend the existing durable-row pattern
(`followUpQueue`-style table with `status`/`scheduledFor`) if/when Phase 4+
needs job durability. No new infrastructure dependency added in Phase 1-3.

**Reasoning**: The existing app already proves this pattern works at its
current scale (two cron-driven flows). Nothing in the repository indicates
job volume or concurrency that a polled table can't handle. Redis is a new
operational dependency (uptime, memory, another thing to monitor) with no
current justification.

**Consequences**: If Phase 4-7 job volume/latency requirements outgrow a
polled table, that's the trigger to revisit — not a hypothetical today.

---

## ADR-004 — OpenAI agent execution architecture

**Context**: Spec §10/§17 describe a manager/orchestrator pattern with
several specialist agents.

**Decision**: Deferred — no OpenAI SDK dependency added in Phase 1. When
built (Phase 4), agents call the same `server/formaops/` service functions a
human-facing UI would, through the `AI_SYSTEM` role's permission grants —
no privileged shortcut.

**Reasoning**: Building agent scaffolding before the governance layer it
must respect existed would risk exactly the "prompt-only security" spec §2
explicitly warns against. Governance first (Phase 1, done), agents second
(Phase 4).

**Consequences**: `AGENTS.md` documents the intended shape now so Phase 4
starts from an agreed design, but nothing there is implemented — clearly
marked as such.

---

## ADR-005 — Approval architecture

**Context**: Spec §6 describes `ApprovalRequirement` as a possibly-separate
concept from `Approval`, supporting N-of-M, role-based, resource-specific
policy.

**Decision**: For Phase 1, fold the approval *requirement* into
`changeRequests.riskLevel` + `requiredApprovalRole`, computed once at
creation by `policy.ts` and persisted on the row — not a separate table.
`approvals` itself (the actual decision records) is a separate, real,
durable table.

**Reasoning**: No current requirement needs N-of-M-from-multiple-roles.
Building that generality now is speculative. The simpler shape still
satisfies: durable (survives restart), auditable, and blocks self-approval.

**Consequences**: If a future requirement genuinely needs "2 of 3 owners"
or "one owner AND one operations manager," that's a real, well-scoped
migration to add an `approvalRequirements` table — not a rewrite, since
`changeRequests`/`approvals` don't need to change shape to support it.

**Alternatives rejected**: Building the full generalized `ApprovalRequirement`
table now, with only one policy rule ever populating it — normalization with
no present benefit.

---

## ADR-006 — Deployment architecture

**Context**: Spec §8/§21 ask about controlled deployment + rollback for
AI-generated changes.

**Decision**: Deferred entirely. Phase 1-3 never touch deployment — no
ChangeRequest category in Phase 1 can result in a code deployment. Existing
Railway git-push deploy is completely unchanged.

**Reasoning**: Nothing to deploy yet (no code-change pipeline exists —
that's Phase 7). Designing rollback machinery for a pipeline that doesn't
exist would be pure speculation.

**Consequences**: Revisit at Phase 7/8 with `DeploymentRecord` design
informed by whatever the actual sandbox/build/test pipeline ends up needing.

---

## ADR-007 — Packages seed: wipe-and-replace → insert-if-missing

**Context**: `server/_core/index.ts`'s `seedDefaultContent()` unconditionally
deleted and reinserted every `packages` row on every server boot, to keep
the DB in lockstep with `shared/services.ts`'s hardcoded catalog across
deploys. Phase 2 needs an approved pricing ChangeRequest's price update to
*durably* change that same table.

**Decision**: Changed the packages sync to insert-if-missing (matching the
pre-existing `siteContent` seeding pattern) — see the code comment at the
change site for the full reasoning.

**Reasoning**: The two behaviors are directly incompatible. Keeping
wipe-and-replace would mean every FormaOps-approved price change gets
silently reverted on the next deploy or restart, with no error and no
record of it happening — the worst kind of bug, because it looks like
success at approval time.

**Consequences** (the real tradeoff, stated plainly): a *source-code* price
or copy change in `shared/services.ts`'s `PACKAGES` array no longer
automatically reaches the `packages` DB row once that row already exists —
it did before this change. Going forward, changing a package's price/copy
in code requires either a FormaOps ChangeRequest (once the category
supports the field being changed) or a manual migration for anything
FormaOps doesn't cover yet (e.g. `description`, `duration`, `features` —
only `price` is wired to an executor as of Phase 2). This is the expected
and correct shift for a system whose whole premise is "the database is the
operational source of truth, mutable without a deploy" — but it's a real
behavior change from before FormaOps existed, not a pure improvement with
no cost.

**Alternatives rejected**: leaving wipe-and-replace and having the pricing
executor "fight" the seed by writing on every deploy — fragile, and still
loses any change made between deploys (e.g. a Friday price change reverted
by Monday's routine restart).

**Not addressed in this ADR**: `addOns` has the identical latent problem
and was deliberately left as wipe-and-replace, because no executor writes
to it yet — fix it the same way the moment one does.

---

## ADR-008 — Package pricing gets DB-backed vehicle-size tiers

**Context**: `executors/pricing.ts` only ever updated `packages.price`, a
single flat number. Two active packages (Full Showroom Reset, The
Signature Detail) also had vehicle-size-tiered pricing, but it lived only
in the `shared/services.ts` code constant — `resolvePackagePrice()`
preferred that code catalog over the DB whenever it recognized the
package name and a vehicle size was known. Live verification (see
`STATUS.md`) confirmed this as a real, customer-visible bug, not a
theoretical one: after an approved pricing ChangeRequest, `/services` and
`/` showed the new price but `/book`'s actual checkout price for a
selected vehicle size — the price a customer would actually pay — did
not move.

**Decision**: Added `priceSedan`/`priceSuv`/`priceLarge` columns to
`packages` (migration `0015_package_vehicle_tier_pricing.sql`, backfilled
from the existing code catalog values, with `priceSedan` seeded from each
package's *current* `price` so the Full Showroom Reset change already
approved through FormaOps this session was preserved rather than reset to
the original code value). `resolvePackagePrice()` now checks the DB tier
columns first, falling back to the static catalog only when a tier is
unset (e.g. quote-only packages, or new packages the seed hasn't given
tiers to). The `pricing` executor accepts optional `newPriceSuv`/
`newPriceLarge` alongside the existing `newPrice` (still the base/sedan
price, unchanged default meaning) — a ChangeRequest can move just the
base price or all three tiers in one approval.

**Reasoning**: This was a schema change touching the actual checkout
price path, so it's recorded as a decision rather than folded silently
into a "fix" — per §8.13/§8.14, a change with this blast radius gets
flagged, not assumed. The alternative (proposing a source-code change to
`shared/services.ts` through a future Phase 7 pipeline) was rejected for
now: it would mean a routine price update needs a code deploy, which
defeats the point of FormaOps existing at all. Making the database the
sole source of truth for tiered pricing, with the code catalog as a
pure fallback for packages that haven't been migrated yet, is consistent
with every other decision in this log (ADR-002, ADR-007) about the
database being the operational source of truth once populated.

**Consequences**: `Booking.tsx` (checkout) and `Pricing.tsx` (marketing
display) now both call `resolvePackagePrice()` with the same DB tier
data, so they cannot disagree — verified live by re-screenshotting
`/pricing` with Sedan selected after the migration ran. A package that
has never had tiered pricing still won't get any invented by a pricing
ChangeRequest, even if `newPriceSuv`/`newPriceLarge` are supplied — the
executor only touches tier columns that already exist.

---

## Open decisions requiring owner input

Not yet decided — flagged per spec §33 as genuinely needing your input
(business governance / money / vendor choice), not ordinary engineering
judgment calls:

1. **OpenAI API budget ceiling** — before Phase 4 adds a real dependency
   with per-request cost, what's an acceptable monthly spend, and should
   there be a hard cutoff?
2. **SMS provider** — Twilio is already integrated for outbound reminders;
   confirm it's also the intended Phase 9 inbound/two-way provider before
   that work starts (different Twilio product surface — Programmable
   Messaging inbound webhooks vs. the current send-only usage).
   **Confirmed requirement (2026-09-01, owner)**: owners/staff must be able
   to text the Phase 5 AI agent (Conversational Operations) to create a
   ChangeRequest — SMS is not a later add-on to a web-only chat surface,
   it's a first-class input channel from day one of the AI integration.
   Scope Phase 5 and Phase 9 together rather than sequentially: the agent's
   request-parsing logic needs to work the same way regardless of whether
   the text came from SMS or a web chat, and `changeRequests.create`'s
   `source` field should account for an `"sms"` value alongside
   `"admin_dashboard"`.
3. **Phase 4 worker-split timing** — ADR-001 defers this until "justified."
   You may prefer a firmer trigger (e.g. "before any production deployment
   automation," Phase 8) rather than an engineering judgment call at the
   time.
4. **Resolved**: pricing and hours are both wired end to end, and
   `Services.tsx`/`Home.tsx` are DB-driven for pricing (see ADR-007 and
   `ROADMAP.md`). What's now open: which category to wire third —
   `ROADMAP.md` suggests `services` or `promotions` as the next-simplest,
   but hasn't picked one, since which matters more depends on what the
   business actually wants to change through FormaOps first.
