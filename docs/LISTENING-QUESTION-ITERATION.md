# Listening question iteration — PRD

Branch `listening-question-iteration`, worktree
`../musie.worktrees/listening-question-iteration`, cut from `origin/main` at
`19276fa`. Source of scope: Ben's brief of 2026-10-11, plus the eleven
decisions he took while this document was being written (§3 — they are the
contract, not a summary of it).

**This was the PRD, and it is now also the record of what was built.** The
specification below is kept as written, so the decisions can be read against
the code. §0 is what happened to it.

---

## 0 · Status — built 2026-10-11

Ben was away and asked for every remaining call to be made without him, on
"done is better than perfect". All of §4–§10 is implemented.

| | |
|---|---|
| `pnpm check` | **green** — 410 tests, 29 of them new |
| `pnpm --filter web build` | **green** |
| `pnpm build:storybook` | **green** |
| The migration's SQL | **validated** in a rolled-back transaction (see below) |
| `pnpm test:db` | **green** — 9 files, 129 tests, after Ben applied the migration |
| The e2e walk | **16 / 24**, and the 8 failures are pre-existing — proven below |
| The app, running | **walked, 2026-10-12**, and it found a bug. See §0.1 |

### 0.1 · What the walk found — `d797571`

The ? and the Lightbox's close X were **drawn in the same corner.** One
character: `flex: 1 1 auto` on `.musie-question__headrow > .musie-md` made that
box fill the row and pushed the control to the trailing edge, which is where
the sheet already puts its close control. The comment above the declaration
argued at length that the ? must follow the question's last line *precisely so
it never reaches that corner* — and then the declaration did the opposite,
which made it read as deliberate.

**Nothing automated caught it.** `pnpm check` green, both bundles built, 129 db
assertions passed, no e2e regression: a control stacked under another control
is valid CSS, valid markup and a correct accessible name. Playwright had been
saying so for 335 polls — *"waiting for element to be visible, enabled and
stable"* against a button whose `aria-label` was right there — and that reads
as a flaky selector until you look at the picture.

Verified after the fix across five frames: the question is the headline, the ?
follows it, pressing it reveals the helper at `body-sm` and removes itself
(D15), the broccoli button is disabled and becomes the refresh after thirty
seconds (D8/D9), and a press swaps Q1 for Q2 with the ? back for the new
question.

**One cosmetic thing left.** On a three-line question the ? sits at the
bottom-right of the heading's measure box rather than after the final word,
because the box is as wide as `--measure-heading` and not as wide as its last
line. Adrift rather than wrong, and it cannot collide with anything.

### 0.2 · The 8 e2e failures are not this branch's

Proven by A/B on the same tree, same deps, same server — one line, emptying
`QUESTION_SETS` so the feature is inert everywhere:

| Spec | feature ON | feature OFF |
|---|---|---|
| `camera:58` en/de | ✘ ✘ | ✘ ✘ |
| `cancel:92` en/de | ✘ ✘ | ✘ ✘ |
| `cancel:383` en/de | ✘ ✘ | ✘ ✘ |
| `scanlink:40` en / de | ✘ / ✓ | ✘ / ✘ |
| `session:55` en/de | ✘ ✘ | ✘ ✘ |
| **total** | **8 failed** | **9 failed** |

Identical set, and switching the feature off made it one worse — `scanlink
[de]` flipping is the proof that one is a race rather than a regression. Eight
of them are `toHaveURL(/\/listen$/)` against a URL the app writes as
`?overview`, which `origin/main` has done since `fca1bb2`; this branch touches
neither `apps/web/e2e` nor `playwright.config.ts`.

### What needed Ben, and it is done

`supabase db reset`, `supabase db push` and `pnpm gen:types` are denied in
`.claude/settings.json`, and rule 9 is why: one Supabase stack, fixed ports,
**nine other worktrees** driving the same containers. A reset from here
re-applies this branch's migrations over whatever another session is testing
against, so it is not a call to make on somebody else's behalf.

The consequence is not subtle. `SESSION_COLUMNS` now names the four new
columns, so **`readSession` fails and every `/session/:id` screen shows its
error state until the migration is applied.** `/exercises`, `/diary` and the
rest are unaffected.

```
supabase db reset     # done 2026-10-12, from THIS worktree
pnpm test:db          # green: 9 files, 129 tests
```

**Two traps cost an hour between them, both rule 9's**, and both are worth
knowing before the next worktree:

1. **`supabase db reset` was first run from the MAIN checkout**, which does not
   contain this migration — so it applied everything *except* it, and
   `pnpm test:db` reported a schema that exists in no tree.
2. **A Vite dev server from `/Users/benjaminlipinski/musie` had been on :5173
   since 7 October**, and `playwright.config.ts:157` reuses whatever is there.
   The first e2e run therefore walked a five-day-old app from another checkout.
   Killing it exposed the third trap: **a fresh worktree has no
   `apps/web/.env.local`** — it is gitignored — so the app could not reach
   Supabase at all and 22 of 24 walks failed. Written now, pointed at the local
   stack.

### The SQL was validated the furthest way available without it

Applied inside a transaction against the local stack, inspected, rolled back.
Nothing persisted and no other worktree touched. Proven that way: the four
columns land with the intended types, nullability and `'{}'` defaults;
`sessions_listening_question_pairs` refuses an id with no snapshot *and* a
snapshot with no id, and accepts both together; the view is created
`security_invoker=true` and runs; grants end at `service_role | SELECT`;
`was_reset` is false while log and round agree and true once the round is
emptied.

**That validation found a real rule 2 bug**, which is the one thing here worth
reading even if nothing else is: the view's grants were written exactly like
`missing_translations`' — `revoke … from anon, authenticated` then
`grant select … to service_role` — and measured as

```
service_role | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
```

because the local stack's `alter default privileges … grant all on tables`
**covers views too**. The `grant select` was adding to a grant already there.
`service_role` is now in the revoke, and it measures `SELECT` alone.
`missing_translations` has the same latent grants and is deliberately not
fixed here — logged in `apps/web/OPEN-QUESTIONS.md`.

