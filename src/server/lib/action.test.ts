import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineAction } from "./action";
import { createContext } from "./context";
import { NotFoundError, SafetyError } from "./errors";

const schema = z.object({ servings: z.number().int().positive() });
const context = () => createContext({ requestId: "req-1234567890" });

describe("defineAction", () => {
  it("passes validated input to the handler and wraps the value", async () => {
    const action = defineAction(schema, async (input) => input.servings * 2, { name: "double", context });
    await expect(action({ servings: 2 })).resolves.toEqual({ ok: true, value: 4 });
  });

  it("returns field errors for invalid input without calling the handler", async () => {
    let called = false;
    const action = defineAction(
      schema,
      async () => {
        called = true;
      },
      { name: "noop", context },
    );
    const result = await action({ servings: -1 });
    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.fieldErrors?.servings?.length).toBeGreaterThan(0);
    }
  });

  it("maps AppErrors to their safe user message", async () => {
    const action = defineAction(
      schema,
      async () => {
        throw new SafetyError("This recipe contains peanuts, which you're allergic to.");
      },
      { name: "schedule", context },
    );
    await expect(action({ servings: 1 })).resolves.toEqual({
      ok: false,
      error: { code: "SAFETY", message: "This recipe contains peanuts, which you're allergic to." },
    });
  });

  it("maps NotFoundError with the entity name", async () => {
    const action = defineAction(
      schema,
      async () => {
        throw new NotFoundError("Recipe");
      },
      { name: "get", context },
    );
    const result = await action({ servings: 1 });
    expect(!result.ok && result.error).toMatchObject({ code: "NOT_FOUND", message: "Recipe not found." });
  });

  it("hides unexpected error details and returns a reference id", async () => {
    const action = defineAction(
      schema,
      async () => {
        throw new Error("connection string postgres://secret@db leaked");
      },
      { name: "boom", context },
    );
    const result = await action({ servings: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).not.toContain("secret");
      expect(result.error.message).toContain("req-1234");
    }
  });
});
