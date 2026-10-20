-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS CODES — the door policy for the closed beta
--
-- A short code Ben and Lucy read out to a trial user. They type it, with a
-- first name and an email address, into one form; the `content-admin`-shaped
-- Edge Function `account-signup` checks it, creates the account and records
-- who claimed what.
--
-- ── IT IS A DOOR POLICY, NOT A SECURITY BOUNDARY, AND THAT IS DECIDED ─────
-- Ben, 2026-10-20. Project-level sign-ups stay ENABLED, so a person who reads
-- the public bundle can call GoTrue directly and mint an account without ever
-- seeing a code. Closing that would mean `[auth] enable_signup = false`, which
-- was measured the same day and takes anonymous sign-in with it — breaking the
-- db suite's sixteen `anonymousUser()` calls (run against HOSTED on every
-- merge by `db-push.yml`), `signIn.db.test.ts`'s anonymous assertion, and
-- H.2's conversion proof. The trade was taken knowingly and is the first thing
-- to revisit when the beta stops being twenty people.
--
-- So what this table buys is not a wall. It is: a stranger cannot join by
-- accident, every real signup is attributable to a code somebody handed out,
-- and the whole thing is deleted by one migration when the beta opens.
--
-- ── WHY TWO TABLES ────────────────────────────────────────────────────────
-- `access_codes` is the code and its budget. `access_code_claims` is who used
-- it. They are separate because the second is a LOG — one row per person per
-- code, never updated in place — and because its primary key is what makes a
-- double-tap idempotent. See `claim_access_code`.
--
-- ── NO CODE VALUE IS EVER STATED HERE ─────────────────────────────────────
-- `product-ben/musie` is a PUBLIC repository, so a migration that inserted
-- codes would publish them to GitHub. Rule 4 normally says new rows arrive in
-- a new migration; this is the exception, and the exception is the whole
-- reason the generator is a script that prints to a terminal and writes
-- nothing. Schema travels by migration (rule 4 untouched); these rows do not.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.access_codes (
  -- Four digits, as handed out. TEXT and not an integer: `0421` is a code and
  -- `421` is a different one, and an integer column cannot tell them apart.
  code text primary key,

  -- ── THE BUDGET, NOT A BOOLEAN ───────────────────────────────────────────
  -- `max_uses = 1` is one code per person, which is the default and what the
  -- plan specifies: it caps what a leaked code costs at exactly one account,
  -- and it tells you WHICH tester is which. A higher number is for a room —
  -- one code read out to a workshop of ten — and trades that attribution for
  -- not reading out ten codes. Ben asked for both on 2026-10-20.
  max_uses integer not null default 1,
  uses integer not null default 0,

  -- Free text for whoever generated the batch: "Lucy, UXDX", "Ben's cohort 1".
  -- Never shown to a tester.
  note text,

  -- Revoked, never deleted. A code read out to the wrong person is retired
  -- here; the claims that already used it keep pointing at a row that still
  -- exists, which is why this is a timestamp and not a DELETE.
  revoked_at timestamptz,
  created_at timestamptz not null default now(),

  -- Shape, enforced where a client cannot skip it. Four digits exactly.
  constraint access_codes_code_shape check (code ~ '^[0-9]{4}$'),
  constraint access_codes_max_uses_sane check (max_uses >= 1 and max_uses <= 500),
  constraint access_codes_uses_sane check (uses >= 0),
  constraint access_codes_note_length check (note is null or length(note) <= 200)
);

create table public.access_code_claims (
  code text not null references public.access_codes (code) on delete cascade,

  -- Normalised to lower-case by `claim_access_code` before it ever gets here,
  -- so `Ben@…` and `ben@…` are one person and the double-tap guard holds.
  email text not null,

  -- Set once the account exists. NULL means claimed-but-not-yet-created, which
  -- is the window `release_access_code` is allowed to take back — see there.
  user_id uuid references auth.users (id) on delete set null,

  claimed_at timestamptz not null default now(),

  -- ── THE DOUBLE-TAP GUARD, AND IT IS THIS LINE ───────────────────────────
  -- One row per (code, email). A tester who presses the button twice hits this
  -- on the second request, which `claim_access_code` reads as "you already
  -- have this" rather than as "that code is used up" — about their own code,
  -- one second later. Asked for by Ben on 2026-10-20.
  primary key (code, email),

  constraint access_code_claims_email_shape check (position('@' in email) > 1),
  constraint access_code_claims_email_length check (length(email) <= 254)
);

-- Lets the generator and an operator answer "what is still unused" cheaply.
create index access_codes_unused on public.access_codes (created_at)
  where revoked_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- The client NEVER touches either table. Not to read, not to validate — a
-- browser that could check a code against this table could also enumerate
-- every code in it, which is the `beta_signups` reasoning exactly: whoever
-- holds the anon key must be able to use the door without being able to read
-- the list of keys.
--
-- So `anon` and `authenticated` get NOTHING AT ALL. No policy, not even a
-- restrictive one — there is no grant for a policy to narrow.
--
-- ── THE REVOKE IS NOT DECORATION (rule 2) ─────────────────────────────────
-- This stack ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so both tables above arrive ALREADY FULLY GRANTED to anon and authenticated.
-- Without the revoke below, RLS-with-no-policies would be the only thing
-- standing between a public key and the code list — and `20260921100000`'s
-- header is the record of what happens when the grants are assumed instead of
-- written. Revoke first, then grant. The order is the point.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.access_codes enable row level security;
alter table public.access_code_claims enable row level security;

