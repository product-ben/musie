-- ════════════════════════════════════════════════════════════════════════════
-- The instruments' copy, cleaned up — Ben, 2026-11-09.
--
-- His brief, decided with four answers:
--   · Einsteigen says what to do before playing („Bevor es losgeht“) and holds
--     the settings: how to play (Duett mit Musie | Alleine), the vibration
--     (touch only, chrome), and for the kalimba and the marimba the motion
--     sensor as a switch (touch only) — the sensor's heading and words here,
--     its switch label in `motion_label`.
--   · Musizieren says „Wenn du bereit bist, spiel auf der …“ (`play_md`) and
--     how to play, in two versions: for a touch screen (`play_touch_md`) and
--     for a mouse and keyboard (`play_pointer_md`).
--   · The focus sheet keeps its headline as it was — the experiments'
--     sentence, until now derived from `play_md` — in a field of its own,
--     `focus_headline`.
--   · The volume hint is a sentence of the intro now, and the browser hint is
--     gone: `volume_md` and `browser_md` are dropped.
--   · All of it editable in the builder, as the first brief asked.
--
-- Rule 4: the instruments migration is applied, so this stacks on it. Rule
-- 4.1 does not reach `exercise_i18n` — its content still travels by
-- migration. The table's grants are table-wide, so the new columns need none.
-- ════════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE NEW COLUMNS ═══════════════════════════════════════════════════
alter table public.exercise_i18n
  add column focus_headline  text,
  add column play_touch_md   text,
  add column play_pointer_md text,
  add column motion_label    text;

comment on column public.exercise_i18n.focus_headline is 'The focus sheet''s headline: one sentence over the instrument, the experiment''s own.';
comment on column public.exercise_i18n.play_touch_md is 'The play step, on a touch screen: how to play.';
comment on column public.exercise_i18n.play_pointer_md is 'The play step, with a mouse and keyboard: how to play.';
comment on column public.exercise_i18n.motion_label is 'Intro: the switch that allows the motion sensor. Null where the instrument uses none (the harp).';
comment on column public.exercise_i18n.motion_md is 'Intro, touch screens only, where the instrument uses the motion sensor: a ### heading (a section of the step, under its ## one) and what it is for, above the switch. Null for the harp.';
comment on column public.exercise_i18n.play_md is 'The play step: its heading.';
comment on column public.exercise_i18n.mode_solo_md is 'Intro: what happens when playing alone, under the segmented control.';
comment on column public.exercise_i18n.mode_musie_md is 'Intro: what happens when playing a duet with Musie, under the segmented control.';


