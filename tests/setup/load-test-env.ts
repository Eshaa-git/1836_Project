import { config } from "dotenv";

/** Loads .env.test, overriding .env, so integration tests can never hit the dev database. */
export function loadTestEnv() {
  config({ path: ".env.test", override: true, quiet: true });
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Refusing to run integration tests against non-test database: ${url}`);
  }
}
