/**
 * What you SET in the menu, as opposed to where you GO — dark mode, the
 * language, and the account you are signed in as.
 *
 * ── WHY IT IS HERE AND NOT IN A SHEET OF ITS OWN — Ben, 2026-09-24 ─────────
 * These three lived at /settings, an overlay sheet behind its own header icon.
 * Two overlays that open over any page, one of them holding three controls and
 * a delete button, is two things to find and two places to look — so /settings
 * is deleted, the profile icon is gone from the header, and the menu is the one
 * overlay. The diary's delete-everything control went to /diary with the same
 * move; it is on the screen it empties now, which is a reversal of G.2's
 * argument and logged as one in apps/web/OPEN-QUESTIONS.md.
 *
 * WHAT DID NOT COME WITH THEM: *Here als* / *Here as*, the four user types.
 * /about-you asks that question, writes the same `profiles.user_type_id`, and
 * is one row up in this very drawer — so the settings copy was a second
 * spelling of one question. Its one unique behaviour is a real loss and is
 * logged: /settings accepted an unimplemented type where /about-you refuses it,
 * so the three unbuilt paths can no longer be recorded as a preference at all.
 *
 * ── PRESENTATIONAL? NO — THIS ONE OWNS ITS WIRING ──────────────────────────
 * `NavDrawer` is presentational and stays that way; this is the piece that
 * reads the theme store, the locale and the auth session. That is the whole
 * reason it is a slot rather than three more props on the drawer.
 */
import * as React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, RadioGroupText, Switch,
} from '@musie/design-system';
import { LOCALES, LOCALE_LABELS, isLocale } from '../i18n';
import { useLocale, useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { useProfile } from '../lib/profileContext';
import { signOut } from '../lib/signIn';

export function MenuPreferences() {
  return (
    <>
      <ThemeSwitch />
      <LanguageChoice />
      {/* LAST, and it renders for nobody else: an anonymous user has no account
          to name and nothing safe to sign out of. See AccountSection. */}
      <AccountSection />
    </>
  );
}

/**
 * Dark mode.
 *
 * ── TWO STORES, ONE DIRECTION ──────────────────────────────────────────────
 * localStorage (`musy-theme`, owned by theme-init.js) is the SOURCE OF TRUTH
 * for rendering. It has to be: the attribute must be set before the first
 * stylesheet loads, and that is measurable — 2.2 verified `data-theme` is
 * written while `document.styleSheets.length` is still 0. Nothing that waits
 * on a network round trip can do that job.
 *
 * profiles.theme is a MIRROR, written alongside so the preference can follow a
 * real account later.
 *
 * NOTHING READS profiles.theme, and that is deliberate, not an oversight:
 * reading it on boot would reintroduce exactly the flash the localStorage
 * store exists to prevent. It becomes readable the day an account spans
 * devices, and until then it is a write-only column. Do not "fix" it.
 *
 * This control calls window.musyTheme.set() and NEVER touches `data-theme`
 * itself — theme-init.js owns the attribute and the storage key together, and
 * setting the attribute here would put a second writer on it.
 *
 * (Language is the mirror image: profiles.language is authoritative, because
 * there is no flash-of-wrong-language to solve. See LocaleProvider.)
 *
 * ── THE STATE IS READ ON MOUNT, WHICH THE DRAWER MAKES FREE ────────────────
 * The initialiser runs once per mount, and this component mounts with the
 * drawer — so every open reads the store again and cannot show a stale switch.
 * In the old sheet that was true for the same reason; nothing about it depended
 * on which overlay it was in.
 */
function ThemeSwitch() {
  const t = useT();
  const { update } = useProfile();

  const [dark, setDark] = React.useState(
    () => (window.musyTheme?.get() ?? 'light') === 'dark',
  );

  return (
    <Switch
      label={t('menu.darkMode')}
      checked={dark}
      onCheckedChange={(checked) => {
        const theme = checked ? 'dark' : 'light';
        window.musyTheme?.set(theme); // source of truth for rendering
        setDark(checked);
        update({ theme }); // mirror, for a future real account
      }}
      reverse
      accent="accent"
      /* A domain pair, not the Check / X default: the glyph says WHAT is
         switching. Moon is the checked state because checked means dark. */
      onGlyph={Moon}
      offGlyph={Sun}
    />
  );
}

/**
 * Language. This WORKS — picking one switches the locale immediately, updates
 * <html lang>, re-fetches content and writes profiles.language. No reload, and
 * no not-implemented dialog.
 *
 * The option labels come from LOCALE_LABELS and NOT from t(), on purpose: a
 * language picker shows each language in its own name, so a German speaker
 * looking for German finds "Deutsch" whatever the current locale is.
 * Translating an endonym is the bug, not the fix.
 *
 * ── THE HINT IS GONE, ON BEN'S CALL — 2026-09-24 ───────────────────────────
 * It read "Content translations are provisional" and it was true: the content
 * tables' German belongs to the Mindfulness Cards spreadsheet and will be
 * overwritten. It is also a note about the state of the project, aimed at
 * whoever is reading the catalogue, printed under a control for whoever is
 * using the app — and in a drawer, where the space is a phone's, it pushed the
 * account below the fold to say something no reader can act on. The fact still
 * lives where it is actionable: `20260918150600_content_seed.sql`'s header, and
 * rule 6 in CLAUDE.md. The legend and the two radios are all that is left.
 */
function LanguageChoice() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <RadioGroupText
      name="language"
      legend={t('menu.language')}
      accent="accent"
      value={locale}
      options={LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))}
      onValueChange={(next) => {
        /* The component's callback is a plain string; narrow it before it
           reaches anything that expects a Locale. */
        if (isLocale(next)) setLocale(next);
      }}
    />
  );
}

