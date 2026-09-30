import { execSync } from "node:child_process";
import { loadTestEnv } from "./load-test-env";

/** Regenerate the client and bring the test database schema up to date once per run. */
export default function setup() {
  loadTestEnv();
  execSync("npx prisma generate", { stdio: "ignore", env: process.env });
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
