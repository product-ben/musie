-- ═══════════════════════════════════════════════════════════════════════════
-- `service_role` gets the content tables in full. The migration before this
-- one was too narrow, and the test suite said so within the minute.
--
-- 20260921100000 granted `service_role` SELECT on the content tables, reasoning
-- that content changes by migration so the server never writes it. True of
-- production, and wrong as a grant — because it is not only production that
-- holds the key.
--
-- `db.sessions.db.test.ts` proves two properties of the catalogue that no type
-- and no policy can state: retiring an exercise or a track a session refers to
-- is REFUSED (`on delete restrict`), and retiring a card is PERMITTED and
-- nulls the reference (`on delete set null`). Both are constraint behaviour,
-- and the only way to observe a constraint is to attempt the statement. The
-- suite attempts it as `service_role`, inserts a throwaway card as a fixture,
-- and then — in a comment written before any of this happened — says why:
--
--     "The POSITIVE CONTROL for the test above: the same client, the same kind
--      of statement, through a SET NULL reference instead of a RESTRICT one —
--      so a failure there cannot be 'the service role cannot delete content'."
--
-- Under the narrow grant it failed with 42501, insufficient privilege: exactly
-- the cause that control exists to rule out. Measured, then fixed here.
--
-- ── THE REASONING THAT WAS ACTUALLY WRONG ─────────────────────────────────
-- The point of the hosted project is PARITY: hosted should behave as the local
-- stack behaves, so a suite that passes in one passes in the other. The local
-- stack gives `service_role` everything. A grant narrower than that is a
-- divergence introduced while removing one, which is worse than the divergence
-- it replaced, because it is ours rather than the platform's.
--
-- The security argument for narrowness was weak in any case. Anyone holding
-- the secret key can already read every user's reflections; withholding DELETE
-- on a seeded exercise from that same key is not a boundary, it is a gesture.
-- The boundary that matters is that the key never reaches a browser, which
-- `lib/supabase.ts` refuses at startup and `.env.example` states twice.
--
-- `anon` and `authenticated` are untouched. Their grants stay exactly as
-- narrow as they were, and `tracks.title` and `.artist` remain unreadable to
-- the client — which the suite re-proves on every run.
-- ═══════════════════════════════════════════════════════════════════════════

grant insert, update, delete on table public.user_types          to service_role;
grant insert, update, delete on table public.user_type_i18n      to service_role;
grant insert, update, delete on table public.situations          to service_role;
grant insert, update, delete on table public.situation_i18n      to service_role;
grant insert, update, delete on table public.exercises           to service_role;
grant insert, update, delete on table public.exercise_i18n       to service_role;
grant insert, update, delete on table public.exercise_situations to service_role;
grant insert, update, delete on table public.cards               to service_role;
grant insert, update, delete on table public.card_i18n           to service_role;
grant insert, update, delete on table public.tracks              to service_role;
grant insert, update, delete on table public.exercise_tracks     to service_role;