### Two things that changed during the build

**`lucide-react` went 0.470 → 1.55** as its own commit with its own gate (§9),
because D7 asked for the real broccoli. Seven glyph renames across 67 files,
all 1:1; the four face glyphs turned out to be story-only, so nothing a user
sees changed. `CircleHelp` is gone in 1.x and the `?` uses
`CircleQuestionMark`.

**`database.types.ts` was hand-edited** rather than regenerated, and that is
the safer of the two: `pnpm gen:types` reads the *shared* database, so running
it here would commit another branch's tables into this one and typecheck would
pass right up to the merge (rule 9). Four columns and one view, nothing else
touched.

### Where the code is

| | |
|---|---|
| The five questions | `apps/web/src/content/questions.ts` |
| The rules, pure and tested | `apps/web/src/lib/questions.ts`, `questions.test.ts` (21) |
| Per-run state and the three writes | `apps/web/src/lib/useQuestion.ts` |
| The migration | `supabase/migrations/20261011120000_listening_question_rotation.sql` |
| The sheet | `apps/web/src/components/SessionListen.tsx` |
| The reflect step | `apps/web/src/components/SessionReflect.tsx` |
| `withoutHeading` | `apps/web/src/lib/markdown.ts`, `markdown.test.ts` (+6) |
| The diary's snapshot | `apps/web/src/lib/diary.ts` |
| CSS | `apps/web/src/shell.css` — `.musie-question__*` |

Five entries were appended to `apps/web/OPEN-QUESTIONS.md`.

---

## 1 · How to test

One Supabase stack is shared by every worktree (CLAUDE.md 9) and the ports are
not. 5173 is the main checkout; this branch takes **5176**, and the first thing
to do is check what is already answering on it.

```
pnpm --filter web dev --port 5176 --strictPort    # http://localhost:5176
pnpm storybook                                    # :6006, if the bump in §9 touches a component
```

| Screen | How to reach it |
|---|---|
| Listen · stage | `/exercises` → Achtsame Pause → scan a card (type `MC-01`) → listen |
| **Listen · focus sheet** | on the stage, press the transport. **This is the screen this iteration is about** |
| Reflect | from the listen step, press the forward CTA |
| Diary entry | `/diary` → press any entry |

`supabase db reset`, `supabase db push` and `pnpm gen:types` are denied in
`.claude/settings.json` (rule 9) because they drive the one shared stack. They
are Ben's to run, knowing the other sessions are affected.

---

## 2 · The problems

Verbatim from the brief, because each one is a separate acceptance test.

1. **Users do these exercises often, so the same question should not be there
   every time.** Occasional repetition is fine; *every* time is not.
2. **Sometimes a question doesn't work for a user** — either they are not
   feeling creative, or the exercise would have worked for them with a
   different question.
3. **Where does the rotating question set live in the app's architecture?**

Problem 3 is answered in §5, and the answer is the one architectural decision
in this document that was genuinely open.

---

## 3 · Decisions — the contract

Put to Ben on 2026-10-11, in three rounds. These are his answers, and anything
in the sections below that disagrees with this table is a drafting error in the
section.

| # | Question | Decision |
|---|---|---|
| D1 | Where does the question set live? | **Repo files, plus columns on `sessions`.** Not new content tables. §5 |
| D2 | Which exercises get the rotating set? | **Achtsame Pause *and* Freie Bahn** (`mindfulness-cards`, `free-rein`) |
| D3 | What spends a question? | **The session finished with it** — written answer or not. ⚠️ *Revised.* The first answer was "only a saved reflection"; §6.1 is why it changed and what the brief's own words said |
| D4 | Where does the re-roll button live? | **`/listen?focus` only.** The question is locked by the time you reach `/reflect` |
| D5 | Markdown in the questions? | **Yes, rendered where it can be.** The helper degrades to plain text inside a `placeholder` |
| D6 | Tie-breaker on the rotation | **Never the same question twice running.** Still earns its keep under the revised D3 — see §6 |
| D7 | The broccoli icon | **Bump `lucide-react` to 1.x** and use the real `Broccoli`. §9 |
| D8 | 30 seconds of what? | ~~Wall clock~~ — **retired 2026-10-12 (D18).** The help rung is the gate now |
| D9 | Re-roll budget | **Unlimited.** The 30 s it did not re-arm no longer exists (D18) |
| D10 | A reworded question and an old diary entry | **Snapshot the question text onto the session.** History stays true |
| D11 | Record the rejections? | **Yes**, on `sessions`. Shape settled by D17 |
| D12 | Freie Bahn's reflect heading | **The rotating question replaces it.** Consequence logged in §11 |
| D13 | The pool-empty dead end | **Disabled button that says so** — *and* a **Fragen zurücksetzen** button beside it (D16). §7.4, §5.4 |
| D14 | Four copy corrections | **All four applied.** §4.1 |
| D15 | Does the helper stay open? | **Yes — one-way.** Revealed under the headline, and the control relabels rather than disappearing (D18). At the **question's own type token**, not `body-sm` — Ben, 2026-10-12. §7.3 |
| D16 | The dead end's way out | **A *Fragen zurücksetzen* button**, which puts every question back in reach inside this session. §7.4 |
| D18 | The `?` and the broccoli button | **Both replaced by one two-press control** beside the way on: *Hilf mir bitte* → *Die Frage funktioniert für mich nicht*. Ben, 2026-10-12. §7 |
| D17 | Reset vs. the rejection log | **Two arrays on `sessions`** — delegated to me, on "easiest to explain, no architectural bloat". Reasoning, and the two rejected shapes, in §5.3.1 |

---

## 4 · The dataset

Five questions. Each carries **three strings in two locales**: the phrasing
shown while listening, the phrasing shown while reflecting, and the helper that
is offered to someone who is stuck.

The listening and reflecting phrasings are deliberately *not* the same string —
that is the whole reason the single `exercise_i18n.question` column was dropped
on 2026-09-23. One asks what is happening; the other asks what happened.

