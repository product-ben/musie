-- ═══════════════════════════════════════════════════════════════════════════
-- A CARD CANNOT BE RETIRED YET — Ben, 2026-10-14
--
-- ── THE BUG THIS STANDS IN FRONT OF ───────────────────────────────────────
-- `MAINTENANCE-UI.md` §10 says, of archiving: *"One line of shipped read code
-- changes for this: the deck query filters `archived_at is null`."* That line
-- was never written. `CARD_SELECT` in `apps/web/src/lib/content.ts` reads
--
--   id, code, image_url, sort, card_i18n(locale, feeling, image_alt)
--
-- and nothing anywhere filters `cards.archived_at`. So retiring a card today
-- does half of what it says: the card leaves the maintenance grid, frees its
-- square and keeps its code — and STAYS IN THE DECK THE PRODUCT DEALS. A
-- player would be handed a card the operator believes is withdrawn, and the
-- operator has no way to see that from the screen they did it on.
--
-- Retiring a TRACK or an ARTWORK is sound and is untouched: `project_deck()`
-- skips archived rows, so the pairing disappears and the card goes silent or
-- loses its picture. It is only the card itself that the read path cannot
-- hide. That asymmetry is why this guard is one trigger on one column rather
-- than anything wider.
--
-- ── WHY A TRIGGER AND NOT JUST A DISABLED BUTTON ──────────────────────────
-- The button is disabled in the same change. A disabled button is not a
-- guard: a stale tab, a second maintainer, a replayed request or a future
-- refactor all reach `admin_write` without passing it — the same reason the
-- maintenance route's own gate is called cosmetic in `Maintenance.tsx`, and
-- the reason `cards_code_write_once` exists beside a read-only field.
--
-- The cost of being wrong here is not a failed write, it is a beta tester
-- drawing a card nobody meant them to have, discovered by them rather than by
-- us.
--
-- ── RESTORE STILL WORKS, AND THAT IS DELIBERATE ───────────────────────────
-- Only the null → not-null direction is refused. Nothing is archived today,
-- but if anything ever is — by a hand-written statement, by a restore of an
-- older dump — bringing it back must not be blocked by the guard that stops
-- it leaving. A guard that can trap a row in the state it exists to prevent
-- is worse than no guard.
--
-- ── HOW THIS GOES AWAY ────────────────────────────────────────────────────
-- One statement, in the migration that adds the filter to `content.ts`:
--
--   drop trigger cards_archive_disabled on public.cards;
--
-- It is written as a trigger precisely so that removing it is one line and
-- cannot be half-done.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.cards_archive_disabled() returns trigger
language plpgsql as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    raise exception
      'a card cannot be retired yet: the deck query does not filter '
      'archived_at, so a retired card would still be dealt to players. '
      'Retire its music or its picture instead, or add the filter to '
      'CARD_SELECT in apps/web/src/lib/content.ts and drop this trigger.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.cards_archive_disabled() is
  'TEMPORARY, 2026-10-14. Refuses archiving a card while the app''s deck query '
  'still has no archived_at filter — see 20261014150000. Drop the trigger in '
  'the same change that adds the filter.';

create trigger cards_archive_disabled
  before update of archived_at on public.cards
  for each row execute function public.cards_archive_disabled();

-- Rule 2's half that gets missed. `service_role` is the only caller that
-- reaches `cards` at all, and a trigger function runs as the invoker, so the
-- grant below is what the maintenance function needs; `public` keeps nothing.
revoke all on function public.cards_archive_disabled() from public, anon, authenticated;
grant execute on function public.cards_archive_disabled() to service_role;
