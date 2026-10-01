/**
 * Output of the deterministic safety layer.
 *
 * - `block`: the request is refused (implausible or clearly unsafe).
 * - `warn`: allowed only after the user explicitly acknowledges it (by code).
 * - `info`: shown alongside, no action needed.
 */
export type SafetySeverity = "block" | "warn" | "info";

export type SafetyIssue = {
  code: string;
  severity: SafetySeverity;
  field?: string;
  message: string;
  /** Present when the safety layer can propose a safer alternative. */
  suggestion?: { field: string; value: string | number; label: string };
};

export function hasBlocking(issues: SafetyIssue[]): boolean {
  return issues.some((i) => i.severity === "block");
}

/** Warn-level codes the user has not yet acknowledged. */
export function unacknowledgedWarnings(
  issues: SafetyIssue[],
  acknowledged: readonly string[],
): SafetyIssue[] {
  return issues.filter((i) => i.severity === "warn" && !acknowledged.includes(i.code));
}

export const PROFESSIONAL_NOTE =
  "If you have a medical condition, are pregnant or breastfeeding, or have a history of disordered eating, please set this with a doctor or registered dietitian.";
