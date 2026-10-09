-- ═══════════════════════════════════════════════════════════════════════════
-- HOW THE SESSION LEFT YOU — Ben, 2026-10-09
--
-- The reflect step asks "Wie fühlst du dich jetzt?" on a three-point scale and
-- had nowhere to put the answer. This is that column.
--
-- ── IT IS A CHANGE, NOT A MOOD, AND THE NAME SAYS SO ──────────────────────
-- The three answers are *schlechter / genau wie / besser als vorher*: every one
-- of them is a comparison with how the person arrived. A column called `mood`
-- would be read as an absolute reading by the first person to query it, and the
-- scale cannot produce one — somebody who came in low and left slightly less
-- low answers `better`, and so does somebody who came in fine.
--
-- `feeling_change` ALSO KEEPS IT APART FROM `card_i18n.feeling`, which is a
-- different thing entirely: the emotion word a printed card is named for
-- (Freude, Trauer, Einsamkeit). Two columns called `feeling` on tables that
-- join in the diary is a trap with no upside.
--
-- ── NULLABLE, BECAUSE THE QUESTION IS OPTIONAL ────────────────────────────
-- The save button is never disabled. Leaving the scale unanswered opens a
-- dialog that says so and offers to save anyway, so a finished session with no
-- answer is an ordinary outcome rather than a broken row — the same shape
-- `goal_id` uses, and for the same reason. A default would invent an answer
-- nobody gave.
--
-- ── NO GRANT AND NO POLICY, CHECKED RATHER THAN ASSUMED ───────────────────
-- Rule 2's second half is the one that gets missed, so both roles, explicitly:
--
--   20260919120000_sessions.sql:313
--     grant select, insert, update, delete on table public.sessions to authenticated;
--   20260921100000_service_role_grants.sql:81
--     grant select, insert, update, delete on table public.sessions to service_role;
--
-- Both are TABLE-level, and a table grant covers every column the table ever
-- gets — which is exactly the asymmetry that makes `public.tracks` different,
-- since tracks carries a COLUMN grant and a column added there is unreadable
-- until it is named.
--
-- `sessions_update_own` filters by `(select auth.uid())` on both `using` and
-- `with check` and names no column, so the client may write this on its own
-- rows and on no others. That is the whole access rule.
--
-- ── A CORRECTION TO 20261002100000_sessions_listened_at.sql ───────────────
-- That file's closing section says `public.sessions` has NO explicit
-- `service_role` grant in any migration, and warns that `reveal-track` would
-- fail with 42501 on hosted if the default grant were off. It is wrong, and
-- was when it was written: 20260921100000:81 grants exactly that, eleven days
-- earlier. Recorded here rather than edited there, because that file is applied
-- and rule 4 does not bend for a comment.
--
-- ── WHAT THIS FILE DOES NOT DO ────────────────────────────────────────────
-- No index. The column is read as part of a session row that is already being
-- fetched by `id` or by `user_id, started_at desc`, and nothing filters or
-- groups by it yet. An index for a query nobody makes is a write cost with no
-- reader.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.sessions
  add column feeling_change text;

comment on column public.sessions.feeling_change is
  'How the session left the person, relative to how they arrived: worse, same '
  'or better. Null means the question was not answered, which is a real '
  'outcome — the reflect step offers to save without it.';

-- The three the scale can produce, and nothing else. Null passes, which is what
-- makes the question optional; `sessions_status_known` next door is the model.
alter table public.sessions
  add constraint sessions_feeling_change_known
  check (feeling_change is null or feeling_change in ('worse', 'same', 'better'));
