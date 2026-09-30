import { db } from "@/server/lib/db";

/** Empties every application table between tests (keeps the migrations table). */
export async function resetDatabase() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Inserts a bare user row (no credentials) for tests that don't exercise auth. */
export function createTestUser(email: string) {
  return db.user.create({ data: { email, name: "Test User" } });
}
