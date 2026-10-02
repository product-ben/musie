# The recording that heard nothing — a fix plan

**Status: IMPLEMENTED 2026-09-30**, on `voice-capture-honesty`, except where
said otherwise below. §4's five steps all landed; §5's `CONNECT_TIMEOUT_MS`
took the eight-second option rather than fifteen. What is still owed is the one
thing no commit can close: **the iPhone hand test** (§6).

One beta tester, iPhone, Chrome for iOS, 2026-09-29 between 17:00 and 18:00:
the record button went into record mode, ended on its own a moment later with
*"It went quiet for 6 seconds, so Musie stopped listening"*, and no words ever
appeared in the box.

This is Phase F's iPhone checkpoint failing, reported by a user instead of
walked by hand — the checkpoint `BUILD-PLAN.md` L979 says is *"the half the
checkpoint was written for"*.

The plan below is **not** a platform workaround. The investigation found one
structural defect underneath every candidate cause, and the point of fixing
that rather than any single candidate is that **the plan is worth doing
whichever candidate turns out to be true** — including the one where nothing
was broken at all (§3.1).

---

## 1 · The defect, in one sentence

**The code has one predicate for two different facts, and it reports the
flattering one.**

`features/voice/src/useTranscription.ts` L317:

```ts
if (!awaitingStatement.current && Date.now() - lastSound.current >= IDLE_STOP_MS) {
  clearInterval(timer);
  stop('silence');
}
```

`lastSound.current` moves in exactly one place — the recorder's per-chunk
callback, and only when `chunkLevel >= CLIENT_SILENCE_LEVEL` (L265-270). So
that branch fires for two unrelated reasons:

| What actually happened | What the screen says |
|---|---|
| Chunks are arriving and every one is quiet | *It went quiet for 6 seconds* — **true** |
| No chunk ever arrived at all | *It went quiet for 6 seconds* — **a lie** |

And the second is indistinguishable from the first **all the way to the
person**, because `stopNoticeKey('silence')` returns the same sentence
(`apps/web/src/lib/voiceScreen.ts` L86) and no error is set, so nothing
contradicts it.

### The distinction is free

`features/voice/src/audio/pcm-worklet.js` posts a message every
`BATCH_SAMPLES` — 960 samples at 24 kHz, so **every ~40 ms, regardless of
loudness.** A silent room still produces 25 chunks a second at level `0.000`.

So the two facts are separable with no platform knowledge, no new dependency
and no measurement on a device:

- **Chunks flowing, all quiet** → the room is quiet. `voice.stopped.silence` is
  honest.
- **No chunks** → *we* stopped hearing, not them. A different thing, which the
  app must say differently.

Two refs where there is one today:

- `lastSoundAt` — the newest **loud** chunk. Means *the person is speaking*.
- `lastChunkAt` — the newest chunk of **any** loudness. Means *capture is
  alive*.

That is the whole fix. Everything in §4 follows from it.

### The second defect, which is the timing half

`start()` sets `lastSound.current = Date.now()` and `deadline.current` at
L200-201, then `setStatus('connecting')` at L204 — and the countdown effect
arms on `status !== 'idle'` (L305). So the six seconds are **spent before the
microphone exists**, on:

- the WebSocket handshake to `wss://api.openai.com`,
- the `session.created` → `session.update` → `session.updated` round trip,
- `getUserMedia`, **including the permission dialog a person has to read and
  tap**,
- `audioWorklet.addModule()`.

Meanwhile `status` flips to `'recording'` on the socket's `session.updated`
(L208-209) — **independently of the microphone**. The button says *Recording*
while nothing is being recorded. That is why the report says record mode was
entered: it was, truthfully, by a button that is wired to the wrong half of the
system.

`config.ts` L94-99 documents `IDLE_STOP_MS` as *"Measured from the start of
recording"*. It is measured from the start of **connecting**. The config file
is wrong about its own dial, and that is a defect in its own right.

---

## 2 · What was ruled out, with the evidence, so nobody re-litigates it

### The suspended AudioContext — **measured, and largely refuted**

This was the prime suspect, mine included, and it is wrong. `resume()` is
never called anywhere in this repository, `context.state` is never read
(`grep -c '\.resume()'` is **0** on the live production bundle as well), and
WebKit does construct the context `suspended` where Chromium constructs it
`running`. It looks conclusive and it is not.

Driven against Playwright's WebKit 2359 — same WebCore autoplay gate as iOS,
no AVAudioSession — replaying this repo's exact order: gesture → delay →
`getUserMedia` → `new AudioContext({sampleRate:24000})` → `addModule` →
`createMediaStreamSource` → worklet → zero-gain → `destination`.