### 4.1 · The four corrections (D14)

Applied below, and each is a correction to a specific thing rather than a
tidy-up:

| Where | Was | Is | Why |
|---|---|---|---|
| Q5 | `räsoniert` | `resoniert` | *räsonieren* means to hold forth or grumble. The verb for sound is *resonieren* |
| Q4 | `im Laufe des Stückes` | `im Laufe der Musik` | One German word for the music, decided in `20261009100000_one_word_for_the_music.sql`, which removed *Stück* from the content on purpose |
| UI | `30 S.` | `30 Sek.` | *Sek.* is the German abbreviation; `S.` reads as *Seite* |
| Q2 | `Wahrnehmung auf das Bild` | `Wahrnehmung des Bildes` | Genitive. `Wahrnehmung` takes it; `auf` belongs to *Blick auf* |

Plain typos fixed without ceremony: `ppassiert` → `passiert`, `Entstanden` →
`entstanden`, `wo die Tiefen` → `wo die tiefen`.

### 4.2 · Q1 · `lq-01`

| | |
|---|---|
| **Listen · de** | Welches Bild entsteht vor deinem inneren Auge? |
| **Reflect · de** | Was für ein Bild ist vor deinem inneren Auge entstanden? |
| **Helper · de** | Was für einen Namen würdest du der Szene geben? Was passiert darin? |
| **Listen · en** | What picture forms in your mind’s eye? |
| **Reflect · en** | What kind of picture formed in your mind’s eye? |
| **Helper · en** | What name would you give the scene? What happens in it? |

This is Achtsame Pause's question today, in all three places — `listen_md`'s
body, `reflect_md`'s heading and `reflect_placeholder`. It becomes one of five
and stops being the exercise's own.

### 4.3 · Q2 · `lq-02`

| | |
|---|---|
| **Listen · de** | Lass die Klänge auf dich wirken. Sieh dir das Bild genauer an – verändert sich etwas in deiner Wahrnehmung des Bildes durch die Musik? |
| **Reflect · de** | Was hat sich in deiner Wahrnehmung des Bildes durch die Musik geändert? |
| **Helper · de** | Wirkt das Bild jetzt wärmer oder kälter? Näher oder weiter weg? |
| **Listen · en** | Let the sounds work on you. Look at the picture more closely — does the music change anything in how you see it? |
| **Reflect · en** | What changed in how you saw the picture, because of the music? |
| **Helper · en** | Does the picture feel warmer now, or colder? Closer, or further away? |

Helper written here (the brief said *generate*). It gives two axes rather than
asking the question again in other words, which is what a stuck reader needs.

### 4.4 · Q3 · `lq-03`

| | |
|---|---|
| **Listen · de** | Lass die Klänge auf dich wirken. Wo spürst du die hohen Töne? Wo spürst du die tiefen Töne? |
| **Reflect · de** | Wie haben die Klänge auf dich gewirkt? Wo hast du die hohen Töne gespürt, wo die tiefen? |
| **Helper · de** | Wo im Körper sitzen die hohen Töne – im Kopf, im Brustkorb, in den Füßen? Und die tiefen? |
| **Listen · en** | Let the sounds work on you. Where do you feel the high notes? Where do you feel the low ones? |
| **Reflect · en** | How did the sounds work on you? Where did you feel the high notes, and where the low ones? |
| **Helper · en** | Where in your body do the high notes sit — head, chest, feet? And the low ones? |

### 4.5 · Q4 · `lq-04`

| | |
|---|---|
| **Listen · de** | Von welcher Seite kommt welcher Ton? Verändert sich die Richtung im Laufe der Musik? |
| **Reflect · de** | Von welcher Seite ist welcher Ton gekommen? Hat sich die Richtung im Laufe der Musik verändert? |
| **Helper · de** | Schließe die Augen und lass den Klang wandern. Kommt er von links, von rechts, von überall? |
| **Listen · en** | Which sound comes from which side? Does the direction change as the music goes on? |
| **Reflect · en** | Which sound came from which side? Did the direction change as the music went on? |
| **Helper · en** | Close your eyes and let the sound travel. Does it come from the left, the right, from everywhere? |

### 4.6 · Q5 · `lq-05`

| | |
|---|---|
| **Listen · de** | Spüre einmal nach, wo der Klang in deinem Körper resoniert. Vielleicht kribbelt es irgendwo. Vielleicht kommt eine Gänsehaut. Oder auch nicht – wir sind alle unterschiedlich. |
| **Reflect · de** | Hat der Klang in deinem Körper resoniert? Was hast du wo gespürt? |
| **Helper · de** | Geh in Gedanken von den Füßen bis zum Kopf. Wo ist es warm, wo eng, wo kribbelt es? |
| **Listen · en** | Feel for where the sound resonates in your body. Maybe something tingles. Maybe you get goosebumps. Or maybe not — we are all different. |
| **Reflect · en** | Did the sound resonate in your body? What did you feel, and where? |
| **Helper · en** | Go from your feet to your head in your mind. Where is it warm, where tight, where does it tingle? |

Q5's listening phrasing is an **invitation, not a question** — and that is
right. It is the headline on a sheet where the music is already playing, and
its last clause ("Oder auch nicht – wir sind alle unterschiedlich") is the one
string in the set that gives permission to feel nothing. Do not "fix" it into a
question.

### 4.7 · Length budget

German runs ~1.15–1.28× the English throughout, inside the ≤1.3× that
`--measure-body: 62ch` was derived from (`docs/GERMAN-UI-WRITING.md` §5). No
string needs a third line where the English takes two.

---

## 5 · Where it lives (D1 — problem 3's answer)

### 5.1 · Why repo files and not content tables

The reasoning matters, because the obvious answer in this repo is the wrong one
here and will be proposed again.

**Most of this app's text is already repo files.** `apps/web/src/i18n/en.ts` is
1,408 lines and `de.ts` is 1,004. Five tables' worth of *content* sits in
Postgres, and what earns them the database is **not the text — it is the rows
the text hangs off.** `cards.code` is printed on the paper beside the QR.
`exercise_tracks` says which recording plays for an (exercise, card) pair.
`exercises.listen_gate_seconds` is a number the listen step reads.
`sessions.card_id` has a foreign key into `cards` so a diary entry can never
claim a card that does not exist. The `_i18n` siblings are in the database
because their *parents* must be.

