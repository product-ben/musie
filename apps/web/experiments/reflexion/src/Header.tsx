/**
 * The experiment's header. Brief: "Kein Menü links. Musie-Logo ganz links.
 * Ganz rechts oben ein kleiner Segmented Control (Größe S) mit DE | EN."
 *
 * The app's `.musie-header` (sticky, raised surface, hairline) with the
 * hamburger gone: logo at the start, nothing in the centre, the language
 * switch at the end. Its height is held to the app header's — Session's
 * `--chrome-block` arithmetic assumes it — in experiment.css.
 *
 * Body scan exists in German only: EN is disabled, and the one English line
 * says why. That line is English on a page pinned to `de`, so it carries its
 * own `lang`.
 */
import { FlaskConical, Languages } from 'lucide-react';
import { Badge, Logo, SegmentedControl } from '@musie/design-system';
import { useLocale } from '../../../src/i18n/localeContext';
import { useCopy } from './context';
import { RUN } from './run';

export const GERMAN_ONLY = RUN.exercise !== null && RUN.exercise.languages.length === 1;

/**
 * DE | EN at the small rung. Also rendered at the foot of the name modal:
 * a modal dialog makes the header inert, and the modal is the first thing a
 * visitor whose browser guessed wrong has to read.
 */
export function LanguageSwitch({ name }: { name: string }) {
  const copy = useCopy();
  const { locale, setLocale } = useLocale();
  return (
    <div className="musie-reflexion-lang">
      <SegmentedControl
        name={name}
        legend={copy.languageLegend}
        legendHidden
        size="min"
        value={locale}
        onValueChange={(next) => {
          if (next === 'de' || next === 'en') setLocale(next);
        }}
        options={[
          { value: 'de', label: copy.languageDe, glyph: Languages },
          { value: 'en', label: copy.languageEn, glyph: Languages, disabled: GERMAN_ONLY },
        ]}
      />
    </div>
  );
}

export function Header() {
  const copy = useCopy();

  /* THE HINT SITS UNDER THE HEADER, NOT IN IT. At 320px the logo and the
     switch leave ~30px between them, so in the row it wrapped to four lines
     and doubled the header — which moves everything `--chrome-block` was
     computed for. Below it, it scrolls away with the page and the sticky
     header keeps the app's height. */
  return (
    <>
      <header className="musie-header musie-reflexion-header">
        <Logo size="nav" showWordmark alt={copy.logoAlt} />
        <LanguageSwitch name="reflexion-language" />
      </header>
      {GERMAN_ONLY && (
        <p className="musie-reflexion-langnote" lang="en">
          {copy.onlyGerman}
        </p>
      )}
      {/* A test device (run.ts): said on screen, so a phone handed to a real
          participant is noticed rather than silently left out of the data. */}
      {RUN.internal && (
        <p className="musie-reflexion-langnote">
          <Badge variant="accent" glyph={FlaskConical}>{copy.testMode}</Badge>
        </p>
      )}
    </>
  );
}
