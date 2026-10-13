# Listening exercises · implementation plan

The engineering half of [`LISTENING-EXERCISES.md`](LISTENING-EXERCISES.md).
Branch `listening-features`, worktree `../musie.worktrees/listening-features`,
cut from `main` at `00f26a0`. **Nothing here is built yet.**

Revised twice on 2026-10-11, and the second revision is the one to know about.
**The music is ducked under the voice**, so its automation follows the script —
which makes the bed per language, per posture and per ending, and makes the bed
and the guidance a matched pair that cannot be recombined. Two drafts of this
plan built a general music-version model to hold that. It is not general: it is
**one row per way of running an exercise**, carrying its two files.

What that removed, measured against the previous draft: two new tables became
one; `tracks` and `exercise_tracks` are **untouched**; the deck generator is
untouched; there are no superseded columns, so the rule-9 column-dropping
hazard is gone; and `/discovered-music` needs no change at all.

**§4 is a performance round** made after the rest was written. It reverses
§3.3's Web Audio decision, puts a half-day iPhone spike before step 4, and
fixes a loading defect that predates this branch: a freshly minted signed URL
is a fresh cache key, so re-entering the listen step re-downloads the whole
file.

Read the PRD first for *why*. This file is *what*, in the order it gets done.

---

## 0 · Before anything

```
cd ../musie.worktrees/listening-features
pnpm install                                     # the worktree has no node_modules
pnpm --filter web dev --port 5176 --strictPort    # 5173 is the main checkout's
```

**Rule 9, three ways.** One Supabase stack serves every worktree, so
`supabase db reset`, `supabase db push` and `pnpm gen:types` are Ben's and are
denied to me in `.claude/settings.json` — §10 lists every handoff. One port 5173,
so this branch takes 5176 explicitly. And migration timestamps interleave by
wall clock across branches, so every statement below **states a whole value and
is safe applied twice, in any order against any other branch's work**. This
version is additive throughout: one new column on `exercises`, one new table,
three new columns on `sessions`, and nothing taken away from anyone.

---

## 1 · The schema

Four migrations, each its own file with its own timestamp (rule 4). Three are
shape; the fourth is content and is generated.

### 1.1 · `exercises.kind` — one column, three values

```sql
alter table public.exercises add column kind text;

update public.exercises set kind = 'card_based'
  where id in ('mindfulness-cards', 'free-rein');
update public.exercises set kind = 'digital_interactive'
  where id = 'breathing-score';
update public.exercises set kind = 'listening_only'
  where id in ('sound-journey', 'body-scan-soundwalk');

alter table public.exercises alter column kind set not null;

alter table public.exercises add constraint exercises_kind_known
  check (kind in ('card_based', 'digital_interactive', 'listening_only'));

-- needs_cards STOPS BEING A SECOND ANSWER. It cannot be dropped yet (§1.5),
-- so it is nailed to the kind instead.
alter table public.exercises add constraint exercises_cards_match_kind
  check ((kind = 'card_based') = needs_cards);
```

**Nullable, filled, then `set not null`** rather than a default that is dropped
afterwards. A default would mean a future insert can omit the kind and be
silently filed as card-based; with no default, an exercise that does not declare
what it is fails to insert. The constraint order matters too: both checks come
*after* the updates, because three rows would violate the second one for as long
as a default lasted.

**Why a check and not a lookup table.** The repo splits these cleanly already:
check constraints for structural enums the code branches on (`sessions.status`,
`sessions.step`, `reflections.mode`), lookup tables for content taxonomies with
labels people read (`user_types`, `goals`). A kind is never printed, so it has
nothing to translate and no `sort`; a table would buy an i18n sibling nobody
reads and a join on every exercise query.

### 1.2 · `exercise_cuts` — one way of running one exercise

```sql
create table public.exercise_cuts (
  -- Derived from the four answers: cut-sound-journey-de-lying-sleep. Never
  -- typed twice, so the id, the object keys and the address agree by
  -- construction.
  id               text    primary key,
  exercise_id      text    not null references public.exercises (id) on delete cascade,
  -- ── THE ADDRESS ──────────────────────────────────────────────────────────
  -- The four things that describe a recording session. There is no routing
  -- table because there is nothing to route: these ARE the lookup.
  locale           text    not null,
  posture          text    not null,
  ending           text    not null,
  -- ── THE TWO FILES ────────────────────────────────────────────────────────
  -- Stems at final mix level, bounced from one session. `music_src` carries
  -- the DUCKING, which is why it cannot be shared with another locale: the
  -- automation follows this script and no other.
  voice_src        text    not null unique,
  music_src        text             unique,
  -- ONE duration for both. They are two bounces of one session and are the
  -- same length; the upload refuses a pair that disagrees (§2.3).
  duration_seconds integer not null,
  -- The piece whose music is ducked in `music_src` — the credit, and what
  -- /discovered-music hands back UNDUCKED, from `tracks.src`.
  track_id         text             references public.tracks (id) on delete restrict,
  constraint exercise_cuts_locale_known  check (locale  in ('de', 'en')),
  constraint exercise_cuts_posture_known check (posture in ('sitting', 'lying')),
  constraint exercise_cuts_ending_known  check (ending  in ('day', 'sleep')),
  constraint exercise_cuts_duration_positive check (duration_seconds > 0),
  -- A bed with no piece has no credit and nothing to discover; a piece with no
  -- bed is a credit for music nobody hears. They travel together, so a
  -- guidance-only cut is expressible and a half-stated one is not.
  constraint exercise_cuts_music_has_a_piece
    check ((music_src is null) = (track_id is null)),
  constraint exercise_cuts_one_per_answer
    unique (exercise_id, locale, posture, ending),
  -- What `sessions`' composite foreign key references.
  constraint exercise_cuts_track_cut unique (track_id, id)
);

create index exercise_cuts_track_id_idx on public.exercise_cuts (track_id);
```

