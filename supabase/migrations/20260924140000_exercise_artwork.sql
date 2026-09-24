-- ═══════════════════════════════════════════════════════════════════════════
-- THE LIBRARY GETS ITS PICTURES
--
-- Ben, 2026-09-24. Five illustrations, one per exercise, uploaded to
-- `apps/web/public/assets/web/exercises/`. This migration is the half that
-- makes them visible: the path is a column, not a convention, so a file on
-- disk changes nothing until `image_url` says so.
--
-- ── WHAT WAS THERE BEFORE WAS NOT A PICTURE ───────────────────────────────
-- Every row said `assets/web/method-card.png`, a placeholder seeded on
-- 2026-09-18 and never created — `public/assets/web/` has only ever held
-- `musy-logo.png`. So every card on /exercises has been drawing an empty
-- `--surface-sunken` box behind an alt text apologising for a placeholder,
-- and the two halves agreed with each other well enough that nothing flagged
-- it. A broken image that is styled to look deliberate is the kind that
-- survives three phases.
--
-- `public.cards` and `public.user_types` still point at that same
-- non-existent file. They are NOT touched here: there is no artwork for them
-- yet, and pointing them somewhere equally absent would only spread the
-- problem across three tables. Logged in apps/web/OPEN-QUESTIONS.md.
--
-- ── WEBP, AND WHY THE SOURCE RESOLUTION IS NOT THE SHIPPED ONE ────────────
-- The uploads are 1254 × 1254 PNGs at ~3.3 MB each: ~17 MB for one screen
-- that loads all five at once, on a product whose primary surface is a phone.
-- They ship as 768 × 768 WebP at quality 80 — 748 KB for the set.
--
-- 768 is not a guess. `.musy-rcard__media` is `--target-guided` wide (64px)
-- below the group's 480px container breakpoint and `calc(--target-guided * 3)`
-- (192px) above it, so 768 is 4× the largest slot the card ever gives an
-- image — past any display anyone is holding, with the retina margin intact.
-- The crop is `object-fit: cover` at both sizes, which is why every source is
-- square and centred (musy-components.css §7.8).
--
-- ── THE ALT TEXT IS REWRITTEN, ALL TEN ROWS ───────────────────────────────
-- Four said 'Platzhalterbild' / 'Placeholder artwork' and were honest when
-- written. The other two — Achtsame Pause and Freie Bahn — said the deck was
-- 'auf einem Tisch ausgelegt', which was a guess at a picture that did not
-- exist and is not what either illustration turned out to show.
--
-- Alt text is not decoration on this screen: `RadioCards` puts the image
-- inside the radio's own label, so what it says is part of what the card
-- announces when somebody chooses with a screen reader. All ten are rewritten
-- to describe the picture that is actually there.
--
-- German first and Ben's register (du throughout, though none of these five
-- address the reader), no trailing full stop to match the rows already in the
-- table, and no noun pile with nowhere to break — 'Karten des
-- Mindfulness-Cards-Sets' as a genitive rather than welding a fourth noun on,
-- per docs/GERMAN-UI-WRITING.md §8. English translated to match.
--
-- Unlike the rest of the content tables, this copy is OURS and permanent: the
-- Mindfulness Cards spreadsheet never described these images, because these
-- images did not exist when it was written. It is not provisional and the
-- seed's blanket warning does not cover it.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · WHERE THE FILES ARE ═══════════════════════════════════════════════
-- Relative, no leading slash, matching every other `image_url` in these
-- tables. It resolves against a one-segment route (`/exercises`) and so lands
-- on `/assets/...` — true today and only today. See OPEN-QUESTIONS.md: the
-- convention is a trap the moment a second, deeper route draws an exercise.

update public.exercises set image_url = 'assets/web/exercises/mindfulness-cards.webp'
  where id = 'mindfulness-cards';
update public.exercises set image_url = 'assets/web/exercises/free-rein.webp'
  where id = 'free-rein';
update public.exercises set image_url = 'assets/web/exercises/breathing-score.webp'
  where id = 'breathing-score';
update public.exercises set image_url = 'assets/web/exercises/sound-journey.webp'
  where id = 'sound-journey';
update public.exercises set image_url = 'assets/web/exercises/body-scan-soundwalk.webp'
  where id = 'body-scan-soundwalk';


-- ═══ 2 · WHAT EACH PICTURE SHOWS ═══════════════════════════════════════════

-- Achtsame Pause — five blank cards fanned across the surface, a hand lifting
-- the nearest one out. The gesture is the exercise's own instruction ('the
-- card you are drawn to'), so the alt says a hand is TAKING one rather than
-- that a hand is present.
update public.exercise_i18n set
  image_alt = 'Fünf aufgefächerte Karten des Mindfulness-Cards-Sets, eine Hand nimmt die vorderste heraus'
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set
  image_alt = 'Five Mindfulness Cards fanned out, with a hand taking the nearest one'
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- Freie Bahn — the whole deck stacked, one card standing face-up against it.
-- The picture separates itself from Achtsame Pause exactly where the two
-- exercises differ: nothing is being chosen here, the deck hands you one.
update public.exercise_i18n set
  image_alt = 'Ein Stapel des Mindfulness-Cards-Sets mit einer einzelnen Karte davor'
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set
  image_alt = 'A stack of Mindfulness Cards with a single card standing in front of it'
where exercise_id = 'free-rein' and locale = 'en';

-- Achtsam Atmen — a torso, both hands laid over the belly. Written without a
-- person's gender rather than around it: the hands and the belly are what the
-- picture is about, and 'eine Person' would put a pronoun in the sentence
-- that the illustration does not settle.
update public.exercise_i18n set
  image_alt = 'Zwei Hände liegen ruhig auf einem Bauch, direkt unterhalb der Rippen'
where exercise_id = 'breathing-score' and locale = 'de';

update public.exercise_i18n set
  image_alt = 'Two hands resting on a belly, just below the ribs'
where exercise_id = 'breathing-score' and locale = 'en';

-- Klangreise — a small seated figure in headphones at the centre of wide
-- concentric bands. The bands are the sound; saying so is the difference
-- between describing the picture and listing its shapes.
update public.exercise_i18n set
  image_alt = 'Eine Person sitzt mit Kopfhörern im Schneidersitz, von hinten gesehen, in der Mitte konzentrischer Klangwellen'
where exercise_id = 'sound-journey' and locale = 'de';

update public.exercise_i18n set
  image_alt = 'Someone sitting cross-legged in headphones, seen from behind at the centre of concentric waves of sound'
where exercise_id = 'sound-journey' and locale = 'en';

-- Bodyscan — lying on the back, eyes closed, a lit line running head to feet
-- with a point of light at each station. The line IS the scan travelling, and
-- it is the one detail that makes this picture this exercise.
update public.exercise_i18n set
  image_alt = 'Eine Person liegt mit geschlossenen Augen auf dem Rücken, eine leuchtende Linie verläuft vom Kopf bis zu den Füßen'
where exercise_id = 'body-scan-soundwalk' and locale = 'de';

update public.exercise_i18n set
  image_alt = 'Someone lying on their back with eyes closed, a line of light running from head to feet'
where exercise_id = 'body-scan-soundwalk' and locale = 'en';