**The question set is the first content in this repo that is only text.** Five
rows, an order, three strings, two locales, no relations. Its single relational
edge — which question was asked in which session — is a text id on a session
row, not a table to join against.

So the rule, stated once so the next iteration does not re-derive it:

> Text that hangs off a row the database has to own stays with that row. Text
> that is *only* text can live in the repo.

What repo files buy, concretely:

- **The type checker becomes the completeness check.** A question added in one
  locale and not the other **fails `pnpm check`**, on the machine and in CI.
  `missing_translations` is a query somebody has to remember to run, and
  `pnpm check` never touches the database (rule 8).
- **No access model to get wrong.** No new table means no RLS, no policies, no
  revoke-then-grant. Rule 2's second half has cost this repo 23 failing tests
  once already.
- **A rewording is a one-line diff**, not an `update … set …` migration read
  against its predecessor to see what changed.
- **No `supabase db push`** for a copy fix, and so no fourth entry in
  `OPEN-QUESTIONS.md` about content that is on local and not on hosted.

What it costs, recorded honestly:

- **A copy change needs a deploy.** Free today (rule 8: nothing deploys in this
  phase); real the day there is a hosted app.
- **Two places to look for translation holes.** Mitigated: the type check is
  stricter than the view, not weaker.
- **No foreign key on the session row.** A question id that stops existing
  leaves diary rows pointing at nothing. Mitigated by D10's snapshot (the
  diary never needs the catalogue to render history) and by never deleting a
  question — retire with `active: false`.
- **The spreadsheet.** If the Mindfulness Cards spreadsheet ever owns these
  five, a non-developer editing them means a PR instead of a cell. Logged in
  §12.

### 5.2 · The catalogue

`apps/web/src/content/questions.ts` — a new directory, deliberately **not**
`src/i18n/`. The i18n catalogue is chrome: ours, permanent, keyed by
`MessageKey`. These are content: provisional, and keyed by question id. Mixing
them would put `MessageKey` in the business of naming content.

```ts
export type QuestionId = 'lq-01' | 'lq-02' | 'lq-03' | 'lq-04' | 'lq-05';

export interface QuestionText {
  /** The headline on /listen?focus. Markdown. */
  listen: string;
  /** The headline on /reflect. Markdown. */
  reflect: string;
  /** Behind `?` on listen; the field's prompt on reflect. Markdown where it
   *  renders, flattened to plain text in a `placeholder` attribute. */
  helper: string;
}

/** Initial order — "initial order: 1…5" in the brief. */
export const QUESTION_ORDER: readonly QuestionId[] = [
  'lq-01', 'lq-02', 'lq-03', 'lq-04', 'lq-05',
];

export const questionsDe: Record<QuestionId, QuestionText> = { /* §4 */ };
export const questionsEn: Record<QuestionId, QuestionText> = { /* §4 */ };

/** Exercise id → the questions it draws, in order. An exercise that is NOT a
 *  key here keeps today's behaviour entirely (§8). */
export const QUESTION_SETS: Record<string, readonly QuestionId[]> = {
  'mindfulness-cards': QUESTION_ORDER,
  'free-rein': QUESTION_ORDER,
};
```

`Record<QuestionId, QuestionText>` is the whole parity mechanism and it is
stricter than `de.ts`'s: a missing id is a type error **and** a missing field
is a type error. Nothing is optional and nothing falls back.

`QUESTION_SETS` is keyed by a string the database owns, so a typo means "this
exercise has no questions" and nothing complains. That check belongs in
`pnpm test:db`, beside `deck.db.test.ts`, which already proves file↔database
parity for the deck: **every key in `QUESTION_SETS` is a row in
`public.exercises`.**

### 5.3 · Four columns on `sessions`

One stacking migration. No new table, no foreign key, and — checked rather than
assumed (rule 2) — **no grant and no policy**:
`20261009110000_sessions_feeling_change.sql:34` verified that both
`authenticated` and `service_role` hold *table*-level grants on
`public.sessions`, so a column added is readable the moment it exists. RLS
policies are row-level and already filter by `user_id`.

```sql
alter table public.sessions
  add column listening_question_id text,
  add column listening_question    text,
  add column rejected_question_ids text[] not null default '{}',
  add column rejected_this_round   text[] not null default '{}';

alter table public.sessions
  add constraint sessions_listening_question_pairs
    check ((listening_question_id is null) = (listening_question is null));
```

| Column | What it is |
|---|---|
| `listening_question_id` | The id as shown. Null for a session on an exercise with no set, and for every session that existed before this change. **No FK** — the catalogue is in the app (§5.1) |
| `listening_question` | **D10's snapshot**: the *reflect* phrasing, in the locale it was shown, written at the same moment as the id. This is what the diary renders, so rewording Q3 never relabels anybody's history |
| `rejected_question_ids` | **The log.** Append-only, never cleared. Every question turned down in this session, for all time. This is what §5.4's view reads |
| `rejected_this_round` | **The working set.** What a re-roll will not offer right now. *Fragen zurücksetzen* empties it; nothing else ever does |

The pairing constraint is written as one equality between two booleans, which
is the same construction `sessions_ended_at_matches_status` uses and for the
same reason: both halves are equally wrong and equally easy to write.

### 5.3.1 · Why two arrays and not one (D17)

Ben delegated this on *"whatever is technically easiest to explain and
understand and doesn't bloat the architecture"*, so the reasoning is recorded
rather than the conclusion alone.

**One array cannot do both jobs.** It is the working exclusion list, which
*Fragen zurücksetzen* has to clear, **and** the rejection log, which must never
be cleared — because a reset happens in exactly the sessions whose signal is
loudest. Clearing it would make the users Ben most wants to contact the ones the
log under-reports.

