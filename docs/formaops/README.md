# FormaOps

FormaOps is the AI-assisted operational layer for Forma Auto Spa (and,
eventually, other service businesses). The end goal: an authorized business
user can say "change our hours this Monday" or "the ceramic coating page has
the wrong price" from a phone or admin dashboard, and FormaOps determines who
they are, whether they're allowed to ask for that, how risky the change is,
who must approve it, and — only after real authorization — makes it happen,
tests it, and records exactly what happened.

**FormaOps is not yet built.** As of this writing, Phase 1 (governance
foundation: permissions, roles, ChangeRequests, approvals, audit log) has
just landed. Nothing below Phase 1 in `ROADMAP.md` exists in code. See
`STATUS.md` for the honest current state.

## Start here

- **New to this project?** Read `ARCHITECTURE-REVIEW.md` first — it explains
  why FormaOps is built the way it is, grounded in what the actual Forma
  Auto Spa repository looks like (not the aspirational stack a spec might
  assume).
- **Picking up mid-project?** Read `STATUS.md` for what's working today,
  then `ROADMAP.md` for what's next.
- **Touching permissions or approvals?** Read `PERMISSIONS.md`.
- **Touching the database?** Read `DATABASE.md`.
- **Adding an OpenAI agent or tool?** Read `AGENTS.md` (currently mostly
  design intent — no agents exist yet).
- **Thinking about a security implication?** Read `SECURITY.md`.
- **Wondering why a past decision was made a certain way?** Read
  `DECISIONS.md`.

## Core principle

The ability to **request** a change must never itself grant the authority to
**approve** or **execute** it. This is enforced in trusted, deterministic
application code (`server/formaops/`) — never by prompting an AI model to
"remember" a permission rule. See `PERMISSIONS.md` and `SECURITY.md`.

## Where the code lives

```
server/formaops/       — policy, permissions, change requests, audit (the module boundary)
server/routers/formaops.ts — tRPC surface
drizzle/0014_formaops_governance_foundation.sql — schema
docs/formaops/          — this documentation
```

No `apps/`/`packages/` monorepo split exists — see `ARCHITECTURE-REVIEW.md`
§6 for why that was deliberately deferred rather than built speculatively.