| case | activation at construction | capture live | state at construction | state +3 s | chunks | max peak |
|---|---|---|---|---|---|---|
| A · gesture, no delay, mic | yes | yes | `suspended` | **running** | 48 | 0.598 |
| B · gesture, **8 s delay**, mic | **no** | yes | `suspended` | **running** | 48 | 0.590 |
| C · gesture, 8 s delay, **no mic** | no | no | `suspended` | **suspended** | 0 | 0 |
| D · **no gesture**, no mic | no | no | `suspended` | **suspended** | 0 | 0 |
| E · **no gesture**, mic granted | no | yes | `suspended` | **running** | 48 | 0.598 |

Three findings, with C and D as the control that proves the gate was armed:

1. **A capturing document is exempt from the gate.** B and E start rendering
   with the activation expired or never granted, purely because
   `getUserMedia` had resolved — `document.isCapturing()` winning inside
   WebKit's `shouldDocumentAllowWebAudioToAutoPlay`. This repo constructs the
   context **after** the `getUserMedia` await (`recorder.ts` L64, then L79),
   which is the one ordering that is exempt. **"The four awaits burned the
   user activation" is refuted for this code path.**
2. **`state` immediately after construction is `suspended` in every case,
   including A.** Rendering starts asynchronously. So reading `context.state`
   right after L79 — the confirming test that suggests itself — is worthless.
   Only a later read, or `onstatechange`, means anything. This is why Step 1
   proves capture by **chunk arrival** and not by state.
3. **A 24 kHz context over a capture track resamples and delivers usable
   levels** (peak ≈ 0.59, far above `CLIENT_SILENCE_LEVEL`). The
   "24 kHz mismatch yields silence" candidate is much weaker than it looked.

**What survives:** WebKit's non-standard `interrupted` state, which only a real
iOS audio-session interruption can produce and which nothing here reads. A
watcher, not a diagnosis. `resume()` is still worth adding — see Step 1 — but
as belt and braces, explicitly **not as the fix**.

### The `data:` URI worklet — retired, measured

`apps/web/OPEN-QUESTIONS.md` L2034 pre-registered this as *the* suspect for the
iPhone checkpoint, in the exact words of this report: *"if it refuses, the
symptom will be a microphone that opens and produces no audio."* Vite inlines
`pcm-worklet.js` as `data:text/javascript;base64,…` because it is under the
4 kB `assetsInlineLimit`, and WebKit had never been asked to accept one.

**It accepts it.** `addModule` resolved and `new AudioWorkletNode(ctx,
'pcm-recorder')` constructed in all five cases above, cold and inside a genuine
click handler. **Close that entry** — §8.

### Anything provider-side — ruled out by the stop reason alone

An OpenAI incident, a model retirement, an expired token, a 429 or a 402 in
that hour produces either an error banner or `stopReason === 'timeout'`. None
produces a `'silence'` stop. `realtime-token`'s failures land as `noCredits` /
`rateLimited` / `connectionFailed` (`apps/web/src/lib/realtimeToken.ts`
L60-70), all banners.

### A regression from that morning — checked, and it is not one

Two commits landed on 2026-09-29 (`78d5101`, `bd48058`, merged as #9 and #10 at
09:16 and 09:58), hours before the incident. Both diffs change only
`navigate('/diary', …)` route state and touch no `voice.*` key, and
`features/voice` has been untouched since 2026-09-24 (`85bf7fa`). Production
serves `assets/index-CjrstwJu.js`; the local `apps/web/dist` holds a
**different, post-incident** build, which is worth knowing before anyone greps
it as "the deployed artifact".

### Two more, checked and closed

- **`sendAudio` throwing out of the chunk callback.** `connection.ts` L150
  guards on `readyState === WebSocket.OPEN`. Without that guard a `send()` on a
  CONNECTING socket would throw *past* the `lastSound.current` update — chunks
  arriving and never refreshing the clock, no React error state, an otherwise
  perfect four-observation candidate. The guard closes it.
- **`stop` identity churn tearing down its own session.** `stop` is
  referentially stable, so the 250 ms interval is not rebuilt per render and the
  unmount effect (L326-333) does not fire spuriously: `settle` is
  `useCallback(…, [])` and `append` is `useCallback(…, [])`
  (`features/voice/src/useSentences.ts` L76-81).

---

## 3 · What survives, ranked — and why they share one fix

Every one of them is a different first domino and **the same last one**: no
chunk carrying sound reached the callback, and the app called that silence. The
ranking turns on questions nobody has asked the tester (§7), which is why the
plan does not wait on it.

### 3.1 · Nothing audible reached the microphone in the window — the null hypothesis

**Turns on: did he actually speak in the first ~5 seconds?** Nobody asked, and
**the report never says he spoke** — it says no words appeared.

The token round trip happens *before* the window opens (`VoiceTranscript.tsx`
L183), so the clock starts at `useTranscription.ts` L200 and the socket reports
ready 0.3-1 s later. Someone who taps, reads the reflection question, thinks,
and starts speaking at second five or six gets their first loud chunk *after*
the tick at 6.00-6.25 s has already stopped the session. Four observations out
of four, **no bug, no platform assumption.**

