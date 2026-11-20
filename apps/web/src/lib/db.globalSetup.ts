/**
 * Give the `db` project the one storage object it asserts about, once.
 *
 * ── THE TRAP THIS CLOSES ───────────────────────────────────────────────────
 * `db.content.db.test.ts` asks a signed-in listener to mint a signed URL for a
 * recording, and `createSignedUrl` checks that the object EXISTS. The `tracks`
 * bucket is created empty by `20260921160000_track_audio.sql` and nothing in
 * the migrations puts a file in it — correctly, because the real masters are
 * licensed and are an operator upload.
 *
 * So the only things that ever filled it were an operator running
 * `pnpm music:upload`, and `e2e/fakeTracks.ts` via Playwright's `globalSetup` —
 * which runs on `pnpm test:e2e` and NEVER on `pnpm test:db`.
 *
 * The result was an order dependency dressed as a schema failure: run
 * `supabase db reset` and then `pnpm test:db`, and the suite went red with
 * `StorageApiError: Object not found` for a reason that had nothing to do with
 * the migration just written. CLAUDE.md rule 4 sends you to `pnpm test:db`
 * after every migration change, so the trap fired exactly when the suite was
 * being trusted most. Logged OPEN in `apps/web/OPEN-QUESTIONS.md`; this is the
 * close.
 *
 * ── WHY REUSE THE WALK'S SEEDER ────────────────────────────────────────────
 * `e2e/fakeTracks.ts` already does this job and already does it carefully: it
 * reads `tracks` rather than taking a list, so a fifth recording arriving in a
 * migration is covered without editing anything; it leaves a NULL `src` alone,
 * because that is the schema saying there is no recording; and every upload is
 * `upsert: false` and skipped when the key is already present, so a stack
 * holding the real masters is untouched. A second seeder would be the same
 * decisions taken twice, and `deck-migration.mjs` versus
 * `music-migration.mjs` is the standing lesson about what that costs.
 *
 * ── NO HOSTED BRANCH ANY MORE ─────────────────────────────────────────────
 * This used to skip when the suite was aimed at hosted, whose bucket holds the
 * real masters. Since 2026-11-20 `stack()` refuses any target that is not
 * loopback (see `db.support.ts`), so every target this runs against is a local
 * stack with fixture audio to give.
 */
import seedTrackAudio from '../../e2e/fakeTracks';
import { stack } from './db.support';

export default async function setup(): Promise<void> {
  /* The target, injected: the walk's own `stack()` compares `.env.local`
     against it and refuses when they differ, which is right for a walk and
     wrong here. See `TrackAudioTarget`. */
  await seedTrackAudio(stack());
}
