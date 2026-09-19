/**
 * /exercises — the three real exercises, from the database, as plain text.
 *
 * The designed screen is Phase 3. This exists to prove the content pipeline:
 * rows arrive, they arrive in the active locale, and they swap when the
 * locale changes without a reload.
 *
 * ── THE ERROR USES THE SYSTEM'S OWN Message ────────────────────────────────
 * Resolved: `Message` was never deleted, and L14's first rule is "do not
 * recreate a component — if the system has one, import it and pass props". So
 * no error component was built; this passes props to the existing one, which
 * is what docs/10-layout.md L11 prescribes for a fatal problem injected after
 * load.
 *
 * `live="assertive"` is the whole of the accessibility wiring: Message derives
 * `role="alert"` and `aria-live` from it, so there is nothing to set by hand.
 * No `onDismiss` — this error is still true after any dismissal, and omitting
 * it also avoids the German `dismissLabel` default leaking into English.
 *
 * `headingLevel={2}` because the h1 above is the screen title and the error
 * replaces the list, whose items are also h2. Message defaults to 3, which
 * would skip a level here.
 *
 * ONE KNOWN GAP, logged in apps/web/OPEN-QUESTIONS.md: Message renders a
 * visually hidden status word from a hardcoded German constant, so an English
 * screen reader hears "Fehler: …". There is no prop to override it.
 *
 * The heading renders in every state, so the page is never a blank frame with
 * no indication of where you are.
 *
 * Note there is no separator punctuation between the two meta lines. A
 * hardcoded '·' would be a rendered string literal, and putting punctuation
 * in the catalogue is worse — so they are simply two lines.
 */
import { Message } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { useExercises } from '../lib/useContent';
import type { Exercise } from '../lib/content';

export function Exercises() {
  const t = useT();
  const { data, loading, error } = useExercises();

  let body;
  if (loading) {
    body = <p className="musie-note">{t('content.loading')}</p>;
  } else if (error !== null) {
    body = (
      <Message
        variant="error"
        live="assertive"
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  } else if (data === null || data.length === 0) {
    body = <p className="musie-note">{t('content.empty')}</p>;
  } else {
    body = (
      <ul className="musie-plain-list">
        {data.map((exercise) => (
          <ExerciseItem key={exercise.id} exercise={exercise} />
        ))}
      </ul>
    );
  }

  return (
    <>
      <h1 className="musie-placeholder">{t('route.exercises.title')}</h1>
      {body}
    </>
  );
}

function ExerciseItem({ exercise }: { exercise: Exercise }) {
  const t = useT();

  return (
    <li className="musie-plain-list__item">
      <h2 className="musie-plain-list__name">{exercise.name}</h2>
      <p className="musie-plain-list__text">{exercise.description}</p>
      <p className="musie-plain-list__meta">
        {t('exercises.timeframe', {
          min: String(exercise.timeframeMin),
          max: String(exercise.timeframeMax),
        })}
      </p>
      {exercise.implemented ? null : (
        <p className="musie-plain-list__meta">{t('exercises.notImplemented')}</p>
      )}
    </li>
  );
}