Counter-evidence, honestly: the relay says the streaming did not work *"as
well"*, which reads like someone who expected words, i.e. who spoke. And the
prior cuts the other way — `BUILD-PLAN.md` L1149 records that F's iPhone
checkpoint **has never been performed**, so the first observed use of a
never-verified path failed, which is real weight for a platform cause.

This is not a reason to close the ticket. **Six seconds of thinking before
answering a question about your feelings is normal behaviour for this
product**, and an app that cuts the microphone for it is broken as designed.

### 3.2 · Capture was live and silent — every chunk's peak below 0.02

**Turns on: headphones, and wired or Bluetooth?** Nobody asked what the
previous step was playing through.

`CLIENT_SILENCE_LEVEL = 0.02` gates **both** the idle cut-off and — because
`DEFAULT_MODEL` is `gpt-live-transcribe` with `serverVad: false` — the browser's
turn commit (L272-284). One silent-but-live capture produces zero text, a
`'silence'` stop and no error, all three at once.

The concrete path in this app: the reflect step follows a step that has just
played a real track through an `<audio>` element (`SessionListen.tsx` L578,
played at L235), and **nothing pauses that element explicitly on the way out** —
the only `pause()` is inside `toggle()` at L257. React's detach normally stops
playback, so this is a question, not a proven first domino; it is listed here
because it is the one link in the chain that is cheap to remove outright
(Step 3). `getUserMedia({ echoCancellation: true,
noiseSuppression: true })` (`recorder.ts` L64-66) then forces iOS to renegotiate
the audio session from playback to play-and-record — over Bluetooth, to the HFP
headset mic, if AirPods are in, which for a mindfulness audio exercise on a
phone is the likely case. The context is constructed immediately after that
await (L79), i.e. *inside* the route change.

Two downstream outcomes, both silent and both fitting all four: chunks arrive
with peak 0, or `inputs[0]?.[0]` is undefined and `process()`'s
`if (!channel) return true` absorbs it silently and permanently.
`recorder.ts` inspects neither `track.muted` nor `track.readyState`.

**Confidence:** the strongest remaining *platform* candidate. The route
renegotiation is certain; "Bluetooth capture on iOS WebKit yields silence" is a
commonly reported class that **could not be established** as current behaviour,
and no probe on this machine can reach it.

**And the discriminator two people reached for does not work:** `RecordButton`
pads with `?? 0` (`packages/design-system/src/RecordButton.tsx` L87) and floors
each bar at 10 % (L115), so an empty `levels` array and an all-zero one are
**pixel-identical**. "Watch the level meter" tells you nothing.

### 3.3 · `getUserMedia` was still pending at six seconds

**Turns on: was there a permission prompt?** `await getUserMedia`
(`recorder.ts` L64) is an unbounded wait on a finger, and on Chrome for iOS a
first use can need the iOS app-level microphone grant for Chrome **and**
Chrome's own per-origin prompt. A native sheet does not block the JS event
loop, so the interval keeps ticking and the session dies at six seconds with
the request still in flight.

Against it: the reporter describes *watching* the button enter and leave record
mode, which a sheet would have covered — and it predicts that the second
attempt works, the grant now cached.

### 3.4 · The same, but he tapped "Don't Allow" late

The branch the investigation excluded for a wrong reason, and it is worth
stating because the reasoning was load-bearing.

The premise was that the report *"is internally consistent only if
`startRecorder` resolved"*, since a throw would set `stopReason = 'error'` and
suppress the silence notice. **That is false.** `stop()` records a reason only
when the previous status was not idle (`useTranscription.ts` L142-145) — so a
rejection landing *after* the six-second tick finds `previous === 'idle'`,
leaves `stopReason` as `'silence'`, and the notice renders. Meanwhile the catch
calls `setError(...)` **first** (L292) and `stop('error')` second (L297), so the
banner renders **as well**.

DOM order in `VoiceTranscript.tsx`: list (L209) → `RecordButton` (L246) → tips
(L292) → **stop notice (L311)** → **error banner (L323)**. The banner is the
second box below the button. **"No error was reported" is an absence of a
report, not a checked absence**, and the box he did report is the first one.

So no throwing candidate is excluded — including, at low rank, the `data:`
worklet, though §2 shows WebKit accepts it. This is also the cheapest thing to
test, because the wording separates the causes: *"Musie needs your
microphone…"* is `micDenied` (`en.ts` L791); *"Recording could not start on
this device"* is `recorderFailed` (L794). One question, two answers.

### 3.5 · Latent bugs found along the way, which explain none of this

Worth fixing in the same pass; worth **not** confusing with the diagnosis.

