# Privacy and data handling

Nourish stores personal and health-related information. This document is the application's data policy
and is enforced by the schema and tests. Update it whenever a new kind of personal data is stored.

## What we store (as of Phase 2)

| Data                                                                              | Where                                     | Why                                                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Name, email                                                                       | `users`                                   | Sign-in and addressing the user                                                                       |
| Password hash (scrypt)                                                            | `accounts.password`                       | Sign-in. Plain passwords are never stored or logged                                                   |
| Sessions (token, expiry, IP, user agent)                                          | `sessions`                                | Keeping the user signed in; showing and revoking devices                                              |
| Reset tokens                                                                      | `verifications`                           | Password reset; expire after one hour and are single-use                                              |
| Rate-limit counters (IP + endpoint)                                               | `rate_limits`                             | Stopping password guessing                                                                            |
| Security events                                                                   | `audit_logs`                              | Investigating account issues; contains no names, emails or health data                                |
| Date of birth, sex (optional), height, units, timezone                            | `user_profiles`                           | Age-appropriate guidance, safety limits on targets, healthy-range checks on goals, "today" boundaries |
| Diet type, cuisines, preferred foods, routine, meal times, motivation, role model | `user_profiles`                           | Tailoring suggestions and encouragement; all optional                                                 |
| Allergies, intolerances, foods avoided, other restrictions                        | `dietary_restrictions`                    | Excluding unsafe or unwanted foods from every suggestion (allergies strictly)                         |
| Body measurements                                                                 | `body_measurements`                       | Progress toward goals; days without an entry are unknown, never inferred                              |
| Goals, goal change history, milestones                                            | `goals`, `goal_events`, `goal_milestones` | Showing start → current → target and keeping achievements                                             |
| Daily targets and their history                                                   | `daily_targets`                           | Target → eaten → remaining; acknowledged safety warnings are recorded                                 |

## Account deletion

Deleting an account (Settings → Delete account, password required) is **immediate and permanent**:

- The `users` row is deleted. Every user-owned table references it with `ON DELETE CASCADE`, so sessions,
  credentials and all future personal data (profile, goals, logs, workouts, conversations) are removed in the
  same transaction.
- `audit_logs` rows are kept with `user_id` set to `NULL`, including an `account.deleted` event. They hold only
  an action name, timestamps and a request id, so they no longer identify anyone.
- There is no soft-delete or grace period.

Tests: `tests/integration/auth.test.ts` ("account deletion") and `tests/e2e/auth.spec.ts`.

**Rule for new tables:** any table holding user data must have a `user_id` foreign key with
`onDelete: Cascade` and must be added to the deletion test.

## Logging

pino redacts `password`, `token`, `authorization` and `cookie` fields. Services must not log personal or
health data. Log request ids instead.

## Coming later

Data export, and connecting and disconnecting trackers. Each profile field already explains on screen why it is asked for.
