-- ═══════════════════════════════════════════════════════════════════════════
-- Evaluate auth.uid() once per query instead of once per row.
--
-- Reported by the Performance Advisor, three times — once per policy:
--
--   [WARN] auth_rls_initplan
--     Table `public.profiles` has a row level security policy
--     `profiles_select_own` that re-evaluates current_setting() or
--     auth.<function>() for each row.
--
-- auth.uid() is a STABLE function reading a request-local setting, so its
-- value cannot change during a statement — but written bare in a policy,
-- Postgres calls it per row anyway. Wrapping it in a scalar subquery turns it
-- into an InitPlan: evaluated once, then compared against every row.
--
-- The semantics are identical. `user_id = (select auth.uid())` accepts and
-- refuses exactly the same rows as `user_id = auth.uid()`; only the number of
-- calls changes. Verified after this migration by re-running the isolation
-- proof: a second anonymous user still cannot read or write the first user's
-- row.
--
-- Policies cannot be altered in place, so they are dropped and recreated.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy profiles_select_own on public.profiles;
drop policy profiles_insert_own on public.profiles;
drop policy profiles_update_own on public.profiles;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Still no delete policy. A profile dies with its auth user, through the
-- `on delete cascade` on profiles.user_id, and by no other route.
