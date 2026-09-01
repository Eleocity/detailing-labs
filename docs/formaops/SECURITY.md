# FormaOps — Security

## Threat model (Phase 1 scope)

FormaOps Phase 1 has no AI, no SMS, no external channel — it's a
database-backed governance layer reachable only through authenticated tRPC
procedures on the existing site. The relevant threats today:

1. **Privilege escalation via self-approval** — a user approving their own
   request. Mitigated: `changeRequests.approve` explicitly checks
   `approvedByUserId !== submittedByUserId` before anything else.
2. **Privilege escalation via missing/weak permission checks** — a new
   tRPC procedure forgetting to call `hasPermission`. **Fixed**: every
   `formaops` procedure is built with `withPermissionCheck()`
   (`server/formaops/trpc.ts`), a tRPC middleware that runs the permission
   check as a structural part of the procedure definition — before
   `.query()`/`.mutation()` ever runs, not as a line inside the resolver
   body. A new procedure that skips this builder and calls
   `protectedProcedure` directly would still bypass it (see "Residual gap"
   below), but every procedure that exists today goes through it.
3. **Cross-tenant data leakage** — a `businessId` in a query not scoped to
   the caller's membership. Mitigated: every `formaops` service function
   takes `businessId` explicitly and every read/write is scoped by it;
   tested. Only one tenant exists today, so this is prophylactic, not yet
   load-bearing.
4. **Trusting client-supplied identity** — never done. Every procedure
   resolves the actor from `ctx.user` (server-side cookie/JWT resolution,
   unchanged from the existing app), never from a request body field.

## Residual gap (stated plainly, not hidden)

`withPermissionCheck()` makes the check structural for any procedure built
with it — but nothing stops a *future* procedure from being written with
`protectedProcedure` directly, skipping the builder entirely. This is a
smaller, different gap than before (previously: the check could be silently
deleted from inside a resolver; now: a new procedure would have to
deliberately choose not to use the standard builder). Closing it completely
would mean either code-review discipline (current mitigation) or a lint
rule that flags a `formaops` router procedure not built with
`withPermissionCheck` — not yet built, low priority while the router has
exactly five procedures, all reviewed in this session.

## Execution privilege (added Phase 2)

`server/formaops/executors/pricing.ts` writes directly to the `packages`
table once a pricing ChangeRequest is approved — this is the first place
FormaOps code has a real, unconditional write path to business data (not
gated by a further permission check at execution time, because the
*approval* that triggered it already was). This is intentional: requiring
a second permission check to execute an already-approved decision would be
redundant, not safer. What *is* worth tracking: execution runs with
whatever DB privileges the main app process has (see
`ARCHITECTURE-REVIEW.md` §16/ADR-002) — there is no narrower "execution-only"
DB role yet, consistent with the Phase 1-3 same-process/same-role decision.

## Trust boundaries (current)

- **Public website ↔ FormaOps**: same process, same DB connection. A bug in
  `formaops/` code cannot corrupt unrelated tables (Drizzle queries are
  scoped per-table) but *can* crash the shared process. Accepted tradeoff —
  see `ARCHITECTURE-REVIEW.md` §21.
- **Human ↔ AI_SYSTEM**: not yet reachable — no OpenAI credentials exist in
  this repo. When Phase 4 adds them: server-side only, never in a client
  bundle, never interpolated into a prompt unless the specific tool
  genuinely needs that value.

## Prompt injection posture (forward-looking, not yet applicable)

No agent reads untrusted content yet (no Site Inspector, Phase 6). When it
lands: scraped page text / API responses are DATA passed as tool-result
content, never concatenated into the system/developer instruction channel.
Documented here now so the constraint is visible before anyone builds the
Site Inspector, not discovered after.

## Secrets

No new secrets were introduced by Phase 1 (no OpenAI key, no new vendor).
Existing secrets (`JWT_SECRET`, `SQUARE_ACCESS_TOKEN`, `SENDGRID_API_KEY`,
`TWILIO_*`, `DATABASE_URL`, `CRON_SECRET`) are unchanged.

## Risks tracked

| Risk | Severity | Status |
|---|---|---|
| Same-process blast radius (§ "Trust boundaries") | Medium | Accepted for Phase 1-3, revisit at Phase 4 |
| No middleware-enforced permission check | Medium | Open — recommended before Phase 2 |
| Single MySQL role for app + future FormaOps writes | Low today, grows with Phase 4 worker | Revisit when a worker process exists (narrower DB role for it) |
| No RED-tier action path exists | N/A (this is the safe state) | Intentional — do not build one without an explicit, separate design pass |