**Why one row with two files, rather than two rows.** They were bounced
together and they are not interchangeable: pairing a German bed with English
guidance ducks the music in the wrong places, which is audibly wrong and which
nothing in the schema or the app could notice. One row is the constraint —
there is no way to express the broken pairing.

**Why this is not a `track_versions` table.** Two drafts of this plan had one:
files hanging off a piece, with the guidance either baked in (draft one) or
beside it (draft two). The ducking kills both. A ducked bed is not a *version
of the piece* — you cannot play it on its own, it is not what was licensed, and
nobody would want it handed back — it is a **part of a cut of an
exercise**. Putting it under `tracks` would have meant a file belonging to a
piece but keyed by an exercise, a locale and two answers, which is a cut
with the wrong name.

**Why `tracks` does not change.** It already holds exactly the right thing: the
credit and the music as released, one row, one file. That file is now also the
*fallback* and the *discovery*, which is more work than it did before, not less.

**`on delete restrict` from a cut to its piece and from a session to a
cut.** Deleting a piece something still plays fails loudly, as today.
Deleting a cut a session played fails too — and the composite FK below is
why it cannot be `set null`: that would null `sessions.track_id` along with it,
and the piece you heard is a fact the diary must keep.

### 1.3 · What the session records

```sql
alter table public.sessions add column cut_id text;
alter table public.sessions add column posture      text;
alter table public.sessions add column ending       text;

alter table public.sessions add constraint sessions_posture_known
  check (posture is null or posture in ('sitting', 'lying'));
alter table public.sessions add constraint sessions_ending_known
  check (ending  is null or ending  in ('day', 'sleep'));

-- THE CUT AND THE PIECE CANNOT DISAGREE. Composite, against
-- exercise_cuts (track_id, id) — so a session cannot claim it heard a
-- cut of one piece while crediting another.
alter table public.sessions add constraint sessions_cut_belongs_to_track
  foreign key (track_id, cut_id)
  references public.exercise_cuts (track_id, id) on delete restrict;

create index sessions_cut_id_idx on public.sessions (cut_id);
```

Domain model ⑥: *derivable is not recorded*. The cut is derivable from the
exercise and three answers right up to the moment one of them is re-recorded —
and one of the three, the locale, is not even on the row. `posture` and `ending`
are recorded **as asked**, so a session that found no cut still says what
it was asked for, which is what makes the gap visible in a month.

For a card session all three are null and the composite FK is not enforced,
which is what MATCH SIMPLE means and what makes this one table serve both.

**The switch is NOT recorded.** A run that toggled it four times has no single
answer, and a column holding the last state would read as *how you listened*
while meaning *where the switch was when you left*. What the session records is
the cut it was given; what the person did with the music is not a fact
about the run. Stated here so it is a decision rather than an omission.

`sessions.step` needs **no** change: a listening run uses `intro`, `listen` and
`reflect`, all three already legal in `sessions_step_known`.

### 1.4 · What does not change, and why that is the headline

- **`tracks`** — not one column. No `track_versions`, nothing superseded,
  nothing to drop later, and therefore **none of the rule-9 hazard** two drafts
  of this plan carried: eight worktrees select
  `tracks(id, src, duration_seconds)` against this one Postgres, and they keep
  working.
- **`exercise_tracks`** — not one column. It stays the card pairing table it has
  always been, with its `unique nulls not distinct (exercise_id, card_id)`
  intact. A listening exercise has **no row** in it.
- **`deck.json`, `deck.mjs`, `deck-pdf.mjs`, `deck.db.test.ts`** — untouched.
- **`discovered.ts` and `/discovered-music`** — untouched. It reads
  `sessions.track_id` and the piece's own file, which is exactly what Ben asked
  it to hand back.
- **`reveal-track`** — untouched. It takes a session, reads `track_id`, and the
  credit lives on the piece, so the German and English runs of one exercise
  reveal the same title.

### 1.5 · The one thing left half-done

`needs_cards` stays, nailed to `kind` by a check constraint, rather than being
dropped — for the rule-9 reason above: every other worktree's `content.ts`
selects it. Dropping it is a one-statement follow-up migration once the parallel
branches are in, and it is logged in `apps/web/OPEN-QUESTIONS.md` so it is a
decision rather than a leftover.

### 1.6 · Access — rule 2, in full

```sql
alter table public.exercise_cuts enable row level security;

create policy exercise_cuts_select
  on public.exercise_cuts for select to authenticated using (true);

revoke all on table public.exercise_cuts from anon, authenticated;

grant select on table public.exercise_cuts to authenticated;

-- THE HALF THAT WAS MISSED ON 2026-09-21 AND COST 23 TESTS. service_role has
-- BYPASSRLS and no table privileges; Postgres checks privileges first.
grant select                 on table public.exercise_cuts to service_role;
grant insert, update, delete on table public.exercise_cuts to service_role;
```

**No column grant.** The table holds an exercise id, the four answers the person
themselves gave, two object keys, a duration and a piece id — and `tracks.id` is
opaque precisely so that being readable costs nothing. `tracks.title` and
`tracks.artist` stay withheld, and the reveal stays the only door.

### 1.7 · One report, for the recording schedule

```sql
create view public.missing_cuts with (security_invoker = true) as …
```

One row per (listening exercise × locale × posture × ending) that has no
cut — the recording schedule, in the order it matters, and the query that
answers *what does an English tester actually get today*.

`security_invoker` for the same reason `missing_translations` has it: a view is
owner-privileged by default, which would quietly bypass RLS and is what the
Security Advisor flags. **Granted to `service_role` only**, revoked from `anon`
and `authenticated` — it is an operator report about recordings that do not
exist, which is the reasoning that took `licence_ref` off the client.

---

## 2 · The content pipeline