/**
 * The account, and signing out of it — H.0b.
 *
 * ── IT RENDERS ONLY FOR A USER WITH AN EMAIL ADDRESS ───────────────────────
 * An anonymous user has none, and this whole section is hidden from them. That
 * is not tidiness: their account lives in this browser and nowhere else, so
 * 'Sign out' would be a button that strands an entire diary on an id nobody can
 * sign in as again — the exact data-loss shape H.0 is written to keep away from
 * testers, drawn as a control and placed one tap from the theme switch. There
 * is no confirmation dialog that makes that a reasonable thing to offer.
 *
 * So the test is `email !== null`, published by AuthProvider. For a signed-in
 * tester the diary is on the server and signing out costs them nothing but a
 * retype.
 *
 * ── THE ADDRESS IS SHOWN, DELIBERATELY ─────────────────────────────────────
 * These accounts are handed out, and a workshop phone gets passed between
 * people. "Which of us is this?" has to be answerable without signing out to
 * find out — which, for the person who was not supposed to sign out, is the
 * expensive way to ask.
 *
 * ── AND THERE IS NO CONFIRM STEP ───────────────────────────────────────────
 * Unlike the diary's delete-everything, this is REVERSIBLE: the credentials
 * still work and the diary is untouched. A confirmation for a reversible act is
 * noise that teaches people to tap through the ones that are not.
 *
 * ── h2, AND IT IS THE SAME LEVEL IT HAD IN THE SHEET ───────────────────────
 * The sheet's `Dialog.Title` was an h1 and this sat under it. The drawer has no
 * heading — it is named by `aria-label`, because a drawer whose visible top is a
 * logo has no title to make a heading OF — so this is the first heading inside
 * the dialog. h2 is still right: the page beneath the scrim is still in the
 * document with its own h1, and the level a screen reader reports is the
 * document's, not the dialog's.
 */
function AccountSection() {
  const t = useT();
  const { email } = useAuth();
  const [busy, setBusy] = React.useState(false);

  /* Anonymous, or not resolved yet. Either way there is nothing to sign out
     of and nothing true to say about an address. */
  if (email === null) return null;

  return (
    <ContentBox headline={t('auth.account')} headingLevel={2} text={t('auth.signedInAs', { email })}>
      <ButtonGroup align="start">
        <CtaButton
          variant="ghost"
          leadingIcon={LogOut}
          loading={busy}
          loadingLabel={t('content.loading')}
          onClick={() => {
            /* No `finally` that clears this. `signOut()` ends by reloading the
               tab, so there is no later render to clear it in — and the button
               staying disabled across the reload is what stops a second tap
               landing while the page is on its way out. */
            setBusy(true);
            void signOut();
          }}
        >
          {t('auth.signOut')}
        </CtaButton>
      </ButtonGroup>
    </ContentBox>
  );
}
