# Architecture

Nourish is a nutrition, pantry, meal-planning, workout and progress-coaching web app. This document
records the decisions that shape the codebase. Update it when a decision changes.

## Guiding principles

1. **LLM for reasoning and explanation, application logic for truth and enforcement.**
2. **Missing data is UNKNOWN, not zero.** Nullable columns mean unknown; totals report completeness.
3. **Append-only history** for goals, targets, measurements and inventory (ledger).
4. **Safety first:** allergens are enforced by deterministic filters on every path, including AI tools.
5. **Isolation:** every user-owned query is scoped by `userId`.

## Stack

| Concern       | Choice                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| Web framework | Next.js 16 (App Router, Turbopack, typed routes), React 19, TypeScript strict             |
| UI            | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, next-themes; Recharts for charts (later) |
| Database      | PostgreSQL (18 locally via `embedded-postgres`; any hosted Postgres in production)        |
| ORM           | Prisma 7 with the `pg` driver adapter; migrations in `prisma/migrations`                  |
| Validation    | Zod 4 at every boundary (forms, actions, env, AI tool inputs, jobs)                       |
| Auth          | Better Auth (Phase 1)                                                                     |
| AI            | Anthropic Claude with tool use (Phase 12)                                                 |
| Jobs          | pg-boss worker (Phase 13)                                                                 |
| Logging       | pino (JSON; pretty in dev), sensitive keys redacted                                       |
| Tests         | Vitest (`unit` + `integration` projects), Playwright (desktop + mobile)                   |

## Layers

```
app/ (routes, server components)  →  features/*/actions.ts (thin)  →  server/services
                                                                      ↙          ↘
                                                        server/domain (pure)   server/repositories (Prisma)
```

- **domain**: deterministic calculations and rules. No I/O, no framework imports. Fully unit-tested.
- **services**: use-cases. Take a `RequestContext` (`requestId`, `userId`, `now`, `timezone`, `logger`),
  run multi-step writes in one transaction, record audit events.
- **repositories**: Prisma queries; user-owned reads/writes require `userId`.
- **lib**: `env` (validated config), `db` (Prisma singleton), `logger`, `errors` (typed `AppError`s),
  `action` (`defineAction` wraps validation + error mapping for server actions), `context`.

Server actions return `ActionResult<T>` (`{ ok: true, value } | { ok: false, error }`). Unexpected errors
are logged with the request id and shown to users only as a generic message with a reference.

## Database conventions

- UUIDv7 primary keys; snake_case tables/columns via `@@map`/`@map`; `timestamptz(3)`.
- Quantities and nutrients as `numeric`; canonical base quantity (g/ml/piece) plus the user's unit.
- Log tables store UTC timestamps **and** a `local_date` in the user's timezone.
- `AuditLog` rows survive user deletion with `user_id` set to NULL (pseudonymous).

## Phases

| #   | Phase                                       | Status |
| --- | ------------------------------------------- | ------ |
| 0   | Foundation                                  | ✅     |
| 1   | Authentication and account                  |        |
| 2   | Onboarding, profile, goals                  |        |
| 3   | Nutrition engine and targets                |        |
| 4   | Food database and units                     |        |
| 5   | Recipes (scaling, oil logic, allergens)     |        |
| 6   | Pantry and smart pantry                     |        |
| 7   | Recommendations and daily plan              |        |
| 8   | Reservations, meal states, food logging     |        |
| 9   | Weekly/14-day planning and shopping         |        |
| 10  | Workouts                                    |        |
| 11  | Progress, missing-data logic, weekly review |        |
| 12  | AI coach                                    |        |
| 13  | Notifications and hardening                 |        |
