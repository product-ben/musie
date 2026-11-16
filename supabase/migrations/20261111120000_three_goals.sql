-- ═══════════════════════════════════════════════════════════════════════════
-- THREE GOALS, AND EACH ONE IS A VERB — Ben, 2026-11-11
--
-- /exercises' headline stops counting and starts inviting: *Lass uns zusammen
-- {goal}* / *Let's {goal} together*. The count goes, the goal stepping goes,
-- and the goal itself becomes the one control in the sentence
-- (docs/plans/exercises-ready-to-build.md, D5).
--
-- That sentence decides what a goal's `purpose` has to be. It was a phrase
-- for after *zum* — *zum Entspannen*, a nominalised infinitive with a capital
-- — and it is now the verb phrase that ends *Lass uns zusammen …*: lower case
-- where German is lower case, nouns capitalised where German capitalises
-- them. So all three purposes are rewritten, and the labels in the sheet
-- *Was brauchst du gerade?* follow them (A6), so that the card you choose and
-- the sentence that reports the choice say the same words.
--
--   relax        entspannen         relax
--   wake-up      Energie sammeln    recharge
--   mindfulness  Achtsamkeit üben   practise mindfulness   (British, as en.ts)
--
-- ── THE DEFAULT IS *entspannen*, AND THAT IS A `sort` ─────────────────────
-- `defaultGoal()` in apps/web/src/lib/goals.ts takes the FIRST goal by
-- `sort` rather than naming an id — "the default" and "the first card in the
-- sheet" are one fact. So making relax the default is `sort = 1` and no code
-- change, exactly as `20261015140000` §2 says it should be.
--
-- ═══ `get-to-know-musie` IS RETIRED, NOT DELETED ═══════════════════════════
-- *Musie kennenlernen* goes from the offer. The row stays.
--
-- ── WHY NOT A DELETE ──────────────────────────────────────────────────────
-- `sessions.goal_id` references `goals (id) on delete set null`, and since
-- 2026-10-15 the app has written a real goal id on every session it starts.
-- *Musie kennenlernen* was the default for all of that time, so it is the
-- goal most likely to be on them. A delete would therefore SUCCEED and
-- quietly null the goal on every one of those diary entries: the history
-- rewritten by a content change, with no error and nothing to undo it from.
--
-- (The plan's A4 says the column is NOT NULL since 2026-10-15, so the delete
-- would fail. It is not: `20261015140000` made it never null BY BEHAVIOUR —
-- the app always passes an id — not by constraint, and `database.types.ts`
-- still types it `string | null`. The conclusion is the same and it is the
-- quieter of the two failures that rules the delete out.)
--
-- ── SO A FLAG, AND THE READ PATH FILTERS IT IN THE SAME CHANGE ────────────
-- `goals.retired boolean not null default false`. `getGoals()` in
-- apps/web/src/lib/content.ts asks for `retired = false`, in this same change
-- — not later. `20261014150000_a_card_cannot_be_retired_yet.sql` is the
-- precedent for why that matters: `cards.archived_at` shipped with a promise
-- that the deck query would filter it, the filter was never written, and a
-- retired card would have gone on being dealt. A flag nothing reads is a
-- comment with a column type.
--
-- A boolean and not an `archived_at timestamptz` like the maintenance tables:
-- goals are migration-governed (`20261015140000`, "why this is a migration"),
-- so the WHEN of a retirement is this file's timestamp and its WHY is this
-- header. A timestamp column would be a second copy of both.
--
-- A browser that remembered *Musie kennenlernen* in `musie-goal` opens on the
-- default and needs nothing: `readCachedGoal()` validates the stored id
-- against the goals `getGoals()` returns, and a retired one is not among
-- them. The same path a stored `__none__` took on 2026-10-15.
--
-- ── ITS THREE EXERCISES STAY REACHABLE ────────────────────────────────────
-- Its `exercise_goals` rows go, so no exercise is filed under a goal nobody
-- can choose. All three it served are mapped elsewhere, read off the two
-- migrations that write this table (`20261015140000` §4, `20261109100000`):
--
--   breathing-score       relax · wake-up
--   body-scan-soundwalk   relax
--   free-rein             wake-up · mindfulness
--
-- So after this file: relax 6 (Klangreise, Bodyscan, Achtsam Atmen, Kalimba,
-- Marimba, Harfe), wake-up 3, mindfulness 3. `db.content.db.test.ts` asserts
-- that every exercise is still under at least one goal that is offered.
--
-- ── ITS WORDS STAY TOO ────────────────────────────────────────────────────
-- Its `goal_i18n` rows are untouched: both locales, a `purpose`, no `why`.
-- A diary entry that names it can still be given a name, and
-- `public.missing_translations` stays quiet about it, because nothing in
-- either locale is missing.
--
-- ═══ RULE 2 ════════════════════════════════════════════════════════════════
-- No new table, so no RLS to enable and no policy to write. The new column is
-- covered the moment it exists, because both grants on `goals` are
-- TABLE-level, never column-level:
--
--   grant select on table public.goals to authenticated     (20260918150500,
--     as `situations`, after `revoke all … from anon, authenticated`)
--   grant select on table public.goals to service_role      (20260921100000)
--   grant insert, update, delete … to service_role          (20260921103000)
--
-- Read for this file: no migration since has revoked them or granted a
-- column list on `goals`, and the rename in `20261007100000` carried them
-- by OID. A table-level grant covers columns added later; a column-level one
-- would not — rule 2's worked example on `public.tracks`.
--
-- THE POLICY STAYS `using (true)`, AND DOES NOT HIDE A RETIRED GOAL. Hiding
-- it there would make an old diary entry's goal unreadable to the person who
-- wrote it. Retirement decides what is OFFERED; who may READ is unchanged, so
-- the filter belongs in the query that builds the offer, not in the policy.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE FLAG ══════════════════════════════════════════════════════════
alter table public.goals
  add column retired boolean not null default false;

