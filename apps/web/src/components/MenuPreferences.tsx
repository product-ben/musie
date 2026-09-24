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
import { Languages, Moon, Sun } from 'lucide-react';
import { SegmentedControl, Switch } from '@musie/design-system';
import { AccountSection } from './AccountSection';
import { LOCALES, LOCALE_LABELS, isLocale } from '../i18n';
import { useLocale, useT } from '../i18n/localeContext';
import { useProfile } from '../lib/profileContext';

export function MenuPreferences() {
  return (
    <>
      {/* FIRST NOW, and it still renders for nobody else: an anonymous user has
          no account to name and nothing safe to sign out of. See
          AccountSection. It moved above the two switches on 2026-09-24 because
          the row below is pinned to the foot of the viewport — see
          `.musie-prefs-row` in shell.css — and something has to be the thing
          that is not pinned. */}
      <AccountSection />

      {/* THE TWO SETTINGS THAT ARE NOT ABOUT AN ACCOUNT, SIDE BY SIDE — Ben,
          2026-09-24. Each is a single control with a short answer, and stacked
          they spent two full rows of a phone's drawer saying so. In one row
          the switch keeps its intrinsic width and the segments take what is
          left, which is the only division that survives a narrow drawer.

          Neither carries a visible name any more: the moon/sun knob says what
          the switch does, the endonyms say what the segments do, and two
          labels over two controls in one 393px row is more label than row.
          Both names are still PASSED — `labelHidden` and `legendHidden` hide
          them from the eye, not from the accessibility tree, so the switch is
          still announced as "Dark mode" and the group as "Language" (rule 7,
          and 1.3.1 / 4.1.2). */}
      <div className="musie-prefs-row">
        <ThemeSwitch />
        {/* The wrapper is the screen's, the control inside it is the system's:
            L14's opening rule is that a screen never reaches into a
            component's geometry, so what this app gets to say is how much of
            the row the control is given, and nothing about what it does with
            it. The same division `.musie-diary__filter` makes. */}
        <div className="musie-prefs-row__lang">
          <LanguageChoice />
        </div>
      </div>
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
      /* HIDDEN, NOT DROPPED — Ben, 2026-09-24. The label is still the switch's
         accessible name; what goes is the printed word beside the track, so
         the control costs the row its own width and nothing more.

         WHICH IS ONLY DEFENSIBLE BECAUSE OF THE NEXT TWO PROPS. Switch's own
         header calls a visible label strongly preferred, and 2.5.3 wants the
         visible text to be in the accessible name — with no visible text there
         is nothing to disagree with it, but there is also nothing to read. The
         moon/sun knob is what is left carrying the meaning, and it carries it
         in both directions: it shows the current state AND names the thing
         being switched, which the generic Check / X default could not. */
      labelHidden
      checked={dark}
      onCheckedChange={(checked) => {
        const theme = checked ? 'dark' : 'light';
        window.musyTheme?.set(theme); // source of truth for rendering
        setDark(checked);
        update({ theme }); // mirror, for a future real account
      }}
      /* NO `reverse`. It exists to push a visible label to the far edge of a
         settings row; with the label hidden it would only flip the order of a
         track and a clipped span, and `justify-content: space-between` on a
         one-item flex line does nothing at all. */
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
 * rule 6 in CLAUDE.md.
 *
 * ── AND IT IS SEGMENTS NOW, NOT A RADIO LIST — Ben, 2026-09-24 ─────────────
 * `RadioGroupText` drew two stacked rows plus a legend: three lines of drawer
 * for a two-way answer, and vertical space is exactly what the foot of a
 * phone's menu has least of. `SegmentedControl` is specified for 2–4 options
 * with the answer visible at once, which is this choice precisely, and it fits
 * beside the dark-mode switch on one line. The behaviour is unchanged — same
 * `name`, same values, same narrowing, still a radio group underneath (that
 * component is RadioGroup + Radio, not Tabs), so arrow keys and the single tab
 * stop survive the swap.
 */
function LanguageChoice() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <SegmentedControl
      name="language"
      legend={t('menu.language')}
      /* The row has no room for a legend over the track, and the answer is
         self-describing in a way a stacked radio group's is not: two segments
         reading *English* and *Deutsch*, one of them filled, is a language
         picker on sight. Hidden visually, never dropped — an unnamed radio
         group announces as a bare set of options. */
      legendHidden
      accent="accent"
      value={locale}
      options={LOCALES.map((value) => ({
        value,
        label: LOCALE_LABELS[value],
        /* THE SAME GLYPH ON BOTH, WHICH IS NOT WHAT THE COMPONENT ASKS FOR.
           SegmentedControl requires a glyph per option because the label may
           ellipse and the icon is what survives it — so the pair is meant to
           tell the options apart. A language pair has no such pair to draw:
           lucide has no per-language mark, and a flag is a country, not a
           language. The endonym is the only honest cue, and at two segments in
           this drawer it never clips to begin with (seven characters in a
           ~130px segment). So the glyph says "language" for both and the words
           do the distinguishing. Logged in apps/web/OPEN-QUESTIONS.md as a
           question for the design system, not worked around further here. */
        glyph: Languages,
      }))}
      onValueChange={(next) => {
        /* The component's callback is a plain string; narrow it before it
           reaches anything that expects a Locale. */
        if (isLocale(next)) setLocale(next);
      }}
    />
  );
}
