import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `server-only` throws outside a React Server environment; tests run server code directly.
const serverOnlyStub = fileURLToPath(new URL("tests/stubs/server-only.ts", import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["tests/setup/unit-env.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/integration-global.ts"],
          setupFiles: ["tests/setup/integration-env.ts"],
          // Tests share one database; run files serially to keep them isolated.
          fileParallelism: false,
        },
      },
    ],
  },
});
