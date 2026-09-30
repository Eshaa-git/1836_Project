import "server-only";
import pino from "pino";
import { env } from "./env";

/**
 * Structured JSON logger. In development `npm run dev` pipes output through
 * pino-pretty. Sensitive fields are redacted wherever they appear.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "nourish-web" },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "headers.cookie",
      "headers.authorization",
    ],
    censor: "[redacted]",
  },
});

export type Logger = pino.Logger;
