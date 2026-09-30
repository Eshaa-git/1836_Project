import "server-only";
import { env } from "./env";
import { logger } from "./logger";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailTransport {
  send(email: Email & { from: string }): Promise<void>;
}

/**
 * Development/test transport: writes the email to the log and keeps it in an
 * in-memory outbox so tests can read reset links. Never used in production.
 */
const outbox: (Email & { from: string; sentAt: Date })[] = [];

const consoleTransport: EmailTransport = {
  async send(email) {
    outbox.push({ ...email, sentAt: new Date() });
    logger.info({ to: email.to, subject: email.subject }, `email (console transport)\n\n${email.text}\n`);
  },
};

function transportFor(kind: typeof env.EMAIL_TRANSPORT): EmailTransport {
  switch (kind) {
    case "console":
      if (env.NODE_ENV === "production") {
        logger.warn("EMAIL_TRANSPORT=console in production — emails are only logged");
      }
      return consoleTransport;
  }
}

export async function sendEmail(email: Email) {
  await transportFor(env.EMAIL_TRANSPORT).send({ ...email, from: env.EMAIL_FROM });
}

/** Test helpers for the console transport. */
export const testOutbox = {
  all: () => [...outbox],
  lastTo: (to: string) => [...outbox].reverse().find((e) => e.to === to),
  clear: () => {
    outbox.length = 0;
  },
};
