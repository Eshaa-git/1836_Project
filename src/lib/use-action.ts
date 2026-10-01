"use client";

import { useCallback, useState } from "react";
import type { ActionError, ActionResult } from "@/lib/result";

export type SafetyIssueView = NonNullable<ActionError["safetyIssues"]>[number];

/**
 * Calls a server action and tracks pending state, field errors, a form-level
 * error and safety issues, so every form handles results the same way.
 */
export function useAction<I, T>(action: (input: I) => Promise<ActionResult<T>>) {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [safetyIssues, setSafetyIssues] = useState<SafetyIssueView[]>([]);

  const run = useCallback(
    async (input: I): Promise<{ ok: true; value: T } | { ok: false }> => {
      setPending(true);
      setFormError(null);
      try {
        const result = await action(input);
        if (result.ok) {
          setFieldErrors({});
          setSafetyIssues([]);
          return { ok: true, value: result.value };
        }
        setFieldErrors(result.error.fieldErrors ?? {});
        setSafetyIssues(result.error.safetyIssues ?? []);
        // Safety issues are shown by <SafetyReview>; other errors get a banner.
        if (!result.error.safetyIssues?.length) setFormError(result.error.message);
        return { ok: false };
      } catch {
        setFormError("We couldn't reach the server. Check your connection and try again.");
        return { ok: false };
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, fieldErrors, formError, safetyIssues, setSafetyIssues };
}
