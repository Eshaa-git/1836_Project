import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/lib/db";
import { testOutbox } from "@/server/lib/email";
import { authRequest, freshIp, getSessionUserId, signUp } from "./auth-helpers";
import { resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  testOutbox.clear();
});
afterAll(() => db.$disconnect());

const PASSWORD = "correct horse battery";

function resetTokenFromEmail(to: string) {
  const email = testOutbox.lastTo(to);
  expect(email, `expected a reset email to ${to}`).toBeDefined();
  const url = new URL(email!.text.match(/https?:\/\/\S+/)![0]);
  return url.pathname.split("/").pop()!;
}

describe("registration", () => {
  it("creates the user with a hashed password and signs them in", async () => {
    const { userId, cookie } = await signUp("new@example.com");

    const account = await db.account.findFirstOrThrow({ where: { userId } });
    expect(account.providerId).toBe("credential");
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain(PASSWORD);
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/); // UUIDv7 from Prisma
    expect(await getSessionUserId(cookie)).toBe(userId);

    const actions = (await db.auditLog.findMany({ where: { userId } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["auth.registered", "auth.signed_in"]));
  });

  it("rejects a duplicate email regardless of letter case", async () => {
    await signUp("Alice@Example.com");
    const res = await authRequest("/sign-up/email", {
      body: { name: "Alice", email: "alice@example.com", password: PASSWORD },
      ip: freshIp(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(String(res.body?.code)).toMatch(/USER_ALREADY_EXISTS/);
    expect(await db.user.count()).toBe(1);
  });

  it("rejects passwords shorter than the minimum", async () => {
    const res = await authRequest("/sign-up/email", {
      body: { name: "Short", email: "short@example.com", password: "abc" },
      ip: freshIp(),
    });
    expect(res.status).toBe(400);
    expect(await db.user.count()).toBe(0);
  });
});

describe("sign in and sign out", () => {
  it("gives the same error for a wrong password and an unknown email", async () => {
    await signUp("bob@example.com");
    const ip = freshIp();
    const wrong = await authRequest("/sign-in/email", {
      body: { email: "bob@example.com", password: "not the password" },
      ip,
    });
    const unknown = await authRequest("/sign-in/email", {
      body: { email: "nobody@example.com", password: PASSWORD },
      ip,
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(unknown.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("signs in with correct credentials and signs out", async () => {
    const { userId } = await signUp("carol@example.com");
    const signIn = await authRequest("/sign-in/email", {
      body: { email: "carol@example.com", password: PASSWORD },
      ip: freshIp(),
    });
    expect(signIn.status).toBe(200);
    expect(await getSessionUserId(signIn.cookie)).toBe(userId);

    await authRequest("/sign-out", { body: {}, cookie: signIn.cookie });
    expect(await getSessionUserId(signIn.cookie)).toBeNull();
  });

  it("rate limits repeated sign-in attempts from one IP", async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await authRequest("/sign-in/email", {
        body: { email: "nobody@example.com", password: "guess" + i },
        ip,
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe("password reset", () => {
  it("resets the password with a single-use token and signs out other sessions", async () => {
    const { cookie: oldSession } = await signUp("dana@example.com");

    const request = await authRequest("/request-password-reset", {
      body: { email: "dana@example.com", redirectTo: "/reset-password" },
      ip: freshIp(),
    });
    expect(request.status).toBe(200);
    const token = resetTokenFromEmail("dana@example.com");

    const reset = await authRequest("/reset-password", {
      body: { newPassword: "a brand new passphrase", token },
      ip: freshIp(),
    });
    expect(reset.status).toBe(200);

    // Old sessions are revoked, old password fails, new password works.
    expect(await getSessionUserId(oldSession)).toBeNull();
    const ip = freshIp();
    expect(
      (await authRequest("/sign-in/email", { body: { email: "dana@example.com", password: PASSWORD }, ip }))
        .status,
    ).toBe(401);
    expect(
      (
        await authRequest("/sign-in/email", {
          body: { email: "dana@example.com", password: "a brand new passphrase" },
          ip,
        })
      ).status,
    ).toBe(200);

    // The token cannot be used twice.
    const reuse = await authRequest("/reset-password", {
      body: { newPassword: "another passphrase!", token },
      ip: freshIp(),
    });
    expect(reuse.status).toBe(400);
  });

  it("responds identically for unknown emails and sends nothing", async () => {
    const res = await authRequest("/request-password-reset", {
      body: { email: "ghost@example.com", redirectTo: "/reset-password" },
      ip: freshIp(),
    });
    expect(res.status).toBe(200);
    expect(testOutbox.all()).toHaveLength(0);
  });

  it("records the reset in the audit log", async () => {
    const { userId } = await signUp("erin@example.com");
    await authRequest("/request-password-reset", {
      body: { email: "erin@example.com", redirectTo: "/reset-password" },
      ip: freshIp(),
    });
    await authRequest("/reset-password", {
      body: { newPassword: "fresh passphrase 1", token: resetTokenFromEmail("erin@example.com") },
      ip: freshIp(),
    });
    expect(await db.auditLog.count({ where: { userId, action: "auth.password_reset" } })).toBe(1);
  });
});

describe("account deletion", () => {
  it("requires the correct password", async () => {
    const { cookie, userId } = await signUp("frank@example.com");
    const res = await authRequest("/delete-user", { body: { password: "wrong password" }, cookie });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.user.findUnique({ where: { id: userId } })).not.toBeNull();
  });

  it("deletes the user's personal data, keeps a pseudonymous audit trail, and leaves others untouched", async () => {
    const { cookie, userId } = await signUp("gina@example.com");
    const other = await signUp("hank@example.com");

    const res = await authRequest("/delete-user", { body: { password: PASSWORD }, cookie });
    expect(res.status).toBe(200);

    expect(await db.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await db.session.count({ where: { userId } })).toBe(0);
    expect(await db.account.count({ where: { userId } })).toBe(0);
    expect(await getSessionUserId(cookie)).toBeNull();

    const deletion = await db.auditLog.findFirst({ where: { action: "account.deleted" } });
    expect(deletion).not.toBeNull();
    expect(deletion!.userId).toBeNull();
    expect(JSON.stringify(deletion)).not.toContain("gina@example.com");

    expect(await getSessionUserId(other.cookie)).toBe(other.userId);
    expect(await db.auditLog.count({ where: { userId: other.userId } })).toBeGreaterThan(0);
  });
});