`supabase/content/music.json` + two commands, modelled on the deck
(`supabase/content/README.md`), because that loop works and a second shape for
the same job would be a second thing to learn.

### 2.1 · The file, and what it owns

```json
{
  "pieces": [
    { "id": "trk-01", "title": "Little Yellow Petals", "artist": "Rachel Sandy",
      "licenceRef": "Epidemic Sound · Little Yellow Petals · Rachel Sandy",
      "file": "trk-01.mp3" },
    { "id": "trk-10", "title": "…", "artist": "…", "licenceRef": "…",
      "file": "trk-10.mp3" }
  ],
  "cuts": [
    { "exercise": "sound-journey", "locale": "de", "posture": "sitting",
      "ending": "day", "piece": "trk-10",
      "voice": "cut-sound-journey-de-sitting-day-voice.mp3",
      "music": "cut-sound-journey-de-sitting-day-music.mp3" }
  ]
}
```

**It owns `tracks` entirely and `exercise_cuts` entirely.** All nine
existing pieces move into it — their titles, artists, licence references and
measured durations are already in `20260921160000_track_audio.sql`, so nothing
is exposed that the repository did not already carry, and `tracks` gains one
hand-written source instead of a trail of migrations.

**It does not own `exercise_tracks`.** `deck.json` keeps that, and the partition
is clean: *the deck says which piece a card plays; the music file says what the
pieces are and how the exercises are rendered.* Neither generator touches the
other's table, which is simpler than the two-halves-of-one-table arrangement an
earlier draft needed.

- A cut's **id is derived** from its four answers, and so are its two
  object keys. Nothing is typed twice.
- **Nothing is expanded.** No cross-product, no stand-ins: the cuts listed
  are the cuts that exist, and a combination not listed plays the original
  piece. That is the whole of PRD §4.3, and it is why this file is short.
- `duration` is **not in the file**. It is measured from the audio (§2.3).

**Three validations the generator refuses rather than warns about:**

1. a cut on an exercise whose `kind` is not `listening_only`;
2. a `piece` that no entry in `pieces` declares;
3. `music` without `piece`, or `piece` without `music` — the constraint in
   §1.2, caught before the migration rather than by Postgres.

### 2.2 · `pnpm music:migration`

`apps/web/scripts/music.mjs` (read, validate, derive ids — shared with the
test) and `apps/web/scripts/music-migration.mjs` (write the SQL), mirroring
`deck.mjs` / `deck-migration.mjs` including `--dry-run`, `--name`,
`--allow-removal` and the `git show HEAD:…` summary in the header.

**It states the whole library** — upserts every piece and every cut, then
deletes what the file no longer has — rather than the difference, for rule 4's
reason: a migration carrying only the changed row depends on the database
already being in the state the generator imagined.

**`--allow-removal` guards both.** Deleting a piece or a cut that a
session played hits `on delete restrict` and fails loudly, which is right; the
flag is there so the failure is expected rather than discovered.

### 2.3 · `pnpm music:upload`

Reads `music.json`, finds each file in a folder **outside the repo** (`--from`,
default `~/Documents/musie-audio/`), uploads what the bucket does not have,
measures the durations, and writes them back into `music.json` — together with
the object keys it minted, because those now carry a content hash (§4.6).

- **The master never enters git**, for the reason the artwork masters do not.
- **It refuses a cut whose two stems differ in length** by more than
  250 ms. That is a bad bounce, and the symptom in the app would be guidance
  sliding against its own music — subtle, intermittent, and nobody's first
  suspicion.
- **`cacheControl: '31536000, immutable'`**, against Supabase's default of one
  hour, and the key carries a short content hash so that an immutable response
  can never go stale (§4.6). A re-bounce is a new key, a new row value and a new
  migration.
- **Durations without a dependency, two parsers.** `mvhd` for MP4/AAC, which is
  what the new audio should be (§4.8), and the frame-header plus Xing path for
  MP3, which the nine existing masters are. No ffprobe, because a plan cannot
  promise what is installed on a laptop, and a missing binary should not stand
  between Ben and a working exercise.
- One bucket (`tracks`), two key prefixes (`trk-`, `cut-`). One select policy,
  one signed-URL path, one script.
- Service role from the environment, never from a file; it prints its target on
  the first call, as `pnpm test:db` does.

### 2.4 · Step copy

Hand-written migration, not generated: it is prose, reviewed the way the
therapeutic-copy passes were. `intro_md`, `listen_md`, `reflect_md` and
`reflect_placeholder` for `sound-journey` and `body-scan-soundwalk`, in German
and English, to `docs/GERMAN-UI-WRITING.md` and the PRD's §6 guardrails.
`scan_md` stays null for both — the step does not exist for them, and
`missing_translations` stays quiet because null in both locales is data.

The same migration flips `implemented = true` for both. **It is the last
migration in the branch**, so an exercise never becomes startable before its
audio and its words exist.

---

## 3 · The app

### 3.1 · New module — `apps/web/src/lib/exerciseKind.ts`

```ts
export const EXERCISE_KINDS = ['card_based', 'digital_interactive', 'listening_only'] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export function isExerciseKind(value: string): value is ExerciseKind
export function stepsForKind(kind: ExerciseKind): readonly StepId[]

export const POSTURES = ['sitting', 'lying'] as const;
export const ENDINGS  = ['day', 'sleep'] as const;
export type Posture = …; export type Ending = …;
export const DEFAULT_POSTURE: Posture = 'sitting';
export const DEFAULT_ENDING:  Ending  = 'day';
```

`stepsForKind` is the **only** place a step set is written down:

| kind | steps |
|---|---|
| `card_based` | intro · scan · listen · reflect |
| `listening_only` | intro · listen · reflect |
| `digital_interactive` | intro · listen · reflect — provisional, and the exercise is unbuilt |