comment on column public.goals.retired is
  'True when the goal is no longer offered. A retired goal is never deleted: '
  'sessions.goal_id still names it (on delete set null would rewrite those '
  'entries), its goal_i18n rows stay so the name resolves, and it serves no '
  'exercise. getGoals() in apps/web/src/lib/content.ts reads only '
  'retired = false. First used 2026-11-11, for get-to-know-musie.';

comment on table public.goals is
  'What a person is after when they start a session, as the /exercises '
  'headline says it: entspannen, Energie sammeln, Achtsamkeit üben '
  '(2026-11-11). Ordered by sort; the first unretired goal is the default.';

comment on column public.sessions.goal_id is
  'The goal chosen on /exercises when the session started, or NULL when none '
  'was recorded (before 2026-10-15, "Musie entdecken" meant no goal). A goal '
  'leaves the offer by goals.retired rather than by a delete, so the id '
  'recorded here keeps its name.';


-- ═══ 2 · RETIRE *Musie kennenlernen* ══════════════════════════════════════
update public.goals set retired = true where id = 'get-to-know-musie';

delete from public.exercise_goals where goal_id = 'get-to-know-musie';


-- ═══ 3 · THE ORDER, AND THEREFORE THE DEFAULT ══════════════════════════════
-- ── THE PARKING TRICK, FOR THE SAME REASON AS 20260923150000 ──────────────
-- `goals.sort` is `not null unique` and the constraint is NOT deferrable, so
-- moving relax to 1 while get-to-know-musie holds 1 fails mid-statement. Park
-- every row out of the way, then land the three that are offered.
--
-- THE RETIRED GOAL STAYS PARKED, at 1001. Two reasons, and the second is the
-- one that matters:
--   * a goal added later takes 4, 5, … without colliding with a row nobody
--     sees;
--   * a reader that ever forgets the `retired` filter gets it LAST, not
--     first. At a low sort it would become the default the moment a query
--     dropped the filter — the one failure here that would change what
--     everybody opens on.
-- It is also clear of the throwaway goal at sort 99 that
-- `db.sessions.db.test.ts` inserts and deletes.
update public.goals set sort = sort + 1000;

update public.goals set sort = 1 where id = 'relax';
update public.goals set sort = 2 where id = 'wake-up';
update public.goals set sort = 3 where id = 'mindfulness';