- **L1 · A `startRecorder` that resolves after `stop()`** is installed into a
  dead session (L258 assigns after L137-138 nulled the ref, with no
  cancellation flag). A later `start()` then overwrites the ref and the orphan
  becomes unreachable: microphone indicator lit, doubled audio into the new
  socket, and the orphan's `if (loud) lastSound.current = …` feeding the *next*
  attempt's clock.
- **L2 · `recorder.ts` L79-93 sits outside the `getUserMedia` try/catch**
  (L63-76). A throw from `addModule`, `createMediaStreamSource` or
  `new AudioWorkletNode` leaks the granted `MediaStream` **and** the
  `AudioContext`; only the returned `stop()` releases them, and on that path it
  is never returned.
- **L3 · `connection.ts` L121 drops every provider error** whose code starts
  with `input_audio_buffer` — no banner, no warning, no log. Written for
  commit-on-empty, it swallows a family, including the one event that is OpenAI
  saying *the browser sent no audio*. So "no banner" does not license "OpenAI
  reported nothing".
- **L4 · The mirror image of this bug, unreported.** `connection.ts` L99-107
  emits nothing for a `completed` event with an **empty** transcript.
  `awaitingStatement.current` is cleared only by `final`, `warning` or
  `settle()`, so an empty committed turn leaves it stuck `true` — which
  **permanently disables the idle cut-off** at L317 and leaves `pending` on
  until the 60 s timeout. A session that will not stop, instead of one that
  stops too soon.
- **L5 · The repo owns the right sentence and cannot reach it.**
  `messages.ts` L44-45 documents `recorderFailed` as *"getUserMedia worked and
  the capture graph still did not start"* — exactly this failure — and its only
  producer is the catch at L291-298, i.e. a thrown exception.
- **L6 · `close()` does not detach the message listener.** `connection.ts`
  L159-162 guards the `close` and `error` handlers with `closedByUs` and leaves
  the `message` listener from L70 attached, so a buffered `session.updated` can
  still call `onEvent({type:'ready'})` → `setStatus('recording')` on an idle
  session. Low probability, one line.
- **L7 · Nothing tests any of it.** `features/voice` has only
  `segmentation.test.ts` and `transcript/fillers.test.ts`;
  `apps/web/src/lib/voiceScreen.test.ts` covers pure functions. No test touches
  the idle timer, the recorder or the worklet, and `apps/web/e2e` has no voice
  spec.

---

## 4 · The plan — landed

Five steps. Steps 1-3 are the fix; 4 and 5 are what stop the next one costing a
week.

### Step 1 · Capture proves itself before the session believes in it

`features/voice/src/audio/recorder.ts`.

**Resume, but do not trust the resume.** After building the graph:

```ts
if (context.state !== 'running') {
  try { await context.resume(); } catch { /* the gate below is the real test */ }
}
```

A failed `resume()` must not throw here. The gate is what makes this robust to
platform behaviour nobody has measured — including the residual iOS half of §2 that
this repository cannot verify.

**Then do not resolve until a chunk has actually arrived.** The worklet posts
every ~40 ms, so a short window is generous:

```ts
/** ~37 chunks at 40 ms. Long enough for a slow first render quantum,
 *  short enough that a dead microphone is reported rather than waited on. */
const CAPTURE_PROOF_MS = 1500;
```

Install `recorder.port.onmessage` **before** awaiting, so a chunk that arrives
during set-up still counts; resolve on the first message; on timeout **tear the
graph down and stop the tracks** before throwing, or the failed attempt leaks a
live microphone.

The thrown code is **`recorderFailed`, not a new one.** `messages.ts` L44-45
already documents it as *"getUserMedia worked and the capture graph still did
not start"* — precisely this failure — and both locales already carry the right
sentence (`en.ts` L794, `de.ts` L561). Today **no code path can reach it
without an exception.** The repo owns the correct words and cannot say them;
Step 1 is what lets it.

**Watch the track, for the whole session, not just at the start.** Inspect
`readyState` after `getUserMedia`, and subscribe to `mute` and `ended` on the
audio track, reported upward through a new `options.onInterrupted`.

**Widen the `try` to cover the graph — §3.5's L2.** L79-93 currently sits
*outside* the `getUserMedia` try/catch at L63-76, so a throw from `addModule`,
`createMediaStreamSource` or `new AudioWorkletNode` leaks the granted
`MediaStream` **and** the `AudioContext`: the only thing that releases them is
the `stop()` this function never got to return. One teardown helper, called
from the timeout path, the catch, and `stop()` alike — three call sites, one
truth about what releasing the microphone means.

### Step 2 · The clock starts when capture does, and `recording` stops lying

`features/voice/src/useTranscription.ts`, `features/voice/src/config.ts`.

**`status === 'recording'` must mean both halves are live** — the socket is
configured *and* the microphone is proven. Today it means only the first, which
is the whole reason the button said *Recording* over a dead microphone. Keep
`socketReady` and `captureLive` as refs and set `'recording'` only when both
are true. `recordPhase` in `voiceScreen.ts` then needs no change and the button
stops lying for free.