-- ═══ 2 · MISSING TRANSLATIONS, BEFORE THE DROP ═════════════════════════════
-- `create or replace`, never drop (20261007100000) — and first, because a
-- column a view reads cannot be dropped. The same view as 20261109100000 with
-- volume_md and browser_md out and the four new columns in.
create or replace view public.missing_translations with (security_invoker = true) as
with locales (locale) as (
  values ('de'), ('en')
),
parents (entity, record_id) as (
            select 'user_types', id from public.user_types
  union all select 'goals',      id from public.goals
  union all select 'exercises',  id from public.exercises
  union all select 'cards',      id from public.cards
),
present (entity, record_id, locale) as (
            select 'user_types', user_type_id, locale from public.user_type_i18n
  union all select 'goals',      goal_id,      locale from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale from public.exercise_i18n
  union all select 'cards',      card_id,      locale from public.card_i18n
),
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',      label      from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',  image_alt  from public.user_type_i18n
  union all select 'goals',      goal_id,      locale, 'label',      label      from public.goal_i18n
  union all select 'goals',      goal_id,      locale, 'purpose',    purpose    from public.goal_i18n
  union all select 'goals',      goal_id,      locale, 'why',        why        from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',        name        from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description', description from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',       needs       from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'intro_md',    nullif(intro_md,   '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'scan_md',     nullif(scan_md,    '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'listen_md',   nullif(listen_md,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'reflect_md',  nullif(reflect_md, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'image_alt',   image_alt   from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'motion_md',        nullif(motion_md,        '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'motion_label',     nullif(motion_label,     '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_md',          nullif(play_md,          '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_touch_md',    nullif(play_touch_md,    '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_pointer_md',  nullif(play_pointer_md,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'focus_headline',   nullif(focus_headline,   '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_cta',         nullif(play_cta,         '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_solo_label',  nullif(mode_solo_label,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_solo_md',     nullif(mode_solo_md,     '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_musie_label', nullif(mode_musie_label, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_musie_md',    nullif(mode_musie_md,    '') from public.exercise_i18n
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


-- ═══ 3 · THE VOLUME AND BROWSER HINTS GO ═══════════════════════════════════
alter table public.exercise_i18n
  drop column volume_md,
  drop column browser_md;


-- ═══ 4 · THE COPY ══════════════════════════════════════════════════════════
-- Ben's words, with the spelling put right (Saiten, Zungen, „mit gedrückter
-- Maustaste“, „Benachrichtigungen“ — docs/GERMAN-UI-WRITING.md §8). The
-- English is written to the same meaning (rule 6). The focus headlines are
-- what the sheet showed until today, derived from the old `play_md`.

update public.exercise_i18n set intro_md = $md$## Bevor es losgeht

Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender. Stell außerdem sicher, dass in den nächsten drei Minuten keine Benachrichtigungen oder anderen Ablenkungen an dich herankommen.$md$
where exercise_id in ('harp', 'kalimba', 'marimba') and locale = 'de';

update public.exercise_i18n set intro_md = $md$## Before you begin

Please don't have your device at full volume — Musie's instruments sound more soothing that way. Also make sure no notifications or other distractions can reach you for the next three minutes.$md$
where exercise_id in ('harp', 'kalimba', 'marimba') and locale = 'en';

update public.exercise_i18n set
  mode_musie_label = 'Duett mit Musie',
  mode_solo_label  = 'Alleine'
where exercise_id in ('harp', 'kalimba', 'marimba') and locale = 'de';

update public.exercise_i18n set
  mode_musie_label = 'Duet with Musie',
  mode_solo_label  = 'Alone'
where exercise_id in ('harp', 'kalimba', 'marimba') and locale = 'en';

-- ── the kalimba ─────────────────────────────────────────────────────────────
update public.exercise_i18n set
  play_md         = '## Wenn du bereit bist, spiel auf der Kalimba',
  play_touch_md   = 'Spiele mehrere Töne gleichzeitig, indem du mehrere Zungen mit deinen Fingern berührst. Je weiter unten du drückst, desto lauter der Ton.',
  play_pointer_md = 'Spiele mehrere Töne gleichzeitig, indem du deine Tastatur nutzt oder mit gedrückter Maustaste über mehrere Zungen fährst. Je weiter unten du drückst, desto lauter der Ton.',
  focus_headline  = 'Tippe die Zungen der Kalimba an. Schwenkst du das Handy, schwingt der Klang mit.',
  mode_musie_md   = 'Machst du eine Pause, antwortet die Kalimba passend zu deiner Musik. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
  mode_solo_md    = 'Die Kalimba antwortet nicht. Spiel frei, so lange du magst.',
  motion_md       = $md$### Kalimba zum Schwingen bringen?

Schwenkst du das Handy, schwingt der Klang mit. Dafür nutzt die Kalimba die Bewegung deines Handys. Dein Handy fragt dich einmal, ob du das erlaubst.$md$,
  motion_label    = 'Schwingen erlauben'
where exercise_id = 'kalimba' and locale = 'de';

update public.exercise_i18n set
  play_md         = '## When you''re ready, play the kalimba',
  play_touch_md   = 'Play several notes at once by touching several tines with your fingers. The further down you press, the louder the note.',
  play_pointer_md = 'Play several notes at once with your keyboard, or drag across several tines with the mouse button held down. The further down you press, the louder the note.',
  focus_headline  = 'Tap the kalimba''s tines. Swing your phone and the sound swings with it.',
  mode_musie_md   = 'When you pause, the kalimba answers to suit your music. Tap in between and it stops, and it''s your turn again.',
  mode_solo_md    = 'The kalimba does not answer. Play freely for as long as you like.',
  motion_md       = $md$### Make the kalimba swing?

Swing your phone and the sound swings with it. For that the kalimba uses your phone's movement. Your phone asks you once whether you allow it.$md$,
  motion_label    = 'Allow swinging'
where exercise_id = 'kalimba' and locale = 'en';

-- ── the marimba ─────────────────────────────────────────────────────────────
update public.exercise_i18n set
  play_md         = '## Wenn du bereit bist, spiel auf der Marimba',
  play_touch_md   = 'Spiele mehrere Töne gleichzeitig, indem du mehrere Stäbe mit deinen Fingern berührst.',
  play_pointer_md = 'Spiele mehrere Töne gleichzeitig, indem du deine Tastatur nutzt oder mit gedrückter Maustaste über mehrere Stäbe fährst.',
  focus_headline  = 'Spiel, bis du ruhig bist.',
  mode_musie_md   = 'Machst du eine Pause, antwortet die Marimba passend zu deiner Musik. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
  mode_solo_md    = 'Die Marimba antwortet nicht. Spiel frei, so lange du magst.',
  motion_md       = $md$### Marimba laut und leise spielen?

Tippst du fester, klingt die Marimba lauter, sanft getippt leiser. Das misst sie an der Erschütterung deines Handys. Dein Handy fragt dich einmal, ob du das erlaubst.$md$,
  motion_label    = 'Bewegung erlauben'
where exercise_id = 'marimba' and locale = 'de';

update public.exercise_i18n set
  play_md         = '## When you''re ready, play the marimba',
  play_touch_md   = 'Play several notes at once by touching several bars with your fingers.',
  play_pointer_md = 'Play several notes at once with your keyboard, or drag across several bars with the mouse button held down.',
  focus_headline  = 'Play until you feel calm.',
  mode_musie_md   = 'When you pause, the marimba answers to suit your music. Tap in between and it stops, and it''s your turn again.',
  mode_solo_md    = 'The marimba does not answer. Play freely for as long as you like.',
  motion_md       = $md$### Play the marimba loud and soft?

Tap harder and the marimba sounds louder, tap gently and it sounds softer. It measures that by how your phone is jolted. Your phone asks you once whether you allow it.$md$,
  motion_label    = 'Allow movement'
where exercise_id = 'marimba' and locale = 'en';

-- ── the harp ────────────────────────────────────────────────────────────────
update public.exercise_i18n set
  play_md         = '## Wenn du bereit bist, spiel auf der Harfe',
  play_touch_md   = 'Zupfe an mehreren Saiten gleichzeitig, indem du mit beiden Daumen spielst. Tippen ist leiser als Zupfen.',
  play_pointer_md = 'Spiele mehrere Töne gleichzeitig, indem du deine Tastatur nutzt oder mit gedrückter Maustaste über mehrere Saiten fährst. Klickst du eine Saite an, ist der Ton leiser, als wenn du sie mit gedrückter Maustaste zupfst.',
  focus_headline  = 'Atme tief ein und aus. Spiele dabei Musies Harfe im Rhythmus deines Atems.',
  mode_musie_md   = 'Machst du eine Pause, antwortet die Harfe passend zu deiner Musik. Spielst du dazwischen, hört sie auf, und du bist wieder dran.',
  mode_solo_md    = 'Die Harfe antwortet nicht. Spiel frei, so lange du magst.'
where exercise_id = 'harp' and locale = 'de';

update public.exercise_i18n set
  play_md         = '## When you''re ready, play the harp',
  play_touch_md   = 'Pluck several strings at once by playing with both thumbs. Tapping is softer than plucking.',
  play_pointer_md = 'Play several notes at once with your keyboard, or drag across several strings with the mouse button held down. Clicking a string sounds softer than plucking it with the mouse button held down.',
  focus_headline  = 'Breathe deeply in and out. Play Musie''s harp in the rhythm of your breath.',
  mode_musie_md   = 'When you pause, the harp answers to suit your music. Play in between and it stops, and it''s your turn again.',
  mode_solo_md    = 'The harp does not answer. Play freely for as long as you like.'
where exercise_id = 'harp' and locale = 'en';
