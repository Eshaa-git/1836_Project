import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { listAuditLogsForUser } from "@/server/repositories/audit-log";
import { recordAudit } from "@/server/services/audit";
import { resetDatabase } from "./helpers";

beforeEach(resetDatabase);
afterAll(() => db.$disconnect());

describe("audit log", () => {
  it("records an event attributed to the current user", async () => {
    const user = await db.user.create({ data: { email: "a@example.com" } });
    const ctx = createContext({ userId: user.id });

    await recordAudit(ctx, { action: "profile.updated", entityType: "UserProfile", entityId: user.id });

    const [entry] = await listAuditLogsForUser(db, user.id);
    expect(entry).toMatchObject({
      action: "profile.updated",
      actorType: "USER",
      requestId: ctx.requestId,
    });
  });

  it("only lists events belonging to the requested user", async () => {
    const alice = await db.user.create({ data: { email: "alice@example.com" } });
    const bob = await db.user.create({ data: { email: "bob@example.com" } });
    await recordAudit(createContext({ userId: alice.id }), { action: "a" });
    await recordAudit(createContext({ userId: bob.id }), { action: "b" });

    const aliceLogs = await listAuditLogsForUser(db, alice.id);
    expect(aliceLogs.map((l) => l.action)).toEqual(["a"]);
  });

  it("keeps the event but removes the user link when the user is deleted", async () => {
    const user = await db.user.create({ data: { email: "gone@example.com" } });
    await recordAudit(createContext({ userId: user.id }), { action: "account.deleted" });

    await db.user.delete({ where: { id: user.id } });

    const remaining = await db.auditLog.findMany({ where: { action: "account.deleted" } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.userId).toBeNull();
  });

  it("commits audit rows atomically with the surrounding transaction", async () => {
    const user = await db.user.create({ data: { email: "tx@example.com" } });
    const ctx = createContext({ userId: user.id });

    await expect(
      db.$transaction(async (tx) => {
        await recordAudit(ctx, { action: "will.rollback" }, tx);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");

    expect(await db.auditLog.count({ where: { action: "will.rollback" } })).toBe(0);
  });
});
