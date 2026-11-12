/* eslint-disable react-refresh/only-export-components -- an entry file, built
   once into a static page and never hot-reloaded. */
/**
 * card-options — card designs from Figma section `134:3835` („karten
 * varianten“, file McSA3aX…), compared on the real deck.
 *
 * AN EXPERIMENT (CLAUDE.md rule 10): built by `build.mjs` into one static
 * index.html next to this folder, and nothing in apps/web/src changes. It runs
 * the REAL `CardDeck` and the screen's REAL stylesheets, so the drag, the
 * fling, the deal and Ben's pile shadows are the shipped ones, and only what
 * the variants change is changed here (options.css).
 *
 * THE SECOND ROUND (Ben, 2026-11-12), in his order:
 *
 *   6   card 100vw − 68, corners 40, raised chevrons on the pile's top corners
 *   10  6, with back beside forward in the top-right corner
 *   3   the app's card width, corners 40, the pair top-right, Elevation/1
 *   7   card 100vw − 108, corners 40, ghost chevrons beside the card
 *   9   7 with the top corners at 20
 *
 * The directions are the deck's OWN two buttons in every variant, restyled
 * and moved: so they stay where they are while cards come and go under them
 * (Ben: „oben stehen, nicht bei jeder Karte neu“), and they move the pile
 * exactly as the gutter or an arrow key does. A press on a card opens a modal
 * instead of an exercise.
 *
 * No analytics, no network beyond the page's own fonts and pictures, nothing
 * written anywhere but the URL (`?v=`).
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, CardDeck, Icon, Lightbox, MusyLocaleProvider, MusyTooltipProvider, Switch,
} from '@musie/design-system';
import type { CardDeckCard, CardDeckItem } from '@musie/design-system';
import { ArrowRight, ListFilter, Timer } from 'lucide-react';

import '@musie/design-system/tokens/musy-fonts.css';
import '@musie/design-system/tokens/musy-foundations.css';
import '@musie/design-system/tokens/musy-foundations-amendments.css';
import '@musie/design-system/musy-components.css';
import '../../../../src/styles.css';
import '../../../../src/shell.css';
import '../../../../src/exercises.css';
import './options.css';

import { useHeaderReveal } from '../../../../src/lib/useHeaderReveal';
import { HEADER, HEADLINE, TOOLBAR_ROW } from './chrome';

/** Ben's order, and his names for them. */
const VARIANTS = ['6', '10', '3', '7', '9'] as const;
type Variant = (typeof VARIANTS)[number];

interface Exercise {
  id: string; name: string; image: string; alt: string; text: string; min: number; max: number;
}

/** The goal „entspannen“, as the local database serves it on 2026-11-12. The
 *  first three are the pile; the switch adds the rest, as on /exercises. */
const EXERCISES = [
  {
    id: 'breathing', name: 'Atementspannung', image: 'breathing-score',
    alt: 'Zwei Hände liegen ruhig auf einem Bauch, direkt unterhalb der Rippen',
    text: 'Atme mit meinen Anweisungen und Musik. Das hilft dir, zur Ruhe zu kommen und dich zu entspannen.',
    min: 5, max: 8,
  },
  {
    id: 'sound-journey', name: 'Klangreise', image: 'sound-journey',
    alt: 'Eine Person sitzt mit Kopfhörern im Schneidersitz, von hinten gesehen, in der Mitte konzentrischer Klangwellen',
    text: 'Eine tiefe Stimme leitet dich durch Klänge und gibt dir Anregungen zum achtsamen Hören.\nDu kannst die Übungen zwischendurch oder vor dem Einschlafen durchführen.\nDie Übung kann dir helfen, dich zu entspannen und Achtsamkeit zu üben.',
    min: 10, max: 14,
  },
  {
    id: 'body-scan', name: 'Bodyscan', image: 'body-scan-soundwalk',
    alt: 'Eine Person liegt mit geschlossenen Augen auf dem Rücken, eine leuchtende Linie verläuft vom Kopf bis zu den Füßen',
    text: 'Lass mich dich mit der Stimme eines echten Menschen und passender Musik durch deinen Körper führen. Das hilft dir, dich zu spüren, zu entspannen und Achtsamkeit zu üben.',
    min: 4, max: 7,
  },
  {
    id: 'kalimba', name: 'Kalimba', image: 'kalimba',
    alt: 'Eine Kalimba mit neun Zungen auf einem Holzkörper',
    text: 'Tippe die Zungen der Kalimba an und hör ihnen beim Nachklingen zu. Schwenkst du das Handy, schwingt der Klang mit.',
    min: 3, max: 10,
  },
  {
    id: 'marimba', name: 'Marimba', image: 'marimba',
    alt: 'Eine Marimba mit zehn Holzstäben, tief links und hoch rechts',
    text: 'Leg dein Handy quer vor dich und spiel auf den Stäben, bis du ruhig bist.',
    min: 3, max: 10,
  },
  {
    id: 'harp', name: 'Harfe', image: 'harp',
    alt: 'Eine Harfe mit sieben Saiten',
    text: 'Atme tief ein und aus und spiel dabei Musies Harfe im Rhythmus deines Atems.',
    min: 3, max: 10,
  },
] as const satisfies readonly Exercise[];

