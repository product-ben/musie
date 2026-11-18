/**
 * After „Feedback senden“ — Ben, 2026-11-18: no success message. Instead
 * „Danke, dass du an unserem Experiment teilgenommen hast. Lust auf eine
 * weitere Übung?“, and under it the card deck as `/exercises` has it on
 * main, holding the experiment's three exercises. Pressing a card opens that
 * exercise's link.
 *
 * ── MAIN'S DECK, AND A COPY OF MAIN'S FACE ────────────────────────────────
 * `CardDeck` is the design system's, used as `/exercises` uses it: the stage
 * class `musie-deck-stage`, alternating accents, the app's own labels for the
 * chevrons, the deck and the position. The face cannot be imported:
 * `ExerciseFace` is a private function inside `routes/Exercises.tsx`, and the
 * brief keeps the app untouched. So it is rebuilt here from the same markup
 * and the same classes, styled by the app's `exercises.css`. If the app's face
 * changes, this copy does not follow. That is acceptable for a page that lives
 * a few weeks; it would not be for the app.
 *
 * ── THE ONE JUST DONE GOES LAST ───────────────────────────────────────────
 * All three are in the pile, as Ben asked, but the top card is one this
 * person has not done yet, and the one they just finished is at the bottom.
 *
 * ── A PRESS LEAVES THE PAGE ───────────────────────────────────────────────
 * Each exercise is its own static page (rule 10), so a card is a full page
 * load of `/experiments/reflexion/<slug>/`, not a route. The browser keeps
 * the participant and a test device's mark (`run.ts`), so the next page
 * pre-fills the name. The press there is a fresh consent. `busy` holds the
 * card lifted until the page goes.
 *
 * The heading takes focus when this replaces the survey, so a screen reader
 * hears the new state. The old success message announced itself instead.
 */
import * as React from 'react';
import { ArrowRight, Timer } from 'lucide-react';
import { Button, CardDeck, Icon } from '@musie/design-system';
import type { CardDeckCard, CardDeckItem } from '@musie/design-system';
import { useLocale, useT } from '../../../src/i18n/localeContext';
import { getExercise } from '../../../src/lib/content';
import type { Exercise } from '../../../src/lib/content';
import { fromRoot } from '../../../src/lib/assets';
import { cardText } from '../../../src/lib/cardText';
import '../../../src/exercises.css';
import { EXERCISES, type Slug } from './config';
import { useCopy } from './context';
import { RUN } from './run';

const ALL: readonly Slug[] = ['harfe', 'body-scan', 'freie-bahn'];

/** The others first, the one just done last. */
const PILE: readonly Slug[] = [
  ...ALL.filter((slug) => slug !== RUN.slug),
  ...ALL.filter((slug) => slug === RUN.slug),
];

const linkTo = (slug: Slug) => `/experiments/reflexion/${slug}/`;

export function NextExercises() {
  const copy = useCopy();
  const t = useT();
  const { locale } = useLocale();
  const [rows, setRows] = React.useState<Partial<Record<Slug, Exercise>>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all(PILE.map((slug) => getExercise(EXERCISES[slug].exerciseId, locale))).then(
      (found) => {
        if (cancelled) return;
        const next: Partial<Record<Slug, Exercise>> = {};
        PILE.forEach((slug, index) => {
          const row = found[index];
          if (row !== null && row !== undefined) next[slug] = row;
        });
        setRows(next);
      },
      (error: unknown) => { console.warn('[reflexion] exercises for the deck unavailable:', error); },
    );
    return () => { cancelled = true; };
  }, [locale]);

  /* The survey was long, and this is short: start at the top, with the
     heading focused. */
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const shown = PILE.filter((slug) => rows[slug] !== undefined);
  const items: CardDeckItem[] = shown.map((slug, index) => {
    const exercise = rows[slug] as Exercise;
    return {
      id: slug,
      accent: ((index % 2) + 1) as 1 | 2,
      content: (card: CardDeckCard) => <Face exercise={exercise} card={card} />,
    };
  });

  const onAccept = (id: string) => {
    if (!(ALL as readonly string[]).includes(id)) return;
    setBusy(true);
    window.location.assign(linkTo(id as Slug));
  };

  return (
    <div className="musie-exercises musie-reflexion-next">
      <div className="musie-reflexion-next__head">
        <h1 ref={headingRef} tabIndex={-1} className="musie-placeholder">
          {copy.thanksHeadline}
        </h1>
        <p className="musie-reflexion-next__lead">{copy.anotherExercise}</p>
      </div>
      {items.length > 0 && (
        <CardDeck
          className="musie-deck-stage"
          items={items}
          busy={busy}
          onAccept={onAccept}
          onNext={() => {}}
          onPrevious={() => {}}
          nextLabel={t('exercises.next')}
          previousLabel={t('exercises.previous')}
          label={t('exercises.deckLabel')}
          positionLabel={(position, total, id) =>
            t('exercises.deckPosition', {
              name: rows[id as Slug]?.name,
              index: String(position),
              total: String(total),
            })}
        />
      )}
    </div>
  );
}

/** `ExerciseFace` from routes/Exercises.tsx, markup and classes unchanged. */
function Face({ exercise, card }: { exercise: Exercise; card: CardDeckCard }) {
  const t = useT();
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);
  const text = cardText(exercise.description);

  return (
    <div className="musie-exercise-card">
      {exercise.imageUrl !== null && (
        <img
          className="musie-exercise-card__image"
          src={fromRoot(exercise.imageUrl)}
          alt={exercise.imageAlt}
          decoding="async"
        />
      )}
      <div className="musie-exercise-card__body">
        <h2 className="musie-exercise-card__headline">{exercise.name}</h2>
        <p className="musie-exercise-card__text">
          {text.cut ? (
            <>
              <span aria-hidden="true">{text.shown}</span>
              <span className="musy-sr-only">{exercise.description}</span>
            </>
          ) : (
            text.shown
          )}
        </p>
      </div>
      <div className="musie-exercise-card__foot">
        <p className="musie-exercise-card__time">
          <Icon glyph={Timer} size="sm" inline />
          <span aria-hidden="true">{t('exercises.fact.timeShort', { min, max })}</span>
          <span className="musy-sr-only">{t('exercises.fact.time', { min, max })}</span>
        </p>
        <Button
          variant="primary"
          size="min"
          leadingIcon={ArrowRight}
          className="musie-exercise-card__start"
          disabled={card.disabled}
          onClick={card.accept}
        >
          {t('exercises.startShort')}
        </Button>
      </div>
    </div>
  );
}
