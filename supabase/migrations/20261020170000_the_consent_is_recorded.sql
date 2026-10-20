-- ═══════════════════════════════════════════════════════════════════════════
-- THE ANALYTICS CONSENT, RECORDED ON THE PROFILE.
--
-- PostHog arrived on 2026-10-20 and session replay came with it, so the app
-- now has one thing it must ask permission for: § 25 Abs. 2 Nr. 2 TDDDG
-- exempts the login and the preferences somebody set, and exempts nothing a
-- third party writes to a device. LEGAL-PAGES.md §4.3 is the whole inventory
-- and §4.4 is the argument.
--
-- ── WHY A COLUMN AND NOT A localStorage KEY ───────────────────────────────
-- A consent has to be DEMONSTRABLE (Art. 7(1)): who, when, and against which
-- version of the policy. localStorage satisfies none of that — it is per
-- browser, it is cleared by the person it is about, and it cannot be produced
-- when somebody asks what they agreed to. It also makes the card appear again
-- on a second device, which reads as the product having forgotten.
--
-- So the answer lives on `profiles`, beside `theme` and `language`, which is
-- where everything else somebody SET already lives.
--
-- ── THREE COLUMNS, NOT ONE ────────────────────────────────────────────────
-- A boolean would record the answer and lose both facts that make it a
-- consent: when it was given, and what it was given to. `analytics_consent_at`
-- is the moment, and `analytics_consent_version` is the policy the card was
-- showing — so a later rewrite of the privacy page can tell who agreed to
-- which text, rather than silently re-using an old yes for a new processor.
--
-- NULL means NOT ASKED YET, and it is the state the app has to get right:
-- nothing is initialised and nothing is captured while it holds. 'refused' is
-- not null — it is an answer, and it switches PostHog to cookieless rather
-- than off.
--
-- ── NO NEW GRANT, AND THAT IS CHECKED RATHER THAN ASSUMED ─────────────────
-- CLAUDE.md rule 2 is about a table being created; this adds columns to one
-- that exists. `20260918142704_profiles.sql` grants
--
--     grant select, insert, update on table public.profiles to authenticated;
--
-- which is a TABLE-level grant, so it covers every column the table has now
-- and every column it gains — unlike `public.tracks`, where the grant names
-- four columns and a fifth would arrive unreadable. There is nothing to add
-- here, and the revoke that precedes that grant is what makes the statement
-- above the whole truth about who may read this.
--
-- RLS is untouched for the same reason: the profiles policies are per ROW
-- (`auth.uid() = user_id`), so a new column is already scoped to its owner.
-- `pnpm test:db` proves that rather than this comment.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column analytics_consent         text,
  add column analytics_consent_at      timestamptz,
  add column analytics_consent_version text;

-- Two answers and no third. A typo in the client writes 'granted ' or 'yes'
-- once and then reads as "not asked" forever, which would re-ask a person who
-- already said no — so the database refuses it instead of the app remembering
-- to.
alter table public.profiles
  add constraint profiles_analytics_consent_known
  check (analytics_consent in ('granted', 'refused'));

comment on column public.profiles.analytics_consent is
  'granted | refused | null. Null means the consent card has not been '
  'answered yet, and nothing analytics-related is initialised while it holds. '
  'refused is an answer: PostHog runs cookieless. LEGAL-PAGES.md §4.4.';

comment on column public.profiles.analytics_consent_at is
  'When the answer was given. Art. 7(1) asks for a demonstrable consent, and '
  'an answer with no moment attached is not one.';

comment on column public.profiles.analytics_consent_version is
  'Which version of the privacy page the card was showing. A rewrite that '
  'adds a processor must not inherit an older yes.';
