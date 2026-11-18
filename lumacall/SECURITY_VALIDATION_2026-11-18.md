# LumaCall 3 — security and release validation (2026-11-18)

This is a working technical validation record; it does **not** certify the product as safe for public release.

## Immutable production baseline

At the start of this hardening branch, GitHub \`main\` and the Vercel production domain \`lunacall.vercel.app\` used commit \`f1a93e020fddc9096f2ed1963784eaa711b33c2a\`, READY. Do not force-update main or treat an isolated Preview as Production.

## High-impact vulnerabilities addressed in this branch

- Normalize invitation codes before checks and enforce bans inside the database join transaction.
- Archive channels without deleting their historical messages or exposing private messages to the general channel.
- Reject archived channels in the \`v3_can_read_channel\` database function.
- Retire the legacy server-wide LiveKit token endpoint in favor of channel-level authorization.
- Attempt LiveKit participant removal and token revocation on kick/ban; explicitly report failed or unverified removal.
- Limit newly created account secrets to at least 8 characters while retaining compatibility for existing logins.
- Validate profile changes before applying a single atomic SQL UPDATE.
- Prevent delegated role managers from changing roles held by equal/higher-ranked users or themselves.
- Prevent a stale busy state when chat sending is attempted without a selected channel.

## Database prerequisites

The branch adds \`v3/security-hardening.sql\`. **Apply it on an isolated Neon branch first**, then run regression checks. Before promoting matching code, verify that production has the new columns and function definitions. Applying code that references \`archived_at\` before the migration causes API errors.

The SQL contains only additive columns/indexes and function replacements; all existing rows remain untouched. Do not rerun the older \`v3/migrate.sql\` script indiscriminately after archiving private channels: its legacy message backfill was designed for the original V3 rollout.

## Tests

Run \`npm run test\`, which uses Node's built-in test runner. \`npm run build\` executes the tests before the Next.js compilation, preventing a broken Preview from appearing READY.

Source-based tests are useful guards, but they **do not prove** runtime authorization. Required additional tests before launch:

- Two-account invite-ban bypass attempts using uppercase/lowercase/whitespace.
- Archived private-channel message confidentiality by SQL and authenticated APIs.
- Roles/permissions tests with two privileged accounts at different priorities.
- LiveKit active room removal tests in a test room.
- Media screen sharing, multi-user calls, zoom and mobile browsers.
- Rate limiting across multiple serverless instances.

## Rollout / rollback

1. Validate this branch with Vercel Preview and an isolated Neon branch.
2. Apply additive schema changes to production only after approval and integrity checks.
3. Update main as a fast-forward; monitor the production deployment and alias.
4. Recheck runtime errors and Vercel failure alerts.
5. Roll back the application code if unexpected errors occur. The additive schema can remain; do not delete production columns or user data as a rollback shortcut.

## Known limitations still outstanding

LiveKit revocation in production and 2–6 person real media calls are untested. The messaging UI still polls. Attachments, persistent unread indicators, search, notifications, account recovery, and robust end-to-end tests are not complete. Avoid claiming a public-launch-ready product before validating these.