**The step set is code, not data.** A step is a React screen; a database-driven
list would let a content edit promise a screen that does not exist. A `Record`
keyed by kind, so a fourth kind fails the typecheck rather than rendering
nothing.

**There is no mix level here.** An earlier draft exported a
`MUSIC_UNDER_VOICE` constant, because the app was mixing. It is not: the
balance and the ducking are in the stems, and the app sums them at unity. One
fewer number nobody measured.

### 3.2 · `sessionMachine.ts` — unchanged

It already takes `skipped` and already makes a cardless run finishable (D14,
D.0). The caller changes, not the machine:

```ts
const steps   = stepsForKind(exercise.kind);
const skipped = STEP_IDS.filter((step) => !steps.includes(step));
```

One derivation, two consumers — the reducer gets `skipped`, the rail gets
`steps`. No new state, and no second rule that could disagree with the first.

### 3.3 · New module — `apps/web/src/lib/mixer.ts`

The two-stem player, as one hook, because it is the only genuinely new
machinery in the branch and it has no business inside a 1400-line screen.

```ts
useMix({ voiceSrc, musicSrc, musicMuted }): {
  position: number; duration: number; playing: boolean; ready: boolean;
  toggle(): void; restart(): void; seek(s: number): void;
}
```

**Two plain `<audio>` elements. No `AudioContext`, no graph.** Two earlier
drafts of this plan specified Web Audio gain nodes; §4.2 is the reversal and the
reason — an `AudioContext` is suspended when iOS backgrounds the page, and this
is an exercise people lie down for with the screen locked. The stems are at
final mix level, so the app plays them at **unity** and needs no level between
0 and 1 anyway.

Six decisions, each with its reason; the first four are §4's and are stated
there in full:

1. **The switch sets `muted` on the music element** — ramped through `volume`
   where that property is writable, instant on iOS where it is not (§4.2).
   A muted element keeps playing and keeps buffering, so switching back is
   instant and already in sync. That is the whole of "continue at 00:31": there
   is nothing to load, nothing to seek, and the clock never stops.
2. **Both `play()` calls are synchronous inside the one gesture**, with nothing
   awaited between them (§4.3). The URLs are in hand by then, which is §4.7's
   job.
3. **One hard alignment, then a lazy 250 ms nudge** (§4.4).
4. **Only the voice element writes React state** (§4.4). The music element's
   `timeupdate` touches refs only.
5. **The voice stem is the clock.** Both are the same length by construction, so
   little hangs on it — and the voice is the one that is never silenced, so the
   number on screen always comes from something audible.
6. **Every transport act applies to both, in one place**: play, pause, restart,
   seek, and the end of the piece. Three copies of "and also the other element"
   is three places to forget it, and forgetting it is how the guidance ends up
   thirty seconds ahead of the music.

With a null `musicSrc` it is one element and no pairing at all: the
original-piece fallback and every card exercise take that path, so the flow that
works today gains no new risk.

### 3.4 · `SessionListen.tsx`

- Takes what `resolveListenAudio` returned (§3.5) instead of a single track, and
  hands it to `useMix`. The gate, the latch, the reveal, the three scroll views
  and the simulated clock are untouched — they all read `position`, and they
  already do not ask who moved it.
- **The switch**, in the immersive sheet, **after `.musie-immersive__caption`
  and before `.musie-immersive__actions`** — under the counter and its subline,
  which is where Ben placed it and also the only place on that sheet where a
  third control competes with neither the figure nor the way on.
  `Switch` from the design system, `label` passed explicitly (rule 7),
  `onGlyph={VolumeX}` / `offGlyph={Volume2}` — the component's own docblock
  names that pair as the case where the glyph should say *what* is switching.
- **It renders only when there are two stems.** On the original-piece fallback,
  on a card exercise, or on the simulated clock there is nothing to silence, and
  a disabled switch would advertise a feature the content cannot deliver.

### 3.5 · `content.ts`

- `Exercise` gains `kind: ExerciseKind`, narrowed at the boundary with the
  warn-and-fall-back shape `isStepId` already uses in `session.ts` — the
  generated type is `string`, and an `as` cast would hide the day somebody
  widens the constraint.
- **One function, three outcomes**, and it is where the whole fallback rule
  lives:

```ts
resolveListenAudio(exercise, card, locale, posture, ending):
  | { kind: 'cut'; cutId; trackId; voiceSrc; musicSrc; duration }
  | { kind: 'piece';     trackId; src; duration }      // the original, unducked
  | null                                               // no recording at all
```

  For a listening exercise it reads `exercise_cuts` by the four answers;
  on a miss it reads **any cut of the same exercise and ending** for its
  `track_id` and returns that piece's own file — the original, which is the
  honest thing to play when the guidance does not exist in this language yet.
  For a card exercise it is today's `exercise_tracks` lookup, returning
  `'piece'`. `null` keeps meaning *no recording*, and the simulated clock keeps
  answering it.

  **Why the fallback reads a cut rather than a second content column:**
  the piece an exercise is built on is already written down once, on its
  cuts. A `fallback_track_id` on `exercises` would be a second answer to
  the same question, and the two could disagree after a content edit.

- The object-versus-array embed collapse stays where it is, at the boundary,
  with the comment it already carries.

### 3.6 · `audio.ts` — minted once, and both at a time

Two changes, both argued in §4.5: a module-level `Map<src, {url, mintedAt}>` so
a URL is minted once per page rather than once per mount, and
`createSignedUrls([voiceSrc, musicSrc], TTL)` so the pair costs one round trip.
`useTrackSource` keeps its signature and its `resolving` guard — the guard is
the thing that stops a slow URL being mistaken for a missing file, and it is
unchanged.

Plus the expiry case: on an `error` event with a non-null `src`, re-mint once
and restore `currentTime`, rather than falling to the simulated clock.

### 3.7 · `session.ts`

