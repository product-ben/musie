/**
 * `/dev/experiment-mixer` — the two-stream bench. KEPT, not deleted.
 *
 * ── THE ORIGINAL QUESTION, ANSWERED: YES ──────────────────────────────────
 * iOS keeps two simultaneous `<audio>` elements playing with the screen locked
 * and the app in the background. Confirmed by Ben on a real iPhone, 2026-10-13,
 * including the locked-screen half that `OPEN-QUESTIONS.md` had been waiting on.
 * `lib/mixer.ts` was built on that answer and the answer holds.
 *
 * ── AND A SECOND FINDING THE SPIKE WAS NEVER ASKED FOR ────────────────────
 * **The lock-screen widget pauses one element, not both.** Pressing pause in
 * iOS's own now-playing widget stops the FOREGROUND track and leaves the
 * background bed playing. It should pause both: a person who presses pause has
 * asked for silence, and getting music without guidance is worse than either.
 *
 * That is a real bug in the two-stream design rather than in this bench, and it
 * is why the bench stays. iOS binds its Media Session to one element, so the
 * fix is to own that session deliberately — one `navigator.mediaSession` with
 * handlers that act on the PAIR — and this is the only place it can be tried
 * against a locked screen without shipping it.
 *
 * Logged for the backlog; `lib/mixer.ts` is where the fix lands.
 *
 * ── SO IT IS NO LONGER "ONE QUESTION AND A DELETE" ────────────────────────
 * It was written to be deleted the moment its one question was answered, and
 * the answer arrived with a second question attached. Ben's call, 2026-10-13:
 * keep it as `dev/experiment-mixer`, the bench for anything about two streams
 * that only a locked phone can settle.
 *
 * It keeps its exemptions from rules 6 and 7 — inline English, no catalogue
 * keys — on the same grounds as `/dev/qr` and `goal-mappings`: a tool nobody
 * but the team opens, linked from nowhere, and lazy so no visitor downloads it.
 *
 * ── THE QUESTION ──────────────────────────────────────────────────────────
 * Does iOS keep TWO simultaneous `<audio>` elements playing with the screen
 * locked and the app in the background?
 *
 * It is the one question that cannot be answered by reasoning, and it decides
 * the whole shape of the listening type — see LISTENING-EXERCISES-PLAN.md §4.10:
 *
 *   YES → two stems, as planned. The guidance and the ducked music are two
 *         files, the switch silences one of them, and the position never moves.
 *   NO  → a pre-mixed master plus a dry guidance file, only one element playing
 *         at a time, and the switch becomes *pause A, set B's position, play B*.
 *         One more export per cut, and the bed is no longer separable.
 *
 * The two answers do not share their files, so this has to be settled BEFORE
 * anybody records thirty-two of them.
 *
 * ── IT USES TWO RECORDINGS THAT ALREADY EXIST ─────────────────────────────
 * `trk-01.mp3` (219s) and `trk-05.mp3` (191s), from the private bucket, through
 * the app's own signed-URL path. Ben's call, and the right one: what plays is
 * irrelevant to the question, and waiting for stems to answer a question that
 * decides what the stems are is circular. Different lengths are fine — two
 * minutes of locked screen fits inside both.
 *
 * ── WHAT IT MEASURES, AND WHY A LOG RATHER THAN A WATCH ───────────────────
 * Nobody can watch a screen that is locked. So this samples
 * `{ wall, a.currentTime, b.currentTime }` four times a second and keeps the
 * samples either side of the gap. When the page comes back it compares three
 * numbers: how long the page was hidden, and how far each element advanced
 * while it was. Equal means it kept playing. Zero means it was paused — and
 * one of each is the answer nobody wants and the reason this page measures per
 * element instead of per page.
 *
 * It also answers two smaller questions on the way:
 *   · §4.3 — do both `play()` calls survive ONE user gesture? Both are made
 *     synchronously in the press handler, and each promise's fate is logged.
 *   · §4.4 — how far apart do two media clocks drift over minutes?
 *
 * ── IT IS A SPIKE, AND THESE TWO EXEMPTIONS GO WITH THAT ──────────────────
 * The strings here are INLINE ENGLISH, against rule 7, and there are no
 * German ones, against rule 6. A spike is an instrument read once by one
 * person and then deleted; fifteen catalogue keys in two locales for a page
 * with a known delete date is the waste the rule exists to prevent elsewhere.
 * Logged in apps/web/OPEN-QUESTIONS.md rather than taken quietly.
 *
 * NOTHING ELSE IS EXEMPT. No new CSS, no new class, no raw token: the
 * readouts are a `<dl>`, the log is a `<pre>`, and the two controls are the
 * design system's.
 *
 * ── HOW TO RUN IT ─────────────────────────────────────────────────────────
 *   pnpm --filter web dev --host --port 5176
 *   open http://<your-lan-ip>:5176/dev/experiment-mixer on the iPhone
 *   sign in as usual (the bucket is private; the policy wants `authenticated`)
 *   press Start both · lock the screen · wait two minutes · unlock · read the verdict
 *
 * Run it twice: once with the music audible, once with the switch on. Muting
 * is not pausing, and a platform that treats it as pausing is a platform this
 * design has to know about.
 *
 * Check the ringer switch and Low Power Mode before believing a negative.
 *
 * ── WHAT TO RUN NEXT ON IT ────────────────────────────────────────────────
 * The widget bug above. Press pause in the lock-screen widget and watch which
 * element keeps going; then try a single Media Session whose `pause` handler
 * stops both. Nothing else imports this file, so it can be changed freely.
 */
