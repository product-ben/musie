-- ═══════════════════════════════════════════════════════════════════════════
-- THE REFLECT STEP'S QUESTIONS MOVE INTO THE FIELD THEY ARE ANSWERED IN
--
-- Ben, 2026-10-07. Achtsame Pause's reflect copy asked its two questions as
-- body text above the answer field, and the field's own placeholder was a
-- piece of chrome — "Ein Satz reicht." So the reader held the questions in
-- their head while typing into a box that said nothing about them.
--
-- The questions are now the PLACEHOLDER, which is where a prompt belongs: it
-- is in the box being answered, it is there while the answer is being written,
-- and it goes away the moment it has been.
--
-- ── WHY A COLUMN AND NOT THE `reflect.text.placeholder` KEY ───────────────
-- Because the questions are CONTENT, not chrome. They are Achtsame Pause's —
-- a named scene, and what happened in it — and Freie Bahn's reflect step asks
-- something else entirely ("Wie geht es dir jetzt? Wie fühlt sich der Moment
-- an?"). Putting them in the catalogue would print one exercise's questions
-- under every exercise's answer field.
--
-- So `reflect_placeholder` is nullable and null is meaningful: this exercise
-- has no questions of its own, and the screen falls back to the catalogue's
-- sentence. Freie Bahn keeps that fallback; its own two questions stay in
-- `reflect_md`, where they are instructions to follow rather than a prompt to
-- answer, and they are a numbered list rather than a pair of bullets.
--
-- ── NO NEW GRANT, AND THAT IS CHECKED RATHER THAN ASSUMED (rule 2) ────────
-- `information_schema.column_privileges` lists ten named columns for
-- `authenticated` on this table, which reads exactly like the column-level
-- grant `public.tracks` really has — and would mean a new column nobody can
-- select. It is not: `column_privileges` EXPANDS a table-level grant into one
-- row per column. `information_schema.table_privileges` has the truth —
-- `authenticated | SELECT` on the table — from
-- `20260918150500_content_schema.sql:321`, which grants the table and not a
-- list. A column added here is covered the moment it exists.
--
-- Verified after applying: a signed-in listener reads the new column, which is
-- what `db.content.db.test.ts` asserts for the rest of this table.
--
-- ── STILL PROVISIONAL, LIKE ALL CONTENT ───────────────────────────────────
-- The Mindfulness Cards spreadsheet owns this copy and will overwrite it
-- (CLAUDE.md 6). Held to docs/GERMAN-UI-WRITING.md so nothing
-- placeholder-shaped ships, not because it is final.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercise_i18n add column reflect_placeholder text;

comment on column public.exercise_i18n.reflect_placeholder is
  'The reflect field''s prompt — this exercise''s own questions, shown inside '
  'the box they are answered in. NULL means the exercise asks nothing '
  'specific and the screen falls back to the catalogue''s '
  '`reflect.text.placeholder`. Plain text, never Markdown: a placeholder is '
  'an attribute on an <input>, so there is nothing there to render.';

-- ── Achtsame Pause · Mindful Break ────────────────────────────────────────
-- The headline stops asking what you thought ABOUT and asks what you SAW,
-- which is the thing the listen step just spent ninety seconds setting up —
-- and it is now the same question that sheet puts in display type, so the two
-- steps are visibly one thought rather than two.
--
-- The line under it gains the other half of the offer: the questions are an
-- invitation, and anything else the reader wants to write is as welcome. That
-- matters more now the questions have moved into the box — without it, a
-- reader with something else to say would read the field's prompt as the only
-- thing it would accept.
--
-- The two bullets are GONE from the body. They are the placeholder below.
update public.exercise_i18n
set reflect_md = '## Welches Bild ist vor deinem inneren Auge entstanden?

Wenn du magst, beantworte diese Fragen. Oder schreibe alles Andere auf, was dir dazu in den Sinn gekommen ist.',
    reflect_placeholder = 'Was für einen Namen würdest du der Szene geben, die durch Musik und Bild vor deinem inneren Auge entstanden ist? Was ist dabei passiert?'
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n
set reflect_md = '## What picture formed in your mind’s eye?

If you like, answer these questions. Or write down anything else that came to mind.',
    reflect_placeholder = 'What name would you give the scene that the music and the image made in your mind’s eye? What happened in it?'
where exercise_id = 'mindfulness-cards' and locale = 'en';
