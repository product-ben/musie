-- ════════════════════════════════════════════════════════════════════════════
-- A COPY ROUND: „herankommen“, the volume sentence, and the instruments' play
-- texts — Ben, 2026-11-19
--
-- From his list after testing the „Reflexion 01“ experiment, which he ruled
-- holds „for the experiment pages as well as the main app“. The experiment
-- reads these same rows (baked by its export), so one change serves both.
--
-- ── WHAT CHANGES ────────────────────────────────────────────────────────────
--   · „heran kommen“ → „herankommen“, in the intro of every exercise that has
--     it (eight German intros).
--   · The volume sentence, identical in all three instruments' intros:
--     „Bei mittlerer Lautstärke klingen die Instrumente am besten.“
--   · The two ways to play, and the play step's heading, for all three
--     instruments. Ben's list names the harp. The kalimba's and the marimba's
--     sentences are the same sentence with another instrument in it, and a
--     harp that spoke differently from its siblings would be the odd one out,
--     so they follow.
--   · The harp's pointer hint and its focus line. These are the harp's own
--     sentences; the kalimba's and the marimba's are different sentences and
--     keep their words.
--
-- English follows for every German change except the typo, which has no
-- English counterpart.
--
-- Fixes to the list's own text, as written in the log: „Saiten“ (not
-- „Seiten“), a comma before a „wie“ clause, no full stop on a heading, „am
-- besten“ in lower case.
--
-- ── HOW ─────────────────────────────────────────────────────────────────────
-- `replace()` on the exact old text, never a blind `set`. A row whose text has
-- changed since is left alone instead of overwritten, and a second run
-- changes nothing.
--
-- `exercise_i18n` travels by migration only (rule 4.1 does not reach it, and
-- nothing in the app edits it — 20261118100000 says the same), so there is
-- no live edit for this to overwrite.
-- ════════════════════════════════════════════════════════════════════════════


-- ═══ 1 · „herankommen“ ══════════════════════════════════════════════════════
update public.exercise_i18n
set intro_md = replace(intro_md, 'an dich heran kommen', 'an dich herankommen')
where locale = 'de'
  and intro_md like '%an dich heran kommen%';


-- ═══ 2 · THE VOLUME SENTENCE, ALL THREE INSTRUMENTS ═════════════════════════
update public.exercise_i18n
set intro_md = replace(
  intro_md,
  'Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender.',
  'Bei mittlerer Lautstärke klingen die Instrumente am besten.'
)
where locale = 'de'
  and exercise_id in ('harp', 'kalimba', 'marimba');

update public.exercise_i18n
set intro_md = replace(
  intro_md,
  'Please don''t have your device at full volume — Musie''s instruments sound more soothing that way.',
  'The instruments sound best at medium volume.'
)
where locale = 'en'
  and exercise_id in ('harp', 'kalimba', 'marimba');


-- ═══ 3 · THE TWO WAYS TO PLAY, AND THE PLAY HEADING, ALL THREE ══════════════
-- One statement per language, with the instrument's name taken from the row
-- itself, so the three cannot drift apart.
update public.exercise_i18n as e
set mode_musie_md = replace(
      mode_musie_md,
      'Machst du eine Pause, antwortet die ' || v.name || ' passend zu deiner Musik. '
        || v.verb || ' du dazwischen, hört sie auf, und du bist wieder dran.',
      'Mach eine Pause und die ' || v.name || ' spielt selber. Du kannst die '
        || v.name || ' jederzeit unterbrechen.'
    ),
    mode_solo_md = replace(
      mode_solo_md,
      'Die ' || v.name || ' antwortet nicht. Spiel frei, so lange du magst.',
      'Spiel so kurz oder so lange, wie du magst.'
    ),
    play_md = replace(
      play_md,
      '## Wenn du bereit bist, spiel auf der ' || v.name,
      '## Spiel auf der ' || v.name || ', wenn du bereit bist'
    )
from (values
  ('harp', 'Harfe', 'Spielst'),
  ('kalimba', 'Kalimba', 'Tippst'),
  ('marimba', 'Marimba', 'Tippst')
) as v(exercise_id, name, verb)
where e.exercise_id = v.exercise_id
  and e.locale = 'de';

update public.exercise_i18n as e
set mode_musie_md = replace(
      mode_musie_md,
      'When you pause, the ' || v.name || ' answers to suit your music. '
        || v.verb || ' in between and it stops, and it''s your turn again.',
      'Take a pause and the ' || v.name || ' plays by itself. You can interrupt the '
        || v.name || ' at any time.'
    ),
    mode_solo_md = replace(
      mode_solo_md,
      'The ' || v.name || ' does not answer. Play freely for as long as you like.',
      'Play for as short or as long as you like.'
    ),
    play_md = replace(
      play_md,
      '## When you''re ready, play the ' || v.name,
      '## Play the ' || v.name || ' when you''re ready'
    )
from (values
  ('harp', 'harp', 'Play'),
  ('kalimba', 'kalimba', 'Tap'),
  ('marimba', 'marimba', 'Tap')
) as v(exercise_id, name, verb)
where e.exercise_id = v.exercise_id
  and e.locale = 'en';


-- ═══ 4 · THE HARP'S OWN: THE POINTER HINT AND THE FOCUS LINE ════════════════
update public.exercise_i18n
set play_pointer_md = replace(
      play_pointer_md,
      'Spiele mehrere Töne gleichzeitig, indem du deine Tastatur nutzt oder mit gedrückter Maustaste über mehrere Saiten fährst. Klickst du eine Saite an, ist der Ton leiser, als wenn du sie mit gedrückter Maustaste zupfst.',
      'Streiche über mehrere Saiten, um Töne gleichzeitig zu spielen. Klickst du eine Saite an, ist der Ton leiser. Zupfst du sie, ist er lauter.'
    ),
    focus_headline = replace(
      focus_headline,
      'Atme tief ein und aus. Spiele dabei Musies Harfe im Rhythmus deines Atems.',
      'Atme ruhig weiter. Spiele die Harfe so, wie es sich gut anfühlt.'
    )
where exercise_id = 'harp'
  and locale = 'de';

update public.exercise_i18n
set play_pointer_md = replace(
      play_pointer_md,
      'Play several notes at once with your keyboard, or drag across several strings with the mouse button held down. Clicking a string sounds softer than plucking it with the mouse button held down.',
      'Sweep across several strings to play notes at once. Clicking a string sounds softer. Plucking it sounds louder.'
    ),
    focus_headline = replace(
      focus_headline,
      'Breathe deeply in and out. Play Musie''s harp in the rhythm of your breath.',
      'Keep breathing calmly. Play the harp in whatever way feels good.'
    )
where exercise_id = 'harp'
  and locale = 'en';