`saveListeningAnswers(id, posture, ending)` and
`savePlayed(id, trackId, cutId)` — the second called beside
`markListened`, non-throwing for the same reason it is: this is a note taken
beside an exercise, not something the person is waiting on, and an exception
inside a play handler mid-exercise is the wrong failure.

### 3.8 · i18n — `en.ts` first, `de.ts` with it

| key | en | de |
|---|---|---|
| `session.intro.posture.legend` | How do you want to listen? | Wie möchtest du zuhören? |
| `session.intro.posture.sitting` | Sitting | Sitzend |
| `session.intro.posture.lying` | Lying down | Liegend |
| `session.intro.ending.legend` | How should it end? | Wie soll es enden? |
| `session.intro.ending.day` | Back into the day | Zurück in den Tag |
| `session.intro.ending.sleep` | Into sleep | Ins Einschlafen |
| `session.listen.musicOff` | Mute music, instructions only | Musik stumm, nur Anleitung |

`de.ts` is typed against `en.ts`, so a key added in English without German
fails `pnpm check` — the mechanism, not a habit. Nothing user-visible is written
inline, placeholder or not.

---

## 4 · Performance and loading

The round made after the plan above was written, because a listening exercise is
the heaviest thing this product does: **two streams, up to fifteen minutes, on a
phone, often on mobile data, often with the screen locked.** It reverses §3.3's
Web Audio decision, adds a gate before step 4, and changes how a signed URL is
minted.

### 4.1 · The budget

| moment | budget | why it is reachable |
|---|---|---|
| Hören mounted → transport pressable | **≤ 1.0 s** on a throttled 4G profile | the URLs were minted during Einsteigen (§4.7); `preload="metadata"` is a few KB |
| press → first sound | **≤ 300 ms** | 128 KB of each stem is already in the HTTP cache |
| switch toggled → music gone | **≤ 100 ms**, zero bytes | it sets a property on an element; nothing is requested, loaded or seeked |
| seek → sound | **≤ 500 ms** on 4G | one Range request per stem, to an exact byte offset (§4.8) |
| a second visit to Hören in the same run | **0 bytes** | same signed URL, immutable response (§4.5, §4.6) |
| total transfer, twelve minutes | **≈ 15 MB** | ≈ 11 MB music + ≈ 4 MB speech. A single pre-mixed master would be ≈ 11 MB, so the switch costs about 40% |

### 4.2 · The reversal — no Web Audio, after all

§3.3 specified `MediaElementAudioSourceNode` into a `GainNode`, twice, and
argued it from `HTMLMediaElement.volume` being read-only on iOS. **That is
wrong for this product, for a reason that outranks the ramp:**

**An `AudioContext` is suspended when iOS backgrounds the page, and suspending
it stops the sound.** A plain `<audio>` element keeps playing with the screen
locked. This is a *lie-down-and-put-the-phone-away* exercise of twelve to
fifteen minutes — background playback is not a nice-to-have, it is the use case.
Trading it for a smoother mute is the wrong way round.

And the reason for the graph has evaporated anyway: the stems are at final mix
level, so the app plays them at **unity**. It never needs a level between 0 and
1 — only off and on — and `element.muted` is settable on every platform,
including the one where `volume` is not.

So: **two plain `<audio>` elements, no context, no graph.**

- the switch sets `muted` on the music element;
- where `volume` is writable (desktop, Android — probed by writing 0.5 and
  reading it back), an ≈80 ms ramp runs first, because a hard cut on a sustained
  pad can click;
- on iOS it is an instant `muted`, and that is the accepted cost. A click is a
  worse-sounding switch; a suspended context is no exercise at all.
- `navigator.mediaSession` metadata is set from the **voice** element, so the
  lock screen names the exercise rather than picking whichever element the OS
  noticed last.

A muted element keeps playing and keeps buffering, so switching back is
instant and in sync — which is the whole reason the music is muted rather than
paused.

### 4.3 · Never await before `play()`

`enterImmersive` calls `play()` **synchronously inside the press handler**
(`SessionListen.tsx:521`), and that is load-bearing: iOS grants playback to the
gesture, not to the component. So in `useMix`:

- **both `play()` calls happen in that same synchronous block**, with nothing
  awaited between them — no "wait until both are ready", no `await
  ensureUrls()`, no promise chain. An await spends the gesture and the second
  element silently never starts, on iPhone only, intermittently;
- the URLs must therefore already be in hand when the transport is pressable,
  which is what §4.7 is for;
- `play()` returns a promise that may reject (autoplay policy, no data yet).
  Both rejections are caught and logged, and the existing fall-to-the-clock path
  is reached only when `resolving` is false — the guard `lib/audio.ts` already
  documents.

### 4.4 · Two clocks, one alignment, then a lazy nudge

Starting two elements that are not equally buffered means starting them a few
hundred milliseconds apart. §3.3's 250 ms drift nudge would then "correct" a
large initial offset with an audible jump.

- **One hard alignment**, once: on the first `timeupdate` after both elements
  report playing, `music.currentTime = voice.currentTime`. Inaudible on ambient
  music at the start of a piece, and it absorbs whatever the start cost was.
- **Then the lazy nudge**, as specified: past 250 ms of disagreement, the music
  is nudged. Speech over ambient music has no phase relationship, so the
  threshold is generous and the correction is inaudible.
- **Only the voice element writes React state.** Both fire `timeupdate` four
  times a second; the music element's handler touches refs only. Otherwise this
  1400-line screen re-renders eight times a second instead of four, for a number
  that comes from one of them.
- Seek, pause, restart and the end of the piece apply to both, in one place.

### 4.5 · A signed URL is a cache key, so mint it once