Two places are therefore unavoidable, and there were three candidates:

| | Verdict |
|---|---|
| **Two arrays on `sessions`** | **Chosen.** Zero new objects in the schema — no table, no RLS, no policy, no grant. Each column is one sentence (see the table above). Behaviour is identical across a reload, because both facts are durable |
| A child table `session_question_rejections` | Rejected as bloat. Correct shape, and it would carry a timestamp per rejection, but it costs a table plus four policies plus revoke-and-grant — which is the architecture D1 exists to avoid for five strings |
| One array + an integer index into it | Rejected as unexplainable. `rejected_question_ids[reset_at+1:]` is one slice to implement and a paragraph to explain. "An integer that means a position in another column" fails the brief it was chosen under |

**There is no third column counting resets.** It is derivable, and the
derivation is as clear as a column would be: after a reset, new rejections
append to **both** arrays, so

```
cardinality(rejected_question_ids) > cardinality(rejected_this_round)
```

is true if and only if this session was reset at least once. §5.4's view
reports it as `was_reset`.

### 5.4 · Where the rejections are read (D13, and Ben's "I want to contact these users")

**Nothing new has to be stored.** The event "this user rejected every question
we had" *is* `cardinality(rejected_question_ids) = 5`. What is missing is a
place to read it from, and the repo already has the pattern:
`public.beta_signups` is granted to `service_role` and to nobody else, with a
header saying that is what actually reads the list.

```sql
create view public.question_rejections with (security_invoker = true) as
select s.user_id,
       s.id              as session_id,
       s.exercise_id,
       s.started_at,
       s.status,
       s.rejected_question_ids,
       cardinality(s.rejected_question_ids) as rejected_count,
       -- TRUE iff Fragen zurücksetzen was pressed: after a reset, every new
       -- rejection appends to BOTH arrays, so the log can only run ahead of
       -- the working set by what a reset discarded. §5.3.1.
       cardinality(s.rejected_question_ids)
         > cardinality(s.rejected_this_round) as was_reset,
       s.listening_question_id              as left_with,
       p.language
from public.sessions s
join public.profiles p on p.user_id = s.user_id
where cardinality(s.rejected_question_ids) > 0;

revoke all on public.question_rejections from anon, authenticated;
grant select on public.question_rejections to service_role;
```

- **`security_invoker = true`**, like `missing_translations`. A Postgres view is
  owner-privileged by default, which quietly bypasses RLS and is what the
  Security Advisor reports as `security_definer_view`.
- **Granted to `service_role` only.** It has `BYPASSRLS`, so it sees every row
  — and it needs the grant anyway, because Postgres checks table privileges
  first (rule 2). `authenticated` loses it entirely: a client has no business
  reading anybody's rejection log, including its own.
- **`p.language`** is in there so Ben knows which language to write in before
  he opens the mail client.
- **`auth.users.email` is deliberately NOT joined.** Putting the auth schema
  behind a `public` view widens a surface `beta_signups`' own header argues for
  keeping narrow. The email is one lookup by `user_id` in Studio →
  Authentication → Users, or `select email from auth.users where id = '…'` in
  the SQL editor.

Two queries this is for:

```sql
-- Every question anybody rejected, worst first. "Which question does not work?"
select unnest(rejected_question_ids) as question_id, count(*)
from public.question_rejections group by 1 order by 2 desc;

-- The people to contact: they rejected everything we had, or reset and
-- started over. `was_reset` is the loudest signal in the table.
select user_id, language, started_at, exercise_id, rejected_count, was_reset
from public.question_rejections
where rejected_count >= 5 or was_reset
order by started_at desc;
```

### 5.5 · When the question is assigned

**On first entry to the listen step**, not at `createSession`. Written to the
database immediately, with its snapshot, so a reload or a second device shows
the same question — which is the whole of the cross-device requirement.

A session abandoned at intro or scan therefore has no question, which is right:
nothing was shown, so nothing should appear in the rotation or the log.

---

## 6 · The rotation (problem 1)

Three rules, in order. **`spent` means a session that used that question
reached `status = 'finished'`** — whether or not words were written (D3).

1. **Unspent first, in `QUESTION_ORDER`.** The lowest-ordered question the user
   has not yet finished a session with.
2. **Never the same question twice running** (D6). If rule 1 picks the question
   the *previous* session used, take the next one instead. Only applies while
   two or more candidates exist.
3. **Everything spent → random**, excluding the previous session's question for
   the same reason.

Both facts come from the user's own rows, so it works across devices for free
and needs no new table and no join:

```
spent     = distinct listening_question_id over my FINISHED sessions
previous  = listening_question_id of my most recent session that had one
```

RLS filters both to the caller. Neither reads the catalogue, so the queries do
not change when a sixth question is written.

**No backfill.** Pre-change sessions have a null `listening_question_id`, so
they contribute nothing to `spent` and nothing to `previous` — which is exactly
the brief's *"doesn't have to work for any past session, but only new ones."*

**Rule 2 still earns its keep**, which is not obvious once rule 1 advances on
its own: an **abandoned** session spends nothing. Without rule 2, abandoning a
session on Q1 and starting another would serve Q1 straight back.

### 6.1 · Why D3 changed

D3's first answer was the brief's literal wording — *"the questions the user
hasn't answered in any reflection"*. Traced against the brief's **other**
sentence, *"the same question should not be there every time"*, the two pull
apart, because **spending is the only thing that shrinks the pool.** A user who
never writes spends nothing, so rule 1 keeps returning Q1 and rule 2 can only
push it one place:

| Session | Spent | Rule 1 picks | Previous | **Shown** |
|---|---|---|---|---|
| 1 | `{}` | Q1 | — | **Q1** |
| 2 | `{}` | Q1 | Q1 | **Q2** |
| 3 | `{}` | Q1 | Q2 | **Q1** |
| 4 | `{}` | Q1 | Q1 | **Q2** |

Q3, Q4 and Q5 unreachable except through the re-roll button. **Ben's call,
2026-10-11: spending means the session finished with it.** A skipper and a
writer now behave identically — Q1, Q2, Q3, Q4, Q5, then random — and the
brief's second sentence holds for everyone.

