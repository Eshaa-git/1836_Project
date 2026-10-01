"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Choice<V extends string> = { value: V; label: string; description?: string };

type Common<V extends string> = {
  options: readonly Choice<V>[];
  label: string;
  /** "cards" shows descriptions in a grid; "chips" is compact. */
  variant?: "chips" | "cards";
  className?: string;
};

type Single<V extends string> = Common<V> & {
  multiple?: false;
  value: V | null;
  onChange: (value: V | null) => void;
  /** Allow clicking the selected option again to clear it. */
  clearable?: boolean;
};

type Multiple<V extends string> = Common<V> & {
  multiple: true;
  value: V[];
  onChange: (value: V[]) => void;
};

/** Accessible single- or multi-select buttons (radiogroup / toggle buttons). */
export function ChoiceChips<V extends string>(props: Single<V> | Multiple<V>) {
  const { options, label, variant = "chips", className } = props;
  const isSelected = (v: V) => (props.multiple ? props.value.includes(v) : props.value === v);

  function toggle(v: V) {
    if (props.multiple) {
      props.onChange(isSelected(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(isSelected(v) && props.clearable ? null : v);
    }
  }

  return (
    <div
      role={props.multiple ? "group" : "radiogroup"}
      aria-label={label}
      className={cn(variant === "cards" ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role={props.multiple ? undefined : "radio"}
            aria-checked={props.multiple ? undefined : selected}
            aria-pressed={props.multiple ? selected : undefined}
            onClick={() => toggle(option.value)}
            className={cn(
              "border text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              variant === "cards"
                ? "flex items-start gap-3 rounded-2xl p-3"
                : "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm",
              selected
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {variant === "chips" && selected && <Check className="size-3.5" aria-hidden />}
            {variant === "cards" ? (
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{option.label}</span>
                {option.description && (
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                )}
              </span>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
