# Listening exercises · PRD

Branch `listening-features`, worktree `../musie.worktrees/listening-features`,
off `main` (`00f26a0`). Written 2026-10-11 and revised three times the same
day: with Ben's answers to Q1–Q4, with the **mute-music switch**, and with the
fact that **the music is ducked under the voice** — which is the one that
settled the shape. **Product document — no code.** The engineering plan is
`LISTENING-EXERCISES-PLAN.md`, beside it.

Scope of the ask (Ben, 2026-10-11): exercise *types* in the database, a
**listening-only** type built end to end, the two questions it asks before it
plays, a switch that drops the music while the guidance keeps going, a music
library that survives one piece being used many ways, and the original music
arriving in */discovered-music* once it has been heard.

---

## 1 · Why this, now

**Three of the five exercises in the library cannot be started.** Mindful Break
and Free Rein work; Breath Relaxation, Sound Journey and Body Scan open a
*not built yet* lightbox. The library promises five things and delivers two,
and both of those need the paper deck in your hand.

That is the sharpest gap in the product, for three reasons:

1. **The deck is blocked on a domain.** Nothing goes to print until the domain
   is chosen (BUILD-PLAN, *Still blocked*), so every card exercise sits behind a
   decision that has nothing to do with music. A listening exercise needs no
   paper — it is the only part of the library that can reach a tester this week.
2. **People arrive expecting to press play.** User testing, 2026-09-25: U5 came
   with a meditation app's model — pick something, listen — and met a product
   that only hands you music inside a card exercise. */discovered-music* was
   half the answer. A listening exercise is the other half, and it is the half
   that is an *exercise* rather than a player.
3. **The library has nowhere to put a produced exercise.** A guided listening
   piece is a **mix**: spoken guidance, and music ducked underneath it that
   dips wherever the speaker speaks. So it exists once per script — per
   language, per posture, per ending — while the piece it is built from is
   licensed once and released once. `tracks` can express the second and has no
   room at all for the first.

**It also closes D11**, open in the domain model since 19 September: *how does a
track get chosen when it is not looked up from a card?* The answer is **the
person chooses it**, by answering two questions. Not rotation, not random. No
repeat rule, no history to read, no diary as an input to a picker.

---

## 2 · What ships

**One sentence.** A listening-only exercise can be started from the library,
asks two questions, plays the guidance in the person's own language with the
music ducked underneath it, lets them drop the music without losing their
place, and leaves **the original piece** in */discovered-music*.

| Ships | Does not ship |
|---|---|
| `exercises` carries a **type**: card-based, digital-interactive, listening-only | the digital-interactive *screens* — Breath Relaxation stays unbuilt, it just stops being mistyped as cardless |
| A type decides **which steps a run has**. Listening-only = Einsteigen → Hören → Nachdenken | a step set authored per exercise, or held in the database. A step is a screen; a type names the screens it uses |
| Einsteigen asks **posture** and **ending**, both preselected, and records both on the session | a third question, per-exercise question sets, or remembering answers between runs (§8) |
| **Two stems that play together** — the guidance, and the music ducked under it — with a switch that silences the music | a mix the person can set by degrees. One switch, two states. And no mixing in the app: the balance is in the audio |
| A **cut** table: one row per (exercise, language, posture, ending), carrying its two files and crediting the piece | any change to `tracks`, to `exercise_tracks`, or to the deck. The nine card recordings and the whole card flow are untouched |
| **Discovered music** hands back the **original** piece, not the ducked bed | a *listen again* control in the diary — D15, still open |
| **Both** listening exercises become startable: Sound Journey and Body Scan | new exercises. Both already exist with names, artwork, goals and timeframes |

Verified against `supabase start` and `pnpm --filter web dev`. Nothing deploys
in this phase (CLAUDE.md rule 8).

---

## 3 · Exercise types, as a product concept

Three types, and each is a promise about **what you need with you**:

| Type | Needs | Steps | Today |
|---|---|---|---|
| **card-based** | the paper deck, a phone camera | Einsteigen · Scannen · Hören · Nachdenken | Mindful Break, Free Rein |
| **listening-only** | headphones, somewhere to sit or lie down | Einsteigen · Hören · Nachdenken | Sound Journey, Body Scan |
| **digital-interactive** | the phone itself, for the whole exercise | not yet designed | Breath Relaxation |

The type is **structure, not copy** — never printed on screen as a word. What
the person sees is the consequence: the fact chips on the library card (*cards*
/ *sound*) and a stepper with three stages instead of four. A visible *type*
label would be the product explaining its own schema.

**Why a type and not another boolean.** `needs_cards` exists and already drives
the skipped step. A second boolean beside it would make four combinations of
which two are nonsense, and nothing would refuse to store them. A type is one
column with three legal values, read in exactly one place.

`needs_cards` therefore **stops being a source of truth** and is derived from
the type. Two columns that can disagree about whether an exercise draws cards is
exactly the drift this repo kills on sight.

---

## 4 · The run

### 4.1 · Einsteigen — the two questions, both answered already

The step keeps what it has (the exercise's own `intro_md` headline and
description) and gains two **segmented controls**, both **preselected**:

> **Wie möchtest du zuhören?**  `[ Sitzend ]` · Liegend
>
> **Wie soll es enden?**  `[ Zurück in den Tag ]` · Ins Einschlafen

Preselected is Ben's call on both (2026-10-11), and it is the right one for a
first screen: nothing to answer means nothing to block, and the two defaults are
what most sessions will want. Changing either is one tap.

**The second question is named after what actually differs** — Ben: *"the fall
asleep version has a very soothing ending while the other one is bringing the
person back into the now."* So the honest question is about **the ending**, and
that is what the copy asks. Three things fall out of it:

- It is **a refinement of the goal, not a second copy of it.** The library
  already asked *Was möchtest du heute erreichen?* and stored the answer
  (`sessions.goal_id`: Entspannen · Aufwachen · Achtsamkeit stärken).
  *Entspannen* splits two ways — unwinding after work, or unwinding into sleep —
  and this is the split. Asking it as *Entspannen / Einschlafen* would have put
  the word **Entspannen** on two screens two taps apart, meaning two different
  things. Asking about the ending cannot collide, because no goal is phrased as
  an ending.
- It is asked **inside the session, not in the library**, because it is about
  the next twelve minutes rather than about today.
- **It is the dimension the audio is actually produced along**, together with
  the language and the posture — see §5.2, which is the most consequential
  section in this document.

Both answers are changeable up to the moment the music starts; changing one
before the first press changes what plays. **After the first press the session
keeps what it played** — the diary rule (domain model ⑥): a journal that changes
what it says you did is broken.

Segmented control rather than radio rows: two options, both visible, one tap,
no scrolling. Each segment carries a glyph as well as a word — the component's
own rule, and the glyph is what survives a clipped German label.

### 4.2 · Hören — and the switch

Unchanged in shape: the copy, the transport, the countdown at
`listen_gate_seconds`, the reveal of title and artist once the listening is
done. What changes is that **two files are playing** — the guidance, and the
music ducked underneath it — and that they were bounced together, so the sum of
them is the mix as it was made.

**The switch sits under the counter and its caption**, inside the full-screen
listening sheet, where the listening actually happens — between the countdown
and the way on. Default **off**, meaning the music plays.

> `( ●— )`  **Musik stumm, nur Anleitung**

- **On, the music goes silent and the guidance carries on talking.** Nothing
  restarts, nothing re-buffers, and the counter does not jump: at 00:31 you are
  still at 00:31, because the two layers were never one file and silencing one
  of them touches neither the clock nor the buffer. Off again is the same move
  in reverse.
