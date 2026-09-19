-- ═══════════════════════════════════════════════════════════════════════════
-- profiles — one row per auth user, created by trigger, readable only by its
-- owner.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  user_type_id text,
  language     text        not null default 'en',
  theme        text        not null default 'light',
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users row, created by the on_auth_user_created trigger. '
  'Never inserted from the client.';

-- ── Row level security ─────────────────────────────────────────────────────
-- Without this, the grant below would expose every row to every signed-in
-- user. RLS first, then the grant.
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No delete policy, deliberately. A profile dies with its auth user, through
-- the `on delete cascade` above, and by no other route.

-- ── Taking back what nobody asked for, and only then granting ─────────────
-- MEASURED, not assumed: the local stack ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so at this point `anon` AND `authenticated` already hold arwdDxtm on this
-- table — every privilege, DELETE and TRUNCATE included — regardless of the
-- grant above. The two environments therefore disagree: hosted exposes
-- nothing until granted, local exposes everything by default.
--
-- That leaves "no delete" resting entirely on there being no delete policy.
-- True, but a single line away from not being true: add a permissive policy
-- later, for any reason, and DELETE comes with it. These revokes make the
-- privilege surface match the intent in both environments, so RLS is the
-- second lock rather than the only one.
--
-- anon loses everything: an unauthenticated caller has no business here, and
-- the app signs in before it reads anything. There is no anon policy either,
-- so this removes no working access.
revoke all on table public.profiles from anon;

-- authenticated: REVOKE ALL, then grant back exactly the three operations the
-- app performs.
--
-- `revoke all`, NOT an enumerated `revoke delete, truncate, references,
-- trigger`. MEASURED on this stack (PostgreSQL 17.6): the enumerated form
-- left `authenticated=arwm` — the trailing `m` is MAINTAIN, a privilege that
-- arrived in PG 17 and that no enumeration written before it could name. It
-- only permits VACUUM / ANALYZE / REINDEX / CLUSTER / REFRESH, so nothing
-- leaked. The lesson is the shape, not the privilege: an enumerated revoke
-- stops being complete the next time Postgres invents one, and it fails OPEN.
--
-- The grant now comes AFTER the revoke, which is also the order CLAUDE.md
-- rule 2 states. It was the other way round here, which worked only because
-- the revoke was enumerated and could not take the grant back with it.
revoke all on table public.profiles from authenticated;

-- ── API visibility ─────────────────────────────────────────────────────────
-- The hosted project has "automatically expose new tables" turned OFF, so
-- without this grant PostgREST cannot see the table at all and every request
-- fails with a permission error rather than returning an empty set — which
-- reads like broken RLS and is not.
--
-- No DELETE: a profile dies with its auth user, through the `on delete
-- cascade` above, and by no other route.
grant select, insert, update on table public.profiles to authenticated;

-- ── Row creation ───────────────────────────────────────────────────────────
-- A trigger, not a client-side upsert. Two reasons: a client upsert races
-- itself whenever the app mounts twice (React StrictMode does exactly that),
-- and it would need an insert path that a client could also use to write a
-- row for someone else.
--
-- security definer, so the insert runs as the function owner and RLS does not
-- block it — the owner of a table bypasses that table's policies.
--
-- set search_path = '' is not decoration: a definer function with a mutable
-- search_path can be pointed at an attacker's `profiles`. Every name below is
-- therefore schema-qualified.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- on conflict do nothing, so a retried signup cannot fail the insert into
  -- auth.users. This trigger must never be the reason a user cannot sign up.
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Creates the public.profiles row for a new auth user. Runs as owner so RLS '
  'does not block the insert.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
