# MOCKUPS.md

**What looks finished and is not.**

Musie is built in phases, and several screens deliberately show the *shape* of
a feature before the feature exists. That is a choice, not a shortfall: it is
how the flow gets walked end to end early. But a mockup that nobody wrote down
becomes a bug report from a new developer, or worse, a promise to a user.

So: every place the product presents something it cannot yet do, with what you
actually see, what is missing behind it, and which
[BUILD-PLAN.md](BUILD-PLAN.md) step finishes it.

**Read this before filing a bug.** If a behaviour is in the table below, it is
known and scheduled.

Two things this file is *not*. It is not a list of unbuilt screens — an absent
screen is honest and lives in BUILD-PLAN.md. And it is not a list of known
defects — a mockup behaves as designed.

**Updated 2026-09-20, after Phase D.** Four entries described screens that did
not exist when this file was written; all four were built, and every one of
them was still a mockup — which is exactly why they were written down early.

**Revised 2026-09-21, twice, and the numbering moved. Read this before citing
an entry by number.**

The morning's pass found three entries that had gone wrong in the same
direction, each understating what works: the scan step's said a simulated
draw was the only way in, the deploy one still said no hosted project was
linked and told the reader to edit applied migrations in place — the one
instruction in this repo that fails silently — and the Diary's said a delete
confirmation did not exist when Phase D had built it the day before.

The evening's pass **deleted the scan entry outright**, and everything after
it shifted down by one. E.2 and E.3 landed, the camera works, Ben confirmed
it on an iPhone, and this file's own closing rule says an entry describing
something that works is worse than no entry. It had no content left: the last
thing it could honestly have claimed was "untested on hardware", and hardware
has now been tested. What survives of it lives in BUILD-PLAN's E.3 and in
`apps/web/OPEN-QUESTIONS.md` — the `BarcodeDetector` branch that only Android
Chrome runs, and which nothing tests.

**Two earlier deletions, for the same reason.** About Musie's carousel had CSS
and no component until D.0 built it. And the numbering has now shifted twice,
so a citation of the form *MOCKUPS.md 5* is only good against the commit it
was written in — `SessionListen.tsx` and `scan.ts` were both repointed by hand
in the same commit as this deletion.

---

## At a glance

| # | What looks real | What is actually missing | Lands in |
|---|---|---|---|
| 1 | Voice reflection: record button, meter, timer | Nothing is recorded or transcribed, and the step says so | F.1–F.6 |
| 2 | Photo reflection: drop zone, picker, preview | Nothing is uploaded or read, and the step says so | blocked |
| 3 | Listen step's transport and clock | There are no audio files; the clock is simulated | E.4 |
| 4 | Track title and artist | Withheld by design, and no reveal gate yet | E.5 |
| 5 | Exercise step copy | Columns exist, near-empty — 28 strings owed | blocked |
| 6 | Situation on a session | Recorded, never filled — nothing asks | open |
| 7 | The listen step's three scroll views | Only the stage is built; the reveal is not | E.5 |
| 8 | The four user types | Three unbuilt; no artwork for any | D.2 ✓ / artwork |
| 9 | The Diary timeline | Grouping, filtering and deletion are done; the rail and markers are not — a design-system step | open |
| 10 | The whole app | The database is hosted; the app is not — no Netlify build, no domain | A.6 half 2 |

---

## 1 · Voice reflections are UI only

**What you see.** The reflect step offers voice as one of three modes. Pressing
record starts a timer and animates a level meter; pressing it again stops.

**What is missing.** All of it. No `MediaRecorder`, no upload, no
transcription — and **no level, either**: the meter runs on the clock, because
with no microphone there is nothing to measure. The UI is interactive so the
flow can be walked and reviewed, and it says so on screen rather than
pretending: an info `Message` sits under the control and states that recording
is not built and that only the text would ever be kept.

**IT CANNOT COMPLETE THE STEP.** Voice writes no `reflections` row, so *Finish
session* stays disabled while it is the chosen mode. That is deliberate — the
alternative was hiding a mode the product has already decided on, which would
make the screen look finished and be less true.

**How it will work, and why the schema already suits it.** A voice answer is
**transcribed to text** by OpenAI and only the text is stored — so a voice
reflection eventually lands as an ordinary `reflections` row with
`mode = 'voice'` and the transcript in `body`. **Musie never stores a
recording of anyone's voice.** That is why there is no `media_path` column and
no Storage bucket: the absence is the design, not an omission.

Decision D1. The voice work itself is Phase F, and the proof-of-concept lives
outside this repository in `product-ben/musie-voice-to-text-demo` (F.0 brings
it in).

## 2 · Photo reflections are UI only, and the image is never kept

**What you see.** A drop zone, a file picker, a preview, a remove — the real
`PhotoUpload`, driving a real `<input type="file">`, so choosing a photo really
does show it.

