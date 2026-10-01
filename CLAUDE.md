@AGENTS.md

# Nourish — project notes for AI assistants

Read `docs/architecture.md` before making structural changes.

## Non-negotiable rules

- **LLM for reasoning and explanation; application logic for truth and enforcement.** Allergy filtering,
  nutrition arithmetic, pantry reservations/deductions, meal state transitions, auth and permissions are
  deterministic code in `src/server/domain` / `src/server/services` — never delegated to the AI.
- **Missing data is UNKNOWN, never zero.** Use `null` for unknown nutrients/measurements; never coalesce to 0.
- **History is append-only** for goals, nutrition targets, measurements and inventory changes.
- Every user-owned query is scoped by `userId` in the repository layer.
- No business logic in React components; UI → server action → service → domain.

## Layout

- `src/server/domain` pure functions (no I/O), `src/server/services` use-cases/transactions,
  `src/server/repositories` Prisma access, `src/server/lib` env/db/logger/errors/action helper.
- `src/features/<feature>` UI + thin actions; `src/components/ui` is shadcn (generated — edit sparingly).
- Prisma client is generated to `src/generated/prisma` (gitignored); import from `@/generated/prisma/client`.

## Gotchas

- `defineAction` requires a signed-in user unless `auth: "public"`; use `requireUserContext()` in route handlers.
- Prisma 7 `migrate` does not regenerate the client — run `npm run db:generate` after schema changes.
- Every new user-owned table needs `onDelete: Cascade` to `User` and coverage in the deletion test (docs/privacy.md).
- Prisma blocks `migrate reset` for AI agents; ask the user to run it if a reset is truly needed.
- Hand-edited migrations (extensions, partial indexes, CHECKs): `prisma migrate dev --create-only`, edit, then
  `prisma migrate deploy` — `migrate dev` can hang on an interactive drift prompt afterwards.

## Commands

- `npm run db:start` (keep running) · `npm run dev` · `npm run check` (lint, types, format, tests)
- `npm run db:migrate -- --name <change>` after editing `prisma/schema.prisma`
- `npm run test:e2e` (builds and serves against the test DB)
