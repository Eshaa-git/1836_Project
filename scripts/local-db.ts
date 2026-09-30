/**
 * Runs a local PostgreSQL server for development and tests without Docker or
 * a system install. Data persists in .data/postgres between runs.
 *
 *   npm run db:start      (leave running in its own terminal; Ctrl-C to stop)
 *
 * Any Postgres works — point DATABASE_URL elsewhere to skip this entirely.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.LOCAL_PG_PORT ?? 54329);
const databaseDir = path.resolve(".data/postgres");
const databases = ["nourish_dev", "nourish_test"];

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    port,
    user: "postgres",
    password: "postgres",
    authMethod: "scram-sha-256",
    persistent: true,
    onLog: () => {},
    onError: (e) => console.error("[postgres]", e),
  });

  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    console.log(`Initialising cluster in ${databaseDir}`);
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const { rows } = await client.query<{ datname: string }>("SELECT datname FROM pg_database");
  const existing = new Set(rows.map((r) => r.datname));
  await client.end();
  for (const db of databases) {
    if (!existing.has(db)) {
      await pg.createDatabase(db);
      console.log(`Created database ${db}`);
    }
  }

  console.log(`Postgres ready on postgresql://postgres:postgres@localhost:${port}`);
  console.log(`Databases: ${databases.join(", ")} — Ctrl-C to stop.`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping Postgres…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
