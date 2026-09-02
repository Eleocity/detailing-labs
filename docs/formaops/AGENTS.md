# FormaOps — Agents

**Status: FormaOps Manager (the only agent in the table below marked
built) exists as of 2026-09-01** — `@openai/agents` is a real dependency,
and `server/formaops/agents/{tools,manager,budget}.ts` implement it. Every
other agent in the table is still design intent only, written so its
phase starts from an agreed shape instead of a blank page (spec §27) — not
to be mistaken for working code (spec §28).

## FormaOps Manager — what actually exists

`server/formaops/agents/manager.ts`'s `handleIncomingMessage()` is the
single channel-agnostic entry point — currently reachable via
`formaops.agent.chat` (a tRPC mutation, surfaced as an "Ask the AI" panel
on `/admin/change-requests`). SMS is not wired yet (needs Twilio inbound
credentials — see `DECISIONS.md` open decision #2) but calls the exact
same function once it is, by design, not by later refactor.

Tools: `get_pricing` / `get_hours` (read-only) and
`propose_pricing_change` / `propose_hours_change`, which call the exact
same `changeRequestsService.create()` the admin UI and tRPC router call —
no privileged shortcut. There is no approve/execute/deploy/SQL tool, per
the boundary below.

Budget: `server/formaops/agents/budget.ts` enforces the $20/month cutoff
decided in `DECISIONS.md` — checked before every run (not just logged
after), and `handleIncomingMessage` never throws: every failure mode
(budget exceeded, OpenAI error, no usable output) degrades to a reply
pointing at `/admin/change-requests`, which never calls OpenAI.

**Not yet done**: real end-to-end testing against a live OpenAI API key
(none was available in this working environment as of this writing — the
graceful-failure path was verified live instead, real usage was not),
SMS transport, and identity resolution for a channel where the caller
isn't already an authenticated web session (SMS needs phone-number → user
mapping, which doesn't exist yet).

## Boundary (non-negotiable, from Phase 1 onward)

> AI proposes / coordinates. Trusted software authorizes / executes.

Concretely: every tool an agent can call that has a side effect must be one
of the narrow `server/formaops/` service functions, which independently
re-check `hasPermission` using the *agent's own* resolved identity
(`AI_SYSTEM` role) — never trusting anything the model asserts about itself
or the user in its output.

## Planned agents (build only when their phase arrives)

| Agent | Phase | Responsibility | Tools it must NOT have |
|---|---|---|---|
| FormaOps Manager | 4-5 | Interpret natural-language requests, select tools, create ChangeRequests | approve, deploy, SQL, shell |
| Site Inspector | 6 | Crawl/inspect the live site via Playwright, produce `WebsiteIssue` rows | write access to anything |
| Business Data Agent | 2-4 | Read structured business data (services/pricing/hours/promotions) | write access — read-only by design |
| Website Developer Agent | 7 | Prepare source patches in an isolated workspace | direct production write, deploy |
| QA Agent | 7 | Run lint/typecheck/build/tests/Playwright, report pass/fail | approve business decisions |
| Content Agent | 2-5 | Draft marketing/page copy | publish |
| SEO Agent | 6 | Inspect titles/canonicals/structured data/sitemap | publish |

No agent beyond this list will be added "for architectural novelty" (spec
§10 explicit instruction) — a new agent needs a specific unmet
responsibility, not just conceptual tidiness.

## Tool design rules (apply when Phase 4 starts writing tools)

- Narrow, named capabilities (`getPricing()`, `preparePricingChange()`),
  never `executeAnything()`/`runArbitrarySQL()`.
- Every side-effecting tool: resolve actor → resolve business → validate
  input → check permission → check policy → check ChangeRequest/approval
  state → execute → audit → return structured result. (Spec §11, verbatim
  order — this is the same sequence `server/formaops/changeRequests.ts`
  already follows for the two mutations that exist today.)
- Structured outputs via Zod schemas (already the convention everywhere
  else in this codebase's tRPC routers — no new pattern needed).

## What Phase 1 already builds that Phase 4 will plug into

`changeRequests.create` and `.approve`/`.reject` are usable *today* by any
authenticated human caller via the `formaops` tRPC router. When the Manager
agent is built, it calls the exact same service functions a human-facing UI
would — no privileged shortcut, no separate code path.