const SUGGESTED = 3;

function readVariant(): Variant {
  const v = new URLSearchParams(window.location.search).get('v');
  return (VARIANTS as readonly string[]).includes(v ?? '') ? (v as Variant) : VARIANTS[0];
}

/** The screen's ExerciseFace, verbatim. */
function Face({ exercise, card }: { exercise: Exercise; card: CardDeckCard }) {
  const min = String(exercise.min);
  const max = String(exercise.max);
  return (
    <div className="musie-exercise-card">
      <img
        className="musie-exercise-card__image"
        src={`/assets/web/exercises/${exercise.image}.webp`}
        alt={exercise.alt}
        decoding="async"
      />
      <div className="musie-exercise-card__body">
        <h2 className="musie-exercise-card__headline">{exercise.name}</h2>
        <p className="musie-exercise-card__text">{exercise.text}</p>
      </div>
      <div className="musie-exercise-card__foot">
        <p className="musie-exercise-card__time">
          <Icon glyph={Timer} size="sm" inline />
          <span aria-hidden="true">{`${min}–${max} Min.`}</span>
          <span className="musy-sr-only">{`Dauert ${min} bis ${max} Minuten`}</span>
        </p>
        <Button
          variant="primary"
          size="min"
          leadingIcon={ArrowRight}
          className="musie-exercise-card__start"
          disabled={card.disabled}
          onClick={card.accept}
        >
          Starten
        </Button>
      </div>
    </div>
  );
}

/** The variants, one choice — the system's segmented look, drawn by hand
 *  because SegmentedControl is specified for 2–4 options with a glyph each. */
