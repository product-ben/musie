-- ═══════════════════════════════════════════════════════════════════════════
-- AN EXERCISE SAYS WHAT KIND OF THING IT IS — Ben, 2026-10-11
--
-- Three kinds, and each one is a promise about what you need with you:
--
--   card_based           the paper deck and a phone camera
--                        → Achtsame Pause, Freie Bahn
--   listening_only       headphones, and somewhere to sit or lie down
--                        → Klangreise, Bodyscan
--   digital_interactive  the phone itself, for the whole exercise
--                        → Atementspannung
--
-- ── WHAT IT IS FOR: THE STEPS ─────────────────────────────────────────────
-- The kind decides which steps a run has. A card exercise walks all four —
-- intro, scan, listen, reflect — and a listening exercise walks three, because
-- there is no card to scan. That was already true and was derived from
-- `needs_cards` (D14); what changes is WHERE the answer comes from and what it
-- is allowed to mean.
--
-- THE STEP LIST ITSELF IS NOT IN HERE, and must not be. A step is a React
-- screen (`apps/web/src/lib/exerciseKind.ts`), so a step list in the database
-- could promise a screen that does not exist. This column says which kind; the
-- code says which screens a kind runs.
--
-- ── WHY A CHECK AND NOT A LOOKUP TABLE ────────────────────────────────────
-- This schema already splits those two cleanly, and the line is whether people
-- read the value:
--
--   check constraints   for structural enums the CODE branches on —
--                       sessions.status, sessions.step, reflections.mode,
--                       sessions.feeling_change
--   lookup tables       for content taxonomies with labels people READ —
--                       user_types, goals, and their _i18n siblings
--
-- A kind is never printed. What a person sees is the consequence of it: the
-- fact chips on the library card, and a stepper with three stages instead of
-- four. A visible *type* label would be the product explaining its own schema.
-- So a table here would buy an i18n sibling nobody reads, a `sort` nobody
-- orders by, and a join on every exercise query.
--
-- ── NULLABLE, FILLED, THEN `set not null` — AND NO DEFAULT, EVER ──────────
-- A default would mean a future `insert` that forgets the kind is silently
-- filed as card-based, and the failure would be a new exercise quietly
-- demanding a deck. With no default, an exercise that does not say what it is
-- fails to insert. The three-statement shape is the price of that, and the
-- column is `not null` by the end of this file either way.
--
-- ── `needs_cards` STOPS BEING AN ANSWER AND BECOMES A MIRROR ──────────────
-- It is the same fact twice, and two columns that can disagree about whether
-- an exercise draws cards is exactly the drift this repo kills on sight. The
-- honest fix is to drop it — and that is NOT what this file does, for one
-- reason that has nothing to do with modelling:
--
--   EIGHT WORKTREES ARE LIVE, every one of them selects `needs_cards` in
--   `apps/web/src/lib/content.ts`, and they all run against the one Postgres
--   this stack serves (CLAUDE.md rule 9). Dropping it here means the next
--   `supabase db reset` breaks every other agent's app with a PostgREST error
--   in a file they did not touch.
--
-- So it stays, nailed to `kind` by a check constraint so it cannot drift, and
-- dropping it is a one-statement follow-up once those branches are in. Logged
-- in apps/web/OPEN-QUESTIONS.md so it is a decision rather than a leftover.
--
-- ── ORDER IS LOAD-BEARING ─────────────────────────────────────────────────
-- Both checks are added AFTER the updates. `exercises_cards_match_kind` would
-- fail against three rows for as long as any row carried a kind that did not
-- match its `needs_cards`, which is every row until the updates below run.
--
-- ── ACCESS: NOTHING TO DO, AND CHECKED RATHER THAN ASSUMED ────────────────
-- Rule 2's second half is the one that gets missed, so both roles, explicitly:
--
--   20260918150500_content_schema.sql   grant select on public.exercises to authenticated
--   20260921100000_service_role_grants.sql
--                                       grant select on public.exercises to service_role
--   20260921103000_service_role_content_writes.sql
--                                       grant insert, update, delete … to service_role
--
-- All THREE are table-level, and a table grant covers every column the table
-- ever gets. That is the asymmetry that makes `public.tracks` different: it
-- carries a COLUMN grant, so a column added there is unreadable until it is
-- named in a new grant. Nothing of the sort applies here.
--
-- `exercises_select` is `using (true)` for authenticated and names no column,
-- so the new value is readable by every signed-in user, which is right: the
-- client is the thing that has to know how many steps to draw.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercises
  add column kind text;

comment on column public.exercises.kind is
  'What kind of exercise this is, and therefore which steps a run has: '
  'card_based (intro/scan/listen/reflect), listening_only (intro/listen/'
  'reflect), digital_interactive (not yet designed). The step list itself '
  'lives in apps/web/src/lib/exerciseKind.ts — a step is a screen, and the '
  'database must not be able to promise one that does not exist.';

-- The two that draw the deck. Both implemented, both shipping today.
update public.exercises set kind = 'card_based'
  where id in ('mindfulness-cards', 'free-rein');

-- Atementspannung. Needs sound, draws no card, and is the whole of this kind:
-- the breathing screens are not designed, so the row exists to stop the
-- exercise being MISTYPED as a listening one rather than to switch anything on.
update public.exercises set kind = 'digital_interactive'
  where id = 'breathing-score';

-- Klangreise and Bodyscan, which is what the listening type is being built for.
update public.exercises set kind = 'listening_only'
  where id in ('sound-journey', 'body-scan-soundwalk');

-- Every row has one now, so the column can insist on it. No default: see the
-- header.
alter table public.exercises
  alter column kind set not null;

-- The three the product can draw, and nothing else. `sessions_status_known`
-- next door is the model, minus the null branch — this column is `not null`.
alter table public.exercises
  add constraint exercises_kind_known
  check (kind in ('card_based', 'digital_interactive', 'listening_only'));

-- ONE FACT, ONCE. `needs_cards` is kept for rule 9's sake (see the header) and
-- is now a mirror of the kind rather than a second answer to the same
-- question. Equality in both directions, so neither column can move alone.
alter table public.exercises
  add constraint exercises_cards_match_kind
  check ((kind = 'card_based') = needs_cards);

comment on column public.exercises.needs_cards is
  'SUPERSEDED by `kind`, and held equal to it by exercises_cards_match_kind. '
  'Kept only because eight worktrees select it against this one Postgres '
  '(CLAUDE.md rule 9); dropping it is a one-statement follow-up migration.';
