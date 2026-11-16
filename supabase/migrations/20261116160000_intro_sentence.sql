-- ════════════════════════════════════════════════════════════════════════════
-- Every exercise's Einsteigen says the same sentence about the next minutes —
-- Ben, 2026-11-16.
--
-- His brief: "füge zu jeder Karte den gleichen intro text hinzu, allerdings
-- immer mit der richtigen min. Zahl (nimm die min length). Einfach als String
-- pro Karte." The sentence is Bodyscan's, the number is the exercise's own
-- `timeframe_min`, and it is written into the copy rather than filled in from
-- a `{minutes}` placeholder:
--
--   Achtsame Pause 2 · Freie Bahn 2 · Atementspannung 5 · Klangreise 10 ·
--   Bodyscan 4 · Kalimba, Marimba, Harfe 3
--
-- Then two answers:
--   · the sentence stands DIRECTLY UNDER THE HEADLINE everywhere. On the card
--     exercises the app now takes the headline and this first paragraph
--     above the cards switch (`headingAndLead`), so it shows in the digital
--     mode too; their instructions about paper stay below the switch;
--   · Klangreise and the instruments had their own „Stell sicher …“; it is
--     REPLACED by this one, and the rest of their copy stays. Klangreise's
--     first paragraph went with it („… ungestört bist und nicht abgelenkt
--     wirst. Schalte Notifications aus.“ said the same thing).
--
-- Atementspannung is not implemented and had no intro at all; it gets its
-- headline (`20261116150000`'s header held it) and the sentence, so it is
-- ready when it goes live.
--
-- WHOLE INTROS, NOT A PATCH. Each row is written out in full, so the file
-- says what every Einsteigen reads. `exercise_i18n` content travels by
-- migration only (rule 4.1 does not reach it) — nothing edits it in the app —
-- so there is no edit elsewhere for this to overwrite.
-- ════════════════════════════════════════════════════════════════════════════

update public.exercise_i18n as e
set intro_md = v.intro_md
from (values
  ('mindfulness-cards', 'de', $md$## Lass uns eine Achtsame Pause beginnen

Stell sicher, dass die nächsten 2 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

1. Zieh fünf zufällige Karten und leg sie vor dich.
2. Lass die Bilder einen Moment auf dich wirken.$md$),
  ('mindfulness-cards', 'en', $md$## Let's begin a Mindful Break

Make sure that for the next 2 minutes no notifications or other distractions can reach you.

1. Draw five random cards and lay them out in front of you.
2. Let the images settle for a moment.$md$),

  ('free-rein', 'de', $md$## Lass uns mit Freier Bahn beginnen

Stell sicher, dass die nächsten 2 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Lege den Stapel Karten verdeckt vor dich.$md$),
  ('free-rein', 'en', $md$## Let's begin with Free Rein

Make sure that for the next 2 minutes no notifications or other distractions can reach you.

Lay the deck face down in front of you.$md$),

  ('breathing-score', 'de', $md$## Lass uns eine Atementspannung beginnen

Stell sicher, dass die nächsten 5 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.$md$),
  ('breathing-score', 'en', $md$## Let's begin a Breath Relaxation

Make sure that for the next 5 minutes no notifications or other distractions can reach you.$md$),

  ('sound-journey', 'de', $md$## Lass uns eine Klangreise beginnen

Stell sicher, dass die nächsten 10 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Du kannst die Übung zwischendurch oder zum Einschlafen durchführen.

Mach es dir bequem.$md$),
  ('sound-journey', 'en', $md$## Let's begin a Sound Journey

Make sure that for the next 10 minutes no notifications or other distractions can reach you.

Tell me how you are listening, and I will pick the recording that fits.$md$),

  ('body-scan-soundwalk', 'de', $md$## Lass uns einen Bodyscan beginnen

Stell sicher, dass die nächsten 4 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.$md$),
  ('body-scan-soundwalk', 'en', $md$## Let's begin a Body Scan

Make sure that for the next 4 minutes no notifications or other distractions can reach you.$md$),

  ('kalimba', 'de', $md$## Lass uns Kalimba spielen

Stell sicher, dass die nächsten 3 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender.$md$),
  ('kalimba', 'en', $md$## Let's play the Kalimba

Make sure that for the next 3 minutes no notifications or other distractions can reach you.

Please don't have your device at full volume — Musie's instruments sound more soothing that way.$md$),

  ('marimba', 'de', $md$## Lass uns Marimba spielen

Stell sicher, dass die nächsten 3 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender.$md$),
  ('marimba', 'en', $md$## Let's play the Marimba

Make sure that for the next 3 minutes no notifications or other distractions can reach you.

Please don't have your device at full volume — Musie's instruments sound more soothing that way.$md$),

  ('harp', 'de', $md$## Lass uns Harfe spielen

Stell sicher, dass die nächsten 3 Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender.$md$),
  ('harp', 'en', $md$## Let's play the Harp

Make sure that for the next 3 minutes no notifications or other distractions can reach you.

Please don't have your device at full volume — Musie's instruments sound more soothing that way.$md$)
) as v (exercise_id, locale, intro_md)
where e.exercise_id = v.exercise_id
  and e.locale = v.locale;