**What is missing.** The reading. The image is **never stored server-side** —
but it is not discarded either: it is **read back as text**, and the text is
what persists (decision D13). So a photo answer lands as an ordinary
`reflections` row with `mode = 'photo'` and the words in `body`, exactly as a
voice answer lands as its transcript.

Photo and voice are therefore ONE feature with two front doors. Both produce
words; neither produces a file. That is why `reflections` has no `media_path`
and no Storage bucket, and why the `mode` check constraint already allows all
three values although two of them are unbuilt — widening it cost nothing
before A.6 and would be an `alter table` against live rows after.

**Still blocked on someone other than Claude Code:** which vision model reads
the handwriting. BUILD-PLAN.md lists it. Until it lands, the reflect step's
photo mode captures and shows a preview and writes no row — and, like voice,
leaves *Finish session* disabled, with an info `Message` saying why.

## 3 · There is no audio

**What you see.** A `TrackButton` — one pill carrying the action word and a
countdown — that starts, pauses and replays. The listen step's 90-second gate
unlocks against it.

**What is missing.** The files. `tracks.src` points at recordings that are not
in the project, because **the licensing is not cleared** — up to eleven
recordings, and that is a real-world blocker, not an engineering one.

**The element is real and is tried first.** There is an `<audio>` with the
track's `src` on it; when the browser refuses the file, the step falls back to
a clock at the track's own `duration_seconds`, which the seed carries precisely
so a countdown can render before anything has loaded. A note appears under the
control saying the clock is what is running, and the element is unmounted — it
has already refused, and leaving it mounted left it fighting the clock that
took over, which was a real defect the end-to-end walk found. That fallback is
the only thing a real file deletes.

No scrubber: this is the stage, and the stage never had one — see entry 7.

`select count(*) from tracks` is the number to quote when asking. Note the
schema deliberately stores a recording **once** and points at it, so a
recording shared between two exercises is one licence, not two. E.4.

## 4 · A track's title and artist are withheld, deliberately

**Not a mockup — this one is finished, and the easiest thing in the repo to
"fix" by mistake.**

`tracks.title` and `tracks.artist` are **not granted to the client at all**, by
column-level grant. The premise of the exercise is a listener who has not been
primed by the track name. Track ids are opaque (`trk-01`, never
`morgenlicht`) for the same reason, because `exercise_tracks.track_id` *is*
readable and a title-derived id would hand over the answer the grant withholds.

Both halves are asserted by `pnpm test:db`. If a query for a title returns
nothing, that is the design working. See CLAUDE.md rule 2.

**What is missing** is only the reveal: a `reveal-track` Edge Function and the
scroll-gated reveal at the end of the listen step. E.5.

## 5 · Every exercise's step copy is empty

**What you see.** Session steps with chrome and almost no words of their own.
The intro step shows one borrowed sentence; the listen and reflect steps show a
borrowed question.

**What is missing.** The copy. `exercise_i18n` carries `intro_text`,
`scan_text`, `listen_text` and `reflect_text` — one list of 1–3 sentences per
step, each element rendered as its own paragraph — plus one `question` shown on
**both** the listen and the reflect step. All of it is null except one
`scan_text`.

**That is 28 strings, and they are not ours to write.** They come from the
Mindfulness Cards spreadsheet: 4 lists × 3 exercises × 2 locales = 24, less
the two `scan_text` rows that already carry real copy, plus 1 question × 3 × 2
= 6. The source only ever wrote nine *per-card* variants, which had no home
once the copy moved to the exercise.

The exception is worth knowing about, because it is the only content the
re-cut kept: `scan_text` on Quick Mindfulness Break is the old `guideline` —
*"Work with the card you are drawn to, not the one you think you should
pick."* — with hand-written German. Everything else is null.

**TWO FALLBACKS EXIST, AND THEY ARE CHROME RATHER THAN PLACEHOLDERS.**
`session.intro.fallback` and `reflect.questionFallback` are in the app's own
catalogues, in both languages, written to `docs/GERMAN-UI-WRITING.md`. They are
not stand-ins for content nobody has written — they are true of every exercise,
which is exactly why they could be written without the spreadsheet, and they
simply stop rendering the moment an exercise has words of its own. The question
fallback is the prototype's, word for word.

Ben approved that on 2026-09-19, and it is what un-blocked D.5: the step copy
blocks FINAL copy, not the screens.

`select * from public.missing_translations` finds every hole. It stays quiet
about these because it compares locales against *each other* rather than
testing for null — absent from both is data, absent from one is a dropped
translation.

Two exercises — Breathing Score and Body Scan Soundwalk — also have no track at
all, and each wants one pairing row with a null `card_id`.

## 6 · A session records its situation, and nothing asks

`sessions.situation_id` exists, is nullable, and is **null for every row**.
`situations` and `exercise_situations` are seeded and are how the prototype
narrowed which exercise to offer, but no screen puts the question to anyone.

The column is here because it was free to add before the schema deployed and an
`alter table` against live rows afterwards. Decision D6: record it, ask it
later. "What was I trying to do?" is diary-grade context whenever a picker
lands.