**Re-base both clocks at capture-live**, not at `connecting`:

```ts
lastSoundAt.current = Date.now();
lastChunkAt.current = Date.now();
deadline.current   = Date.now() + SESSION_SECONDS * 1000;
```

This also stops the handshake eating the person's minute, which it does today.
And it makes `config.ts` L94-99 true about its own dial — **correct that comment
in the same commit**, or the next reader inherits the same wrong map.

**Two timers where there is one**, because there are two failures and they
deserve different sentences:

| Timer | Armed while | Fires on | Says |
|---|---|---|---|
| `CONNECT_TIMEOUT_MS` (new, ~15 s) | `connecting` | socket or mic never came up | `connectionFailed` / `recorderFailed` |
| `IDLE_STOP_MS` (6 s, unchanged) | `recording` | `lastSoundAt` stale, chunks flowing | `voice.stopped.silence` — now true |
| the watchdog, below | `recording` | `lastChunkAt` stale | `micInterrupted` |

**The watchdog is the centrepiece.** "No chunk of any loudness for
`CAPTURE_LOST_MS` while recording" means capture died mid-session, and it
subsumes four separate
candidates at once: the iOS page freeze (app switch, screen lock, the address
bar), a Bluetooth route change, an audio-session interruption, and a context
suspended after it had been running. One mechanism, four bugs, and none of them
can reach the person as *"it went quiet"* again.

**Start `CAPTURE_LOST_MS` at 1500 ms, not at the 1 s that suggests itself.**
Chunks arrive every ~40 ms, so 1500 ms is 37 consecutive misses — unambiguous —
while a one-second threshold is within reach of a long GC pause or a blocked
main thread, and a watchdog that cries wolf gets raised until it is useless.
It is a dial, it belongs in `config.ts` beside the others, and it wants one
measurement on a real phone before it is trusted.

Note why a wall-clock watchdog is right here and a wall-clock **idle** check is
wrong: a frozen page makes the first tick after the freeze fire `'silence'`
immediately today, because 6 s of wall clock passed with no chunks. Under the
new split, the same freeze trips the watchdog instead — the timer froze too, so
the first tick back sees a stale `lastChunkAt` and says the true thing.

**Cancel the in-flight start.** A generation counter closes §3.5's L1:

```ts
const generation = ++run.current;          // in start()
const opened = await startRecorder(...);
if (generation !== run.current) { opened.stop(); return; }  // stopped while opening
recorder.current = opened;
```

with `run.current++` in `stop()`.

**Arm the idle cut-off only after the first sound.** A product point, and
Ben's call (§8): today the cut-off cannot tell *"you stopped talking"* from
*"you never started"*, and for a reflection prompt the second is normal. Arming
it on the first loud chunk, and giving "never started" its own longer grace,
is the shape that matches how people actually answer a question about their
feelings.

### Step 3 · The messages that are owed, written not flagged

`features/voice/src/messages.ts`, `apps/web/src/lib/voiceMessages.ts`,
`apps/web/src/i18n/en.ts`, `apps/web/src/i18n/de.ts`.

`recorderFailed` needs nothing (Step 1). One genuinely new code is owed, for
capture lost **mid**-session — `recorderFailed` says *could not start*, and it
did start:

- `VoiceMessageCode` gains `'micInterrupted'`, in the microphone group.
- `VOICE_MESSAGE_KEYS` gains `micInterrupted: 'voice.error.micInterrupted'`.
  The `Record` is exhaustive both ways, so a missing entry fails `pnpm check`.
- Copy, both locales, to `docs/GERMAN-UI-WRITING.md` — du, lower case,
  sentence case, no *Bitte*, matching the register of the four sentences
  already in that block:

  **en** · `'The microphone stopped part-way through. Everything Musie had already heard was kept — start again when you are ready.'`

  **de** · `'Das Mikrofon hat mitten in der Aufnahme aufgehört. Alles, was Musie schon gehört hat, bleibt erhalten – starte neu, wenn du bereit bist.'`

`de.ts` is typed against `en.ts`, so one side without the other fails
`pnpm check`. That is the enforcement; this list is complete rather than
indicative (CLAUDE.md 6).

**Three things in `connection.ts` close in the same commit** — the first two
because they make "no banner" mean less than it should, the third because it
lets a dead session claim to be recording:

- **L121** drops *every* provider error whose code starts with
  `input_audio_buffer`. It was written for `commit_empty` and it swallows a
  family — including the one event that is OpenAI telling us **the browser sent
  no audio**, which would have diagnosed this report in one line. Narrow it to
  the exact codes that are genuinely ordinary, and count the rest into the
  diagnostics (Step 5) rather than dropping them on the floor.
