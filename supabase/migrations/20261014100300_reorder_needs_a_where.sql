-- ═══════════════════════════════════════════════════════════════════════════
-- `admin_reorder_cards` PARKED THE ORDER WITH NO WHERE CLAUSE
--
-- Found by `maintenance.db.test.ts` on the first run, with:
--
--   21000: UPDATE requires a WHERE clause
--
-- ── WHY IT PASSED THE MIGRATION AND FAILED THE TEST ───────────────────────
-- This is the interesting part, and it is the reason the test had to exist.
--
-- Supabase enables `pg_safeupdate` for the roles that reach the database
-- THROUGH PostgREST, which refuses an `update` or `delete` with no `where` —
-- a guard against the classic one-keystroke accident. A migration runs as
-- `postgres` and is not subject to it, so `20261014100000` applied perfectly
-- and the function inside it was broken for the only caller it has.
--
-- A function that is valid when written and refused when called is invisible
-- to `supabase db reset` and to `pnpm check`, which touches no database at
-- all. Nothing but an actual rpc through the API would have caught it, which
-- is exactly what `pnpm test:db` is for.
--
-- ── THE FIX, AND WHY IT IS NOT `where true` ───────────────────────────────
-- `where true` is optimised away before the guard sees it, so it is both a
-- lie and ineffective. `sort < 1000` is a real predicate AND it says
-- something: a row already above the parking line is one this function has
-- somehow parked twice, and skipping it is right rather than incidental.
--
-- Everything else about the function is unchanged. `create or replace` rather
-- than a drop, so nothing has to re-grant: the revoke and the grant from
-- `20261014100000` survive a replace, and re-stating them would be the kind
-- of duplication that silently drifts.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.admin_reorder_cards(
  p_actor_id    uuid,
  p_actor_email text,
  p_ids         text[]
) returns jsonb
language plpgsql as $$
declare
  v_id   text;
  v_i    int := 0;
  v_was  int;
  v_rows jsonb := '[]'::jsonb;
begin
  -- Out of the way of the values below. `cards.sort` is `unique` and NOT
  -- deferrable, so Postgres checks it as each ROW is written and two cards
  -- swapping places collide halfway through an update that ends perfectly
  -- valid — the trap 20260923150000 hit on `exercises.sort`.
  --
  -- The `where` is required by pg_safeupdate for a caller arriving through
  -- PostgREST; see this file's header.
  update public.cards set sort = sort + 1000 where sort < 1000;

  foreach v_id in array p_ids loop
    v_i := v_i + 1;
    select sort - 1000 into v_was from public.cards where id = v_id;
    if v_was is null then
      raise exception 'there is no card %', v_id using errcode = 'no_data_found';
    end if;

    update public.cards set sort = v_i where id = v_id;

    if v_was is distinct from v_i then
      insert into public.content_edits
        (actor_user_id, actor_email, entity, row_id, action, before, after)
      values
        (p_actor_id, p_actor_email, 'card', v_id, 'update',
         jsonb_build_object('sort', v_was), jsonb_build_object('sort', v_i));
    end if;

    v_rows := v_rows || jsonb_build_object('id', v_id, 'sort', v_i);
  end loop;

  -- Anything still parked is a card the caller did not name. It keeps its
  -- relative order, after everything that was named.
  update public.cards c set sort = v_i + ranked.pos
    from (select id, row_number() over (order by sort) as pos
            from public.cards where sort > 1000) as ranked
   where c.id = ranked.id;

  perform public.project_deck();
  return v_rows;
end;
$$;