## 7 · The listen step is the stage, and the reveal is not built

**What you see.** One screen: the exercise's words, the question, the transport
and the gate copy under it. The gate is `exercises.listen_gate_seconds` — 90s
for Quick Mindfulness Break, which is the prototype's measured figure. **The
other two exercises carry estimates** (60s and 180s), because neither has a
recording to tune against; the seed says so where they are set.

**What is missing.** Two more. The prototype's listen step is three stacked
viewports — this stage, a *"it would be better not to get influenced by the
track name and cover"* interstitial, and a details view with the full
`MusicPlayer`, the track's title and its artist. **Reaching the third view IS
the reveal**, which is the whole mechanism entry 4 is waiting on.

Deliberately not built here: those two views exist to gate `reveal-track`, and
that function is E.5. Nothing in the stage has to be undone when they arrive —
they are scroll targets below it.

## 8 · Three of the four user types are not built

`user_types.implemented` is true for exactly one. Picking one of the other
three **on `/about-you`** opens a not-implemented lightbox and records nothing;
`/settings` deliberately accepts all four, because a preference is something
you are entitled to record whether or not the product has caught up with it.
Ben settled that asymmetry on 2026-09-19 and it is commented in both files.

Separately, **none of the four has artwork** — all four rows point at the same
placeholder — so `RadioGroupText` is what ships and `RadioGroupImage` cannot be
used properly until the four pictures arrive. Four identical images destroy the
thing that component is for; this is the clickdummy handoff's own open item 1,
and it is the one part of D.2 still waiting on somebody.

## 9 · The Diary's timeline has no timeline

**Rewritten 2026-09-21, and most of this entry went away.** It used to say the
diary grouped by calendar day with no filtering, and that deletion was half
built. G.1 and G.2 both landed; all of that is done.

**What you see.** `/diary` lists your finished and abandoned sessions, grouped
by **day for the last week and by month before that** — so the number of
headings is bounded by the calendar rather than by how long you have used the
product. Past five entries a filter appears (all / finished / unfinished), and
a filter that matches nothing gets its own empty state naming which one came
up empty. Deleting one session is on its card; deleting everything is in
`/settings`, each with its own confirmation.

**What is missing, and it is only this:** `Timeline`'s own header promises
"a rail, a marker per group, sticky headings", and none of those exist. The
groups are correct and the screen is honest — nothing here pretends to a rail
it does not have — so this is a **styling gap rather than a mockup**, and it
is the reason the entry is nearly empty rather than deleted.

**It cannot be fixed in the app**, which is why it is still open. A `musie-`
pattern in `apps/web` reaching into `.musy-timeline__group` is exactly what
L14's opening rule and L7 forbid. The rail belongs in
`packages/design-system/src/Timeline.tsx`, as its own step. Logged in
`apps/web/OPEN-QUESTIONS.md`.

## 10 · The database is deployed. The app is not

**Rewritten 2026-09-21, and this one had gone dangerous rather than merely
stale.** It used to say *"No hosted Supabase project is linked… Do not create a
hosted project. Do not run `supabase link`"*, and it told the reader that a
content change **edits the existing migration in place**. All three sentences
are now false, and the last one is the kind of false that costs an afternoon:
following it today edits a migration Supabase has already applied, which is
recorded by timestamp rather than by content, so the change is **skipped in
silence** on the remote while every local check reports success.

**What is deployed.** `project-musie` (`xliwtiiopwyfunxkdmxh`, Frankfurt) is
linked, and every migration has been pushed. So **migrations stack now.** Never
edit an applied one; each change is a new file with `alter table`. That is
CLAUDE.md rule 4, and rule 4 is where the full reasoning lives.

**What is not deployed.** The app itself. No Netlify build runs and there is no
domain — [BUILD-PLAN.md](BUILD-PLAN.md) A.6's second half, waiting on the build
allowance. `pnpm --filter web dev` against `supabase start` is still how the
product is looked at.

**The domain is not only a deploy question, and that is the part worth knowing
here.** A QR code printed on a paper card carries an absolute URL, so the
printed deck locks the domain in permanently. E.0 is built so that nothing
*waits* on it — the decoder never compares a host, `/s/:code` is same-origin,
and the dev QR sheet generates its codes from whatever origin served it — but
the deck cannot go to print until the domain is chosen. Entry 4 is the screen
this lands on.

---

## Keeping this file honest

Add an entry the moment you build a control that does not do what it appears to
do. Delete an entry when the real feature lands — an entry describing something
that now works is worse than no entry, because it teaches the reader to
distrust the rest.

Related: [BUILD-PLAN.md](BUILD-PLAN.md) for the steps and what "done" means,
[DOMAIN-MODEL.md](DOMAIN-MODEL.md) for the schema and its open decisions,
[apps/web/OPEN-QUESTIONS.md](apps/web/OPEN-QUESTIONS.md) for what was decided
and why.
