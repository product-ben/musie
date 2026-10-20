-- ═══════════════════════════════════════════════════════════════════════════
-- LEGAL ACCEPTANCES — what a person agreed to, and when
--
-- Signing up asks for ONE agreement — the terms — and shows the privacy policy
-- beside it. This is where both are recorded, and the two rows do not mean the
-- same thing.
--
-- ── 'terms' IS CONSENT. 'privacy' IS NOT ──────────────────────────────────
-- Ben, 2026-10-20, after the first draft put a toggle on both. A privacy
-- policy is information the controller PROVIDES under Art. 13 DSGVO, not
-- something a person agrees to: consent must be specific, unbundled and freely
-- given, so a required "I accept the privacy policy" box is meaningless at
-- best and evidence of bundled consent at worst. The conventional shape is a
-- required checkbox for the terms, on a contract basis, with the policy linked
-- and acknowledged beside it.
--
-- So a `terms` row means **they ticked the box**, and a `privacy` row means
-- **this version of the notice was on screen when they signed up** — which is
-- the Art. 13 fact worth being able to prove, and the one nobody can
-- reconstruct later. Same table because the question asked of both is "which
-- wording, when"; different meanings, written down here so a later reader does
-- not mistake the second for consent.
--
-- ── WHY NOT TWO COLUMNS ON `profiles` ─────────────────────────────────────
-- Because `20260918142704` grants `select, insert, update` on that table to
-- `authenticated` at TABLE level — correctly, since a person owns their own
-- language, theme and display name. Consent timestamps in that table would
-- inherit the update grant, and a record the subject can rewrite is not a
-- record. Nothing here is writable by anyone holding a browser key.
--
-- ── WHY A ROW PER VERSION AND NOT A TIMESTAMP PER DOCUMENT ────────────────
-- The question a consent record has to answer is not "did they agree" but
-- "what did they agree TO". A timestamp alone cannot say which wording was on
-- screen, so the day the terms change it answers nothing and cannot be
-- backfilled. One row per (person, document, version) keeps the history: a
-- later version is a new row, and the old one stays true.
--
-- `version` is a date string the app owns — see `lib/legal.ts`. It is NOT a
-- foreign key to anything, because the documents are files served by the app
-- and not rows (`LEGAL-PAGES.md` §2: `/impressum` and `/privacy` are public
-- pages). The day they become rows, this column is what joins to them.
--
-- ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
-- Not cookie consent. `LEGAL-PAGES.md` §4 argues at length that this app has
-- nothing to put in a banner — every key it writes is the login itself or a
-- preference the person set, which § 25 Abs. 2 Nr. 2 TDDDG exempts. That
-- argument is untouched by this table: accepting terms at sign-up and
-- consenting to tracking are different instruments, and only the first one
-- happens here.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.legal_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 'terms' or 'privacy'. A check rather than an enum or a lookup table, for
  -- the reason `beta_signups.reason_code` gives: the list is meant to grow —
  -- an Impressum acknowledgement, a research-consent form — and a shape check
  -- grows by one word instead of by a migration and an `_i18n` sibling.
  document text not null,
  version text not null,
  accepted_at timestamptz not null default now(),

  primary key (user_id, document, version),

  constraint legal_acceptances_document_known
    check (document in ('terms', 'privacy')),
  constraint legal_acceptances_version_shape
    check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

-- "What has this person agreed to" is the only question asked of it, and it is
-- asked per person.
create index legal_acceptances_by_user on public.legal_acceptances (user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- Written by `account-signup` holding the service role, and by nothing else.
-- `anon` and `authenticated` get NOTHING: not insert, because a client that
-- could write its own consent row could write one it never saw; and not
-- select, because nothing on screen reads this yet and a grant that exists
-- before a reader does is a grant nobody is watching.
--
-- The day the terms change and the app has to ask "have you seen version two",
-- that is a `select` policy for `authenticated` scoped to `auth.uid()` — and
-- it is a deliberate addition at that point, not something already standing
-- open now.
--
-- ── THE REVOKE IS NOT DECORATION (rule 2) ─────────────────────────────────
-- This stack ships `alter default privileges … grant all on tables to
-- postgres, anon, authenticated, service_role`, so the table above arrives
-- ALREADY FULLY GRANTED to anon and authenticated. Revoke first, then grant.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.legal_acceptances enable row level security;

revoke all on public.legal_acceptances from public, anon, authenticated;

-- And to service_role what the server may — the half of rule 2 that is easy to
-- miss, because BYPASSRLS makes one assume the grants are irrelevant too.
-- No DELETE: a consent record dies with its auth user through the cascade
-- above, and by no other route. Nothing should be able to un-say it.
grant select, insert on public.legal_acceptances to service_role;
