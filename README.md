# Nourish

Plan meals from what you have, track workouts, and see real progress.

See [docs/architecture.md](docs/architecture.md) for the architecture and phase plan, and
[docs/privacy.md](docs/privacy.md) for data handling and account deletion.

## Requirements

- Node.js ≥ 20.9 (developed on Node 26)
- PostgreSQL — provided locally by `npm run db:start` (no Docker or system install needed)

## Setup

```bash
npm install
cp .env.example .env
# put a real secret in .env:  BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
sed 's/nourish_dev/nourish_test/' .env > .env.test
npx playwright install chromium        # once, for end-to-end tests

npm run db:start                        # terminal 1 — leave running
npm run db:deploy                       # terminal 2 — apply migrations to nourish_dev
npm run db:import-foods                 # food catalog: USDA download (~13 MB, once) + curated dishes
npm run dev                             # http://localhost:3000
```

Password-reset emails are printed in the `npm run dev` output (`EMAIL_TRANSPORT="console"`).
Auth rate limiting is off under `next dev`; set `AUTH_RATE_LIMIT="on"` to try it locally.

To use a different Postgres (Postgres.app, Neon, Supabase…), set `DATABASE_URL` in `.env` / `.env.test`
and skip `db:start`.

## Scripts

| Script                                | Purpose                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                         | Dev server with pretty logs                                          |
| `npm run build` / `npm start`         | Production build / serve                                             |
| `npm run check`                       | Lint + typecheck + format check + unit & integration tests           |
| `npm test`                            | Vitest (unit + integration)                                          |
| `npm run test:unit`                   | Unit tests only (no database needed)                                 |
| `npm run test:integration`            | Integration tests against `nourish_test` (migrates it first)         |
| `npm run test:e2e`                    | Playwright on desktop + mobile viewports (builds and serves the app) |
| `npm run db:start`                    | Local embedded Postgres on port 54329 (data in `.data/`)             |
| `npm run db:migrate -- --name <name>` | Create and apply a migration after editing the schema                |
| `npm run db:deploy`                   | Apply pending migrations                                             |
| `npm run db:studio`                   | Browse data in Prisma Studio                                         |

## Project layout

```
prisma/               schema and migrations
scripts/              dev tooling (local database)
src/app/              routes — (app)/ is the signed-in area; api/ holds route handlers
src/components/       ui/ (shadcn), layout/ (shell, nav), common/ (shared app components)
src/config/           navigation and static config
src/lib/              code shared by client and server (Result type, formatting helpers)
src/server/           domain/ (pure logic), services/, repositories/, lib/ (env, db, logger, errors)
tests/                integration/, e2e/, setup/
```
