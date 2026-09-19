-- ═══════════════════════════════════════════════════════════════════════════
-- profiles.user_type_id → user_types.id
--
-- The column shipped before user_types existed, so it has been an unvalidated
-- text column that would happily store a typo. Adding the constraint now is
-- free: nothing writes the column yet, and every existing profiles row has
-- null there. Once there are real rows it stops being free.
--
-- Separate migration, after the content seed, so the referenced rows exist
-- when the constraint is validated.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add constraint profiles_user_type_id_fkey
  foreign key (user_type_id)
  references public.user_types (id)
  -- SET NULL, emphatically not CASCADE: retiring a user type must not delete
  -- the people who chose it. They lose the answer, not the account.
  on delete set null;

-- Postgres does not index the referencing side of a foreign key. Without this,
-- every delete or update of a user_types row sequentially scans profiles to
-- check the constraint — and it is what the Performance Advisor reports as an
-- unindexed foreign key.
create index profiles_user_type_id_idx on public.profiles (user_type_id);
