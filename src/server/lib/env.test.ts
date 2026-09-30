import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  const valid = { DATABASE_URL: "postgresql://u:p@localhost:5432/db" };

  it("applies defaults for optional values", () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects a missing DATABASE_URL with a readable message", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://u:p@localhost/db" })).toThrow(/DATABASE_URL/);
  });

  it("rejects an unknown log level", () => {
    expect(() => parseEnv({ ...valid, LOG_LEVEL: "loud" })).toThrow(/LOG_LEVEL/);
  });
});