- **It is a switch, not a slider.** Two states a person can describe — *with
  music* and *instructions only*. A volume mix would be a fourth control on a
  screen whose whole design is one number and one transport, and the balance
  between the two layers is not the listener's to set: it is ducked, and the
  ducking is the craft.
- **It is offered only when there is something to silence** — an exercise
  running on the original piece because its guidance has not been recorded in
  this language yet (§4.3) has one layer, and a switch that does nothing is
  worse than no switch.
- **Both layers are the same length**, being two bounces of one session, so
  there is no state in which the guidance has finished and the music plays on.
  The upload refuses a pair that disagrees — §5.6.

The gate still caps at the recording's own length, and both listening exercises
carry a 180-second gate against 10–15 minutes — an estimate with nothing to
tune against until the audio exists. Tuning it is a content edit.

### 4.3 · Language reaches further than the words

Ben, on scope: *"we ship everything in German and English — relevant for all
tracks with spoken words."* And then the sentence that moved the model: the
music is **faded in and out as the speaker speaks**, so the automation follows
the script — and a German script and an English one do not pause in the same
places.

**So the bed is per language too, not just the voice.** Four rules:

1. **The active locale picks the cut** — the same locale that drives the
   UI and `<html lang>` (CLAUDE.md rule 5).
2. **A bed is never paired with a different language's guidance.** It would duck
   in the wrong places: audibly wrong, and nothing in the schema or the app
   could notice. The two files are one row for exactly this reason.
3. **Nothing ever crosses locales.** A language with no cut recorded yet
   plays **the original piece** — the music as released, unducked, with no
   guidance and no switch. A real exercise, in the right language on screen.
4. **A missing language is a reported hole, not a silent one.** For audio the
   gap is a recording session, so it has to be visible from a query rather than
   from using the app.

**The original is the only locale-free audio in the feature**, which is also
exactly why it is the thing that gets discovered — §5.4.

### 4.4 · Nachdenken

Unchanged. Same three answer modes, same reflection row, same diary entry.

### 4.5 · The stepper — three stages

Einsteigen · Hören · Nachdenken, confirmed by Ben. This **changes** D14, which
settled that a cardless run draws four markers with Scannen visibly skipped.
That was right while "cardless" was an accident of which exercises had
recordings. It stops being right once the type says *this exercise has no scan
stage*: a crossed-out marker then teaches a step that will never apply, every
run, to everyone.

---

## 5 · The music library

### 5.2 is the one that matters — read it first

The music under the guidance is **ducked**: it comes down when the speaker
speaks and back up when they stop. Ben, 2026-10-11. Everything below follows
from that one production fact, and it overturned two things this document said
earlier today.

### 5.1 · Two things: a piece, and a cut of an exercise

- **A piece** — what is licensed and credited, and the music **as released**:
  title, artist, licence reference, one file, one duration. Unchanged from
  today, including the opaque id, the withheld title and artist, and
  `reveal-track` as the only door. This is the thing somebody *discovers*.
- **A cut** — one way of running one exercise: for a language, a posture
  and an ending, it is **two audio files that belong together** — the spoken
  guidance, and the music as ducked underneath that exact guidance. It credits
  the piece its music came from. It is produced, not licensed; it is ours.

The nine card recordings stay exactly as they are: pieces with no cuts,
played through `exercise_tracks` as today. Nothing about the card flow moves —
not one column, not even the deck generator.

### 5.2 · Why the bed is per language, and per everything else

Ducking automation follows **the script**. A German sentence and its English
translation do not start or end at the same moment, so the music dips in
different places — which means:

- **the ducked bed for German is a different audio file from the English one.**
  It is not a locale-free layer, and the earlier claim that it was is wrong;
- **it is per posture and per ending too**, for the same reason: a different
  script is a different automation;
- **so the bed and the guidance are a matched pair.** One session, two exports,
  the same length. Pairing a German bed with English guidance would duck the
  music in the wrong places — audibly wrong, in a way nothing would catch.