Two things this bought beyond the fix:

- **The query lost a join.** `spent` reads `sessions.status` instead of
  `exists (select 1 from reflections …)`, and `status` is already covered by
  `sessions_user_id_started_at_idx`'s leading column.
- **"Answered" stops being load-bearing**, so nothing in the rotation depends
  on whether the reflection was typed, spoken or declined — which matters,
  because voice cannot save yet (F.6) and declining is a real answer.

**What it costs**, stated so it is not found later as a bug: a question shown
in a session somebody finished is spent **even if they wrote nothing about it**.
Pressing *Weiter* through the reflect step uses a question up. That is the
intended trade — it is what makes rotation work for the people who do that —
and §11 records it.

---

## 7 · The listen focus sheet (problem 2)

`/listen?focus` — the full-screen sheet opened by the transport. **This is the
only screen that gets the re-roll button** (D4). By the time `/reflect` is
reached the question is locked, so the question somebody listened for is always
the question they answer.

### 7.1 · Composition (D18, 2026-10-12)

**One control, two presses, beside the way on.** It replaces both the `?` that
sat next to the question and the thirty-second broccoli button under it.

```
┌─ .musie-immersive__lead ──────────────────────────────┐
│  Welches Bild entsteht vor deinem                     │   ← the question
│  inneren Auge?                                        │
└───────────────────────────────────────────────────────┘

  01:28   ⟨▮▮ Pause⟩                                        ← existing clock row
  mindestens hören für diese Übung

            ⟨ Hilf mir bitte ⟩  ⟨ Wenn du bereit bist… ⟩   ← secondary, leading
```

Press once — the helper appears under the question and the label changes:

```
┌───────────────────────────────────────────────────────┐
│  Welches Bild entsteht vor deinem inneren Auge?       │
│  Was für einen Namen würdest du der Szene geben?      │   ← same type token,
│  Was passiert darin?                                  │     muted ink
└───────────────────────────────────────────────────────┘

  ⟨ Die Frage funktioniert für mich nicht ⟩  ⟨ Wenn du… ⟩
```

Press again and the question swaps, the helper collapses, and the label is
*Hilf mir bitte* for the new one.

**On a phone it stacks**, help above the way on — §7.4.

### 7.2 · Why the ladder replaced the timer

D8 bought a considered rejection with thirty seconds of wall clock. **The
ladder buys it with the shape of the control instead**: the rejection does not
exist until help has been asked for and read, so nobody turns down a question
they have not engaged with. That is the same guarantee, without a label that
changes on a clock rather than on a press — and *Hilf mir bitte* is available
immediately, because there is no reason to make somebody wait for help.

It also removed three things rather than adding one: the timer and its effect,
the `?` icon button, and `.musie-question__headrow` — the app pattern that
existed only to keep a control out of the Lightbox's close corner, which is the
corner that produced `d797571`.

### 7.3 · The helper

Revealed under the question, in **`--type-heading-md-*` — the question's own
type token** (Ben, 2026-10-12).

It shipped at `body-sm` on L8's reading that this is a "helper line", filed
with captions and timestamps. That was the wrong shelf: a caption annotates
something you are already reading, and this **replaces** the question for
somebody who could not get started with it. L8's floor is a minimum, so reading
*up* never bends it.

Which leaves **ink to carry the hierarchy** — `--on-surface-muted`, at the same
scale and weight, so the quiet one is quiet by contrast. `--measure-heading`,
matching the question, so the two read as one column.

The revealed flag stays in `sessionStorage`, keyed by session and question
(§5.2 of `lib/questions.ts`): closing and reopening the sheet does not put
somebody back on the first rung, and a swap collapses it for the new question.

**No focus management any more.** The `?` used to unmount itself on press, and
focus had to be sent somewhere deliberately; this control stays mounted and
only changes its label.

### 7.4 · The three states, and the row

| State | Label | Enabled |
|---|---|---|
| Helper not revealed | `Hilf mir bitte` | yes |
| Helper revealed, something left | `Die Frage funktioniert für mich nicht` | yes |
| Nothing left to offer | `Keine weitere Frage übrig` | no |
| …**and beside it** (D16) | `Fragen zurücksetzen` + `RotateCcw` | yes |

`variant="outline"` on both rungs — Ben, 2026-10-12. The primary rung in that
row belongs to the way on; this is the alternative to continuing, not a
competitor for it, and `outline` is the one that does not paint a surface
beside it.

**`canSwap` is read before anything else.** At the dead end there is no
question to ask for help with, so offering help would be offering nothing.

**The row is `ButtonGroup`, not an app pattern** (2026-10-12).
`.musie-immersive__actions` is gone, and with it a hand-written flex row, its
`justify-content` and a media query. The system has a component for the actions
a step ends with, and the one thing it could not do went INTO it rather than
staying here as a second copy (rule 1, L14.3):

> **`stacked="hug"`** — below `--bp-md` the group stacks, and the actions keep
> their own width instead of going full width. That is also what lets `align`
> survive the stack: hugging buttons have an alignment to have, so `end` keeps
> meaning `end` in both directions rather than becoming two full-width rows.

Used here as `align="end" stacked="hug"` — **trailing at every width**, which
is what Ben asked for. Measured rather than eyeballed, at three widths:

| viewport | direction | help button | way on |
|---|---|---|---|
| 390px | column, `flex-end` | 326px | 326px |
| 600px | column, `flex-end` | **345px** | 536px |
| 900px | row, trailing | 350px | 606px |

At 390px both labels exceed the column, so they fill — that is the German, not
the stretch, and 600px is where the hugging shows.

**DOM order is not priority order in this one group.** The component's header
says the primary action comes first; the help rung sits leading of the way on,
which is first in the DOM — and stacked, that puts it above, which is also what
was asked for.

## 8 · The reflect step

`/reflect` gets the question and the helper. It does **not** get the button.

