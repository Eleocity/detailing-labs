# FormaOps — Database

All FormaOps tables live in the same MySQL instance and Drizzle schema file
(`drizzle/schema.ts`) as the rest of the application. See
`ARCHITECTURE-REVIEW.md` §16 for why no separate database/instance was
introduced.

## Migration

`drizzle/0014_formaops_governance_foundation.sql` — purely additive, no
existing table altered. Applied the same way every other migration in this
repo is (`scripts/migrate.mjs`, tracked in `__drizzle_migrations`).

## New tables

### `businesses`

One row per tenant. **Exactly one row exists today** (Forma Auto Spa). This
table exists now — before a second tenant is remotely needed — specifically
so nothing built in Phase 1-3 has to be retrofitted with a `businessId`
later. It is not the start of a billing/SaaS system; it's the minimum shape
that avoids a future rewrite.

| Column | Notes |
|---|---|
| `id` | PK |
| `name` | "Forma Auto Spa" |
| `createdAt` | |

### `businessMemberships`

Links a `users` row to a `businesses` row with a FormaOps role. This is
**additive** to — not a replacement for — `users.role`. Every existing
`adminProcedure`/`adminOnly()` check in the current codebase keeps working
unchanged. `businessMemberships.role` is a *new*, separate concept used only
by FormaOps permission checks.

| Column | Notes |
|---|---|
| `id` | PK |
| `businessId` | FK → `businesses.id` |
| `userId` | FK → `users.id` |
| `role` | `OWNER \| OPERATIONS_MANAGER \| MANAGER \| EMPLOYEE \| AI_SYSTEM` |
| `createdAt` | |

Unique on `(businessId, userId)` — one membership row per user per business.

### `permissions`

The permission catalog from spec §4, as data (not hardcoded in every check
site). Seeded once by the migration.

| Column | Notes |
|---|---|
| `key` | PK, e.g. `pricing.approve_change` |
| `description` | human-readable |

### `rolePermissions`

Which roles get which permissions. Seeded with sane defaults (see
`PERMISSIONS.md` for the actual grant table) — editable later via
`roles.manage`/`permissions.manage` without a code deploy, once an admin UI
exists (it doesn't yet — today this is edited by inserting rows).

| Column | Notes |
|---|---|
| `id` | PK |
| `role` | matches `businessMemberships.role` |
| `permissionKey` | FK → `permissions.key` |

### `changeRequests`

The core entity from spec §6.

| Column | Notes |
|---|---|
| `id` | PK |
| `businessId` | FK |
| `submittedByUserId` | FK → `users.id` |
| `source` | e.g. `"web_chat"`, `"admin_dashboard"` — channel enum kept intentionally open (`varchar`, not a fixed enum) since Phase 9 (SMS) will add a value |
| `category` | `pricing \| hours \| services \| promotions \| content \| business_profile \| other` |
| `riskLevel` | `GREEN \| YELLOW \| RED`, computed by `policy.ts` at creation time and **persisted** (never recomputed implicitly later — a policy change shouldn't silently reclassify a pending request) |
| `status` | `DRAFT \| AWAITING_APPROVAL \| APPROVED \| REJECTED \| EXECUTING \| COMPLETED \| FAILED \| CANCELLED` — a deliberately smaller set than spec §6's full list; `ANALYZING`/`NEEDS_INFORMATION`/`TESTING`/`DEPLOYING`/`VERIFYING`/`ROLLED_BACK` are added in the phases that actually do those things (Phase 7, 8) rather than reserved now with no code path that ever sets them. As of Phase 2, `EXECUTING`/`COMPLETED`/`FAILED` are genuinely reachable for `category === "pricing"` or `"hours"` (see `server/formaops/executors/index.ts` for the registry); every other category still stops at `APPROVED`/`REJECTED`. `DRAFT` and `CANCELLED` remain unreachable — no code path sets either yet (no draft-saving UI, no submitter-initiated cancellation) |
| `originalRequest` | free text — what the requester actually said/typed |
| `proposedChange` | JSON — shape depends on `category`; not yet applied to real business data in Phase 1 (see STATUS.md) |
| `requiredApprovalRole` | the role(s) that may approve — computed by policy, persisted (not recomputed) |
| `reasoningSummary` | short, human-appropriate explanation — never raw model chain-of-thought (spec §13) |
| `createdAt`, `updatedAt` | |

### `approvals`

| Column | Notes |
|---|---|
| `id` | PK |
| `changeRequestId` | FK |
| `approvedByUserId` | FK → `users.id` |
| `decision` | `APPROVED \| REJECTED` |
| `note` | optional |
| `createdAt` | |

A `changeRequests` row transitions to `APPROVED`/`REJECTED` only when a
matching `approvals` row is inserted by a user who (a) is not the
`submittedByUserId`, and (b) holds `requiredApprovalRole` for that business —
both checked server-side in `changeRequests.ts`, never trusted from client
input.

### `auditEvents`

Append-only. Nothing in `server/formaops/` ever `UPDATE`s or `DELETE`s a row
here.

| Column | Notes |
|---|---|
| `id` | PK |
| `businessId` | FK |
| `actorUserId` | nullable FK — null only for genuinely system-initiated events (e.g. a scheduled job, once one exists) |
| `actorType` | `HUMAN \| AI_SYSTEM` |
| `action` | e.g. `"change_request.created"`, `"change_request.approved"` |
| `targetType` / `targetId` | what it acted on, e.g. `"change_request"` / `42` |
| `metadata` | JSON — before/after values, reasoning summary references, etc. |
| `createdAt` | |

## What was deliberately NOT added in Phase 1

- `ApprovalRequirement` as its own table — folded into `changeRequests.riskLevel`
  + `requiredApprovalRole`, computed once at creation (see rationale above).
  Revisit if a single request ever needs N-of-M approval from *multiple*
  distinct roles simultaneously — today's shape supports one role,
  any-member-of-that-role approves.
- `WebsiteScan`/`WebsiteIssue` (Phase 6), `Conversation`/`Message`/
  `ExternalIdentity` (Phase 5/9), `AgentRun`/`AgentToolExecution` (Phase 4),
  `DeploymentRecord` (Phase 8) — no code exists yet that would write to
  these; adding empty tables ahead of the feature is exactly the kind of
  speculative build spec §28 warns against ("do not create fake placeholder
  implementations and call them complete").
