import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  const valid = {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    BETTER_AUTH_SECRET: "x".repeat(32),
  };

  it("applies defaults for optional values", () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects a missing DATABASE_URL with a readable message", () => {
    expect(() => parseEnv({ BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://u:p@localhost/db" })).toThrow(/DATABASE_URL/);
  });

  it("requires a long auth secret", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("refuses the example placeholder secret in production", () => {
    const placeholder = { ...valid, BETTER_AUTH_SECRET: "replace-me-with-a-long-random-secret-value" };
    expect(() => parseEnv({ ...placeholder, NODE_ENV: "production" })).toThrow(/placeholder/);
    expect(() => parseEnv(placeholder)).not.toThrow();
  });

  it("rejects an unknown log level", () => {
    expect(() => parseEnv({ ...valid, LOG_LEVEL: "loud" })).toThrow(/LOG_LEVEL/);
  });
});