**The sharpest loading defect in the current design, and it predates this
branch.** `signedTrackUrl` mints a fresh URL per call, and
`useTrackSource` is keyed on `src` through `useAsync` — so it re-mints **per
mount**. A Supabase signed URL carries a token whose `iat`/`exp` differ every
time, which makes every mint a **different URL and therefore a different cache
entry**. Going back from Hören to Einsteigen and forward again re-downloads the
file. For a card track that is 3.5 MB; for a twelve-minute music stem it is
11 MB, on mobile data, for a step whose three-viewport design invites exactly
that movement.

Two changes, both small:

- **Cache the minted URL for the life of the page**, in a module-level
  `Map<src, {url, mintedAt}>` inside `lib/audio.ts`, re-minting only when it is
  older than the TTL minus a margin. `useTrackSource` keeps its signature and
  its `resolving` guard; the second mount is a cache hit with no request at all.
- **Batch the two stems**: `createSignedUrls([voiceSrc, musicSrc], TTL)` — one
  round trip for both, confirmed present in `@supabase/storage-js@2.116.0`
  (`createSignedUrls(paths, expiresIn)`). Two separate mints are two serial
  round trips before any audio can start.

**And one robustness case the TTL creates.** `SIGNED_URL_TTL` is an hour; a
fifteen-minute exercise paused for fifty minutes outlives its URL. On an
`error` event with a non-null `src`, re-mint **once** and restore
`currentTime` — rather than falling to the simulated clock, which is the right
answer for a file that does not exist and the wrong one for a token that
expired.

### 4.6 · Content-hashed keys, cached for a year

`cacheControl` on a Supabase upload **defaults to 3600** — one hour — which is
short enough that resuming a session tomorrow re-downloads everything.

So the upload script (§2.3) writes `cacheControl: '31536000, immutable'`, and
the object key carries a short content hash:

```
cut-sound-journey-de-lying-sleep-voice-7f3a9c21.m4a
```

The **id** stays derived from the four answers; only the **key** carries the
hash, and the key is data the migration states. A re-bounce is then a new key,
a new row value and a new migration — never a stale object behind a URL a
browser has cached for a year, which is the failure an immutable cache buys you
if the key is stable.

### 4.7 · Prefetch on Einsteigen, where the time is free

The person spends ten to thirty seconds on Einsteigen reading the copy and
looking at two preselected answers. Both answers already have defaults, so the
cut is **knowable before they touch anything**:

1. on mount, resolve the cut for `(locale, DEFAULT_POSTURE,
   DEFAULT_ENDING)` and mint both URLs (§4.5). One query, one batch sign;
2. **warm 128 KB of each stem** with a `fetch(url, { headers: { Range:
   'bytes=0-131071' } })`, after first paint, from `requestIdleCallback` where
   it exists. 128 KB is about eight seconds of music and twenty of speech —
   enough that the first press is instant — and 256 KB is the whole wager if the
   person leaves. With §4.6's immutable response the warmed bytes are reused by
   the element rather than fetched twice;
3. if an answer changes, re-resolve and re-mint. Nothing is wasted that was not
   already paid.

On the listen step, both elements carry **`preload="metadata"`** rather than
today's `preload="none"`: it is a few KB per stem, it makes `duration` and
accurate seeking available before the first press, and it is what lets the
transport be enabled honestly.

### 4.8 · `.m4a`, and why the format is a seeking decision

The bucket already permits `audio/mp4` and `audio/aac`
(`20260921160000_track_audio.sql`). The new audio should be **AAC-LC in an MP4
container**, not MP3, for three reasons in ascending order of consequence:

1. **Speech at low bitrate.** Mono VBR AAC at ~48 kbps is clean for guidance;
   long pauses cost almost nothing, so a twelve-minute voice stem lands near
   4 MB rather than the 11 MB the music needs.
2. **Exact duration.** The `mvhd` atom carries timescale and duration, so the
   upload script reads a number rather than estimating from frame headers — and
   the §2.3 check that the two stems match within 250 ms becomes exact.
3. **Exact seeking, which is the one that actually matters.** MP3 VBR seeking is
   an estimate unless the file carries a Xing TOC; MP4 has a sample table, so a
   byte offset for a timestamp is arithmetic. **Two streams must land on the
   same place**, and two estimates do not — a seek that puts the voice 400 ms
   from the music is exactly the artefact §4.4's nudge is too polite to fix.

The upload script therefore parses both: `mvhd` for MP4, and the existing
frame/Xing path for the nine MP3 masters already in the bucket, which it only
ever reads if Ben hands it an MP3.

### 4.9 · What costs nothing, stated so nobody optimises it

- **No dependency, no bundle growth.** `useMix` is two refs, two elements and
  about 150 lines. `howler.js` (≈ 30 KB gz) and `tone.js` (≈ 200 KB gz) are
  both the wrong shape for this: we need two elements and a boolean, and
  anything that wraps Web Audio reintroduces §4.2.
- **Decoding two AAC streams** is nothing on any phone shipped in the last
  decade; the hardware decoder handles both.
- **The MP3/MP4 parsers are in a script**, not in the app.
- **The listen step's artwork is already 202 KB of WebP**
  (`infographic-listen-and-see.webp`) and the exercise cards are 116–180 KB
  each. Nothing here changes them; the audio warm in §4.7 runs after first paint
  so it does not contend with them.

### 4.10 · The spike that comes before everything — iOS, two elements, locked screen

**One question decides both the audio architecture and Ben's export list, and it
is unanswerable by reasoning:** does iOS keep **two** simultaneous `<audio>`
elements playing with the screen locked and the app backgrounded?

- **Yes** → stems, as planned. Two files per cut, a free gapless switch.
- **No** → a pre-mixed master plus a dry guidance file, only one element playing
  at a time, and the switch becomes *pause A, set B's position, play B* — a
  small gap, the position preserved exactly, and **one more export per
  cut** with the music no longer separable.

The two strategies do **not** share their files, which is why this cannot wait:
it decides what Ben records before he records thirty-two of them.

