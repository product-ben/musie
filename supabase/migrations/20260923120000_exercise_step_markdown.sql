-- ═══════════════════════════════════════════════════════════════════════════
-- A STEP GETS A HEADLINE AND A DESCRIPTION, AND THE UNIT IS MARKDOWN
--
-- Ben, 2026-09-23: "per exercise and step a headline and a description text".
--
-- ── WHY THE FOUR text[] COLUMNS CANNOT SAY THAT ───────────────────────────
-- `intro_text` and its three siblings are `text[]`, and the array boundary is
-- a PARAGRAPH BREAK and nothing else. Every element is the same kind of thing
-- at the same weight, which is exactly what made them right for a run of
-- imperatives and exactly what makes them unable to carry the new shape:
--
--   * a HEADLINE is not a paragraph — it is an <h2>, it belongs in the
--     document outline, and it is typeset a step up from what follows it;
--   * the copy Ben wrote is NUMBERED ("1. Leg die Karten … 2. Lass die Bilder
--     …") and, in the reflection, BULLETED. An ordered list is a list, not
--     three paragraphs that happen to start with digits — the numbering, the
--     count and the position have to reach assistive tech (L3), and `text[]`
--     can only express them by baking "1." into the prose.
--
-- Two more columns per step (`intro_headline`, `intro_body`, ×4) would answer
-- the headline and not the lists, and would add eight columns to say what one
-- convention says already.
--
-- ── SO: ONE MARKDOWN COLUMN PER STEP ──────────────────────────────────────
-- `intro_md`, `scan_md`, `listen_md`, `reflect_md`. `_md` rather than `_text`
-- so the suffix names the format a reader has to parse, and so no query can
-- confuse the two during the life of this migration.
--
-- THE SUBSET IS NOT "ALL OF MARKDOWN". `apps/web/src/lib/markdown.ts` is the
-- normative statement of what renders: ATX headings, paragraphs, ordered and
-- unordered lists, `**strong**` and `*emphasis*`. There is no raw HTML, no
-- image and no link syntax — deliberately, and that file says why. Content
-- that needs more is a change to the parser AND to this comment, in that
-- order.
--
-- ── `question` GOES WITH THEM ─────────────────────────────────────────────
-- One column, rendered as the <h2> on BOTH the listen and the reflect step,
-- so that "the question you hold while the track plays and the question you
-- answer afterwards cannot drift apart". That was a good rule for one
-- question and it is the wrong rule for this copy: listen now asks *what
-- picture forms when the music and the card come together*, and reflect asks
-- what the scene was called and what happened in it. They are different
-- questions on purpose, and each is its own step's headline.
--
-- It was NULL for all three exercises, in both locales — the app rendered
-- `reflect.questionFallback` from the chrome catalogue every time — so
-- nothing written is lost here. That fallback key goes too.
--
-- ── ORDER, AND WHY THE VIEW IS REPLACED RATHER THAN DROPPED ───────────────
-- `missing_translations` selects all five columns, and Postgres refuses to
-- drop a column a view depends on. `20260921120000_drop_duration_label.sql`
-- hit this and wrote down the answer: `create or replace view` keeps the
-- view's IDENTITY and therefore its GRANTS, where drop-and-recreate silently
-- un-grants `authenticated` and `service_role`. Legal here for the same
-- reason it was legal there — the five OUTPUT columns are untouched, and only
-- the `strings` CTE inside changes.
--
-- Add, fill, replace the view, then drop.
--
-- ── THE SEED IS NOT EDITED ────────────────────────────────────────────────
-- Rule 4. `20260918150600_content_seed.sql` still inserts `scan_text` and it
-- stays that way: on a `db reset` it runs before this file, when the column
-- still exists, and editing it would change nothing on the remote while making
-- local and hosted disagree about what the seed said.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercise_i18n
  add column intro_md   text,
  add column scan_md    text,
  add column listen_md  text,
  add column reflect_md text;

comment on column public.exercise_i18n.intro_md is
  'The intro step''s headline and description, as Markdown. The renderable '
  'subset is defined by apps/web/src/lib/markdown.ts — headings, paragraphs, '
  'ordered and unordered lists, strong and emphasis. No HTML, images or links.';
comment on column public.exercise_i18n.scan_md    is 'As intro_md, for the scan step.';
comment on column public.exercise_i18n.listen_md  is 'As intro_md, for the listen step.';
comment on column public.exercise_i18n.reflect_md is 'As intro_md, for the reflect step.';


-- ═══ THE COPY ══════════════════════════════════════════════════════════════
-- PROVISIONAL, like the rest of the content seed: the Mindfulness Cards
-- spreadsheet will overwrite it. German is Ben's own, 2026-09-23; English is
-- ours, translated to match.
--
-- Only `mindfulness-cards` is filled. Breathing Score and Body Scan Soundwalk
-- carry no step copy in EITHER locale, which is data rather than a dropped
-- translation — the distinction `missing_translations` exists to make, and
-- the reason it compares the locales against each other instead of testing
-- for null.
--
-- ── THREE EDITS TO THE BRIEF'S GERMAN, ALL OF THEM RULE-BACKED ────────────
--   1. "Wähle eine Kart aus" → "Karte". A typo.
--   2. The listen headline lost its full stop. GERMAN-UI-WRITING.md §7: "A
--      heading does not end in a full stop. A sentence does."
--   3. "die durch die Verbindung von der Musik mit dem Bild … entstanden ist"
--      → "die aus der Verbindung von Musik und Bild … entstanden ist". The
--      original piles two prepositions onto one relative clause that already
--      runs 25 words; the shorter form says the same thing and is the one a
--      reader can hold to the end. Flagged in apps/web/OPEN-QUESTIONS.md —
--      revert it if the phrasing was deliberate.
--
-- ── EVERY HEADLINE IS `##`, NEVER `#` ─────────────────────────────────────
-- The <h1> on that screen is the exercise's own name, which `ContentBox`
-- renders above the step rail. A step heading is the level below it. The
-- renderer clamps to <h2>–<h6> so content cannot emit a second <h1> whatever
-- it says, but the copy is written correctly rather than relying on the clamp.

update public.exercise_i18n set intro_md = $md$## So legen wir los

1. Leg die vier Karten mit dem Symbol [X] vor dich.
2. Lass die Bilder einen Moment auf dich wirken.$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set intro_md = $md$## Here is how we start

1. Lay the four cards marked [X] out in front of you.
2. Let the images settle for a moment.$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';

update public.exercise_i18n set scan_md = $md$## Wähle eine Karte aus

1. Wähle das Bild aus, das dich gerade am meisten anspricht, aus welchen Gründen auch immer. Lege die anderen Karten außer Sichtweite.
2. Scanne den QR-Code deiner ausgewählten Karte.$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set scan_md = $md$## Choose a card

1. Pick the image that speaks to you most right now, for whatever reason. Put the other cards out of sight.
2. Scan the QR code on the card you picked.$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';

update public.exercise_i18n set listen_md = $md$## Höre bewusst zu, und schau dir die Karte an

Welches Bild entsteht vor deinem inneren Auge, wenn Musik und Karte zusammenkommen?$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set listen_md = $md$## Listen closely, and look at your card

What picture forms in your mind’s eye when the music and the card come together?$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';

update public.exercise_i18n set reflect_md = $md$## Worüber hast du nachgedacht?

Wenn du magst, beantworte diese Fragen:

- Was für einen Namen würdest du der Szene geben, die aus der Verbindung von Musik und Bild vor deinem inneren Auge entstanden ist?
- Was ist dabei passiert?$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set reflect_md = $md$## What were you thinking about?

If you like, answer these questions:

- What name would you give the scene that the music and the image made in your mind’s eye?
- What happened in it?$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';


-- ═══ THE VIEW, WITH THE NEW COLUMNS IN PLACE OF THE OLD ════════════════════
-- Verbatim from `20260921120000_drop_duration_label.sql` except for the five
-- lines in `strings`: the four `array_to_string(...)` rows and `question` are
-- replaced by the four `_md` columns.
--
-- `nullif(…, '')` stays, and for the same reason it was there for the arrays:
-- an empty string renders as nothing on screen, so a step whose copy was
-- CLEARED rather than deleted is the same hole and must report as one.
create or replace view public.missing_translations with (security_invoker = true) as
with locales (locale) as (
  values ('de'), ('en')
),
parents (entity, record_id) as (
            select 'user_types', id from public.user_types
  union all select 'situations', id from public.situations
  union all select 'exercises',  id from public.exercises
  union all select 'cards',      id from public.cards
),
present (entity, record_id, locale) as (
            select 'user_types', user_type_id, locale from public.user_type_i18n
  union all select 'situations', situation_id, locale from public.situation_i18n
  union all select 'exercises',  exercise_id,  locale from public.exercise_i18n
  union all select 'cards',      card_id,      locale from public.card_i18n
),
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',      label      from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',  image_alt  from public.user_type_i18n
  union all select 'situations', situation_id, locale, 'label',      label      from public.situation_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',        name        from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description', description from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',       needs       from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'intro_md',    nullif(intro_md,   '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'scan_md',     nullif(scan_md,    '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'listen_md',   nullif(listen_md,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'reflect_md',  nullif(reflect_md, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'image_alt',   image_alt   from public.exercise_i18n
  union all select 'cards',      card_id,      locale, 'feeling',    feeling    from public.card_i18n
  union all select 'cards',      card_id,      locale, 'image_alt',  image_alt  from public.card_i18n
)
select
  p.entity,
  p.record_id,
  l.locale,
  'missing row'::text as issue,
  null::text          as column_name
from parents p
cross join locales l
where not exists (
  select 1 from present x
  where x.entity = p.entity and x.record_id = p.record_id and x.locale = l.locale
)

union all

select
  s.entity,
  s.record_id,
  s.locale,
  'missing string'::text as issue,
  s.column_name
from strings s
where s.value is null
  and exists (
    select 1 from strings o
    where o.entity      = s.entity
      and o.record_id   = s.record_id
      and o.column_name = s.column_name
      and o.locale     <> s.locale
      and o.value is not null
  );


-- ═══ AND THE OLD SHAPE GOES ════════════════════════════════════════════════
-- One string is actually being deleted here, not merely re-homed:
-- `scan_text` on mindfulness-cards — "Work with the card you are drawn to,
-- not the one you think you should pick." It is superseded rather than lost;
-- the new `scan_md` says the same thing in its first numbered step ("the
-- image that speaks to you most right now, for whatever reason"). The other
-- 23 array slots and all six `question` slots were null.
alter table public.exercise_i18n
  drop column intro_text,
  drop column scan_text,
  drop column listen_text,
  drop column reflect_text,
  drop column question;