revoke all on public.access_codes from public, anon, authenticated;
revoke all on public.access_code_claims from public, anon, authenticated;

-- And to service_role what the server may — the half of rule 2 that is easy to
-- miss, because BYPASSRLS makes one assume the grants are irrelevant too.
-- Postgres checks table privileges first, for every role.
grant select, insert, update, delete on public.access_codes to service_role;
grant select, insert, update, delete on public.access_code_claims to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- CLAIMING
--
-- ── WHY THIS IS A FUNCTION AND NOT TWO STATEMENTS IN THE EDGE FUNCTION ────
-- "Is this code free?" followed by "mark it used" is two statements with a gap
-- in the middle, and two people submitting the same code inside that gap both
-- read free and both get in. Single-use would be a comment rather than a
-- guarantee. Everything below happens in one statement each, in one
-- transaction, so the gap does not exist.
--
-- ── THE ORDER: CLAIM FIRST, CREATE SECOND ─────────────────────────────────
-- The account lives in GoTrue and the claim lives here, so they cannot be one
-- transaction. One of them can fail after the other succeeded, and the two
-- orderings fail very differently:
--
--   create then claim   a failure leaves the code REUSABLE and an account
--                       already made — the silent leak
--   claim then create   a failure leaves the code spent and no account — a
--                       tester who calls you, and nothing unsafe
--
-- So the caller claims first and calls `release_access_code` if creation
-- fails. Ben, 2026-10-20. The recoverable failure beats the silent one.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.claim_access_code(p_code text, p_email text)
returns text
language plpgsql as $$
declare
  -- Digits only: a code read down a phone and typed back arrives with spaces
  -- and hyphens more often than not.
  v_code  text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row   public.access_codes%rowtype;
  v_rows  integer;
begin
  if v_email = '' or position('@' in v_email) < 2 then
    return 'invalid_email';
  end if;

  select * into v_row from public.access_codes where code = v_code;
  if not found then
    return 'unknown';
  end if;
  if v_row.revoked_at is not null then
    return 'revoked';
  end if;

  -- THE DOUBLE-TAP, caught by the primary key rather than by a prior read:
  -- a read would have the same gap this whole function exists to close.
  insert into public.access_code_claims (code, email)
  values (v_code, v_email)
  on conflict (code, email) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    -- This email already holds this code. Idempotent success: the budget is
    -- NOT charged twice, and the caller may go on and create the account.
    return 'already_claimed';
  end if;

  -- THE GATE, and it is one atomic statement. Two different emails racing here
  -- both reach it; Postgres locks the row, and the loser re-evaluates
  -- `uses < max_uses` against the winner's committed value and matches nothing.
  update public.access_codes
     set uses = uses + 1
   where code = v_code
     and revoked_at is null
     and uses < max_uses;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    -- Spent, or revoked between the select above and here. Take back the claim
    -- this call just inserted so it cannot block a later legitimate one.
    delete from public.access_code_claims
     where code = v_code and email = v_email and user_id is null;
    return 'exhausted';
  end if;

  return 'claimed';
end;
$$;

-- Record the account against the claim, once GoTrue has made it.
create function public.bind_access_code_claim(p_code text, p_email text, p_user_id uuid)
returns boolean
language plpgsql as $$
declare
  v_code  text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_rows  integer;
begin
  update public.access_code_claims
     set user_id = p_user_id
   where code = v_code and email = v_email;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- ── THE COMPENSATION ──────────────────────────────────────────────────────
-- Called when the account could not be created after the code was claimed, so
-- the tester can try again with the same code instead of ringing Ben.
--
-- `user_id is null` IS THE SAFETY. A claim that already carries an account is
-- a finished signup, and releasing one would hand a spent code back while
-- leaving the account standing. Only the half-finished window can be undone.
create function public.release_access_code(p_code text, p_email text)
returns boolean
language plpgsql as $$
declare
  v_code  text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_rows  integer;
begin
  delete from public.access_code_claims
   where code = v_code and email = v_email and user_id is null;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  -- `greatest(…, 0)` so a double release can never drive the budget negative
  -- and hand out a free use.
  update public.access_codes
     set uses = greatest(uses - 1, 0)
   where code = v_code;

  return true;
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, so without
-- this any signed-in user could call these over `/rest/v1/rpc` and spend codes
-- at will. The table grants above would not stop it: these functions run as
-- their caller, but `claim_access_code` is reachable by name regardless of who
-- holds what on the tables. `20261014100000` revoked `admin_write` for the
-- same reason.
revoke all on function public.claim_access_code(text, text)                from public, anon, authenticated;
revoke all on function public.bind_access_code_claim(text, text, uuid)     from public, anon, authenticated;
revoke all on function public.release_access_code(text, text)              from public, anon, authenticated;

grant execute on function public.claim_access_code(text, text)             to service_role;
grant execute on function public.bind_access_code_claim(text, text, uuid)  to service_role;
grant execute on function public.release_access_code(text, text)           to service_role;
