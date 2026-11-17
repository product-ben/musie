-- ════════════════════════════════════════════════════════════════════════════
-- Every exercise's Einsteigen headline says which exercise it is — Ben,
-- 2026-11-16, from Figma *Exercise pages* („Lass uns einen Bodyscan
-- beginnen“).
--
-- His brief: "The new headline is always ‚Lass uns einen/eine … beginnen‘.
-- Don't overcomplicate it with something dynamic, just write new titles for
-- every exercise. Make sure to also translate to English." Then three answers:
--   · names keep their capitals inside the sentence (eine Achtsame Pause,
--     a Body Scan) — they read as the exercise's title;
--   · the instruments are played, not begun: „Lass uns Kalimba spielen“;
--   · Freie Bahn takes a preposition: „Lass uns mit Freier Bahn beginnen“.
--
-- ONLY THE HEADLINE LINE IS REPLACED. Each intro is a Markdown document whose
-- first line is its `## ` headline; `regexp_replace` swaps that line and
-- leaves the description under it exactly as it is, so this cannot undo a
-- later edit to the copy below — and a row whose intro does not start with a
-- headline is not touched at all.
--
-- NOT HERE: Atementspannung (`breathing-score`). It is not implemented and its
-- `intro_md` is null in both languages, so there is no intro to give a
-- headline to. When it gets one, the headline is
--   de: „Lass uns eine Atementspannung beginnen“
--   en: “Let's begin a Breath Relaxation”
--
-- Rule 4: content in `exercise_i18n` still travels by migration (rule 4.1
-- does not reach it — `20261109160000_instruments_copy.sql` says so), and
-- this stacks on everything applied. No schema changes, so no grants.
-- ════════════════════════════════════════════════════════════════════════════

update public.exercise_i18n as e
set intro_md = regexp_replace(e.intro_md, '^## [^\n]*', '## ' || h.headline)
from (values
  ('body-scan-soundwalk', 'de', $h$Lass uns einen Bodyscan beginnen$h$),
  ('body-scan-soundwalk', 'en', $h$Let's begin a Body Scan$h$),
  ('sound-journey',       'de', $h$Lass uns eine Klangreise beginnen$h$),
  ('sound-journey',       'en', $h$Let's begin a Sound Journey$h$),
  ('mindfulness-cards',   'de', $h$Lass uns eine Achtsame Pause beginnen$h$),
  ('mindfulness-cards',   'en', $h$Let's begin a Mindful Break$h$),
  ('free-rein',           'de', $h$Lass uns mit Freier Bahn beginnen$h$),
  ('free-rein',           'en', $h$Let's begin with Free Rein$h$),
  ('kalimba',             'de', $h$Lass uns Kalimba spielen$h$),
  ('kalimba',             'en', $h$Let's play the Kalimba$h$),
  ('marimba',             'de', $h$Lass uns Marimba spielen$h$),
  ('marimba',             'en', $h$Let's play the Marimba$h$),
  ('harp',                'de', $h$Lass uns Harfe spielen$h$),
  ('harp',                'en', $h$Let's play the Harp$h$)
) as h (exercise_id, locale, headline)
where e.exercise_id = h.exercise_id
  and e.locale = h.locale
  and e.intro_md ~ '^## ';
