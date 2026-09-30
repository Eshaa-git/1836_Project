"use client";

import { createAuthClient } from "better-auth/react";

/** Browser-side auth API (same origin). Server code uses `auth.api` instead. */
export const authClient = createAuthClient();
