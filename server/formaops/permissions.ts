/**
 * FormaOps permission checks. This is the single choke point every
 * side-effecting FormaOps operation must go through — see
 * docs/formaops/PERMISSIONS.md and SECURITY.md.
 *
 * `businessMemberships.role` is a separate concept from the existing
 * `users.role` column and does not replace any existing admin check
 * elsewhere in the app.
 */
import { eq, and } from "drizzle-orm";
import {
  businessMemberships,
  rolePermissions,
  type FormaOpsRole,
} from "../../drizzle/schema";

// Mirrors the catalog seeded by drizzle/0014_formaops_governance_foundation.sql.
// Kept as a union type (not re-derived from the DB) so callers get a
// compile-time error for a typo'd permission key.
export type Permission =
  | "website.read"
  | "website.request_change"
  | "website.publish_low_risk"
  | "website.approve_change"
  | "business_profile.read"
  | "business_profile.request_change"
  | "business_profile.modify"
  | "services.read"
  | "services.request_change"
  | "services.approve_change"
  | "pricing.read"
  | "pricing.request_change"
  | "pricing.approve_change"
  | "hours.read"
  | "hours.request_change"
  | "hours.approve_change"
  | "promotions.read"
  | "promotions.request_change"
  | "promotions.approve_change"
  | "content.read"
  | "content.request_change"
  | "content.approve_change"
  | "users.read"
  | "users.manage"
  | "roles.read"
  | "roles.manage"
  | "permissions.read"
  | "permissions.manage"
  | "approvals.read"
  | "approvals.act"
  | "deployments.read"
  | "deployments.execute"
  | "integrations.read"
  | "integrations.manage"
  | "audit.read"
  | "security.manage";

/** The category → request-change permission mapping used by changeRequests.ts. */
export function requestChangePermissionFor(
  category:
    | "pricing"
    | "hours"
    | "services"
    | "promotions"
    | "content"
    | "business_profile"
    | "other"
): Permission {
  if (category === "other") return "website.request_change";
  return `${category}.request_change` as Permission;
}

/** Returns the caller's FormaOps role for a business, or null if they have no membership. */
export async function getMembershipRole(
  db: any,
  businessId: number,
  userId: number
): Promise<FormaOpsRole | null> {
  const [row] = await db
    .select({ role: businessMemberships.role })
    .from(businessMemberships)
    .where(
      and(
        eq(businessMemberships.businessId, businessId),
        eq(businessMemberships.userId, userId)
      )
    )
    .limit(1);
  return row?.role ?? null;
}

/**
 * The single permission choke point. Never trust a client-supplied role or
 * permission claim — this always re-resolves the caller's role from the
 * database for the specific business in question.
 */
export async function hasPermission(
  db: any,
  businessId: number,
  userId: number,
  permission: Permission
): Promise<boolean> {
  const role = await getMembershipRole(db, businessId, userId);
  if (!role) return false;

  const [grant] = await db
    .select({ permissionKey: rolePermissions.permissionKey })
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.role, role),
        eq(rolePermissions.permissionKey, permission)
      )
    )
    .limit(1);
  return Boolean(grant);
}