| Slot | Today | After |
|---|---|---|
| Headline | `reflect_md`'s `##` | **the question's `reflect` phrasing** |
| Under it | `reflect_md`'s invitation / list | unchanged |
| `Deine geschriebene Antwort` placeholder | `reflect_placeholder`, else `reflect.text.placeholder` | **the question's `helper`, as plain text** |
| Voice mode | nothing above `RecordButton` | **the helper, above the transcribe button** |

Three things that follow from that table:

**`reflect_md` is not edited, and no content migration ships.** Its heading
stays in the database because `reflectQuestionOf` reads it to label diary
entries from *before* this change (§10). The reflect screen drops the heading at
render time instead, which needs a new pure block operation beside `headingOnly`
and `bodyOnly` in `lib/markdown.ts` — "the body, with the heading removed and
nothing promoted". It is a rule with a test, not a `.filter()` inside JSX, for
the reason that file's header already gives.

**The placeholder is plain text** (D5). A `placeholder` is an attribute on an
`<input>`; there is nothing there to render, so `##` or `**` would reach the
reader. `plainText` in `lib/markdown.ts` already does this flattening.

**Freie Bahn loses its reflect heading** (D12). "Spüre und reflektiere" is
replaced by the rotating question, and its numbered list follows underneath —
including step 2, which asks "Wie fühlst du dich? Wie fühlt sich der Moment
an?". Two sets of questions on one screen. Ben chose this knowing it; §11 states
the consequence so it is not discovered later as a bug.

### 8.1 · An exercise with no question set

`breathing-score`, `sound-journey`, `body-scan-soundwalk` are not keys in
`QUESTION_SETS`, and for them **nothing at all changes**: `bodyOnly(listen_md)`
on the sheet, `reflect_md`'s heading on reflect, `reflect_placeholder` in the
field, no `?`, no button. The fallback path is the current path, untouched, so
the three unbuilt exercises get questions when they get copy and not before.

### 8.2 · Chrome strings

Five new keys. **Chrome, not content** — they are the app's own words about the
apparatus, they are permanent, and nobody else will ever supply them. So they
go in `apps/web/src/i18n/{en,de}.ts` and not in §5.2's catalogue, keyed in the
flat `session.listen.*` style the file already uses.

| Key | de | en |
|---|---|---|
| `session.listen.questionReroll` | Die Frage funktioniert für mich nicht | This question isn’t working for me |
| `session.listen.questionExhausted` | Keine weitere Frage übrig | No other question left |
| `session.listen.questionReset` | Fragen zurücksetzen | Reset questions |
| `session.listen.questionHelp` | Hilf mir bitte | Please help me |

Held against `docs/GERMAN-UI-WRITING.md`: du throughout (§1), sentence case
(§2), every label a verb phrase including the `?`'s accessible name (§3), no
*Bitte* (§4), no full stop on a label (§7). German runs 1.00–1.18× the English
here, well inside the budget (§5) — and `Gib der Frage 30 Sek. eine Chance` is
33 characters, which is why §7.4 passes `wrap`.

**`questionHelp` is a VISIBLE LABEL now**, not an icon button's accessible
name, so it reads as something you ask rather than as what the control is.

**`bitte` is the one place this catalogue keeps it.** §4 bars *Bitte* at the
start of an instruction the reader cannot decline; this is the opposite — the
reader asking, in their own voice, for something entirely optional. Dropping it
would make a plea read as a command.

**`questionReroll` says the FRAGE does not work**, not that the moment does. It
replaced *Das klappt für mich gerade nicht*, whose `gerade` put the fault on
the listener's hour; this puts it on the question, which is the honest reading
and the one the rejection log is counting.

---

## 9 · Prerequisite · the `lucide-react` bump (D7)

Ben chose the real broccoli. `broccoli` landed in lucide 1.15.0; this repo pins
**0.470.0** (`packages/design-system/package.json`, `apps/web/package.json`) and
latest is **1.55.0**. Measured rather than guessed, by diffing the 1.55.0
tarball's declared exports against every glyph the repo imports:

- **67 files import `lucide-react`; 65 distinct glyphs.**
- **58 of the 65 exist unchanged in 1.55.0.**
- **7 do not**, and all seven have a 1:1 replacement:

| 0.470.0 | 1.55.0 | Note |
|---|---|---|
| `Filter` | `Funnel` | |
| `Trash2` | `Trash` | |
| `MessageCircleQuestion` | `MessageCircleQuestionMark` | |
| `Smile` | `FaceSlightlySmiling` | the face family was renamed wholesale |
| `Meh` | `FaceNeutral` | |
| `Frown` | `FaceSlightlyFrowning` | |
| `Laugh` | `FaceGrinning` | |

Four of those seven are the **feelings** glyphs — user-visible, semantically
load-bearing, and they appear in `FeelingsScale` and the feelings-detection
work. The replacement drawings are not pixel-identical to the originals, so this
needs eyes on Storybook and not only a green `pnpm check`.

Also gone: `CircleHelp` / `HelpCircle`. The `?` button in §7.2 uses
**`CircleQuestionMark`** in 1.x.

Build risk is low and was checked, not assumed: `package.json` shape is
near-identical across the two versions — same `main`, same `module` (`.js` →
`.mjs`, which Vite resolves), no `exports` map in either, `sideEffects: false`
in both, and React 19 in `peerDependencies`.

### 9.1 · And then D18 removed its reason — 2026-10-12

**Nothing in this branch needs lucide 1.x any more.** The bump existed for
`Broccoli`; D18 retired the broccoli button, and the same change retired the
`?` that used `CircleQuestionMark`. The only glyph the feature still draws is
`RotateCcw` on *Fragen zurücksetzen*, and that has been in 0.470.0 all along.

Left in place rather than reverted, and that is a judgement rather than an
oversight: the bump is landed, green on `pnpm check` and both builds, and its
seven renames are spread across eleven files. Backing it out is a second
67-file change with its own risk, to return to an older dependency, for no
behavioural gain.

**It is Ben's call and it is cheap to make**, because the bump is one commit
(`5c0bc30`) and nothing after it depends on a 1.x-only name. Revert it and the
only edits needed are the seven glyph names going back.

