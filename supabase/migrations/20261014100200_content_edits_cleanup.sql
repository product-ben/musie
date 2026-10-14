-- ═══════════════════════════════════════════════════════════════════════════
-- `content_edits` CAN BE DELETED FROM BY THE SERVER, AND HERE IS WHY
--
-- `20261014100000` granted `service_role` only `select, insert` on
-- `content_edits`, with a comment saying "nothing may update or delete a
-- history row, not even the server". That reads well and it is the wrong
-- place to enforce it.
--
-- ── WHAT FOUND IT ─────────────────────────────────────────────────────────
-- Writing `maintenance.db.test.ts`. Every test of a write leaves a history
-- row, by design, and with no delete privilege the suite cannot clean up
-- after itself. Two consequences, and the second is the serious one:
--
--   1. `pnpm test:db` would add rows to the log on every local run, so the
--      operator's own *what changed* list would fill with `MC-98` and
--      `trk-98` — the screen whose whole value is that it is true.
--   2. `pnpm test:db` CAN BE POINTED AT HOSTED, and that is not a misuse —
--      it is how the `service_role` grant hole was found on 2026-09-21, and
--      CLAUDE.md rule 4 documents the three environment variables that do it.
--      A suite that permanently writes into the real audit log is a suite
--      nobody will run against the environment that matters.
--
-- ── WHERE THE PROMISE ACTUALLY LIVES ──────────────────────────────────────
-- Append-only is enforced by there being NO CODE PATH THAT DELETES:
--
--   * `admin_write` and `admin_revert` only ever `insert` here. A revert
--     writes a new row naming the edit it undid; nothing rewrites history.
--   * `content-admin` has no delete action at any level, for any entity —
--     not for a history row, not for a card, not for a storage object.
--   * Nothing else holds the service role.
--
-- A withheld privilege looked like a stronger guarantee than a reviewed code
-- path, and for a table only one function writes it is not: it protects
-- against a bug nobody has, at the cost of a test suite nobody can run
-- cleanly. The grant goes in; the promise stays in the code and in the
-- function's own header.
--
-- `update` is still NOT granted. Deleting a test fixture is a thing an
-- operator-owned suite does; rewriting what a log says happened is not, and
-- no code path wants to.
-- ═══════════════════════════════════════════════════════════════════════════

grant delete on table public.content_edits to service_role;

comment on table public.content_edits is
  'Every maintenance write, append-only BY CODE PATH rather than by privilege '
  '— see 20261014100200. admin_write and admin_revert only insert, and '
  'content-admin has no delete action; `delete` is granted to service_role so '
  'that pnpm test:db can clean up its own fixtures, including when it is '
  'pointed at hosted. `update` is granted to nobody.';
