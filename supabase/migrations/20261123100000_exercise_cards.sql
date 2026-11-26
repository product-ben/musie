-- ═══ EXERCISE CARDS: EVERY EXERCISE GETS A PRINTED CODE ═══════════════════
-- PRD „Übungskarten mit QR-Code" (Ben, 2026-11-20 … 23). Every implemented
-- exercise gets a printed card whose QR code starts it: `https://musie.org/s/EX-02`
-- opens Freie Bahn in its intro, the way `…/s/MC-04` names a deck card.
--
-- Three things, in one migration because they ship together:
--
--   1 · `exercises.code` — the code printed on the exercise card (D4).
--   2 · The scan step of both card exercises stops pointing at the phone's
--       camera app (A9). With this feature a camera-app scan STARTS Freie
--       Bahn (D2, D3), so following the old sentence in the middle of
--       Achtsame Pause would end in a dialog instead of in the music.
--   3 · Two leftovers the app no longer reads are dropped (V5, Ben 23.11.):
--       `exercise_tracks` and `exercises.needs_cards`. Both were logged as
--       „Later drop" on 2026-11-20 (OPEN-QUESTIONS.md, two tracks per card).
--       `grid_cells.track_id` / `artwork_id` are NOT dropped: /maintenance
--       still shows what is parked on an empty square with them.
--
-- ── ACCESS: NOTHING TO GRANT ──────────────────────────────────────────────
-- `exercises` is granted TABLE-WIDE — `select` to authenticated, everything
-- to service_role (`20260918150500`, `20260921100000`, `20260921103000`) — so
-- the new column is covered by grants that are already there, and nothing
-- here widens what anybody can read. No table is created.


-- ═══ 1 · THE CODE ON THE CARD ═════════════════════════════════════════════
-- `EX-NN`, two digits, like `MC-NN` on the deck: the printed form is
-- zero-padded and the decoder accepts exactly that shape
-- (`src/lib/scanCode.ts`). Numbered by today's catalogue order. EX-03 is
-- Atementspannung, which is not built and gets no card yet: its code is
-- reserved so the numbers on paper never have to move.
--
-- NULLABLE on purpose: an exercise without a printed card is ordinary (a new
-- one, before its card exists). UNIQUE, and never reused — a printed card
-- cannot be recalled, so a code freed by a retired exercise must stay free.
alter table public.exercises add column code text;

update public.exercises e
   set code = v.code
  from (values
    ('mindfulness-cards',   'EX-01'),
    ('free-rein',           'EX-02'),
    ('breathing-score',     'EX-03'),
    ('sound-journey',       'EX-04'),
    ('body-scan-soundwalk', 'EX-05'),
    ('kalimba',             'EX-06'),
    ('marimba',             'EX-07'),
    ('harp',                'EX-08')
  ) as v (id, code)
 where e.id = v.id;

alter table public.exercises
  add constraint exercises_code_shape check (code is null or code ~ '^EX-[0-9]{2}$'),
  add constraint exercises_code_key unique (code);

comment on column public.exercises.code is
  'The code printed on the exercise card, beside its QR code: EX-01 … EX-99. '
  'The QR carries <origin>/s/<code>, which starts the exercise (PRD Übungskarten '
  'mit QR-Code, 2026-11-23). Assigned once and never reused: the card is paper.';


-- ═══ 2 · THE SCAN STEP NAMES THE IN-APP SCANNER ONLY (A9) ════════════════
-- Whole texts rather than a replace(): the result is then readable here, and
-- a hosted row that had drifted would be set right rather than left alone.
update public.exercise_i18n
   set scan_md = $md$## Wähle eine Karte aus

- Ziehe eine zufällige Karte vom Stapel. Nimm dir einen Augenblick Zeit, um das Bild auf dich wirken zu lassen. Vielleicht kannst du deine Stimmung in ihr wiederfinden, vielleicht wirst du die Darstellung aber auch eher distanziert betrachten. Alles ist in Ordnung.
- Wenn du so weit bist, scanne den QR-Code hier in Musie.$md$
 where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n
   set scan_md = $md$## Choose a card

- Draw a random card from the deck. Take a moment to let the image work on you. Maybe you will find your own mood in it, maybe you will look at it from more of a distance. Either is fine.
- When you’re ready, scan the QR code here in Musie.$md$
 where exercise_id = 'free-rein' and locale = 'en';

update public.exercise_i18n
   set scan_md = $md$## Wähle eine Karte aus

1. Wähle das Bild aus, das dich gerade am meisten anspricht, aus welchen Gründen auch immer. Lege die anderen Karten außer Sichtweite.
2. Scanne den QR-Code deiner ausgewählten Karte hier in Musie.$md$
 where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n
   set scan_md = $md$## Choose a card

1. Pick the image that speaks to you most right now, for whatever reason. Put the other cards out of sight.
2. Scan the QR code on the card you picked here in Musie.$md$
 where exercise_id = 'mindfulness-cards' and locale = 'en';


-- ═══ 3 · TWO LEFTOVERS GO (V5) ════════════════════════════════════════════
-- `exercise_tracks`: written by `project_deck()` (activation piece only) and
-- read by nothing since 2026-11-20 — the card carries its two pieces and the
-- session stores the one it plays (`sessions_card_plays()`). The projection
-- is re-created without it; everything else it does is unchanged, word for
-- word. `create or replace` keeps the function's grants.
create or replace function public.project_deck()
returns void
language plpgsql
as $$
begin
  update public.cards c
     set image_url = (
           select a.src from public.artworks a
            where a.id = c.artwork_id and a.archived_at is null
         )
   where c.image_url is distinct from (
           select a.src from public.artworks a
            where a.id = c.artwork_id and a.archived_at is null
         );

  insert into public.card_i18n (card_id, locale)
  select c.id, l.locale
    from public.cards c
   cross join (values ('de'), ('en')) as l (locale)
   where c.archived_at is null
  on conflict do nothing;

  update public.card_i18n t
     set image_alt = (
           select i.alt
             from public.cards c
             join public.artworks a
               on a.id = c.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         )
   where t.image_alt is distinct from (
           select i.alt
             from public.cards c
             join public.artworks a
               on a.id = c.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         );
end;
$$;

comment on function public.project_deck() is
  'Derives cards.image_url and card_i18n.image_alt from the card''s artwork, and '
  'gives every live card its two card_i18n rows. exercise_tracks left on '
  '2026-11-23 (PRD Übungskarten mit QR-Code, V5): nothing read it any more.';

drop table public.exercise_tracks;

-- `needs_cards`: a mirror of `kind = 'card_based'` since 2026-10-11, held equal
-- by a check constraint and read by nothing in the app.
alter table public.exercises drop constraint exercises_cards_match_kind;
alter table public.exercises drop column needs_cards;
