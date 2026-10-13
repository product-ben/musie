-- ═══════════════════════════════════════════════════════════════════════════
-- AN EXERCISE SAYS WHETHER IT ASKS HOW YOU ARE LISTENING
--
-- Shipped three hours earlier as a list of exercise ids in
-- `apps/web/src/lib/exerciseKind.ts`, with its own docblock arguing that a
-- two-row list is a column nobody has written yet and that the moment to write
-- it is when a second exercise wants it. Ben, 2026-10-13: that will "absolutely
-- happen". So it is written now, before the list has a chance to grow a second
-- entry and become the place people look.
--
-- ── WHY IT CANNOT BE DERIVED ──────────────────────────────────────────────
-- Worth keeping, because it is the rule a later reader will reach for first.
-- The tempting derivation is *ask only where a posture-specific cut exists*,
-- and it is wrong in exactly the case that prompted this: every cut delivered
-- so far is posture-agnostic, the Bodyscan's included, so that rule silences
-- both questions rather than one. What separates them is editorial — the
-- Bodyscan's guidance addresses a posture out loud and the Klangreise's does
-- not — and nothing in `exercise_cuts` knows that.
--
-- ── NULLABLE, AND TIED TO THE KIND ────────────────────────────────────────
-- Three states, not two: *asks*, *does not ask*, and *the question does not
-- arise*. A card exercise never reaches either listening question, so a
-- `not null default true` would have `mindfulness-cards` claiming to ask about
-- a posture it has no screen for — a column that is false for the wrong reason
-- reads exactly like one that is false for the right one.
--
-- So null means INAPPLICABLE, and `exercises_asks_posture_applies` holds it
-- equal to the kind in both directions. `exercises_cards_match_kind` from
-- `20261011100000` is the model, minus the boolean mirror: that one keeps two
-- columns saying one thing, this one keeps a column APPLICABLE exactly where
-- its question is asked.
--
-- `digital_interactive` is null too, and that is not an oversight.
-- Atementspannung borrows the listening run's three steps but `Session.tsx`
-- gates both questions on `listening_only`, so it asks neither. When the
-- breathing screens are designed, this constraint is one of the things that
-- will have to be answered rather than discovered.
--
-- ── ACCESS · NOTHING TO DO ────────────────────────────────────────────────
-- A new COLUMN, not a new table, on one whose grants are table-level:
-- `20260918150500_content_schema.sql` grants select on `public.exercises` to
-- `authenticated`, and `exercises_select` is `using (true)` and names no
-- column. `20261011100000` wrote the same paragraph when it added `kind`, and
-- `public.tracks` remains the only table here carrying a COLUMN grant, where
-- this would not have been true. Checked, not assumed.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercises
  add column asks_posture boolean;

comment on column public.exercises.asks_posture is
  'Whether the intro step asks *Wie möchtest du zuhören?* — sitting or lying. '
  'Null where the question does not arise, which is every kind but '
  'listening_only, and is held so by exercises_asks_posture_applies. The '
  'ENDING question has no twin column: every listening exercise asks it, and a '
  'column that is true on every row is not a fact.';

-- Both listening exercises asked it until today; the Klangreise stops.
update public.exercises set asks_posture = true  where kind = 'listening_only';
update public.exercises set asks_posture = false where id = 'sound-journey';

-- APPLICABLE EXACTLY WHERE THE QUESTION IS ASKED. See the header.
alter table public.exercises
  add constraint exercises_asks_posture_applies
  check ((kind = 'listening_only') = (asks_posture is not null));
