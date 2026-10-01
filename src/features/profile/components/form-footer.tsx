import { Button } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/form-alert";

/** Error banner + primary submit (and optional secondary action) shared by profile forms. */
export function FormFooter({
  error,
  pending,
  submitLabel,
  secondary,
  disabled = false,
}: {
  error: string | null;
  pending: boolean;
  /** Disable submit without showing the "Saving…" state (e.g. unresolved safety notes). */
  disabled?: boolean;
  submitLabel: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 pt-2">
      <FormAlert message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 min-w-32 px-5 text-base"
          disabled={pending || disabled}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
        {secondary}
      </div>
    </div>
  );
}