**The spike is half a day with no content:** two equal-length placeholder files
(any music, any speech, same length), the real signed-URL path, a real iPhone,
the screen locked for two minutes, then the switch. It stays a spike —
throwaway page, no migration, nothing merged — and its answer goes in
`apps/web/OPEN-QUESTIONS.md` whichever way it falls.

### 4.11 · How the budget is measured, not asserted

`apps/web/e2e/fakeTracks.ts` already generates playable fixture audio — silent
8 kHz 8-bit mono PCM WAV, uploaded `upsert: false`, refusing any target that is
not loopback. It extends to cuts with no new machinery:

- **two stems per cut**, equal length, at the row's own
  `duration_seconds`. It has to be the real length: the gate reads
  `exercise_cuts.duration_seconds`, so a short fixture makes a 180-second
  gate unreachable and the walk fails for the wrong reason;
- **one cut pair, not the matrix.** 8 kHz mono 8-bit is 8 KB per second,
  so a fifteen-minute pair is ≈ 14 MB of fixture — fine once, silly sixteen
  times. The walk needs the path, not the cross-product;
- the Playwright walk asserts the budget with CDP network throttling
  (`Network.emulateNetworkConditions`, a 4G profile) around four marks:
  transport pressable, first `timeupdate`, switch-to-silence, and seek-to-sound.
  The same shape as the existing `listen.spec.ts`.

**Measured, not reasoned** — which is also the house rule for anything with a
threshold in it.

### 4.12 · Two things this round found outside the feature

Logged in `apps/web/OPEN-QUESTIONS.md` rather than fixed here, because neither
is this branch's scope:

1. **`/discovered-music` mints one signed URL per row, on mount** — one round
   trip per recording, in parallel, growing with the library.
   `createSignedUrls` would make it one. Ten lines, and it belongs to that
   screen rather than to this feature.
2. **`reveal-track` is one call per row** on the same screen, which its own
   header already calls acceptable at nine recordings and names the fix for
   (a reveal that takes a list of sessions). This feature adds pieces to that
   list, so it is worth re-reading the threshold rather than the code.

---

## 5 · Tests

**Unit (`pnpm check`)**

- `exerciseKind.test.ts` — the step set per kind; `listening_only` has no
  `scan`; an unknown kind is narrowed, warned about, and treated as card-based.
- `sessionMachine.test.ts` — a listening run walks intro → listen → reflect and
  finishes; `scan` is unreachable; `GO_TO('scan')` is refused by identity
  (`toBe(state)`), which is the existing style.
- `mixer.test.ts` — the switch sets `muted` and **never** `currentTime`; the
  `volume` ramp runs where the property is writable and is skipped where it is
  not; `play()` is called on both elements synchronously, with nothing awaited
  between them (§4.3); the one-time alignment happens once and the 250 ms nudge
  fires past the threshold and not below; only the voice element's `timeupdate`
  produces a render; a null `musicSrc` mounts one element.
- `content.test.ts` — `resolveListenAudio`'s three outcomes, including the
  fallback reading another locale's cut for its piece, and `null` without
  logging it as a fault.
- `audio.test.ts` — the second mount of the same `src` makes **no request** and
  returns the same URL string; a URL older than the TTL margin is re-minted; a
  pair is signed in one call; an `error` with a non-null `src` re-mints once and
  not twice.
- `music.test.ts` — the generator: derived ids and keys, the three refusals in
  §2.1, and that it emits nothing for `exercise_tracks`.

**Database (`pnpm test:db`, after `supabase db reset`)**

- `music.db.test.ts` — the database carries `music.json`, in
  `deck.db.test.ts`'s shape and for its four reasons (edited and not generated,
  generated and not applied, applied and not pushed, edited in Studio).
- One cut per (exercise, locale, posture, ending) — the constraint,
  watched going red with it dropped.
- A cut with a bed has a piece, and one without has neither.
- **`exercise_tracks` and `tracks` are byte-for-byte what the deck and the nine
  recordings say they are** — the regression test for §1.4's headline.
- `db.security.db.test.ts` — `exercise_cuts` readable by `authenticated`,
  nothing readable by `anon`, no write by `authenticated`, `title`/`artist`
  still refused with 42501, `missing_cuts` refused to a listener, and
  `service_role` able to select **and** write the new table.

**End to end, throttled (`pnpm test:e2e`)** — §4.11. `fakeTracks.ts` seeds one
cut pair at its real length, and the walk takes the four marks of §4.1's
budget under a 4G profile: transport pressable, first `timeupdate`, switch to
silence, seek to sound. Red when the budget regresses, which is the only way a
budget stays one.

**By hand, on a phone, and only these three things** — because they are the
three no suite can reach:

1. **the locked screen**, for two minutes, mid-piece — the spike's question
   (§4.10) and then the regression check once it is answered;
2. **the sum of the two stems judged by ear** against the mix as bounced, which
   is the PRD's first risk;
3. **the instant mute on iOS** (§4.2), which is the one audible cost of keeping
   background playback — and if it is worse than it reads on paper, it is a
   product call, not a bug.

---

## 6 · Order of work

Each step ends somewhere the tree is green, because rule 9 means this branch may
have to be left alone for a day at any point.

