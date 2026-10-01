import type { Prisma } from "@/generated/prisma/client";

/** Prisma Decimal (or null) → number (or null). Null stays null: unknown is never 0. */
export function num(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : value.toNumber();
}
