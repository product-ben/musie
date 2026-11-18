-- ════════════════════════════════════════════════════════════════════════════
-- EVERY EXERCISE HAS A NEW PICTURE, AND EVERY DESCRIPTION FOLLOWS IT
--
-- Ben, 2026-11-18: eight new illustrations, one per exercise, 16:9, in the
-- terracotta engraved style. "Die alten musst du wegwerfen, überall wo ein
-- altes eingesetzt ist, bitte mit dem Neuen ersetzen."
--
-- ── NO `image_url` CHANGES ────────────────────────────────────────────────
-- The files keep their names (`assets/web/exercises/<exercise id>.webp`) and
-- were overwritten in place, so the column already points at the new
-- pictures. This migration is the OTHER half: the description of each one.
--
-- ── WHY ALL SIXTEEN ROWS ───────────────────────────────────────────────────
-- An alt text describes a picture, and these describe the old ones.
-- Achtsam Atmen still said "two hands resting on a belly" over a figure
-- breathing onto a wind chime; Marimba counted ten bars where there are now
-- eight; Bodyscan had no headphones. `20261015100000` is the lesson on record:
-- a screen reader told confidently about the wrong image. So every row is
-- rewritten from what the new file shows, not patched where it drifted.
--
-- `RadioCards` puts the image inside the radio's own label, and the card
-- deck and Einsteigen read it too, so this is part of what a chooser hears.
-- (The diary's marks are `alt=""` by design — DiaryGraph.tsx says why.)
--
-- ── HOW THEY ARE WRITTEN ─────────────────────────────────────────────────
-- German first. "Eine Figur", not "eine Person": the illustrations draw a
-- smooth, faceless mannequin, and that is what is there to describe. No
-- pronoun for it — a possessive would have to pick one, and the picture does
-- not. No trailing full stop, matching every row already in the table. No
-- count of strings, tines or bars: a number a reader cannot verify from the
-- picture is the kind that goes wrong at the next redraw.
--
-- `exercise_i18n` travels by migration only (rule 4.1 does not reach it;
-- nothing in the app edits it), so there is no live edit for this to
-- overwrite.
-- ════════════════════════════════════════════════════════════════════════════

update public.exercise_i18n as e
set image_alt = v.image_alt
from (values
  -- Achtsame Pause — four blank cards fanned in an arc; below them a hand
  -- holds up a fifth. The hand is the instruction ("the card you are drawn
  -- to"), so the sentence ends on it.
  ('mindfulness-cards', 'de', 'Vier Mindfulness-Karten im Bogen aufgefächert, darunter hält eine Hand eine fünfte Karte'),
  ('mindfulness-cards', 'en', 'Four Mindfulness Cards fanned out in an arc, with a hand holding up a fifth below them'),

  -- Freie Bahn — the deck stacked, one card standing upright in front of it,
  -- rings spreading out underneath. Nothing is being chosen: the deck hands
  -- you one, and that is the difference from Achtsame Pause.
  ('free-rein', 'de', 'Ein Stapel Mindfulness-Karten, davor steht eine einzelne Karte aufrecht, umgeben von ringförmigen Wellen'),
  ('free-rein', 'en', 'A stack of Mindfulness Cards with a single card standing upright in front of it, surrounded by rings of waves'),

  -- Atementspannung — seated on a cushion, breathing out; fine lines of
  -- breath reach a hanging wind chime and it sounds. The breath making the
  -- sound is what makes this picture this exercise.
  ('breathing-score', 'de', 'Eine Figur sitzt im Schneidersitz auf einem Kissen und atmet sanft aus, feine Linien des Atems bringen ein Windspiel zum Klingen'),
  ('breathing-score', 'en', 'A figure sitting cross-legged on a cushion, breathing out gently, as fine lines of breath set a wind chime ringing'),

  -- Klangreise — seen from behind, in headphones, facing a landscape drawn as
  -- sound waves.
  ('sound-journey', 'de', 'Eine Figur sitzt mit Kopfhörern im Schneidersitz auf einem Kissen, von hinten gesehen, vor einer Landschaft aus Klangwellen'),
  ('sound-journey', 'en', 'A figure in headphones sitting cross-legged on a cushion, seen from behind, facing a landscape of sound waves'),

  -- Bodyscan — lying stretched out, head on a pillow, headphones on; a lit
  -- wave runs along the body from the feet to the head. The wave IS the scan
  -- travelling.
  ('body-scan-soundwalk', 'de', 'Eine Figur liegt ausgestreckt mit Kopfhörern auf einem Kissen, eine leuchtende Welle zieht von den Füßen bis zum Kopf über den Körper'),
  ('body-scan-soundwalk', 'en', 'A figure lying stretched out in headphones, head on a pillow, as a glowing wave runs along the body from feet to head'),

  -- The three instruments — each standing in rings of sound, the same
  -- composition three times, so the three sentences are built alike.
  ('kalimba', 'de', 'Eine Kalimba aus Holz, um sie herum breiten sich Klangwellen in Ringen aus'),
  ('kalimba', 'en', 'A wooden kalimba, with rings of sound spreading out around it'),

  ('marimba', 'de', 'Eine kleine Marimba mit zwei Schlägeln auf den Holzstäben, darunter breiten sich Klangwellen in Ringen aus'),
  ('marimba', 'en', 'A small marimba with two mallets resting on its wooden bars, and rings of sound spreading out beneath it'),

  ('harp', 'de', 'Eine kleine Harfe aus Holz, um sie herum breiten sich Klangwellen in Ringen aus'),
  ('harp', 'en', 'A small wooden harp, with rings of sound spreading out around it')
) as v(exercise_id, locale, image_alt)
where e.exercise_id = v.exercise_id
  and e.locale = v.locale;
