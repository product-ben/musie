/**
 * Everything that has to exist before the first browser starts.
 *
 * ── WHY THIS FILE AND NOT `fakeCamera.ts` ─────────────────────────────────
 * Playwright takes ONE `globalSetup`, and until 2026-10-01 that was
 * `fakeCamera.ts` directly — which was right while the camera's clip was the
 * only fixture. There are two now, and hanging the second off the first would
 * have made a module named after a camera responsible for uploading audio.
 *
 * So the config points here and each fixture stays about one thing.
 *
 * ── THE ORDER IS NOT ARBITRARY ────────────────────────────────────────────
 * The camera's clip is a LAUNCH FLAG — `--use-file-for-fake-video-capture`
 * resolves a path before any page exists — so it must be on disk before the
 * browsers start, which is what `globalSetup` guarantees. The audio only has
 * to be in the bucket before the first page asks for a signed URL, which is
 * strictly later. Camera first anyway: it needs no network and no database, so
 * a stack that is down fails on the thing that is actually missing rather than
 * on a QR code that could have been written regardless.
 */
import generateFakeCamera from './fakeCamera';
import seedTrackAudio from './fakeTracks';

export default async function globalSetup(): Promise<void> {
  await generateFakeCamera();
  await seedTrackAudio();
}
