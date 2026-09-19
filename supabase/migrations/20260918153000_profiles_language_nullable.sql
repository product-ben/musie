-- ═══════════════════════════════════════════════════════════════════════════
-- profiles.language: make "nobody has chosen yet" representable.
--
-- THE BUG THIS FIXES IS IN A SPECIFICATION, NOT IN CODE.
--
-- The app's locale resolution is meant to be:
--
--   profiles.language if set  →  navigator.language if it starts with 'de'  →  'en'
--
-- With `language text not null default 'en'`, every profile row is born
-- holding 'en', so the first branch ALWAYS matches. navigator.language is
-- unreachable, and a browser set to German gets English forever — silently,
-- because nothing is broken, it is just never consulted.
--
-- Dropping NOT NULL and the default makes null mean "no choice recorded",
-- which is the state the resolution order was written for.
--
-- SAFE NOW, AND ONLY NOW: nothing has ever written this column, so every
-- existing 'en' is a default rather than a preference and can be nulled
-- without losing anyone's choice. Once setLocale() starts writing real
-- choices that stops being true — this migration has to land first.
--
-- The check constraint mirrors the content i18n tables, where locale is
-- likewise constrained to the two locales the app ships.
--
-- NOT TOUCHED: `theme` has the same not-null-with-default shape and the same
-- latent problem, but theme is still owned by localStorage (`musy-theme`) and
-- reconciling the two is a separate decision. Flagged, not fixed.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles alter column language drop default;
alter table public.profiles alter column language drop not null;

update public.profiles set language = null where language = 'en';

alter table public.profiles
  add constraint profiles_language_check
  check (language is null or language in ('de', 'en'));

comment on column public.profiles.language is
  'The user''s chosen locale, or null when they have not chosen. Null is '
  'meaningful: it is what lets navigator.language be consulted.';