Which is why a cut is **one row with two files** rather than two things
that can be combined. They cannot be combined; they were bounced together.

### 5.3 · And why the switch still works — stems, not a mix

The two files are **stems at final mix level**: the guidance, and the ducked
music, bounced from the same session without being individually normalised. So:

- **switch off** — both play, summed. The sum *is* the mix, ducking and balance
  included, because the automation is baked into the bed.
- **switch on** — the music stem is silenced. The guidance plays on, at the same
  position, with nothing to load and nothing to seek.

**This deletes the one thing given up earlier.** The previous draft mixed the
layers in the app at a fixed level, and said the cost was no ducking and no
moment-by-moment balance. There is no level in the app any more: the balance is
in the audio, where you set it. The browser only adds two stems together.

**The honest condition on that**, and it is the one question left (§10 Q10):
summing stems equals the mix bus only if nothing processes the two layers
*together* — no master limiter, no shared reverb bus fed by both. If the mix
needs that, stems cannot reproduce it, and the fallback is a pre-mixed master
plus a dry guidance file: the same switch, the same two streams, one more export
per cut and the music no longer separable for */discovered-music*.

### 5.4 · What is discovered is the original, never the bed

Ben, 2026-10-11: */discovered-music* hands back **the original music piece.**

That is right twice over. A ducked bed has holes in it where somebody was
talking — it is unusable as music, and handing it over would be handing over a
by-product of an exercise. And the original is **locale-free and cut-free**,
so the listing stays one row per piece with one name on it, whatever language
you ran the exercise in and however many endings you have heard.

So */discovered-music* needs **no change at all**: it already reads
`sessions.track_id` and the piece's own file. The feature arrives for free, and
that is the strongest evidence this shape is the right one.

### 5.5 · What it costs to produce

Per listening exercise, in both languages:

| | count | what it is |
|---|---|---|
| the piece | **1 file** | the music as released. What gets discovered |
| cuts | **8** | 2 locales × 2 postures × 2 endings — **4** if posture does not change the script (§10 Q6) |
| files per cut | **2** | the guidance, and the music ducked under it. One session, two bounces |

So **17 files** with posture routing, **9 without** — and D16/Q6 is therefore
worth more than it looks: it is not one question's worth of recording, it is
half the studio time.

What is *not* in that table is any mixing on our side, and no file is recorded
twice: a cut's two stems are two exports of one session, and the posture
dimension — if it survives — is a different script read, not a different piece
of music.

### 5.6 · Adding audio — the authoring loop

Modelled on the deck, which already works this way
(`supabase/content/deck.json` → `pnpm deck:migration` → a stacking migration):

```
drop the files in a folder outside the repo
  ↓
edit one file — the piece, its credit, and one entry per cut
  ↓
one command uploads the audio and reads the real durations
  ↓
one command writes a new migration
  ↓
supabase db reset · pnpm test:db · supabase db push
```

Four properties are deliberate:

- **The master never enters git.** A licensed file committed once cannot be
  taken back out of any clone's history. Same reason the artwork masters live
  outside the repo.
- **The durations are measured, never typed** — and the upload **refuses a
  cut whose two stems are not the same length**, because that is a bad
  bounce and the symptom would be guidance drifting against its own music.
- **The keys name the id and the answers, never the piece.**
  `cut-sound-journey-de-lying-sleep-voice.mp3` and `…-music.mp3`, never
  `koerperreise-einschlafen.mp3`. The key reaches the client, and the premise of
  the exercise is a listener not primed by the title. The answers are not a
  secret — the person chose them.
- **Nothing runs on its own.** The generator writes a file and stops;
  `pnpm check` never touches the database (rule 8), and `supabase db push` is
  Ben's.

## 6 · Copy, and the line we do not cross

A music product, not a treatment. Three rules for every string this feature
adds, all enforceable at review:

1. **No claim about an outcome.** *Ins Einschlafen* names **where the piece
   leaves you**, never a result Musie delivers. "Hilft dir beim Einschlafen" is
   out. "Endet so, dass du einschlafen kannst" is in.
2. **No clinical vocabulary.** No *therapy*, *treatment*, *symptom*, *dosage*,
   *indication*, *insomnia*; nothing that reads as a protocol.
3. **The person decides, Musie offers** — the voice the library moved to on
   2026-10-09, Musie in the first person.

German and English are written **together**, to `docs/GERMAN-UI-WRITING.md`.
Control labels are chrome (ours, permanent, `src/i18n/*`); step copy is content
(content tables, provisional until the spreadsheet lands). A key added in
English without German fails `pnpm check`, which is the point.

**I draft the step copy for both listening exercises in both locales** — intro,
listen, reflect — rather than leaving placeholders and reporting them (rule 6).
Yours to overwrite; drafting it is not deciding it.

---

## 7 · Done when

1. `/exercises` offers Sound Journey and Body Scan as startable, and pressing
   one starts a run instead of the *not built* lightbox.
2. The run shows **three** stages. Einsteigen asks posture and ending with
   *Sitzend* and *Zurück in den Tag* preselected, and records both on the row.
3. Hören plays the cut for the active locale, posture and ending — both
   its files, together, summing to the mix as it was bounced.
4. **The switch is under the counter's caption, off by default**, and turning it
   on silences the music without moving the position, re-buffering or
   restarting — at 00:31 you are at 00:31. Off again restores it at the same
   place. It is not offered when only one layer is playing.
5. **No session ever plays speech in a language the person is not reading, and
   no bed is ever paired with another language's guidance.** A locale with no
   cut plays the original piece, unducked, with no switch.
6. The gate opens at `listen_gate_seconds`, capped at the recording's length,
   and the reveal names the piece.
7. Nachdenken, the reflection, the diary entry and close-from-inside behave
   exactly as for a card exercise.
8. After the run, */discovered-music* lists **the original piece** — one row,
   one name, whatever language the exercise ran in and however many endings
   have been heard. Never the ducked bed.
9. **A card exercise is unchanged, and provably so**: no column of `tracks` or
   `exercise_tracks` moves, the deck generator is untouched, and the five silent
   cards still fall to the simulated clock.
10. Adding audio is one file plus two commands, and one query answers which
    (exercise, locale, posture, ending) has no cut yet.
11. `pnpm check` passes. `pnpm test:db` passes against the local stack after
    `supabase db reset`. The new table carries RLS, policies, revoke **then**
    grant — to `authenticated` **and** `service_role` (rule 2).
12. The domain-model artifact is updated: the type, the cut, the switch,
    D11 resolved, and the migrations it has not heard about since 24 September.

## 8 · Not now

- **A volume mix instead of a switch.** Two states, both nameable. A slider is
  a different product decision and a third control on that sheet.
- **Remembering the two answers between runs.** Kind and cheap, and a second
  source of truth for something the session already records. Worth doing when
  there is evidence that answering it every run annoys anybody.
- **A third posture** (*walking*, *standing*). The model takes it; no audio
  exists.
- **Breath Relaxation's screens.** The type is recorded, the exercise stays
  unbuilt. A breathing visual is its own piece of work.
- **Naming the piece in the diary.** D15, unchanged by this — and a credit
  belongs to the piece, so whatever D15 decides, it decides once per piece
  rather than once per file.
- **A listening exercise that also draws a card.** The types are exclusive by
  design; a hybrid would be a fourth type and nothing asks for one.

---

## 9 · Risks

