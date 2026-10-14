-- ═══════════════════════════════════════════════════════════════════════════
-- NOTHING IS SCANNED IN DIGITAL MODE, SO `scan` IS NOT THE STEP
--
-- `DIGITAL-CARDS-PLAN.md`. One step was doing three jobs — the QR frame, a grid
-- of five pictures, and one drawn card — and keeping that readable from the
-- outside had produced four separate answers to one question: a label override
-- per exercise, a derived "which step owns the sheet", a derived "which step
-- deals", and an Einsteigen button that performed a write. Four things kept in
-- agreement by hand.
--
-- Letting the step BE the answer is what this file makes possible. Three
-- changes, and they land together or not at all, which is why they are one
-- migration rather than three.
--
-- ── 1 · TWO MORE STEP NAMES ───────────────────────────────────────────────
-- `view` and `select`, as English in the column for the reason every id in
-- this schema is English: the German is the i18n catalogue's and translating a
-- key makes every query a lookup.
--
-- A run still has FOUR steps. The second one is `scan`, `view` or `select` and
-- never two of them — Ben, 2026-10-14: the rail must not change length when
-- the switch is flipped, only the second marker's name. So the constraint is a
-- list of six and no row will ever use all of them.
--
-- THE CHECK IS DROPPED AND RE-ADDED rather than altered: Postgres has no
-- `alter constraint` for a check expression, and `not valid` + `validate`
-- would be the move for a table too big to scan. `sessions` is not.
--
-- ── 2 · WHICH RUN A SESSION IS ────────────────────────────────────────────
-- `digital_cards`, and it is a column rather than a derivation because the
-- REACHABILITY RULE COMPUTES FROM THE STEP LIST. `isWizardStepReachable` is
-- given the run's steps, and the run's steps now depend on the mode — so a
-- session resumed from the drawer without the mode computes the PAPER run
-- while sitting on `view`, and the rule then refuses the step the row is
-- actually on. Ben chose the column over deriving it for exactly that reason.
--
-- `not null default false` is the honest default here, unlike `profiles.theme`
-- and `profiles.language`, where a default hid the difference between "chose
-- this" and "chose nothing". There is no third state: a session either runs
-- with the deck on the table or it does not, every row that exists today did,
-- and the switch is answered on the first screen of every run.
--
-- ── 3 · HOW MANY CARDS AN EXERCISE DEALS ──────────────────────────────────
-- `cards_dealt` has been a map in `apps/web/src/lib/digitalCards.ts` since the
-- day the feature was built, with a header promising this column and naming
-- why it was not written: the commands that apply a migration are Ben's under
-- rule 9, and a column the generated types do not have is a compile error in
-- every screen that reads it.
--
-- It rides along now because the other two are being applied anyway, and
-- because it is load-bearing twice over: it decides how many cards the hand
-- holds AND which of the two digital steps the run has.
--
-- NULL WHERE NO CARDS ARE DRAWN, and the check holds it to the kind — the same
-- shape `20261011100000` gave `needs_cards`, so a kind and a count cannot
-- disagree. `smallint` because the deck is nine.
--
-- ── ACCESS · NOTHING TO DO, AND IT IS CHECKED ─────────────────────────────
-- CLAUDE.md rule 2 is about a NEW TABLE. Both of these are new COLUMNS on
-- tables whose grants are already table-level:
--
--   20260919120000_sessions.sql
--     grant select, insert, update, delete on table public.sessions to authenticated;
--   20260921100000_service_role_grants.sql
--     grant select, insert, update, delete on table public.sessions to service_role;
--     grant select on table public.exercises to service_role;
--   20260918150500_content_schema.sql
--     grant select on table public.exercises to authenticated;
--   20260921103000_service_role_content_writes.sql
--     grant insert, update, delete on table public.exercises to service_role;
--
-- A table-level grant covers every column the table ever gets, so both are
-- readable by both roles the moment they exist. THE ASYMMETRY `20261011110100`
-- WROTE DOWN STILL HOLDS and still does not apply here: `public.tracks` carries
-- a COLUMN grant, so a column added there is unreadable until a new grant names
-- it. Neither of these tables is `tracks`. Checked, not assumed.
--
-- ── AFTER THIS FILE ───────────────────────────────────────────────────────
--   supabase db reset   re-applies every migration, this one last
--   pnpm gen:types      digital_cards and cards_dealt into database.types.ts
--   pnpm test:db        proves the constraint and the two columns
--
-- Nothing in `apps/web` typechecks against the two columns until the second of
-- those has run. That is the sequencing and it is not avoidable.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE SIX STEP NAMES ════════════════════════════════════════════════
alter table public.sessions drop constraint sessions_step_known;

alter table public.sessions add constraint sessions_step_known
  check (step in ('intro', 'scan', 'view', 'select', 'listen', 'reflect'));

comment on column public.sessions.step is
  'Where in the run this session is. Six legal names, and a run uses four of '
  'them: the second step is scan (the deck is on the table), view (one card '
  'dealt digitally) or select (five dealt digitally), never two.';


-- ═══ 2 · WHICH RUN ═════════════════════════════════════════════════════════
alter table public.sessions add column digital_cards boolean not null default false;

comment on column public.sessions.digital_cards is
  'True where the cards are not on the table. Decides which steps the run has, '
  'which is why it is stored rather than derived: the wizard''s reachability '
  'rule computes from the step list, so a resumed session has to know which '
  'list it has.';


-- ═══ 3 · HOW MANY CARDS ════════════════════════════════════════════════════
alter table public.exercises add column cards_dealt smallint;

update public.exercises set cards_dealt = 5 where id = 'mindfulness-cards';
update public.exercises set cards_dealt = 1 where id = 'free-rein';

-- The two statements above are the whole of the content; the check below then
-- holds every future row to the same agreement rather than trusting the next
-- insert to remember.
alter table public.exercises add constraint exercises_cards_dealt_matches_kind
  check ((kind = 'card_based') = (cards_dealt is not null));

alter table public.exercises add constraint exercises_cards_dealt_sane
  check (cards_dealt is null or (cards_dealt between 1 and 9));

comment on column public.exercises.cards_dealt is
  'How many cards this exercise lays out, or null where it draws none. Nine is '
  'the deck, so nine is the ceiling. Decides the size of a digital hand and '
  'which of the two digital second steps the run has.';
