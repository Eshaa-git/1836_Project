# Architecture

Nourish is a personalized nutrition, cooking, fitness, hydration, sleep and progress-coaching platform. This
document records the decisions that shape the codebase. Update it when a decision changes.

## Requirements baseline

Two requirement documents exist. **The second ("Personalized Diet, Food, Fitness and Motivation Tracking
Platform", 2026-09-30) is authoritative** where they conflict. The core loop is:

> Track → Understand → Recommend → Cook → Eat → Log → Recalculate → Adapt → Progress

The experience is **conversational first**: users log food, correct entries, list the ingredients they have and
ask what to eat by chatting. The rest of the UI shows and edits the same data.

### Gap analysis against the original plan

**Added (not in the original plan)**

| Req    | Capability                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 8      | Household units: bowls, slices, pieces, small/medium/large, servings; ambiguous → ask or mark estimate                             |
| 9, 11  | Conversational food logging and corrections ("change my chicken to 150 g", "remove the banana")                                    |
| 10     | Meal slot status: **logged / skipped / not logged / upcoming**; ask when the difference matters                                    |
| 12, 13 | AI cooking bot: recipes from stated ingredients, remaining nutrition and goal; beginner steps, heat, times, oil                    |
| 14     | Substitutions with **nutrition-equivalent quantities** (never 1:1 by weight by default)                                            |
| 15, 16 | Distribute daily targets across N meals, organised around wake/work/workout/bed times                                              |
| 17     | Within-day adaptation: each log recalculates the remaining meals                                                                   |
| 18     | Nutrient gap analysis (never phrased as a deficiency) → food options → quantity → recipe → log                                     |
| 19     | "Foods available": a lightweight, conversational list instead of an inventory                                                      |
| 20     | Prepared-food record with storage guidance; never a safety guarantee                                                               |
| 21, 22 | Saved meals ("my regular breakfast"), re-logging, searchable food/recipe history                                                   |
| 23     | Meal-prep planning (daily/weekly/biweekly) that considers shelf life                                                               |
| 24     | Beginner "workout done" logging alongside detailed sets/cardio                                                                     |
| 25     | Previous vs today comparisons, personal bests (cardio: speed, incline)                                                             |
| 5      | Goal lifecycle: achieved → celebrate → milestone → next target; missed deadline → suggest an extension (never harsher restriction) |
| 27, 28 | Hydration and sleep tracking with targets                                                                                          |
| 29, 30 | Dashboard answering _accomplished / remaining / focus next_; day-end summary with no "health score"                                |
| 31     | Trends over 7 days, 30 days, 3 months, 6 months or a custom range                                                                  |
| 33, 34 | Motivation (who or what motivated the user); role-model content only from documented public sources                                |
| 36     | Safety layer: extreme requests, unsafe workout jumps, referral to professionals                                                    |
| 37     | Privacy: view/update/delete data; connect and disconnect trackers (integrations later)                                             |

**Removed or on hold (were in the original plan)**

| Original module                                         | New status                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Pantry inventory, statuses, expiry tracking             | **Excluded.** Replaced by the "foods available" list                         |
| Inventory reservation (available → reserved → consumed) | **Removed** (there is no inventory)                                          |
| Shopping list                                           | **Excluded**                                                                 |
| Automatic BMR/TDEE target calculation                   | **HOLD 1.** Targets are user-entered and safety-checked; stored with history |
| Weekly review, plan adjustments, barrier check-ins      | **HOLD 2, 4, 5.** Replaced by day-end summary and trends                     |
| 7/14-day plans with grocery/cost                        | Reduced to meal-prep planning (req 23)                                       |
| Recipe library, multi-serving scaling                   | Recipes come from the bot plus saved/history; multi-serving is **HOLD 8**    |
| Packaged-food labels, barcode                           | **HOLD 9**                                                                   |
| Recipe ratings, like/dislike learning                   | **Excluded / HOLD 3**                                                        |

**Unchanged:** authentication, profile, dietary restrictions kept as four separate categories (allergy is the
highest priority), deterministic nutrition engine with UNKNOWN ≠ 0, cooking fat included in recipe nutrition,
planned ≠ eaten, workout tracking, progress, notifications, AI grounding rules, privacy and account deletion.

## Guiding principles

1. **LLM for language, reasoning and explanation; application logic for truth and enforcement.** The AI turns
   "two eggs and a medium apple" into candidate items. Deterministic code matches foods, converts units,
   computes nutrition, applies allergy rules and writes the log.
2. **Missing data is UNKNOWN, not zero.** Nullable columns mean unknown; totals report completeness. A meal
   slot that was not logged is never treated as skipped.
3. **Estimates are labelled.** Ambiguous portions and missing nutrients carry an `isEstimate` flag through to
   the UI.
4. **Append-only history** for goals, targets and measurements.
5. **Safety first:** allergens are enforced by deterministic filters on every path, including AI tools.
6. **Isolation:** every user-owned query is scoped by `userId`.
7. **No guilt:** late meals, missed days and missed deadlines are neutral events.

## Stack

| Concern       | Choice                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| Web framework | Next.js 16 (App Router, Turbopack, typed routes), React 19, TypeScript strict      |
| UI            | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, next-themes; Recharts for trends  |
| Database      | PostgreSQL (18 locally via `embedded-postgres`; any hosted Postgres in production) |
| ORM           | Prisma 7 with the `pg` driver adapter; migrations in `prisma/migrations`           |
| Validation    | Zod 4 at every boundary (forms, actions, env, AI tool inputs, jobs)                |
| Auth          | Better Auth (email + password, database sessions)                                  |
| AI            | Anthropic Claude with tool use                                                     |
| Food data     | USDA FoodData Central subset imported locally, plus curated household portions     |
| Jobs          | pg-boss worker (notifications, day-end summaries)                                  |
| Logging       | pino (JSON; pretty in dev), sensitive keys redacted                                |
| Tests         | Vitest (`unit` + `integration` projects), Playwright (desktop + mobile)            |

## Layers

```
app/ (routes, server components)  →  features/*/actions.ts (thin)  →  server/services
                                                                      ↙          ↘
                                                        server/domain (pure)   server/repositories (Prisma)
server/ai (Claude, tools)  →  calls the same services; the model never writes to the database directly
```

- **domain**: deterministic calculations and rules. No I/O, no framework imports. Fully unit-tested.
- **services**: use-cases. Take a `RequestContext` (`requestId`, `userId`, `now`, `timezone`, `logger`),
  run multi-step writes in one transaction, record audit events.
- **repositories**: shared Prisma queries. Services may also query Prisma directly, but every user-owned read or
  write must be scoped by `userId` (covered by isolation tests).
- **lib**: `env`, `db`, `logger`, `errors` (typed `AppError`s), `action` (`defineAction`), `context`.

### Authentication

- Better Auth (`src/server/auth/auth.ts`) serves `/api/auth/*`: email + password, database sessions (30 days,
  sliding), scrypt hashes, password reset by emailed single-use link, sign-out of other devices, account
  deletion. Rate limits per IP are stored in Postgres (`AUTH_RATE_LIMIT`, on by default except `next dev`).
- `src/proxy.ts` does an **optimistic** cookie check to redirect signed-out visitors (keeping `?next=`).
  The real checks are `requireSessionOrRedirect()` in the `(app)` layout and `defineAction`, which **requires a
  signed-in user by default** (`auth: "public"` opts out).
- Audit events: `auth.registered`, `auth.signed_in`, `auth.password_reset`, `account.deleted`.
- Email uses a transport interface; `console` logs messages and keeps an in-memory outbox for tests. A real
  provider will be added before launch.
- Data handling and the deletion policy are described in [privacy.md](privacy.md).

### Safety layer (Phase 2)

`src/server/domain/safety`, `targets/safety.ts` and `goals/goals.ts` return `SafetyIssue`s: `block` (refused),
`warn` (allowed only after the user acknowledges that code) or `info`. Forms run the same pure functions live for
instant feedback; services re-run them and throw `SafetyError` (issues reach the client via
`ActionError.safetyIssues`). Acknowledged warning codes are stored with the saved target or goal.

Goal lifecycle: `evaluateGoal` reports `no_target | no_data | in_progress | achieved | deadline_passed`. Achieved →
the user saves a milestone and picks a next goal; deadline passed → a gentler extension date is suggested and only
later dates are accepted. Nothing is ever made stricter automatically.

Server actions return `ActionResult<T>`. Unexpected errors are logged with the request id and shown to users
only as a generic message with a reference.

### Conversational pipeline (food logging example)

```
"I had two eggs, one dosa, 100 g yogurt and an apple"
  → AI extraction tool call: [{text:"egg", qty:2, unit:"piece"}, {text:"dosa", qty:1}, …]   (untrusted)
  → food matcher (deterministic): candidate foods + confidence
  → unit converter: household unit → grams via food portions; unknown portion → ask or mark estimate
  → allergy/restriction check (warn on logging, block on recommending)
  → preview card → user confirms → FoodLog rows (transaction) → recalculate remaining + adapt remaining meals
```

## Database conventions

- UUIDv7 primary keys; snake_case tables/columns via `@@map`/`@map`; `timestamptz(3)`.
- Quantities and nutrients as `numeric`; canonical grams/ml plus the user's original unit and text.
- Log tables store UTC timestamps **and** a `local_date` in the user's timezone.
- `AuditLog` rows survive user deletion with `user_id` set to NULL (pseudonymous).

## Phases

| #   | Phase                          | Scope                                                                                                                                                                    | Status |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 0   | Foundation                     | Tooling, database, shell, testing, CI                                                                                                                                    | ✅     |
| 1   | Authentication and account     | Register, login, logout, reset, sessions, protected routes, delete account                                                                                               | ✅     |
| 2   | Profile, restrictions, goals   | Basic + optional profile, routine and meal count, four restriction categories, goals with lifecycle and history, motivation, manual targets (safety-checked)             | ✅     |
| 3   | Food data and nutrition engine | USDA import, household portions, unit conversion, UNKNOWN-aware totals, estimates, allergen tagging                                                                      |        |
| 4   | Food logging                   | Meal slots and statuses, target → eaten → remaining, edit/delete, saved meals, re-log, history search, hydration and sleep logs                                          |        |
| 5   | Conversational core            | Claude assistant with tools: natural-language logging, corrections, clarifying questions, history questions                                                              |        |
| 6   | Recommend and cook             | Foods available, meal distribution and timing, within-day adaptation, nutrient gaps, recipes with deterministic nutrition, substitutions, prepared-food storage guidance |        |
| 7   | Workouts                       | Quick "done", detailed strength/cardio, previous vs today, personal bests, safe progression checks                                                                       |        |
| 8   | Progress and motivation        | Dashboard, day-end summary, trends, streaks, milestones, goal lifecycle prompts, motivation and role-model messages                                                      |        |
| 9   | Notifications and meal prep    | Contextual reminders, meal-prep planning, hardening, deploy                                                                                                              |        |
| —   | Future / HOLD                  | Wearables, BMR/TDEE, weekly review, feedback learning, restaurants, supplements, multi-serving prep, labels/barcode, check-in schedules                                  |        |
