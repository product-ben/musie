/**
 * Per-file teardown for the `db` project: give back every user the suite made.
 *
 * ── WHY A SETUP FILE AND NOT `globalSetup` ────────────────────────────────
 * `db.globalSetup.ts` runs in Vitest's main process; the tests run in workers.
 * The registry of created ids lives in `db.support.ts`, which the WORKERS
 * import — so a teardown returned from `globalSetup` would drain an empty set
 * in the wrong process and report success having deleted nothing. That is the
 * shape of false green this suite's own header is written against.
 *
 * A `setupFiles` entry runs inside each worker, in the same module graph as
 * the tests, so the `afterAll` below sees the ids those tests actually made.
 *
 * ── ONCE PER FILE, NOT ONCE PER RUN ───────────────────────────────────────
 * Vitest runs this `afterAll` at the end of every test FILE. That is earlier
 * than strictly necessary and is the right trade: a file's tests are finished
 * with their users by then, and deferring to the end of the whole run would
 * need a channel between worker processes that does not exist.
 *
 * ── IT IS REGISTERED FOR EVERY FILE, INCLUDING THE TWO THAT ALREADY SWEEP ──
 * `signIn.db.test.ts` and `auth.convert.db.test.ts` delete their own email
 * accounts in their own `afterAll`. This does not duplicate that work — it
 * drains a registry those files never add to, so for them it is a no-op that
 * returns immediately.
 */
import { afterAll } from 'vitest';
import { sweepCreatedUsers } from './db.support';

/* 30s, matching the budget `signIn.db.test.ts` gives its own sweep: deleting
   a dozen users against a hosted project is a dozen round trips to Frankfurt,
   and a timeout here would strand exactly the rows this exists to remove. */
afterAll(sweepCreatedUsers, 30_000);