-- ═══ 4 · THE WORDS ═════════════════════════════════════════════════════════
-- The German is Ben's (D5) and is NOT the Mindfulness Cards spreadsheet's,
-- so the seed's PROVISIONAL GERMAN caveat does not apply to this table — the
-- note `20261007100100` and `20261015140000` both carry. The English is the
-- plan's A5 and A6, proposed for review in the PR. Written to
-- docs/GERMAN-UI-WRITING.md: du, lower case, sentence case, no em dashes and
-- no *nicht X, sondern Y*.
--
-- ── `purpose` — THE END OF *Lass uns zusammen …* ──────────────────────────
-- A verb phrase, so *entspannen* is lower case: it is a verb in that
-- sentence, not the noun *das Entspannen* it was after *zum*. In English it
-- sits between *Let's* and *together*.
--
-- ── `label` — THE CARD IN THE SHEET ───────────────────────────────────────
-- The same phrase, capitalised as a heading (§2): *Entspannen*, *Energie
-- sammeln*, *Achtsamkeit üben*. Until today the labels were noun phrases
-- (*Entspannung*, *Energie*, *Achtsamkeit*) because each completed *Ich
-- brauche …*. They follow the headline now instead, so the word you tap is
-- the word the headline then says, and the two can no longer be two names
-- for one thing.
--
-- ── `wake-up` KEEPS ITS ID, AGAIN ─────────────────────────────────────────
-- It is *Energie sammeln* on screen and `wake-up` in the schema, for the
-- reason `20261015140000` §3 gives: the slug is referenced by
-- `exercise_goals` and `sessions`, and a slug nobody sees is cheaper to live
-- with than a rewritten history.
--
-- ── `why` — ALL THREE CARDS ARGUE NOW ─────────────────────────────────────
-- On 2026-10-15 only Achtsamkeit carried a *Warum?*, because the other goals
-- named a state you already know you want. With three cards side by side and
-- one of them explaining itself, the other two read as unfinished, so A6
-- gives them one each.
--
-- Written to the shape of Achtsamkeit's (`20261015160000`): two sentences.
-- The first names a moment the reader already knows and what changes in it;
-- the second is Musie offering to help, in the first person (*Meine
-- Übungen*), which the library already speaks in. The claims stay small —
-- *oft*, *often* — because a card that promises a result the exercise may not
-- deliver is the thing the user testing would hear first.
--
-- Each one says something the other two do not: relax is about the BODY
-- letting go, wake-up about ATTENTION when you are flat, mindfulness about
-- staying calm under stress. Read together in the sheet, they are three
-- choices rather than one sentence three times.
--
-- ACHTSAMKEIT'S `why` IS UNCHANGED. Re-read against *Achtsamkeit üben*, it
-- still fits, and better than before: it already ends *das mit Musik
-- einzuüben* / *practise that with music*, which is now the label's own verb.
update public.goal_i18n set
  label   = 'Entspannen',
  purpose = 'entspannen',
  why     = 'Wenn dein Körper Anspannung loslässt, wird oft auch dein Kopf freier. '
            || 'Meine Übungen helfen dir dabei, mit Musik langsamer zu werden.'
where goal_id = 'relax' and locale = 'de';

update public.goal_i18n set
  label   = 'Relax',
  purpose = 'relax',
  why     = 'When your body lets go of tension, your head often clears too. '
            || 'My exercises help you slow down with music.'
where goal_id = 'relax' and locale = 'en';

update public.goal_i18n set
  label   = 'Energie sammeln',
  purpose = 'Energie sammeln',
  why     = 'Wenn du müde oder zerstreut bist, machen dich ein paar Minuten voller Aufmerksamkeit oft wieder wach. '
            || 'Meine Übungen helfen dir dabei, mit Musik neue Energie zu sammeln.'
where goal_id = 'wake-up' and locale = 'de';

update public.goal_i18n set
  label   = 'Recharge',
  purpose = 'recharge',
  why     = 'When you feel tired or scattered, a few minutes of full attention often wake you up again. '
            || 'My exercises help you recharge with music.'
where goal_id = 'wake-up' and locale = 'en';

update public.goal_i18n set
  label   = 'Achtsamkeit üben',
  purpose = 'Achtsamkeit üben'
where goal_id = 'mindfulness' and locale = 'de';

update public.goal_i18n set
  label   = 'Practise mindfulness',
  purpose = 'practise mindfulness'
where goal_id = 'mindfulness' and locale = 'en';


-- ═══ 5 · THE COLUMN COMMENTS FOLLOW THE SENTENCE ═══════════════════════════
comment on column public.goal_i18n.purpose is
  'The goal as a verb phrase, for the /exercises headline: it ends "Lass uns '
  'zusammen …" and sits between "Let''s" and "together" (2026-11-11; it was a '
  'phrase after "zum" / "to" before). Lower case where German is: '
  '"entspannen". Not null: a goal that cannot be said in the headline cannot '
  'be offered.';

comment on column public.goal_i18n.label is
  'The goal''s card headline in the sheet "Was brauchst du gerade?": the '
  'purpose phrase, capitalised as a heading ("Entspannen"), so the card and '
  'the headline say the same words.';

comment on column public.goal_i18n.why is
  'Two sentences of context under a bold "Warum?" on the goal card. Every '
  'offered goal carries one since 2026-11-11. NULL is still legal and means '
  'a card that is a headline alone; public.missing_translations reports it '
  'only when one locale has it and the other does not.';


-- NOTHING ELSE MOVES. `public.missing_translations` needs no new definition:
-- no column was added to `goal_i18n`, every row above is written in both
-- locales, and the retired goal keeps both of its rows.