- **L99-107** emits *nothing* for a `completed` event with an empty transcript.
  `awaitingStatement.current` is cleared only by `final` / `warning` / `settle`,
  so an empty committed turn leaves it stuck `true` — which **permanently
  disables the idle cut-off** at L317 and leaves `pending` on until the 60 s
  timeout. That is this bug's unreported mirror image: a session that will not
  stop instead of one that stops too soon. Add a `{ type: 'cleared' }` to
  `TranscriptEvent` that clears the waiting flag with nothing user-visible
  attached.
- **L159-162** guards the `close` and `error` handlers with `closedByUs` and
  leaves the `message` listener from L70 attached, so a buffered
  `session.updated` arriving after `close()` still calls
  `onEvent({ type: 'ready' })` → `setStatus('recording')` on an idle session.
  That is literally *"record mode, and quickly after that it ended"* for one
  250 ms tick. Low probability, one line: `removeEventListener`, or the same
  `closedByUs` guard the other two handlers already have.

**And one in the app, upstream of all of it.** `SessionListen.tsx` never pauses
its `<audio>` element explicitly on the way out — the only `pause()` is inside
`toggle()` (L257), the user-driven play/pause. In practice React nulls the ref
and detaches the element on unmount, which normally *does* stop playback, so
**this is a question rather than an established bug** and it should not be
written up as one. But it is the first domino in §3.2 and the cheapest item in
this plan: an explicit `pause()` plus `removeAttribute('src')` in an unmount
cleanup costs three lines, releases the iOS audio session deterministically
instead of relying on garbage collection, and removes the question for good.
Do it because it is cheap and because it makes the ordering explicit, not
because the bug is proven.

### Step 4 · The tests, and an honest account of what they cannot reach

**Pure, and this is the sustainable half.** Follow the pattern
`apps/web/src/lib/voiceScreen.ts` already establishes and states its own reason
for — *"the parts of the screen that can be WRONG are pulled out here, where a
test can drive them with fixture values instead of a microphone."* The same
argument applies with more force to the capture decision, which is the part
that was wrong.

Extract it: `features/voice/src/capture/health.ts`, one pure function over
timestamps —

```ts
export type CaptureVerdict = 'live' | 'quiet-room' | 'capture-lost' | 'never-started';
export function captureVerdict(now: number, s: {
  captureLiveAt: number | null; lastChunkAt: number; lastSoundAt: number;
  connectingSince: number; awaitingStatement: boolean;
}): CaptureVerdict;
```

— tested in `features/voice`'s existing node-only `unit` project, beside
`segmentation.test.ts`. No jsdom, no browser, no microphone. **This is the test
that would have caught the bug**, because the bug is a confusion between two
predicates and that is exactly what this function makes explicit.

**WebKit, without a microphone.** `apps/web/playwright.config.ts` runs Chromium
twice and `OPEN-QUESTIONS.md` L3510 records Playwright as Chromium-only,
*"where the bug is invisible"*. A WebKit project can reach the platform half
without a capture device at all: load the real `pcm-worklet.js`, drive it with
an `OscillatorNode` instead of a `MediaStreamSource`, and assert that
`addModule` resolves, that `process()` runs, and that chunks arrive at the
expected rate and level. That is how §2's `data:` URI question was settled and
it is worth keeping as a regression test.

Not in `pnpm check` — CI has no browser, and *"a suite that silently skips is
worse than no suite"* (`ci.yml`, and the same argument `vitest.config.ts` makes
for its `db` project). A `test:webkit` script, or a third Playwright project.

**What no harness here can reach, stated plainly:** Playwright WebKit has no
fake audio device, so the real `getUserMedia` path is untestable; and AVAudio-
Session behaviour — `interrupted`, route changes, the hardware mute switch,
Bluetooth — needs the phone. **Those stay a hand test.** Phase F's checkpoint
does not close by writing tests.

### Step 5 · The next report arrives with its own diagnosis

`features/voice/src` contains **zero** console statements: the entire capture
path is unobservable, and the one on-screen signal is ambiguous by construction
— `RecordButton` pads `levels` with `?? 0` and floors each bar at
`Math.max(0.1, v)`, so an empty array and twelve zeroes draw **identical**
meters. "Watch the level meter" is not a diagnostic.

Have the hook return a `diagnostics` object, cheap and always on: `msToSocketReady`,
`msToCaptureLive`, `chunks`, `maxLevel`, `commitsSent`, `emptyCommits`,
`contextState`, `sampleRate`, `trackMuted`. Those nine numbers separate every
surviving candidate in §3 from every other one.

Getting them off a tester's phone is the part that is a decision, not a task,
and it belongs in the log rather than in this plan (§8): a dev-only readout is
free and rule-clean but invisible on production, where the testers are; a
`?debug=voice` panel reaches them but puts visible text outside the catalogue
(CLAUDE.md 7); and writing them onto the session row reaches them properly but
is a new migration, which is rule 4 (stacking, never edit an applied one) and
rule 2 (RLS, policies, **revoke then grant**, to `authenticated` *and*
`service_role`) — a real piece of work, not a log line.

