/**
 * /settings — a ROUTE that presents as a side sheet, not a piece of local
 * state. Back closes it and the URL is linkable, which is the whole point.
 *
 * ── WHY base-ui's Dialog AND NOT THE SYSTEM'S Lightbox ──────────────────────
 * Lightbox is the right instinct and the wrong fit, twice over:
 *
 *   1. `trigger` is a REQUIRED prop, passed straight to `Dialog.Trigger`. A
 *      route-driven overlay has no trigger element — the URL opened it.
 *   2. It frames a CENTRED popup. This is an edge-anchored sheet.
 *
 * So this uses `Dialog` directly — the same base-ui primitive Lightbox wraps,
 * so nothing that is easy to get wrong is re-implemented: focus moves in on
 * open and is restored on close, the background goes inert, page scroll locks,
 * Escape closes, and the popup is portaled clear of any ancestor's overflow.
 *
 * The frame is an L14 custom pattern, token-only, prefixed `musie-` so it can
 * never be mistaken for a system file. It is now shared with the drawer via a
 * `--start` / `--end` modifier rather than copied — and a recurring pattern is
 * a component request, logged in apps/web/OPEN-QUESTIONS.md.
 */
import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Moon, Sun, X } from 'lucide-react';
import { IconButton, Message, RadioGroupText, Switch } from '@musie/design-system';
import { LOCALES, LOCALE_LABELS, isLocale } from './i18n';
import { useLocale, useT } from './i18n/localeContext';
import { useCloseOverlay } from './lib/useCloseOverlay';
import { useProfile } from './lib/profileContext';
import { useUserTypes } from './lib/useContent';

export function SettingsSheet() {
  const t = useT();
  const close = useCloseOverlay();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="musie-scrim" />
        <Dialog.Popup className="musie-sheet musie-sheet--end">
          <div className="musie-sheet__header">
            {/*
              The dialog's accessible name and the page's h1 are the same
              string, so they are the same element: `render` makes Dialog.Title
              an <h1>. Two names for one thing is how a screen reader ends up
              announcing "Settings, Settings".
            */}
            <Dialog.Title className="musie-placeholder" render={<h1 />}>
              {t('route.settings.title')}
            </Dialog.Title>
            {/* `tooltip={false}`: a close X in a sheet header is the case the
                IconButton docs name for suppressing it. */}
            <Dialog.Close
              render={
                <IconButton
                  glyph={X}
                  label={t('common.closeLabel')}
                  variant="ghost"
                  size="primary"
                  tooltip={false}
                />
              }
            />
          </div>

          <ThemeSwitch />
          <UserTypeChoice />
          <LanguageChoice />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
 */
function ThemeSwitch() {
  const t = useT();
  const { update } = useProfile();

  const [dark, setDark] = React.useState(
    () => (window.musyTheme?.get() ?? 'light') === 'dark',
  );

  return (
    <Switch
      label={t('settings.darkMode')}
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
 * "Here as" — the four user types, from the database.
 *
 * The labels are CONTENT (user_type_i18n), not chrome, so their German is
 * PROVISIONAL: real German, written to docs/GERMAN-UI-WRITING.md, but owned by
 * the Mindfulness Cards spreadsheet and due to be overwritten by it. Nothing
 * marks it on screen any more — the seed migration carries the distinction.
 *
 * All four are selectable. Three carry `implemented: false` in the database
 * and that flag is deliberately unused here: the brief asks for the four rows
 * and the choice persisted, and disabling three without explaining why is
 * worse than letting someone choose and find out.
 */
function UserTypeChoice() {
  const t = useT();
  const { profile, update } = useProfile();
  const { data, loading, error } = useUserTypes();

  if (loading) return <p className="musie-note">{t('content.loading')}</p>;

  if (error !== null) {
    return (
      <Message
        variant="error"
        live="assertive"
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  }

  if (data === null || data.length === 0) {
    return <p className="musie-note">{t('content.empty')}</p>;
  }

  return (
    <RadioGroupText
      name="user-type"
      legend={t('settings.userType')}
      accent="accent"
      /* undefined, not null: an uncontrolled group has no selection, which is
         exactly the state of a profile that has not answered yet. */
      value={profile?.user_type_id ?? undefined}
      options={data.map((userType) => ({ value: userType.id, label: userType.label }))}
      onValueChange={(next) => {
        update({ user_type_id: next });
      }}
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
 */
function LanguageChoice() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <RadioGroupText
      name="language"
      legend={t('settings.language')}
      hint={t('settings.languageHint')}
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
