/** Loads the small offline test food catalog into DATABASE_URL (used by e2e setup). */
import { seedTestCatalog } from "../tests/fixtures/catalog";
import { createScriptClient } from "./lib/prisma";

const db = createScriptClient();
seedTestCatalog(db)
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
