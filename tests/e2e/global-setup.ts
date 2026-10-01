import { execSync } from "node:child_process";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/nourish_test";

/** Migrates the e2e database and loads the small offline food catalog. */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "ignore", env });
  execSync("npx tsx scripts/seed-test-catalog.ts", { stdio: "inherit", env });
}
