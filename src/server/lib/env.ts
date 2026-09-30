import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at first import. Fails fast with a
 * readable message instead of surfacing `undefined` deep inside a request.
 * Never import this from client components — secrets live here.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    APP_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -base64 32)"),
    /** Auth endpoint rate limiting. Defaults to on, except in local development. */
    AUTH_RATE_LIMIT: z.enum(["on", "off"]).optional(),
    EMAIL_TRANSPORT: z.enum(["console"]).default("console"),
    EMAIL_FROM: z.string().min(3).default("Nourish <no-reply@localhost>"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  })
  .refine((e) => !(e.NODE_ENV === "production" && e.BETTER_AUTH_SECRET.startsWith("replace-me")), {
    path: ["BETTER_AUTH_SECRET"],
    message: "is still the .env.example placeholder — generate a real secret for production",
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