| # | Work | Ends when |
|---|---|---|
| 1 | §1.1 migration · `exerciseKind.ts` · `content.ts` narrowing · `Session.tsx` steps/skipped · unit tests | **Three markers for a listening exercise**, provable in the dev server by flipping one row to `implemented` locally. No audio needed. |
| 2 | §1.2–1.7 migrations · the view | `supabase db reset` + `pnpm test:db` green, including the new security cases and the §1.4 regression test. Nothing in the app reads the new table yet. |
| 3 | `music.json` + the three scripts | The nine existing pieces round-trip through the file unchanged — same titles, same keys, same durations — and the card flow is **untouched** end to end. |
| **S** | **The iPhone spike — §4.10.** Two equal-length placeholder files, a real signed URL, the screen locked for two minutes, then the switch | **Answered, in `OPEN-QUESTIONS.md`:** stems, or a pre-mixed master plus a dry voice. It decides what Ben records, so it comes before step 4 and before any recording. Half a day, nothing merged. |
| 4 | `audio.ts` (§3.6) · `mixer.ts` · `resolveListenAudio` · `SessionListen.tsx` · the switch · i18n | Two stems play, the switch silences the music without moving the clock, and the fallback plays the original piece. Provable against any two equal-length files. |
| 5 | `SessionIntro.tsx` · the two segmented controls · the prefetch of §4.7 · the answers written and read back | The questions work, the answers survive a reload and pick the cut, and **Hören opens with its URLs already minted**. |
| 6 | `fakeTracks.ts` extended (§4.11) · the throttled Playwright walk · the four budget marks | **The budget in §4.1 is measured**, not asserted, and red when it regresses. |
| 7 | The step copy migration · `implemented = true` · the hand walk | **Both listening exercises are startable**, and */discovered-music* shows the original piece with no change to its own code. |

Step S is the only one that can run out of order, and the only one that can
change steps 4 and 5 before they are written — which is exactly why it is not
last. Step 7 is the only one that cannot start until Ben's recordings exist.

## 7 · Open questions I will log rather than decide

`apps/web/OPEN-QUESTIONS.md`, in its format, because an empty log is a failure
signal:

1. **`needs_cards` is still a column** (§1.5) and the follow-up migration that
   drops it once the parallel branches merge.
2. **D14 is overturned for one kind.** A cardless *card* exercise would still
   draw four markers with a gap; a listening exercise draws three. The rule is
   now "the kind decides", and the design system's `skipped` keeps its only
   other consumer. Worth Ben's eye, since D14 was his designer's call.
3. **The switch is not recorded** (§1.3), so the diary cannot say you listened
   without the music. Deliberate; logged because somebody will ask.
4. **The stems are summed at unity** (§3.3) — right if the mix has no processing
   across both layers, and that is PRD Q10. If it has, this is the line that
   changes.
5. **The spike's answer** (§4.10), whichever way it falls, because it is the
   reason the audio is shaped the way it is and nothing in the code will say so.
6. **The Web Audio reversal** (§4.2) — written down so that the next person who
   wants a crossfade knows it costs background playback on iOS, and that the
   trade was made deliberately.
7. **`/discovered-music` signs one URL per row and calls `reveal-track` once
   per row** (§4.12). Neither is this branch's scope; both grow with the
   library this branch adds to.
8. **`listen_gate_seconds` for both exercises** is still an estimate (180s
   against 10–15 minutes). Tunable the day the audio exists; a content edit.

## 8 · Rule compliance, stated so it can be checked

| Rule | How |
|---|---|
| 1 · consume the design system | `Switch`, `SegmentedControl` and `InteractiveWizard` imported and given props. No new `musie-` pattern, no raw scale token, and the switch is placed between two existing elements of the sheet rather than inside a component's geometry. |
| 2 · RLS, policies, revoke, grant | §1.6, including `service_role` select **and** write, with a test for each. |
| 3 · never disable RLS | Nothing here disables anything. |
| 4 · migrations stack | Four new files. Nothing edits an applied migration; every statement is whole and idempotent. |
| 5 · `<html lang>` | Untouched — and now load-bearing twice, since the active locale picks the cut as well as the hyphenation. |
| 6 · German is written, not reported | Seven chrome keys in both locales; twelve step documents drafted in both. |
| 7 · every string passed explicitly | Both segmented controls and the switch pass `legend` / `label` and every option; no design-system default is let through. |
| 8 · `pnpm check` before done | Plus `pnpm test:db` after every migration, and the dev server on 5176. |
| 9 · a worktree isolates files only | Own port; **additive schema only**, so no column moves out from under another branch; `db reset` / `db push` / `gen:types` left to Ben. |

One rule this feature adds to itself, because nothing in CLAUDE.md covers it:
**a threshold is measured or it is not claimed.** §4.1 is a table of budgets
with a walk behind each one, and §4.10 is a spike rather than an argument — the
same standard the repo already applies to the listen gate and to anything with a
number in it.

---

## 9 · Size

Ten app files, four migrations, three scripts, one content file, nine test
files, one spike. Two things are genuinely new — `exercise_cuts` and
`mixer.ts` — and the rest is the kind decision threaded through the places that
already branch on an exercise, plus the two small changes to `lib/audio.ts` that
§4.5 argues for and that pay off on every screen that plays anything.

Still smaller than the two previous drafts by a table, a generator change and a
deprecation — and the performance round removed more than it added: no Web Audio
graph, no gain plumbing, no dependency.

---

## 10 · What only Ben can do

1. **`supabase db reset`** after each of steps 1, 2, 3 and 6 — one stack,
   shared, and a reset from here re-applies this branch's migrations over
   whatever another agent is testing against.
2. **`pnpm gen:types`** after each reset, for the same reason, and it writes
   this worktree's `database.types.ts` from the shared database.
3. **A real iPhone, for half a day, before step 4** — the spike in §4.10. It
   decides whether you export stems or pre-mixed masters, so it decides your
   recording list. I can write it; it needs a device and a locked screen.
4. **The audio, as two stems per cut** — the guidance, and the ducked
   music, bounced from the same session at final mix level, as `.m4a` if your
   tooling allows it (§4.8). Steps 4–6 can be built and measured with any two
   equal-length files; step 7 needs the real ones.
5. **An ear on the sum of the stems** against the mix as bounced, once a real
   pair exists — and on the instant mute on iOS, which is the one audible cost
   of keeping background playback (§4.2).
6. **`supabase db push`**, when the branch is ready to leave this laptop.
7. **Q6, Q9 and Q11 in the PRD**, none of which blocks a start.
