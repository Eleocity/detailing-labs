# FormaOps — Permissions

## The rule

**Requesting a change never grants authority to approve or execute it.**
Enforced in `server/formaops/permissions.ts` and `policy.ts` — deterministic
code, not a prompt instruction. An OpenAI agent (once one exists, Phase 4+)
reasons about *what* should happen; it never decides *whether it's allowed
to*.

## Roles (`businessMemberships.role`)

Separate from — additive to — the existing `users.role`
(`user`/`admin`/`employee`), which nothing in FormaOps touches or replaces.

| Role | Intent |
|---|---|
| `OWNER` | Ownership authority. Can approve YELLOW/RED changes, manage roles/permissions, see full audit history |
| `OPERATIONS_MANAGER` | Runs day-to-day operations. Can request changes, cannot approve owner-protected ones just because they requested them |
| `MANAGER` | Narrower operational scope than Operations Manager (reserved for future use — no Phase 1 code path distinguishes it from `OPERATIONS_MANAGER` yet; seeded with the same grants) |
| `EMPLOYEE` | Read-only + narrow request rights (none granted by default in the Phase 1 seed — add explicitly per business need) |
| `AI_SYSTEM` | The identity an OpenAI agent acts as, once one exists. Deliberately under-privileged — see below |

## Permission catalog (seeded)

Exactly the list from the spec, minus a few not yet meaningful (`billing.manage`
— no billing system exists; kept out until it does, per §28's "do not
fabricate integrations").

```
website.read, website.request_change, website.publish_low_risk, website.approve_change
business_profile.read, business_profile.request_change, business_profile.modify
services.read, services.request_change, services.approve_change
pricing.read, pricing.request_change, pricing.approve_change
hours.read, hours.request_change, hours.approve_change
promotions.read, promotions.request_change, promotions.approve_change
content.read, content.request_change, content.approve_change
users.read, users.manage
roles.read, roles.manage
permissions.read, permissions.manage
approvals.read, approvals.act
deployments.read, deployments.execute
integrations.read, integrations.manage
audit.read
security.manage
```

## Default grants (seeded by the migration)

| Permission | OWNER | OPERATIONS_MANAGER | MANAGER | EMPLOYEE | AI_SYSTEM |
|---|:-:|:-:|:-:|:-:|:-:|
| `*.read` (all read perms) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `*.request_change` (pricing/hours/services/promotions/content/business_profile/website) | ✅ | ✅ | ✅ | — | ✅ |
| `*.approve_change` (same set) | ✅ | — | — | — | — |
| `website.publish_low_risk` | ✅ | ✅ | — | — | — |
| `approvals.act` | ✅ | — | — | — | — |
| `users.manage`, `roles.manage`, `permissions.manage` | ✅ | — | — | — | — |
| `deployments.execute`, `security.manage`, `integrations.manage` | ✅ | — | — | — | — |
| `deployments.read`, `integrations.read`, `audit.read` | ✅ | ✅ | ✅ | — | — |
| `approvals.read` | ✅ | ✅ | ✅ | — | — |

Read this table, don't infer it — it's the literal seed data in
`0014_formaops_governance_foundation.sql`. If a real business needs a
different default, edit the seed and add a migration; don't special-case a
person's name in code (spec §3/§28 explicitly forbid that).

## Risk-based approval requirement (`policy.ts`)

| Risk | Examples | Who can approve |
|---|---|---|
| GREEN | typo fixes, expired-promotion removal, alt text | *(Phase 1: no autonomous execution path exists yet — GREEN still lands in `AWAITING_APPROVAL` today; autonomous GREEN execution is explicitly a Phase 10 capability, not built early)* |
| YELLOW | pricing, hours, services, promotions, contact info, marketing copy | requires one `approvals.act` holder (today: `OWNER`) who is **not** the submitter |
| RED | DNS, payment processor config, credentials, role/permission admin, destructive migrations, refunds | Phase 1 does not expose any RED-category action through `changeRequests.create` at all — the category enum in `DATABASE.md` doesn't include a RED-tier category yet. RED operations stay entirely outside the ChangeRequest system until a specific one is deliberately designed, per spec §5 option B ("remain unavailable to autonomous AI execution") |

## Self-approval prevention

`changeRequests.approve` in `server/formaops/changeRequests.ts` rejects if
`approval.approvedByUserId === changeRequest.submittedByUserId`, unconditionally,
before checking anything else. Covered by a test in `server/formaops.test.ts`.