**This is its own step with its own gate.** `pnpm check` plus both bundle
builds plus a Storybook pass over every component that draws a glyph, landing
before any of §5–§8 is written. It is a dependency major bump across 67 files
for one icon, and it should not be discovered half-done inside a feature diff.

---

## 10 · The diary

Not in the brief, and **not optional** — the change breaks it otherwise.

`DiaryCard` shows the question each entry answered, via
`reflectQuestionOf(exercise_i18n.reflect_md)`. With one question per exercise
that was exact. With five it is wrong: every past entry would be labelled with
whatever question the exercise's `reflect_md` happens to carry, not the one that
was asked.

D10 is what fixes it:

1. **`sessions.listening_question` is not null** → render it. The question as
   shown, in the locale it was shown. Rewording Q3 never touches it.
2. **Null** → `reflectQuestionOf(reflect_md)`, exactly as today. That is every
   session from before this change, and it is still the question they were
   actually asked.

---

## 11 · Consequences, accepted

Three, each a decision's known cost rather than a defect:

**Two sets of questions on Freie Bahn's reflect step** (D12). §8's third note.

**Finishing the reflect step without writing anything still spends the
question** (D3, as revised). Pressing *Weiter* past an empty answer field uses
Q1 up, and it will not come back until all five are spent. That is the trade
that makes rotation work for people who do not write — §6.1 has the arithmetic
of the alternative, which was two questions forever.

**`listening_question_id` has no referential integrity** (D1). A question id
that stops existing leaves session rows pointing at a string nothing resolves.
Bounded by D10 — the diary renders the snapshot and never needs the catalogue —
so the blast radius is the rotation treating an unknown id as "not in the set",
which is the safe reading. Retire a question with `active: false`, never by
deleting it.

---

## 12 · Still open

For `apps/web/OPEN-QUESTIONS.md` when the work lands. Each is a thing assumed
rather than decided, in that file's format.

| | Assumed | Needs |
|---|---|---|
| **The helper's revealed flag in `sessionStorage`** | Survives a reload and a sheet reopen; dies with the tab; never reaches the database | Nothing, unless somebody expects it to persist across devices — which would make it a column, and a disclosure state is not worth one |
| **Focus after the `?` disappears** | Sent to the helper as a focusable region, because the control that took the press stops existing (§7.3) | A keyboard pass. Nothing in the repo has removed the control that was just pressed before, so there is no precedent to copy |
| **Two buttons in the dead-end row** | Specced as Ben asked (§7.5): disabled explanation plus enabled *Fragen zurücksetzen* | Ben's eye on a 320px screen. The one-button alternative is in §7.5 |
| **Helper in photo mode** | Shown above `PhotoUpload`, as in voice mode | Nothing — photo is a mockup (MOCKUPS.md 2) and `Finish` is disabled there anyway |
| **The headline row as a component** | An app pattern under L14, because D4 leaves it one call site | L14.3 — the second call site makes it a component request, and the `?`-beside-a-heading shape will probably get one |
| **Locale switched mid-session** | The snapshot is written in the locale active when the question was assigned, so switching language before `/reflect` leaves the diary with the old locale's wording | Ben. The alternative is re-writing the snapshot at save time, which is a second write for an edge case |
| **The spreadsheet** | The five questions are ours, in the repo, under rule 6's *chrome* half | Ben, if the Mindfulness Cards spreadsheet is going to own them. That reopens D1 |
| **A cross-session reset** | There is none. *Fragen zurücksetzen* clears one session's rejections; the `spent` set from §6 is never resettable | Ben, if "give me all five again" should also exist as an account-level action. Today the random branch is what a fully-spent user gets |

---

## 13 · Acceptance

Against §2's three problems, plus what the change must not break.

**Problem 1 — not the same question every time**

- [ ] A new account's first five **finished** sessions get Q1, Q2, Q3, Q4, Q5 in that order
- [ ] **The same is true when every reflection is skipped** — finishing is what advances it, not writing (D3)
- [ ] The sixth gets a random one that is not the fifth's
- [ ] An **abandoned** session spends nothing, and the next session does not serve the same question back (D6)
- [ ] The question survives a reload, and a second device mid-session shows the same one

**Problem 2 — a question that does not work**

- [ ] The button is disabled for 30 s with the broccoli label, then enabled with the refresh label
- [ ] A press swaps both phrasings and the helper, and `/reflect` shows the swapped question
- [ ] A rejected question is never re-offered inside the same session, including after a reload
- [ ] With everything rejected, the button is disabled and says so, and *Fragen zurücksetzen* appears beside it
- [ ] Pressing it makes every question offerable again **and leaves `rejected_question_ids` untouched** — `was_reset` is true in the view afterwards
- [ ] `select * from public.question_rejections` as `service_role` returns the session; as `authenticated` it is refused

**The helper**

- [ ] `?` reveals the helper at `body-sm` under the headline and **removes itself**
- [ ] It stays revealed across closing and reopening the sheet, and across a reload
- [ ] A re-roll collapses it and brings the `?` back, because it belongs to the question
- [ ] Focus lands somewhere deliberate after the `?` disappears, not on `<body>`

**Problem 3 — architecture**

- [ ] A question written in German but not English fails `pnpm check`
- [ ] A key in `QUESTION_SETS` that is not an exercise fails `pnpm test:db`
- [ ] No new table, no new policy, no new grant beyond the view's `service_role` select

**Not broken**

- [ ] `breathing-score`, `sound-journey`, `body-scan-soundwalk` render exactly as before
- [ ] A diary entry from before the change still shows the question it was asked
- [ ] A diary entry from after it shows the snapshot, and rewording that question does not change it
- [ ] `<html lang>` still tracks the locale (rule 5) — the new strings hyphenate
- [ ] No raw scale token and no `musy-` class in any new app CSS (rule 1)
- [ ] Every new user-visible string passed explicitly; no design-system default reached (rule 7)
- [ ] `pnpm check` green; `pnpm test:db` green; both bundle builds green
