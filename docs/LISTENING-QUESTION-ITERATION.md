# Listening question iteration — PRD

Branch `listening-question-iteration`, worktree
`../musie.worktrees/listening-question-iteration`, cut from `origin/main` at
`19276fa`. Source of scope: Ben's brief of 2026-10-11, plus the eleven
decisions he took while this document was being written (§3 — they are the
contract, not a summary of it).

**This is the PRD. The implementation plan is the next document and is not in
here.** What follows says what the product does, where the data lives and why,
and carries every string that has to ship. It does not sequence the work.

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

Eleven questions were put to Ben on 2026-10-11. These are his answers, and
anything in the sections below that disagrees with this table is a drafting
error in the section.

| # | Question | Decision |
|---|---|---|
| D1 | Where does the question set live? | **Repo files, plus columns on `sessions`.** Not new content tables. §5 |
| D2 | Which exercises get the rotating set? | **Achtsame Pause *and* Freie Bahn** (`mindfulness-cards`, `free-rein`) |
| D3 | What spends a question? | **Only a saved reflection.** A question shown but not written about stays in the pool |
| D4 | Where does the re-roll button live? | **`/listen?focus` only.** The question is locked by the time you reach `/reflect` |
| D5 | Markdown in the questions? | **Yes, rendered where it can be.** The helper degrades to plain text inside a `placeholder` |
| D6 | Tie-breaker on the rotation | **Never the same question twice running** |
| D7 | The broccoli icon | **Bump `lucide-react` to 1.x** and use the real `Broccoli`. §9 |
| D8 | 30 seconds of what? | **Wall clock**, from when the question appears on the sheet |
| D9 | Re-roll budget | **Unlimited, and the 30 s does not re-arm** |
| D10 | A reworded question and an old diary entry | **Snapshot the question text onto the session.** History stays true |
| D11 | Record the rejections? | **Yes — `rejected_question_ids text[]` on `sessions`** |
| D12 | Freie Bahn's reflect heading | **The rotating question replaces it.** Consequence logged in §11 |
| D13 | The pool-empty dead end | **Disabled button that says so**, and the event is logged. §7.4, §5.4 |
| D14 | Four copy corrections | **All four applied.** §4.1 |

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

### 5.3 · Three columns on `sessions`

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
  add column rejected_question_ids text[] not null default '{}';

alter table public.sessions
  add constraint sessions_listening_question_pairs
    check ((listening_question_id is null) = (listening_question is null));
```

| Column | What it is |
|---|---|
| `listening_question_id` | The id as shown. Null for a session on an exercise with no set, and for every session that existed before this change. **No FK** — the catalogue is in the app (§5.1) |
| `listening_question` | **D10's snapshot**: the *reflect* phrasing, in the locale it was shown, written at the same moment as the id. This is what the diary renders, so rewording Q3 never relabels anybody's history |
| `rejected_question_ids` | **D11.** Appended on each re-roll. Needed anyway so a mid-session reload does not re-offer the question just rejected, and it is the only place the product learns which questions do not work |

The pairing constraint is written as one equality between two booleans, which
is the same construction `sessions_ended_at_matches_status` uses and for the
same reason: both halves are equally wrong and equally easy to write.

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

-- The people to contact: they rejected everything we had.
select user_id, language, started_at, exercise_id
from public.question_rejections where rejected_count >= 5 order by started_at desc;
```

### 5.5 · When the question is assigned

**On first entry to the listen step**, not at `createSession`. Written to the
database immediately, with its snapshot, so a reload or a second device shows
the same question — which is the whole of the cross-device requirement.

A session abandoned at intro or scan therefore has no question, which is right:
nothing was shown, so nothing should appear in the rotation or the log.

---

## 6 · The rotation (problem 1)

Three rules, in order. `answered` means **a `reflections` row exists for a
session that used that question** (D3).

1. **Unspent first, in `QUESTION_ORDER`.** The lowest-ordered question with no
   saved reflection behind it.
2. **Never the same question twice running** (D6). If rule 1 picks the question
   the user's *previous* session used, take the next one instead. Only applies
   while two or more candidates exist.
3. **Everything spent → random**, excluding the previous session's question for
   the same reason.

Both facts come from the user's own rows, so it works across devices for free
and needs no new table:

```
answered  = distinct listening_question_id over my sessions that have a reflection
previous  = listening_question_id of my most recent session that had one
```

RLS filters both to the caller. Neither reads the catalogue, so the queries do
not change when a sixth question is written.

**No backfill.** Pre-change sessions have a null `listening_question_id`, so
they contribute nothing to `answered` and nothing to `previous` — which is
exactly the brief's *"doesn't have to work for any past session, but only new
ones."*

### 6.1 · The consequence of D3, stated plainly

Ben chose the literal reading: a question is spent **only** when a reflection
was saved. So a user who always skips the writing never spends anything, and
rule 1 would hand them Q1 every single session. **Rule 2 is what stops that**
— they cycle Q1 → Q2 → Q1 → Q2 instead of Q1 forever, which satisfies problem
1's "not every time" without touching D3.

It does mean a persistent skipper sees two questions rather than five. If that
turns out to be the common case, the lever is D3, not rule 2 — logged in §12.

---

## 7 · The listen focus sheet (problem 2)

`/listen?focus` — the full-screen sheet opened by the transport. **This is the
only screen that gets the re-roll button** (D4). By the time `/reflect` is
reached the question is locked, so the question somebody listened for is always
the question they answer.

### 7.1 · Composition

Top to bottom, inside `.musie-immersive`:

```
┌─ .musie-immersive__lead ──────────────────────────────┐
│  Welches Bild entsteht vor deinem         ⟨ ? ⟩       │   ← headline row
│  inneren Auge?                                        │
│                                                       │
│  Was für einen Namen würdest du der Szene geben?      │   ← helper, when revealed
│  Was passiert darin?                                  │
└───────────────────────────────────────────────────────┘
          ↕  --space-inset-card
   ⟨ 🥦 Gib der Frage 30 Sek. eine Chance ⟩                 ← S, ghost, disabled
          ↕
  00:42   ⟨▶⟩                                               ← existing clock row
  mindestens hören für diese Übung
                                   ⟨ Weiter ⟩               ← existing way on
```

After 30 seconds of wall clock (D8), that one button becomes:

```
   ⟨ ⟳ Das klappt für mich gerade nicht ⟩                    ← S, ghost, enabled
```

It is **one control in two states**, not two controls. Label, icon and
`disabled` change together; nothing moves.

### 7.2 · The headline row

The question, with a `?` icon button beside it. The question is already an
`<h2>` on this sheet — `bodyOnly` in `lib/markdown.ts` promotes `listen_md`'s
first paragraph to a heading precisely so the sheet leads with the question.
What changes is only **where the string comes from**.

A heading with a control beside it is a shape the system has once, as
`ContentBox`'s `musy-box__headrow`, and only for dismissal. This sheet is not a
ContentBox. Under `10-layout.md` L14 that makes it a permitted app pattern —
`musie-`-prefixed, every declaration resolving to a Layer 1 token — and under
**L14.3 a second call site makes it a component request**. There is only one
call site (D4 keeps it off `/reflect`), so it stays an app pattern for now, and
§12 logs it so the request exists when a second one appears.

The `?` is an `IconButton`, `size="min"`, `variant="ghost"`, with both toggle
labels passed explicitly (rule 7 — `IconButton` has no catalogue default for
this and an unnamed icon-only control is a 4.1.2 failure).

### 7.3 · The helper

Revealed by the `?`, **between the headline row and the button** — collapsed
when the sheet opens, and not remembered (§12 logs that as an assumption).

Markdown (D5), rendered through the existing `Markdown` component.

### 7.4 · The button, in three states

| State | Label | Icon | Enabled |
|---|---|---|---|
| Before 30 s | `Gib der Frage 30 Sek. eine Chance` | `Broccoli` | no |
| After 30 s | `Das klappt für mich gerade nicht` | `RefreshCw` | **yes** |
| Nothing left to offer | `Keine weitere Frage übrig` | `RefreshCw` | no |

`CtaButton`, `variant="ghost"`, **`size="min"`** — the system's sizes are
`min | primary | comfort | guided` and `min` is the S rung. `wrap` is on:
*"Gib der Frage 30 Sek. eine Chance"* is 33 characters on a 320px screen.

- **The 30 seconds is wall clock** (D8), from when the question appears on the
  sheet. It does not pause with the music and it does not re-arm (D9).
- **Unlimited re-rolls, no re-arm** (D9). Once the first 30 s is past the
  button stays enabled until the pool is empty.
- **A re-roll rewrites `listening_question_id` and its snapshot, and appends
  the rejected id to `rejected_question_ids`** — one write, so a reload never
  re-offers what was just rejected.
- **Within a session, a re-roll never re-offers a rejected question.** The
  candidate pool is the exercise's set minus `rejected_question_ids`, ordered
  by §6's rules.
- **Third state** when that pool is empty (D13). The user keeps the last
  question they rejected, the button says there is nothing else, and
  `question_rejections` has the row that says it happened (§5.4).

---

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

**A persistent skipper sees two questions, not five** (D3 + D6). §6.1.

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
| **Helper disclosure state** | Collapsed each time the sheet opens; toggled by `?`; not remembered across opens or sessions | Ben, if it should persist. Nothing in the brief says |
| **Helper in photo mode** | Shown above `PhotoUpload`, as in voice mode | Nothing — photo is a mockup (MOCKUPS.md 2) and `Finish` is disabled there anyway |
| **The headline row as a component** | An app pattern under L14, because D4 leaves it one call site | L14.3 — the second call site makes it a component request, and the `?`-beside-a-heading shape will probably get one |
| **Locale switched mid-session** | The snapshot is written in the locale active when the question was assigned, so switching language before `/reflect` leaves the diary with the old locale's wording | Ben. The alternative is re-writing the snapshot at save time, which is a second write for an edge case |
| **The spreadsheet** | The five questions are ours, in the repo, under rule 6's *chrome* half | Ben, if the Mindfulness Cards spreadsheet is going to own them. That reopens D1 |
| **D3's threshold** | A question is spent only by a saved reflection | Measurement. If most sessions skip the writing, §6.1's two-question cycle is the real behaviour and D3 is the lever |

---

## 13 · Acceptance

Against §2's three problems, plus what the change must not break.

**Problem 1 — not the same question every time**

- [ ] A new account's first five sessions, each with a saved reflection, get Q1, Q2, Q3, Q4, Q5 in that order
- [ ] The sixth gets a random one that is not the fifth's
- [ ] An account that saves *no* reflections alternates between two questions rather than repeating one
- [ ] The question survives a reload, and a second device mid-session shows the same one

**Problem 2 — a question that does not work**

- [ ] The button is disabled for 30 s with the broccoli label, then enabled with the refresh label
- [ ] A press swaps both phrasings and the helper, and `/reflect` shows the swapped question
- [ ] A rejected question is never re-offered inside the same session, including after a reload
- [ ] With everything rejected, the button is disabled and says so
- [ ] `select * from public.question_rejections` as `service_role` returns the session; as `authenticated` it is refused

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
