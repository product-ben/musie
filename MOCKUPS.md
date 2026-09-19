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

**Some entries below describe a screen that does not exist yet.** Entries 1–4
are Phase D's to build, and they are written down NOW because the decision
behind each one has already been made — what a voice answer does, what a photo
answer does not do, what the listen step counts down. Recording them here is
what stops the decision being re-litigated or quietly lost between phases. Each
says which step builds it.

---

## At a glance

| # | What looks real | What is actually missing | Lands in |
|---|---|---|---|
| 1 | Voice reflection: record, meter, timer | Nothing is recorded or transcribed | F.1–F.6 |
| 2 | Photo reflection: choose, preview | Nothing is uploaded; the image is read as text | D.5 |
| 3 | Listen step's transport and clock | There are no audio files | E.4 |
| 4 | Scan step | Simulated — no camera, no code entry | E.1–E.3 |
| 5 | Track title and artist | Withheld by design, and no reveal gate yet | E.5 |
| 6 | Exercise step copy | Columns exist, near-empty — 28 strings owed | blocked |
| 7 | Situation on a session | Recorded, never filled — nothing asks | open |
| 8 | `sessions.track_id` | Recorded, null until playback is real | E.4 |
| 9 | About Musie's carousel | CSS with no component behind it | D.1 |
| 10 | The four user types | Three unbuilt; no artwork for any | D.2 |
| 11 | The Diary | Minimal by design — day grouping only, no delete | G.1, G.2 |
| 12 | The whole app | Nothing is deployed; localhost only | A.6 |

---

## 1 · Voice reflections are UI only

**What you see.** The reflect step offers voice as one of three modes. Pressing
record starts a timer and animates a level meter. Stopping offers playback and
a delete.

**What is missing.** All of it. No `MediaRecorder`, no upload, no
transcription. The UI is interactive so the flow can be walked and reviewed,
and it says so on screen rather than pretending.

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

**What you see.** A drop zone, a file picker, a preview, a remove.

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
photo mode captures and shows a preview and writes no row.

## 3 · There is no audio

**What you see.** A transport with a play control, a scrubber and a clock that
counts down.

**What is missing.** The files. `tracks.src` points at recordings that are not
in the project, because **the licensing is not cleared** — up to eleven
recordings, and that is a real-world blocker, not an engineering one. The
clock is simulated so the listen step has a duration to behave against.

`select count(*) from tracks` is the number to quote when asking. Note the
schema deliberately stores a recording **once** and points at it, so a
recording shared between two exercises is one licence, not two. E.4.

## 4 · The scan step is simulated

**What you see.** A step that claims to read the QR code on a paper card, with
a button that advances anyway.

**What is missing.** Both real routes in. **Manual code entry comes first**
(E.1, a field that takes `MC-01`), then the camera (E.2, `getUserMedia` +
`BarcodeDetector`), then a wasm fallback for Safari (E.3). The simulate button
disappears when E.1 lands.

`getCardByCode()` in `apps/web/src/lib/content.ts` is already the real lookup —
the code path exists, nothing calls it yet.

## 5 · A track's title and artist are withheld, deliberately

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

## 6 · Every exercise's step copy is empty

**What you see.** Session steps with chrome and almost no words of their own.

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

`select * from public.missing_translations` finds every hole. It stays quiet
about these because it compares locales against *each other* rather than
testing for null — absent from both is data, absent from one is a dropped
translation.

Two exercises — Breathing Score and Body Scan Soundwalk — also have no track at
all, and each wants one pairing row with a null `card_id`.

## 7 · A session records its situation, and nothing asks

`sessions.situation_id` exists, is nullable, and is **null for every row**.
`situations` and `exercise_situations` are seeded and are how the prototype
narrowed which exercise to offer, but no screen puts the question to anyone.

The column is here because it was free to add before the schema deployed and an
`alter table` against live rows afterwards. Decision D6: record it, ask it
later. "What was I trying to do?" is diary-grade context whenever a picker
lands.

## 8 · `sessions.track_id` is recorded but empty

Null until the listen step plays something real, which needs item 3.

**It is a fact the session owns, not a lookup it performs**, and that is worth
understanding before anyone decides to derive it. Two reasons. A content edit
would otherwise **rewrite history** — swap the file behind a card and every
past diary entry silently starts claiming you heard something you never heard.
And where a track is *chosen* rather than looked up, resuming must not
re-roll it.

Which leaves an open decision, **D11**: how a track gets chosen when it is not
looked up. Deferred deliberately — the only implemented exercise draws cards,
so its track is looked up, and `track_id` holds the answer either way. It needs
settling before an exercise picks at random, because "at random" needs a repeat
rule and that rule reads the diary.

## 9 · About Musie's carousel has no component

`musy-components.css` carries ~200 lines of `.musy-carousel` rules and there is
**no Carousel component and no export**. The five-slide explainer needs one
built. D.1, and B.1 already decided it gets built rather than retired.

## 10 · Three of the four user types are not built

`user_types.implemented` is true for exactly one. Picking one of the other
three opens a not-implemented lightbox. Separately, **none of the four has
artwork**, so `RadioGroupImage` cannot be used properly until it arrives. D.2.

## 11 · The Diary is minimal on purpose

`/diary` lists your non-running sessions newest first and `/diary/:id` shows
one. A cancelled session appears like any other, marked unfinished.

**What is missing:** it groups by calendar day, which reads well at ten
entries and badly at three hundred. A month's scale, filtering, and an empty
state tuned for day thirty rather than day one are G.1. Deletion is G.2 — the
cascade already does the work, the confirmation UI does not exist.

`LinkList` and `Timeline` in the design system are deliberately basic for the
same reason — correct bones, styling detail deferred to G.1.

## 12 · Nothing is deployed

Localhost only, and **that is a decision rather than a constraint**. No hosted
Supabase project is linked and no Netlify build runs.

It buys something specific: while nothing is deployed, a content change **edits
the existing migration in place** as though it had always said that, verified
with `supabase db reset`. Every content change so far was made that way. The
day a project is linked, migrations start stacking and that freedom is gone —
which is why A.6 waits until the schema stops moving.

**Do not create a hosted project. Do not run `supabase link`.** CLAUDE.md rule
4, and it inverts the day A.6 happens.

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
