"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
  maxLength?: number;
};

/** Free-text list entry: type and press Enter (or Add); tap a chip to remove it. */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  maxLength = 40,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const has = (text: string) => value.some((v) => v.toLowerCase() === text.toLowerCase());

  function add(text: string) {
    const clean = text.trim().slice(0, maxLength);
    if (clean && !has(clean)) onChange([...value, clean]);
    setDraft("");
  }

  const unused = suggestions.filter((s) => !has(s));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          aria-label={label}
          value={draft}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          className="h-10"
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
        >
          <Plus aria-hidden /> Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} added`}>
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground hover:bg-secondary/70"
                aria-label={`Remove ${tag}`}
              >
                {tag} <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Quick add:</span>
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