**Recommended:** ship the `diagnostics` object plus a `console.info` summary at
session end in Step 5a — it costs nothing and closes the laptop case
immediately — and take the phone-reachable half to Ben as the decision it is.

---

## 5 · What changes on screen

No layout changes, no new components, no design-system work, and nothing new for
the person to decide. The statement cards, the drag-and-drop, the undo toast,
the tips disclosure and the *Finish session* gate are all untouched. What
changes is **when the button changes word, and what the app says when it
stops.**

### The four a tester would notice

**1 · *Connecting…* gets slightly longer, and becomes true.** The button is
already disabled and already says *Connecting…* / *Verbindet…* while
`phase === 'connecting'` (`VoiceTranscript.tsx` L253, L266). Today it flips to
*Recording* the moment the socket is configured — while the microphone may
still be opening. After Step 2 it flips when **both** halves are live, so on a
warm permission grant the extra wait is the ~100-300 ms of `getUserMedia` +
`addModule` + first chunk, not the 1500 ms `CAPTURE_PROOF_MS` ceiling.

**The first-run case is the one to look at.** With a cold permission prompt, the
button now sits disabled on *Connecting…* behind the iOS sheet for as long as
the person takes to tap Allow, where today it would already claim to be
recording. Correct, and worth seeing on a phone before calling it good.

**2 · The clock starts at zero.** `elapsed` is `SESSION_SECONDS -
secondsLeft`, and the minute currently begins at connect — so the handshake
eats a second of the person's minute before the meter appears. Re-based at
capture, the full sixty seconds are theirs.

**3 · Six seconds of silence means six seconds.** Today the budget is
6 s *minus* the handshake, mic acquisition and any permission prompt —
roughly 4-5.5 s of real thinking time. This is the change a reflecting person
actually feels, and it is the whole of §3.1.

**4 · A failure says what failed.** A dead or refused microphone stops saying
*"It went quiet for 6 seconds"* and starts saying *"Recording could not start
on this device"* (`recorderFailed`, already written in both locales), and a
capture lost mid-sentence gets `micInterrupted`. One new box of copy; nothing
removed. `voice.stopped.silence` stays exactly as it is and becomes honest.

### The one regression, named

**A genuinely hung start takes longer to report.** Today *something* appears at
six seconds — the wrong thing, but something. With `CONNECT_TIMEOUT_MS` at
~15 s, a hung socket or a permission prompt nobody answers leaves the button
disabled on *Connecting…* for fifteen seconds before anything is said. That is
a worse wait than the status quo on the one metric a person can feel.

Three ways to spend it, and this is a UX decision rather than an
implementation detail:

- **Lower it.** Eight seconds is still far past a healthy start (~1 s) and half
  the wait. Probably right.
- **Split it.** Time the socket and the microphone separately — each has its own
  honest message already (`connectionFailed`, `recorderFailed`) — so whichever
  half is late is the one that reports.
- **Say something at six.** Keep the ceiling and put a *still connecting…*
  note under the button at ~6 s. More code, and more words on a screen Ben has
  twice asked to have fewer.

### The one risk, named

**The watchdog is a new way for a session to end mid-sentence.** At
`CAPTURE_LOST_MS = 1500` a false positive interrupts somebody who was talking,
which is worse than the bug it prevents — 1.5 s is 37 consecutive missed
chunks, which should be unambiguous, but "should be" is doing real work in that
sentence and no measurement backs it on a phone yet. Ship it behind the
diagnostics (Step 5) so a false positive is visible as a number rather than as
a mystery, and treat the first real-device session as the calibration.

### And the flow change that is Ben's to make

Arming the idle cut-off **only after the first sound** — Step 2's last item —
is the one item here that changes how the step feels rather than how honest it
is. It makes thinking time unbounded: the recorder waits for you to start, and
only then starts counting silence.

**The obvious objection does not survive arithmetic.** An abandoned session
would hold the microphone and socket to the 60 s ceiling, and
`gpt-live-transcribe` is $0.017 per minute (`config.ts` L49) — so the worst case
is **1.7 cents**, against a project spend cap of $50. Battery and a lit
microphone indicator are the real costs, not the bill, and the 60 s ceiling
already bounds both.

For a product whose question is *how do you feel*, waiting for the person to
begin is the behaviour that matches the brief. It is still a product call, and
it is logged as one.

---

## 6 · Order, and what "done" means

1. **Step 4's pure function first**, red. It is the specification: write
   `captureVerdict` and its tests against the four verdicts before touching the
   hook, and the rest of the work has something to be correct against.
2. **Steps 1-3**, in that order. Each is independently shippable and each makes
   the app strictly more honest than it was.
