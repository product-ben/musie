# Start page iteration — implementation plan

Branch: `start-page-iteration`, cut from `main` at `8c571a4`.

Source: the user-testing board (U1–U5) — *Start page Gains*, *Start page Pains*,
*Actions for the start page*. **Five actions are written on that board and this
plan implements those five.** Nothing here is an action that is not on it. Where
an action forces a second change to stay coherent, that change is called a
*consequence* and says which action forces it; where it forces a choice, the
choice is named and a recommendation given rather than taken silently.

One item on the board is an explicit **non**-action and is recorded as such at
the end.

---

## 1 · *How Musie works* gets its own route `/about`; the index refers to it

> Give the "how musie works" page its own route "/about". When the index is
> loaded, directly refer here.
> — from the gains: U1/U2/U3/U5 understood the scope by navigating the
> onboarding, so the page is worth being addressable.

### Today

`/` **is** `AboutMusie` ([router.tsx](apps/web/src/router.tsx)), and the page
itself holds the returning-visitor skip: on a *cold* arrival
(`location.key === 'default'`) with a recorded `user_type_id` it redirects to
`/exercises` ([AboutMusie.tsx:120-137](apps/web/src/routes/AboutMusie.tsx#L120-L137)).

### Change

- `router.tsx`: add `path: 'about'` → `<AboutMusie />`, carrying the existing
  `handle({ titleKey: 'route.aboutMusie.title' })`.
- The `index` route becomes a decision, not a page: it renders nothing while the
  profile is pending, then `<Navigate replace>` to `/exercises` (returning) or
  `/about` (everyone else).
- `AboutMusie.tsx` **loses** `arrivedCold`, `skip` and the `<Navigate>` branch
  entirely, and becomes an unconditional page.
- [MenuDrawer.tsx:165](apps/web/src/routes/MenuDrawer.tsx#L165): the `how` row's
  `href` goes `'/'` → `'/about'`. It is the only link to `/` in the app (grepped).

### Why the decision moves to `/` rather than `/` simply redirecting to `/about`

The skip's first condition is `location.key === 'default'` — "this page is where
the app was opened". A `<Navigate replace>` mints a new history entry, so that
test is no longer true at `/about`, and a plain redirect would show the explainer
to every returning visitor on every cold open. Keeping the decision at `/` keeps
the condition where it is true by construction: **`/` is the cold arrival**.

It also deletes the bug class the current file documents at length — a page that
sometimes silently goes somewhere else. After this, `/about` always shows the
explainer, which is what a drawer row pointing at it promises.

### Suggested shape

The decision is pure and the repo tests pure things
(`lib/requireAccount.ts`, `lib/headerReveal.ts`): put
`entryDestination(arrivedCold: boolean, hasUserType: boolean): '/about' | '/exercises'`
in `lib/entry.ts` with a unit test, and let the index component do the latching
and the `<Navigate>`.

### Consequence — a comment that becomes false

`router.tsx` currently says *"`about-you`, not `about`: one spelling per route,
and the path now says which 'about' it is."* After this, the pair **is** `/about`
and `/about-you`. The board asks for `/about` by name, so implement it and
rewrite that comment; the tension goes in `apps/web/OPEN-QUESTIONS.md` (below)
rather than being resolved by quietly picking a different path.

### Verify

`pnpm --filter web dev`: cold-open `/` as a new profile → `/about`; cold-open `/`
with a user type → `/exercises`; open the drawer → *How Musie works* → `/about`
and it stays there; reload `/about` → it stays.

---

## 2 · More clarity in the carousel — slide 3 is about the diary

> Strengthen the strengths, even more clarity in the carousel
> → Rephrase "Fühle und verstehe dich selbst besser" to
> "Überblicke deinen Fortschritt im Tagebuch"
> — from the gains: U3 liked knowing the diary captures sessions.

### Change

[de.ts](apps/web/src/i18n/de.ts) — `about.slide.understand`:
`'Fühle & verstehe dich selbst besser'` → `'Überblicke deinen Fortschritt im Tagebuch'`.

`en.ts` must move with it or the two locales say different things. `en.ts`
records that **the German is the original here and the English is the
translation**, so the English follows Ben's line:
`'Feel & understand yourself better'` → `'Keep track of your progress in your diary'`.

### Consequences — two names that stop being true

Neither is a new action; both are the same slide.

- **The id.** `SLIDES[2].id` is `'understand'`
  ([AboutMusie.tsx:88](apps/web/src/routes/AboutMusie.tsx#L88)) and the key is
  `about.slide.understand`. Recommend renaming both to `diary`: the ids are
  internal (React keys and the catalogue key), and leaving `understand` pointing
  at a line about the diary is how a catalogue stops being readable.
- **The glyph.** Slide 3 is `Heart`. Heart beside "Überblicke deinen Fortschritt
  im Tagebuch" names nothing on the screen. Recommend `BookOpen` — `Session.tsx`
  already records it as "the diary reading" in its own glyph note. Alternative
  if the *progress* half should lead instead: `LineChart`.

Both are one-line changes and both are Ben's call; the plan does not take them
silently.

### Verify

`pnpm check` (the parity test fails if only one locale moves), then both locales
in the browser: swipe to slide 3, and confirm the CTA still unlocks on
`seenMax >= 2` — the gate counts slides and is untouched.

---

## 3 · The diary paragraph leaves `/about`

> In order to create more clarity on the /about page, get rid of the paragraph
> about the diary. Later, it was an intuitive place for users.
> — from the pains: U1 and U2 both did not perceive the diary section here, and
> both understood the diary once they reached it.

### Change

- [AboutMusie.tsx:254](apps/web/src/routes/AboutMusie.tsx#L254): delete
  `<p className="musie-postscript">{t('about.postscript')}</p>`.
- `en.ts` / `de.ts`: delete `about.postscript` from both, and the comment block
  above it that explains why the diary is a P.S. rather than a slide. That
  reasoning is what actions 2 and 3 together overturn.
- [shell.css:404-413](apps/web/src/shell.css#L404-L413): delete `.musie-postscript`.
  It has exactly one consumer (grepped), which this removes — and an orphan
  `musie-` pattern is the thing rule 1 is about.
- `AboutMusie.tsx`'s header comment mentions "the sixth beat, the diary … is the
  postscript under the CTA". Rewrite: the diary is slide 3 now.

### Note on ordering

Actions 2 and 3 are one move — the diary leaves the P.S. and enters the carousel
— and should land in one commit. Shipping 3 without 2 takes the diary off the
start page entirely, which no insight on the board asks for.

---

## 4 · The large intro text stops breaking words

> Make sure in the large intro display text, words are not seperated
> — from the pains: U4, "Hard to read". The board's screenshot shows
> `be-wusster` and `si-cherer` in the German pitch.

### Diagnosis

The broken line is `about.pitch`, rendered by `ContentBox` at `textStep="stage"`
([AboutMusie.tsx:169](apps/web/src/routes/AboutMusie.tsx#L169)). It reaches
`.musy-box__text`, which carries `hyphens: var(--text-hyphens)`
([musy-components.css:1519](packages/design-system/src/musy-components.css#L1519)),
and Layer 1 sets `--text-hyphens: auto`. The headline is unaffected —
`.musy-box__headline` declares no `hyphens` at all — which matches the
screenshot, where only the body line breaks.

### Where the fix goes

**In the design system, not in `apps/web`.** A screen never reaches into a
component's geometry (rule 1), so overriding `.musy-box__text` from `shell.css`
is out.

It must also not be a blanket removal: `--text-hyphens: auto` is load-bearing for
German body copy at `--measure-body` (rule 5, and `de.ts:164` relies on it).

Recommended — **scope it to the step, not to the screen**:

```css
/* A display-sized line is not body copy: at --type-stage-size a hyphen reads as
   a broken word rather than as wrapping, and German compounds take the worst of
   it. Body steps keep Layer 1's auto. */
.musy-box__text[data-type-step="stage"],
.musy-box__text[data-type-step="display-lg"],
.musy-box__text[data-type-step="display-xl"] { hyphens: none; }
```

`data-type-step` is already on that element
([ContentBox.tsx:150](packages/design-system/src/ContentBox.tsx#L150)), so this
needs no new API. The blast radius is two consumers in the whole repo —
`AboutMusie` and `ContentBox.stories.tsx` — both of which want it.

Fallback if a stage-sized hyphenated paragraph is ever wanted: a
`textHyphens?: 'auto' | 'none'` prop on `ContentBox`. Recommend not adding it
until something asks, per L14.3 — a prop with one caller is a second spelling.

### Verify

Storybook (`pnpm storybook`) on the ContentBox display story in German, and the
German `/about` at 390px wide: `bewusster` and `sicherer` whole, body-step text
elsewhere still hyphenating.

---

## 5 · A new place: *Discovered music*

> In order to allow users to re-use the music they discover in exercises for
> their own purposes, add a new place "Discovered music"
> · Headline
> · Intro text explaining what this music is and what to use it for, in order to
>   inspire the user
> · One row per track, with simply the player
>
> — from the pains: U5 expected a "pick a track to meditate" feature on /about,
> and expected a session on /exercises to be "pick a track and listen to it".

This is the largest of the five and the only one with architectural
constraints, so it is specified in more detail. Two things to know before
starting: the title of a track cannot be read by the client at all, and **the
database does not currently record that anybody pressed play** — so this action
owns one migration.

### Constraint 1 — a title is not readable from the browser

`tracks.title` and `tracks.artist` are **not granted to this client at all**.
Naming either in a PostgREST select fails the whole request with 42501 — it does
not return null ([content.ts:311-320](apps/web/src/lib/content.ts#L311-L320),
and the ACCESS block of `20260918150500_content_schema.sql`). `MusicPlayer.title`
is required *and visible*.

The one door is the `reveal-track` Edge Function
([lib/reveal.ts](apps/web/src/lib/reveal.ts)), and it takes a **`sessionId`,
never a track id** — deliberately, so nobody can walk `trk-01…trk-09` and
collect nine titles without listening to anything.

So *discovered* is not a property of a track. It is a property of **a person's
own session** — which is also what the board means by "the music they discover
in exercises". The page therefore shows only this person's own past sessions,
and only ever their own: `sessions_select_own` filters every read by `user_id`
(`20260919120000_sessions.sql:232`), so there is no query that could leak
somebody else's.

### Constraint 2 — "pressed play" is not recorded anywhere, and it must be

Ben, on this plan's first draft: *only sessions where the user has at least
clicked the play button count.* That is the right rule and **it cannot be
expressed against today's schema.**

What exists is `sessions.step`, which says which screen the run reached. Nothing
says anybody listened. `reveal-track` already admits this in its own header, in
as many words:

> `step` says which screen the session reached, not that anyone listened. The
> gate on the listen step is client state and is not stored, so the server
> cannot check it.

And it is client state: `playing` and `position` are `React.useState` in
[SessionListen.tsx:141-142](apps/web/src/components/SessionListen.tsx#L141-L142)
and are never written anywhere. A session parked on `listen` having touched
nothing is indistinguishable from one that played a track to the end.

So this action adds the fact:

- **A new stacking migration** (rule 4 — a new file, `alter table`, never an
  edit of an applied one): `alter table public.sessions add column listened_at
  timestamptz;`. `timestamptz` rather than a boolean, to match `started_at` /
  `ended_at`, and because "when" is free once "whether" is being stored.
- **No new grant and no new policy.** `20260919120000_sessions.sql:313` grants
  `select, insert, update, delete` on the *table* to `authenticated`, not on
  columns, so a new column is covered; `sessions_update_own` already filters by
  `user_id`. Worth stating in the migration header so the next reader does not
  go looking for the missing half of rule 2.
- **The write**: in `SessionListen`'s `play()`
  ([SessionListen.tsx:204](apps/web/src/components/SessionListen.tsx#L204)),
  after the url-in-flight guard, set it once per session and only if still null.
  Fire-and-forget — a failed write must not interrupt playback, and a session
  that played but failed to say so is a missing row on one screen, not a broken
  exercise.
- **One honest limit to write down.** This step has a simulated fallback: with
  no file, `play()` starts a clock instead. That press is a press, so it would
  be stamped too — but such a session's track has `src = null` (or no bytes in
  the bucket), and the `src` filter below drops it from the page anyway. The two
  rules agree today; they are not the same rule, and the file should say so.

### Shape

1. `lib/discovered.ts`
   - Read the signed-in person's own sessions (RLS already restricts to owner):
     `select id, started_at, track_id, tracks(id, src, duration_seconds)`,
     `not.is('track_id', null)`, `not.is('listened_at', null)`, ordered by
     `started_at`.
   - Collapse to one row per distinct `track_id`, keeping the **earliest**
     qualifying session — that session id is what the reveal is asked for. Keep
     the collapse a pure function (`discoveredFrom(rows)`) with a unit test, as
     `diary.ts` does with its own pure parts.
   - Drop rows whose `src` is null: five of the nine cards are silent, and a
     player for a file that does not exist promises a recording that is not there.
2. The screen calls `revealTrack(sessionId)` per row for the title and artist.
   `kind: 'tooEarly'` should now be unreachable — `listened_at` is only ever set
   on the listen step — so treat it as a bug if it appears rather than as a
   state to design for. `kind: 'silent'` means the row is not discovered music
   and is dropped; `kind: 'failed'` degrades to the player with a neutral title,
   the way `SessionListen` already degrades.
   At most nine calls today — worth a note in the file, not a batching mechanism.
3. `useTrackSource(src)` ([lib/audio.ts:88](apps/web/src/lib/audio.ts#L88))
   signs the object key; `MusicPlayer` takes it from there. The post-reveal
   usage in
   [SessionListen.tsx:740-752](apps/web/src/components/SessionListen.tsx#L740-L752)
   is the precedent to copy, including passing every transport label explicitly
   (rule 7 — `MusicPlayer`'s own defaults come from the design-system catalogue).
4. New route + a drawer row:
   - `router.tsx`: `path: 'discovered-music'`, `handle({ titleKey: 'route.discoveredMusic.title' })`.
   - `MenuDrawer.tsx`: a row between *Your diary* and *About you*.
5. New i18n block in `en.ts` **and** `de.ts` (German written, not owed — rule 6,
   `docs/GERMAN-UI-WRITING.md`): route title, headline, the intro paragraph, the
   empty state, and the player's four transport labels.

### States

- **Empty** — nobody has pressed play yet. **This is the state every existing
  account is in on the day this ships**, because `listened_at` is null for every
  session written before the migration, and there is no backfill that would be
  honest: the rows do not record what they did not record. So the empty state is
  not an edge case here, it is the opening screen, and it gets built as one
  (Ben, on this plan's second draft):

  - The headline and the intro paragraph still render — they explain what this
    place is *for*, which is exactly what somebody with nothing here needs.
  - In place of the list: a line saying there is nothing yet and why — you
    discover music by listening to it in an exercise — and a **CtaButton that
    starts a session**.
  - The button goes where the drawer's own *Start a session* row goes, by the
    same rule: `/exercises` when a user type is recorded, `/about-you` when it
    is not (`MenuDrawer.tsx`). A second rule for the same journey is how two
    entry points drift apart.
  - It reuses `menu.startSession` rather than inventing a second label for one
    action (rule 7's spirit, and L14.3's).

  The list's own `emptyLabel` is not the mechanism: `ContentList` draws a line,
  not a call to action. The screen branches.
- **Loading / failed** — same treatment as every other content screen
  (`useAsync` + `Message`).

### Open for Ben

- **The path.** `/discovered-music` is this plan's suggestion. It compounds with
  the `/about` question in action 1 — both are new route spellings on a branch
  that overturns the one-spelling-per-route note.
- **The German name.** *Entdeckte Musik* is the straightforward reading of
  "Discovered music"; it goes in the drawer and in the heading, so it is worth
  Ben's eye before it is written in two files.

### Verify

`pnpm --filter web dev` against a local stack with the audio fixtures present
(`e2e/fakeTracks.ts` writes silent WAVs — and a passing screen against silence
proves the plumbing, not the recordings; see `OPEN-QUESTIONS.md`). Run one
session and **press play**, then open the new place: one row, the right title,
the player working. A second session that reaches the listen step and is left
alone must add **no** row — that is the whole of Ben's rule and it is the test
worth writing by hand.

`pnpm test:db` **is** required here (rule 4: run it after any change under
`supabase/migrations/`), and `supabase db push` is what sends the migration to
the hosted project. Nothing pushes automatically.

---

## The non-action, recorded on purpose

> could the "Let musie pick an exercise" button be already here for a quick
> start? — #U3
>
> **lets not act here.** We dont want this, as we want the user to discover at
> least a hand full of exercises, so they come back.

`exercises.surpriseMe` stays where it is, on `/exercises`
([Exercises.tsx:273](apps/web/src/routes/Exercises.tsx#L273)). Nothing on
`/about` gains a quick start. Written down here so the next person reading the
board does not implement it.

---

## What goes in `apps/web/OPEN-QUESTIONS.md`

In that file's format, once the work lands:

- **`/about` and `/about-you` are now the pair, and `router.tsx` used to say
  that was the thing to avoid.** What I checked, what I did (implemented the
  board's spelling), why, and what I need from Ben: whether the rule is retired
  or `/about-you` is renamed with it.
- Anything in action 2's two consequences (id, glyph) that is deferred rather
  than decided.

An empty log at the end of this branch is a failure signal.

---

## Order of work, and the gate

1. Action 4 (one CSS rule, no app change) — smallest, and unblocks nothing.
2. Actions 2 + 3 together, one commit — copy only.
3. Action 1 — routing, and it touches the drawer.
4. Action 5 — the new place, on top of a settled route table. Its migration is
   the first thing in it, not the last: `listened_at` has to exist and be
   written before there is anything for the page to read.

`pnpm check` passes before anything is called done (rule 8), and verification is
against `supabase start` + `pnpm --filter web dev`, never a URL. Action 5 writes
a migration, so `pnpm test:db` is part of this branch's gate as well — run after
`supabase db reset`, and `supabase db push` to send it.