| Risk | Mitigation |
|---|---|
| **Stems may not sum to the mix.** If the session has a master limiter, or a reverb bus fed by both layers, adding the two files in a browser is not what the mix engineer heard. | Judged by ear on the first real pair, before this is called done. If it does not hold, the fallback is a pre-mixed master plus a dry guidance file — the same switch and the same two streams, one more export per cut, and the music no longer separable (§5.3). Q10. |
| **Two streams, not one** — about **15 MB** for twelve minutes against 11 MB for a single master, so the switch costs roughly 40% of the bytes. | Speech encodes small, and the music half would be streamed anyway. The plan's §4 pays most of it back elsewhere: the URLs are minted while you answer the two questions, the first seconds are warmed before you press play, and a second visit to the step costs **nothing** instead of re-downloading the file. Budgets are in the plan's §4.1 and measured by a throttled walk, not asserted. |
| **A locked screen may stop two streams.** A fifteen-minute exercise is one you lie down for and put the phone away; if iOS will not keep two audio elements going in the background, the switch cannot work the way it is specified. | **A half-day spike with placeholder audio, before anything is recorded** — plan §4.10. It is the one risk that could change your export list, which is why it is answered before the list is made rather than after. |
| **Seventeen files per exercise** if posture routes, nine if it does not. | Q6 is therefore half the studio time, and worth answering before the second exercise is recorded. Nothing is blocked meanwhile: a missing cut plays the original piece and the hole is a query. |
| **A cut's two files could drift apart** — a re-bounced voice against an old bed. | They are one row, one duration, and the upload refuses a pair whose lengths disagree. The failure is a refused upload rather than guidance sliding against its own music. |
| **Parallel branches.** Rule 9: two branches minting `2026…` filenames interleave by wall clock. | Every migration here states whole values and is safe applied twice in either order; none assumes another branch's `alter table` has run — and this version touches no existing content table at all. |

## 10 · Answered, and still open

**Answered by Ben, 2026-10-11**

- **Q1 · Posture and ending both route.** The model carries both; ship with what
  exists and grow into it.
- **Q2 · The ending is a refinement of the goal, not the goal again.**
  *Entspannen* splits into *back into the day* and *into sleep*.
- **Q3 · Three stages.**
- **Q4 · Both exercises, and both languages.**
- **Q5 · Both questions preselected** — *Sitzend*, *Zurück in den Tag*.
- **Q7 · A switch while listening**, under the counter and its caption, off by
  default, continuing at the same position.
- **Q8 · */discovered-music* hands back the original piece**, not the bed Ben
  ducks under the voice — which also made the listing need no change at all.

**Still open — each has a working answer, so nothing waits**

- **Q6 · Does posture really change the script?** Eight cuts per exercise
  if yes, four if no — seventeen files against nine. *Recommendation: answer it
  before recording the second exercise. The model is the same either way, and a
  question with no consequence is worse than one question.*
- **Q9 · Step copy.** I draft intro / listen / reflect for both exercises in
  both locales; you overwrite what is wrong.
- **Q10 · Can the two layers be delivered as stems at final mix level?** The
  guidance, and the ducked music, bounced from the same session and not
  individually normalised — so that adding them in the browser *is* the mix.
  **This is the one question the switch rests on**, and it has two halves. The
  half that is yours: does the mix have processing across *both* layers — a
  master limiter, a shared reverb — because stems cannot reproduce that. The
  half that is mine: whether a phone will play two streams with the screen
  locked, which is the spike in plan §4.10 and is answered before you record
  anything. *Recommendation: yes on both, and if either turns out no, the
  fallback is a pre-mixed master plus a dry guidance file — one more export per
  cut, everything else unchanged.*

  One request either way, from plan §4.8: **`.m4a` (AAC) rather than `.mp3`**,
  because two streams have to seek to the same place and MP3 seeking is an
  estimate where MP4's is arithmetic.
- **Q11 · English before its recordings, or after?** A German-only upload means
  every English session plays the original piece with no guidance — honest,
  reported, and a different exercise from the German one. *Recommendation: ship
  it that way and record English next; a silent exercise in the library is worse
  than a wordless one you can start.*
