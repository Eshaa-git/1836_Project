import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  errors?: string[];
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint/error for controls that aren't a plain <Input>. */
export function Field({ label, htmlFor, hint, errors, optional, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && !errors?.length && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.length ? (
        <p role="alert" className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

/** A group of related controls with a visible legend (fieldset). */
export function FieldGroup({
  legend,
  description,
  optional,
  errors,
  className,
  children,
}: {
  legend: string;
  description?: React.ReactNode;
  optional?: boolean;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-sm font-medium">
        {legend}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </legend>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {errors?.length ? (
        <p role="alert" className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