function VariantPicker({ value, onChange }: { value: Variant; onChange: (v: Variant) => void }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: React.KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + VARIANTS.length) % VARIANTS.length;
    onChange(VARIANTS[next]);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Kartenvariante" className="musy-seg opt-seg">
      <div className="musy-seg__track">
        {VARIANTS.map((v, index) => (
          <button
            key={v}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={v === value}
            aria-label={`Variante ${v}`}
            data-checked={v === value ? '' : undefined}
            data-unchecked={v === value ? undefined : ''}
            tabIndex={v === value ? 0 : -1}
            className="musy-seg__option"
            onClick={() => onChange(v)}
            onKeyDown={(event) => move(event, index)}
          >
            <span className="musy-seg__label">{v}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Page() {
  const [variant, setVariant] = React.useState<Variant>(readVariant);
  const [showAll, setShowAll] = React.useState(false);
  /* The card that was pressed. While it is set the deck is busy — the card
     has lifted off the pile — and the modal says why nothing opens. Closing
     it lets the card come back: the deck's own contract for a refused accept. */
  const [opened, setOpened] = React.useState<string | null>(null);
  const toolbar = React.useRef<HTMLDivElement>(null);
  /* The app's own header behaviour: it leaves on the way down and comes back
     on the way up, which is most of what lets a phone show pile and dots. */
  const header = React.useRef<HTMLElement>(null);
  const headerHidden = useHeaderReveal(header, false, 'card-options');

  React.useEffect(() => {
    document.documentElement.dataset.opt = variant;
    window.history.replaceState(null, '', `?v=${variant}`);
  }, [variant]);

  /* The toolbar's own „Nach rechts scrollen“, which the app drives from JS. */
  React.useEffect(() => {
    const row = toolbar.current;
    const strip = row?.querySelector<HTMLElement>('.musie-deck-toolbar');
    const more = row?.querySelector<HTMLButtonElement>('button[aria-label="Nach rechts scrollen"]');
    if (!strip || !more) return undefined;
    const fade = () => {
      const start = strip.scrollLeft > 1;
      const end = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
      strip.dataset.fade = start && end ? 'both' : start ? 'start' : end ? 'end' : '';
      more.disabled = !end;
    };
    const scroll = () => strip.scrollBy({ left: strip.clientWidth * 0.8, behavior: 'smooth' });
    strip.addEventListener('scroll', fade, { passive: true });
    window.addEventListener('resize', fade);
    more.addEventListener('click', scroll);
    fade();
    return () => {
      strip.removeEventListener('scroll', fade);
      window.removeEventListener('resize', fade);
      more.removeEventListener('click', scroll);
    };
  }, []);

  const shown: readonly Exercise[] = showAll ? EXERCISES : EXERCISES.slice(0, SUGGESTED);
  const byId = new Map(shown.map((exercise) => [exercise.id, exercise]));
  const items: CardDeckItem[] = shown.map((exercise, index) => ({
    id: exercise.id,
    accent: ((index % 2) + 1) as 1 | 2,
    content: (card: CardDeckCard) => <Face exercise={exercise} card={card} />,
  }));
  const openedName = opened === null ? '' : EXERCISES.find((e) => e.id === opened)?.name ?? '';

  return (
    <>
      <div className="musie-app">
        <header
          ref={header}
          className="musie-header"
          data-hidden={headerHidden ? 'true' : 'false'}
          dangerouslySetInnerHTML={{ __html: HEADER }}
        />
        <main id="main" className="musie-main" data-wide="1" data-auth="ready" data-locale-resolved="1">
          <div className="musie-exercises">
            <h1 className="musie-placeholder" dangerouslySetInnerHTML={{ __html: HEADLINE }} />
            <div ref={toolbar} className="musie-deck-toolbar-row" dangerouslySetInnerHTML={{ __html: TOOLBAR_ROW }} />
            <CardDeck
              className="musie-deck-stage"
              items={items}
              busy={opened !== null}
              dealKey={showAll ? 'all' : 'suggested'}
              onAccept={setOpened}
              onNext={() => {}}
              onPrevious={() => {}}
              nextLabel="Nächste Übung"
              previousLabel="Vorherige Übung"
              label="Das Deck. Enter startet die Übung auf der obersten Karte, die Pfeiltasten blättern vor und zurück."
              positionLabel={(position, total, id) =>
                `${byId.get(id)?.name ?? ''} – Karte ${position} von ${total}`}
            />
            <div className="musie-under-pile">
              <Switch label="Alle Übungen zeigen" checked={showAll} onCheckedChange={setShowAll} />
              <Button
                variant="secondary"
                size="min"
                leadingIcon={ListFilter}
                className="musie-goal-change--below"
              >
                Ziel ändern
              </Button>
            </div>
          </div>
        </main>
      </div>
      <Lightbox
        open={opened !== null}
        onOpenChange={(open) => { if (!open) setOpened(null); }}
        title={openedName}
        closeLabel="Schließen"
      >
        {/* In the body, not `description`: Lightbox draws that for a screen
            reader only, and this sentence is the whole point of the modal. */}
        <div className="opt-modal">
          <p className="opt-modal__text">Aufgabe öffnen ist außerhalb des Experiments.</p>
          <Button variant="primary" onClick={() => setOpened(null)}>Zurück zu den Karten</Button>
        </div>
      </Lightbox>
      <nav className="opt-bar" aria-label="Kartenvarianten">
        <VariantPicker value={variant} onChange={setVariant} />
      </nav>
    </>
  );
}

/* Before the first render, so the first frame is already the variant. */
document.documentElement.dataset.opt = readVariant();

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <React.StrictMode>
      <MusyLocaleProvider locale="de">
        <MusyTooltipProvider>
          <Page />
        </MusyTooltipProvider>
      </MusyLocaleProvider>
    </React.StrictMode>,
  );
}