3. **Step 5a** with them.
4. `pnpm check` — typecheck, lint and unit tests across every package
   (CLAUDE.md 8). No migration is touched, so `pnpm test:db` is not owed.
   `pnpm --filter web build` too, because `tsc --noEmit` resolves neither the
   CSS imports nor the font-pinning plugin.
5. **The iPhone hand test, which is the only thing that closes this.** Verify
   against `supabase start` and `pnpm --filter web dev` through a cloudflared
   tunnel, never a URL — and then on the real deployed build, because the
   `data:` URI worklet only exists in a production bundle and the dev path
   would not exercise it.

**Done when**, on an iPhone: a recording that captures produces words; a
recording where the microphone is refused or dead says so instead of saying the
room was quiet; thinking for eight seconds before speaking does not end the
session; and switching apps mid-sentence ends it with the interruption message
rather than the silence one.

`BUILD-PLAN.md` L1149 and L1153 hold the checkpoint and the one ordering that
matters. Both are still owed after this lands — this makes the checkpoint
*passable*, it does not walk it.

---

## 7 · Six questions, in priority order, before a line is written

The diagnosis is **not settled**, and four of these cost one message to the
tester. Every one of them eliminates at least one candidate in §3.

1. **Did you actually say anything in those seconds?** — kills or confirms
   §3.1, the null hypothesis. Nothing in the report establishes that he spoke,
   and every other candidate assumes it.
2. **Was there a microphone permission prompt, and did you tap Allow or
   Don't Allow?** — §3.3 and §3.4.
3. **Scroll down: was there a second box under the grey one, and what did it
   say?** — repairs §3.4. The *wording* discriminates:
   *"Musie needs your microphone"* is `micDenied`; *"Recording could not start
   on this device"* is `recorderFailed`.
4. **Headphones? Wired or Bluetooth?** — §3.2, and nobody asked.
5. **Did you try again, and what happened the second time?** — a failure that
   repeats kills every prompt-timing candidate.
6. **Which link were you on — the `workers.dev` one or a `trycloudflare.com`
   one?** — the two load the worklet by entirely different mechanisms, and only
   one of them is the `data:` URI path.

One note for whoever checks the build: production was serving a different
bundle hash from the local `apps/web/dist`, and that `dist` was written
**after** the incident. Two commits landed on 2026-09-29 (`78d5101`,
`bd48058`, merged as #9 and #10), so a Workers build deployed that day. The
diffs touch only `navigate('/diary', …)` route state and no `voice.*` key, so
this is almost certainly not a regression — but it was asserted before it was
checked, and now it is checked.

---

## 8 · For `apps/web/OPEN-QUESTIONS.md`

Append-only, in that file's format, when this is approved.

1. **Close the `data:` URI worklet entry (L2034).** It pre-registered exactly
   this symptom and it is not the cause: WebKit's `addModule` accepts the
   inlined module and the processor constructs. Measured against Playwright
   WebKit 2359 with the repo's own worklet. The entry did its job — it told the
   next person where to look first — and closing it with the measurement is
   worth more than deleting it.
2. **Record the WebKit autoplay measurement, because the intuition is wrong
   and will be had again.** §2's five cases: a capturing document is exempt
   from WebKit's Web Audio autoplay gate, so constructing the `AudioContext`
   *after* the `getUserMedia` await — which is what `recorder.ts` L64/L79 does,
   apparently by accident — is the ordering that starts on its own with no
   activation at all. And `context.state` read immediately after construction
   is `suspended` in **every** case including a fresh gesture, so that read is
   not a diagnostic. Both facts cost half a day to discover and one paragraph
   to keep. The WebKit project in Step 4 is what stops them rotting.
3. **`IDLE_STOP_MS`: six seconds, and from when.** Ben's call, and the one
   number in this document with no argument strong enough to settle itself.
   Six seconds of silence is a long time in a conversation and a short time
   when someone is deciding how they feel. Separately from the length: should
   the cut-off arm at all before the first sound is heard?
4. **Whether the diagnostics reach production, and how.** Step 5's three options
   and their real costs: dev-only and invisible where the testers are; a
   `?debug=voice` panel that puts text outside the catalogue (rule 7); or the
   session row, which is a migration under rules 2 and 4.
5. **Capture depends on the output graph rendering.** The worklet only runs
   because it is connected to `context.destination` through a zero-gain node,
   and `recorder.ts` L89-93 says so. That couples microphone capture to whatever
   iOS is doing with audio *output* — the mute switch, an interruption, a route
   change. The watchdog detects the consequence; it does not decouple the cause,
   and decoupling may not be possible in the Web Audio model. Worth writing
   down before somebody rediscovers it.
6. **`echoCancellation` and `noiseSuppression` are on and were never
   measured** (`recorder.ts` L64-66). On iOS they select voice-processing mode,
   which changes the input route. Whether they help or hurt this app's audio is
   an empirical question nobody has asked, and `CLIENT_SILENCE_LEVEL = 0.02` was
   never calibrated against what they actually deliver.
