/**
 * Risk classification and approval-requirement computation.
 * See docs/formaops/PERMISSIONS.md ("Risk-based approval requirement") and
 * DECISIONS.md ADR-005 for why this is a computed value persisted onto the
 * ChangeRequest row, not a separately-editable policy table, in Phase 1.
 */
import type { ChangeRequestCategory, FormaOpsRole } from "../../drizzle/schema";

export type RiskLevel = "GREEN" | "YELLOW" | "RED";

/**
 * Phase 1 always returns YELLOW. Every category the spec lists as a GREEN
 * example (typo fixes, alt text, an already-expired promotion) requires
 * distinguishing "trivial" from "substantial" within a single category
 * (e.g. "content" covers both a one-word fix and a full page rewrite) —
 * Phase 1 has no signal to make that call safely, so it stays conservative
 * rather than guess. RED is never returned: no RED-tier action is exposed
 * through the ChangeRequest system at all yet (see PERMISSIONS.md) — this
 * function simply never has a RED-eligible category to classify.
 */
export function classifyRisk(_category: ChangeRequestCategory): RiskLevel {
  return "YELLOW";
}

/** Which role must approve a ChangeRequest at a given risk level. */
export function requiredApprovalRole(riskLevel: RiskLevel): FormaOpsRole {
  switch (riskLevel) {
    case "RED":
      // Unreachable today (classifyRisk never returns RED) — kept explicit
      // rather than falling through, so a future RED category can't
      // silently inherit YELLOW's (weaker) requirement by omission.
      return "OWNER";
    case "YELLOW":
      return "OWNER";
    case "GREEN":
      // Unreachable today (classifyRisk never returns GREEN) — see above.
      return "OWNER";
  }
}