import * as React from 'react';
import { CtaButton, Switch } from '@musie/design-system';
import { Volume2, VolumeX } from 'lucide-react';
import { signedTrackUrls } from '../lib/audio';

/** Two recordings that exist in the bucket today, longest first. */
const VOICE_KEY = 'trk-01.mp3';
const MUSIC_KEY = 'trk-05.mp3';

/** Four times a second, as the listen step's own simulated clock ticks. */
const SAMPLE_MS = 250;

interface Sample {
  wall: number;
  a: number;
  b: number;
}

interface Verdict {
  hidden: number;
  advancedA: number;
  advancedB: number;
  drift: number;
  muted: boolean;
}

const seconds = (value: number) => `${value.toFixed(1)}s`;

export function DevExperimentMixer() {
  const a = React.useRef<HTMLAudioElement>(null);
  const b = React.useRef<HTMLAudioElement>(null);

  const [urls, setUrls] = React.useState<{ a: string; b: string } | null>(null);
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [started, setStarted] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);
  const [now, setNow] = React.useState<Sample | null>(null);
  const [verdicts, setVerdicts] = React.useState<Verdict[]>([]);

  /* Samples live in a ref: they are written four times a second and read only
     when the page comes back, so putting them in state would re-render the
     page for nothing — the same rule the plan's §4.4 states for `timeupdate`. */
  const samples = React.useRef<Sample[]>([]);
  const startedAt = React.useRef<number | null>(null);
  const lastVisible = React.useRef<Sample | null>(null);
  const mutedRef = React.useRef(false);

  const note = React.useCallback((line: string) => {
    const at = startedAt.current === null
      ? '  —  '
      : `${((Date.now() - startedAt.current) / 1000).toFixed(1).padStart(6)}s`;
    setLog((lines) => [...lines, `${at}  ${line}`]);
  }, []);

  /* ONE BATCH, so the pair costs one round trip — and so this page exercises
     the same `signedTrackUrls` the listening step will. */
  React.useEffect(() => {
    let cancelled = false;
    void signedTrackUrls([VOICE_KEY, MUSIC_KEY]).then((found) => {
      if (cancelled) return;
      const first = found.get(VOICE_KEY);
      const second = found.get(MUSIC_KEY);
      if (first === undefined || second === undefined) {
        setUrlError('One of the two objects could not be signed. Are you signed in?');
        return;
      }
      setUrls({ a: first, b: second });
    });
    return () => { cancelled = true; };
  }, []);

  /* ── the sampler ─────────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!started) return undefined;
    const timer = window.setInterval(() => {
      const sample: Sample = {
        wall: Date.now(),
        a: a.current?.currentTime ?? 0,
        b: b.current?.currentTime ?? 0,
      };
      samples.current.push(sample);
      /* The last sample taken while the page was visible is the one the
         verdict measures from: the interval is throttled or frozen in the
         background, so what matters is the pair either side of the gap. */
      if (document.visibilityState === 'visible') lastVisible.current = sample;
      setNow(sample);
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [started]);

  /* ── the verdict, on coming back ─────────────────────────────────────── */
  React.useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        note('page hidden — lock the screen and wait');
        return;
      }

      const before = lastVisible.current;
      const after: Sample = {
        wall: Date.now(),
        a: a.current?.currentTime ?? 0,
        b: b.current?.currentTime ?? 0,
      };
      note('page visible again');

      if (before === null || !started) return;

      const hidden = (after.wall - before.wall) / 1000;
      /* Under a second is a notification shade, not a locked screen. */
      if (hidden < 1) return;

      setVerdicts((all) => [...all, {
        hidden,
        advancedA: after.a - before.a,
        advancedB: after.b - before.b,
        drift: Math.abs(after.a - after.b) - Math.abs(before.a - before.b),
        muted: mutedRef.current,
      }]);
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [note, started]);

  /* ── BOTH `play()` CALLS IN ONE GESTURE, NOTHING AWAITED BETWEEN THEM ──
     §4.3. An `await` here spends the gesture, and on iPhone the second element
     silently never starts. The promises are logged, not waited on. */
  function startBoth() {
    const first = a.current;
    const second = b.current;
    if (first === null || second === null) return;

    startedAt.current = Date.now();
    samples.current = [];
    lastVisible.current = null;
    setStarted(true);
    note(`start pressed · ${VOICE_KEY} + ${MUSIC_KEY}`);

    const left = first.play();
    const right = second.play();

    void left.then(() => note('A play() resolved'), (e: unknown) => note(`A play() REJECTED: ${String(e)}`));
    void right.then(() => note('B play() resolved'), (e: unknown) => note(`B play() REJECTED: ${String(e)}`));
  }

  function toggleMute(next: boolean) {
    setMuted(next);
    mutedRef.current = next;
    const element = b.current;
    if (element !== null) element.muted = next;
    note(`music ${next ? 'muted' : 'unmuted'} (element.muted, not paused)`);
  }

  const events = (which: 'A' | 'B') => ({
    onPlay: () => note(`${which} play`),
    onPause: () => note(`${which} pause`),
    onWaiting: () => note(`${which} waiting (buffer underrun)`),
    onStalled: () => note(`${which} stalled`),
    onEnded: () => note(`${which} ended`),
    onError: () => note(`${which} error`),
  });

  const elapsed = now !== null && startedAt.current !== null
    ? (now.wall - startedAt.current) / 1000
    : 0;

  return (
    <>
      <h1 className="musie-placeholder">Spike · two streams, locked screen</h1>

      <p className="musie-note">
        Press <strong>Start both</strong>, lock the phone, wait two minutes, unlock, and read
        the verdict. Run it twice — once with the music audible, once with the switch on.
        Check the ringer switch and Low Power Mode before believing a negative.
      </p>

      {urlError !== null && <p className="musie-note">{urlError}</p>}
      {urls === null && urlError === null && <p className="musie-note">Signing two objects…</p>}

      {urls !== null && (
        <>
          {/* preload="auto" ON PURPOSE, unlike the listen step's "none": the
              question is about sustained playback, and starting a measurement
              on an empty buffer measures the buffer. */}
          <audio ref={a} src={urls.a} preload="auto" {...events('A')} />
          <audio ref={b} src={urls.b} preload="auto" {...events('B')} />

          <div>
            <CtaButton onClick={startBoth} disabled={started}>
              {started ? 'Running' : 'Start both'}
            </CtaButton>
          </div>

          <Switch
            label="Mute the music element"
            checked={muted}
            onCheckedChange={toggleMute}
            onGlyph={VolumeX}
            offGlyph={Volume2}
            disabled={!started}
          />

          <dl>
            <dt>wall clock since start</dt><dd>{seconds(elapsed)}</dd>
            <dt>A · {VOICE_KEY}</dt>
            <dd>
              {seconds(now?.a ?? 0)}
              {a.current?.paused === true ? ' · PAUSED' : ''}
            </dd>
            <dt>B · {MUSIC_KEY}</dt>
            <dd>
              {seconds(now?.b ?? 0)}
              {b.current?.paused === true ? ' · PAUSED' : ''}
              {muted ? ' · muted' : ''}
            </dd>
            <dt>drift between them</dt>
            <dd>{`${(((now?.a ?? 0) - (now?.b ?? 0)) * 1000).toFixed(0)}ms`}</dd>
          </dl>
        </>
      )}

      {verdicts.length > 0 && (
        <>
          <h2 className="musie-placeholder">Verdict</h2>
          {verdicts.map((verdict, index) => {
            /* Within a second of the wall clock is "it kept playing". A
               locked phone is not a stopwatch and nothing here needs it to be. */
            const heldA = Math.abs(verdict.advancedA - verdict.hidden) < 1;
            const heldB = Math.abs(verdict.advancedB - verdict.hidden) < 1;
            return (
              <p className="musie-note" key={index}>
                <strong>
                  {heldA && heldB
                    ? '✓ BOTH kept playing'
                    : heldA || heldB
                      ? `✗ ONLY ${heldA ? 'A' : 'B'} kept playing`
                      : '✗ NEITHER kept playing'}
                </strong>
                {` — hidden ${seconds(verdict.hidden)}, A advanced ${seconds(verdict.advancedA)}, `}
                {`B advanced ${seconds(verdict.advancedB)}, drift moved `}
                {`${(verdict.drift * 1000).toFixed(0)}ms`}
                {verdict.muted ? ' · music was muted' : ' · music was audible'}
              </p>
            );
          })}
        </>
      )}

      <h2 className="musie-placeholder">Log</h2>
      <pre>{log.join('\n')}</pre>
    </>
  );
}
