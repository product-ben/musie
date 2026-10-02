/**
 * `/dev/deck` — choosing an exercise from a pile instead of a list. A PROOF OF
 * CONCEPT, in the sense /dev/qr is a tool: not linked from the product, not
 * imported by it, and nothing in the product depends on it.
 *
 * ── THE QUESTION IT ASKS ──────────────────────────────────────────────────
 * /exercises answers "which one?" with five cards in a column, all visible,
 * each a radio. This asks it with one card at a time under a thumb: swipe
 * RIGHT to start it, LEFT to see another. The segmented control at the top
 * puts the two side by side on one screen, which is the only honest way to
 * compare them.
 *
 * ── THE DECK IS THE DESIGN SYSTEM'S; THE CARD IS THIS SCREEN'S ────────────
 * `CardDeck` owns the pile, the gesture, the thresholds, the chips, the dots
 * and the buttons. This file owns what is ON a card — picture, name,
 * description, time — and what the two actions MEAN. That split is why the
 * deck could be given a Storybook story at all: nothing in it knows what an
 * exercise is.
 *
 * ── RIGHT IS THE ONE-WAY DOOR, AND IT CAN BE REFUSED ──────────────────────
 * Starting is `createSession()`, the same call /exercises makes: it writes a
 * row, navigates into the session, and the database refuses a second running
 * one through a partial unique index. So the swipe has three outcomes, and all
 * three are drawn:
 *
 *   started  → /session/:id/intro.
 *   refused  → the card FLIES BACK and SessionRunningLightbox asks the
 *              question. A dialog, not a Message: the gesture already threw
 *              the card off screen, so there is nothing left for an inline
 *              notice to sit beside.
 *   failed   → the card flies back and the failure is named.
 *
 * `busy` is what holds the card out there. CardDeck's contract is that the
 * card returns when `busy` falls with the item still in `items`, so every path
 * that does not navigate simply stops being busy and the deck puts itself
 * back.
 *
 * ── NOTHING ON A CARD GOES THROUGH THE CATALOGUE ──────────────────────────
 * The name, the description, the picture and the timeframe are the exercise's,
 * read through `useExercises()` — the same hook /exercises uses, so this screen
 * cannot drift from the one it is prototyping against. The two time strings
 * are the exception that proves it: they are CHROME wrapped around a content
 * number, and they are the catalogue's own `exercises.fact.time*`, borrowed
 * rather than written again.
 */
import * as React from 'react';
import { LayoutList, Layers, Play, RotateCcw, Shuffle, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CardDeck, CtaButton, Icon, SegmentedControl } from '@musie/design-system';
import type { CardDeckItem } from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { SessionRunningLightbox } from '../components/SessionRunningLightbox';
import { useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { createSession, endSession } from '../lib/session';
import type { ActiveSession } from '../lib/session';
import { useExercises } from '../lib/useContent';
import type { Exercise } from '../lib/content';
import '../poc-deck.css';

type View = 'deck' | 'list';

export function DeckPoc() {
  const t = useT();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data, loading, error } = useExercises();

  const [view, setView] = React.useState<View>('deck');
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] =
    React.useState<{ exercise: Exercise; session: ActiveSession | null } | null>(null);
  const [failed, setFailed] = React.useState(false);
  /** Swiped an exercise that is not built yet. Names it, nothing more. */
  const [unbuilt, setUnbuilt] = React.useState<string | null>(null);

  /* ALL FIVE, not just the built ones.
     An earlier pass filtered to `implemented` on the theory that a deck whose
     cards cannot be started lies about its one gesture. It did something
     worse: it silently showed two exercises where the product has five, so the
     POC stopped being a prototype of the real choice. /exercises shows all
     five and refuses the three that are not built yet, and the deck does the
     same — a right swipe on one opens the same lightbox, which is the honest
     "not yet" rather than a card that was never dealt. */
  const exercises = React.useMemo(() => data ?? [], [data]);

  /**
   * Start it, with the running session's fate already decided by the caller.
   *
   * THE ORDER IS END THEN CREATE and it is not reversible: creating first is
   * what the database refuses. Lifted from /exercises, which is the only other
   * caller of this sequence — see the note at the top of that file.
   */
  const start = React.useCallback(async (exercise: Exercise, replacing: ActiveSession | null) => {
    /* NO USER, NO SESSION — and it says so. `sessions.user_id` is not null, so
       there is nothing to insert, and a swipe that evaporated would be
       indistinguishable from a broken deck. */
    if (userId === null) { setBusy(false); setFailed(true); return; }
    setFailed(false);
    setBusy(true);
    try {
      if (replacing !== null) {
        /* `abandoned`, not `finished`: the diary already calls a run that
           stopped before its reflection abandoned. */
        await endSession(replacing.id, 'abandoned', new Date().toISOString());
      }
      const result = await createSession(userId, exercise.id);
      if (result.kind === 'started') {
        /* The one path that does NOT clear `busy`: the deck is about to
           unmount, and dropping busy first would fly the card back in for a
           frame on the way out. */
        navigate(`/session/${encodeURIComponent(result.session.id)}/intro`);
        return;
      }
      /* Refused. `busy` falls, so CardDeck flies the card back in, and the
         dialog asks the question over the returned deck. */
      setRefused({ exercise, session: result.session });
      setBusy(false);
    } catch (thrown: unknown) {
      console.error('[musie] could not start a session:', thrown);
      setRefused(null);
      setFailed(true);
      setBusy(false);
    }
  }, [navigate, userId]);

  const byId = React.useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const onAccept = React.useCallback((id: string) => {
    const exercise = byId.get(id);
    if (exercise === undefined) return;
    /* NOT BUILT YET — the same refusal /exercises gives, from the same
       component, so the two screens say it in one voice. `busy` is never set,
       so CardDeck returns the card immediately and the lightbox opens over a
       deck that is back where it was. */
    if (!exercise.implemented) { setUnbuilt(exercise.name); return; }
    void start(exercise, null);
  }, [byId, start]);

  /* Left is free and reports nothing: CardDeck has already put the card at the
     back of its own pile, and this screen keeps no order of its own to update.
     The handler exists because the component requires one — a deck whose left
     swipe went nowhere would be a deck with one action. */
  const onDefer = React.useCallback(() => {}, []);

  /** Pick one for me. The same escape hatch /exercises offers, and the same
   *  rule: among the IMPLEMENTED ones only. */
  const pickForMe = React.useCallback(() => {
    /* Among the BUILT ones only — the prototype picked among all three and
       then opened the not-implemented lightbox two times in three, which is
       the note /exercises records against this same escape hatch. */
    const available = exercises.filter((exercise) => exercise.implemented);
    const exercise = available[Math.floor(Math.random() * available.length)];
    if (exercise !== undefined) void start(exercise, null);
  }, [exercises, start]);

  const items: CardDeckItem[] = exercises.map((exercise, index) => ({
    id: exercise.id,
    /* Fixed by the exercise's place in the printed order, NOT by its place in
       the pile, so a card keeps its colour as the deck is dealt. */
    accent: ((index % 3) + 1) as 1 | 2 | 3,
    content: <ExerciseFace exercise={exercise} />,
  }));

  return (
    <>
      <h1 className="musie-placeholder">{t('poc.deck.title')}</h1>
      <p className="musie-note">{t('poc.deck.text')}</p>

      {loading && <p className="musie-note">{t('content.loading')}</p>}
      {error !== null && <p className="musie-note">{t('content.errorDetail')}</p>}
      {data !== null && exercises.length === 0 && <p className="musie-note">{t('content.empty')}</p>}
      {/* NOT `content.error`, which says a list did not load — this says a
          swipe did not start anything, which is a different sentence. */}
      {failed && <p className="musie-note" role="alert">{t('exercises.startFailed')}</p>}

      {exercises.length > 0 && (
        <>
          {/* ── THE TOOLBAR ────────────────────────────────────────────────
              Both controls are deliberately the `min` rung and quiet: they are
              page furniture above the thing the screen is actually about, and
              a deck under two full-size buttons reads as a toolbar with a deck
              attached. The segmented control is icon-only for the same reason —
              two glyphs say "stack or list" without spending a line of German
              on it. */}
          <div className="musie-deck-toolbar">
            <CtaButton
              variant="outline"
              size="min"
              leadingIcon={Shuffle}
              disabled={busy}
              onClick={pickForMe}
            >
              {t('poc.deck.random')}
            </CtaButton>

            <SegmentedControl
              name="poc-deck-view"
              legend={t('poc.deck.view.legend')}
              legendHidden
              size="min"
              iconOnly
              value={view}
              onValueChange={(next) => setView(next === 'list' ? 'list' : 'deck')}
              options={[
                { value: 'deck', label: t('poc.deck.view.deck'), glyph: Layers },
                { value: 'list', label: t('poc.deck.view.list'), glyph: LayoutList },
              ]}
            />
          </div>

          {view === 'deck' ? (
            <CardDeck
              className="musie-deck-stage"
              items={items}
              busy={busy}
              onAccept={onAccept}
              onDefer={onDefer}
              acceptLabel={t('poc.deck.start')}
              deferLabel={t('poc.deck.another')}
              acceptGlyph={Play}
              deferGlyph={RotateCcw}
              label={t('poc.deck.stage')}
              positionLabel={(position, total, id) =>
                t('poc.deck.position', {
                  name: byId.get(id)?.name,
                  index: String(position),
                  total: String(total),
                })}
            />
          ) : (
            /* THE SAME CARD, IN A COLUMN. The comparison is only worth
               anything if the two views differ in LAYOUT and nothing else, so
               the list renders the identical face and adds the one action a
               list has room to state outright. */
            <ul className="musie-exercise-list">
              {exercises.map((exercise, index) => (
                <li key={exercise.id} className="musie-exercise-list__item" data-accent={(index % 3) + 1}>
                  <ExerciseFace exercise={exercise} />
                  <div className="musie-exercise-list__action">
                    <CtaButton
                      variant="primary"
                      size="min"
                      leadingIcon={Play}
                      disabled={busy}
                      onClick={() => {
                        if (!exercise.implemented) { setUnbuilt(exercise.name); return; }
                        void start(exercise, null);
                      }}
                    >
                      {t('poc.deck.start')}
                    </CtaButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {unbuilt !== null && (
        <NotImplementedLightbox what={unbuilt} onClose={() => setUnbuilt(null)} />
      )}

      {refused !== null && (
        <SessionRunningLightbox
          name={refused.exercise.name}
          session={refused.session}
          starting={busy}
          onEndAndStart={() => void start(refused.exercise, refused.session)}
          onClose={() => setRefused(null)}
        />
      )}
    </>
  );
}

/**
 * The face: picture, name, description, time. All four are the exercise's own,
 * straight off the row.
 *
 * THE PICTURE IS FULL-BLEED TO THREE EDGES and cropped to 16:9 by the
 * stylesheet. `alt` is the row's `image_alt`, which is real alt text written
 * per exercise ("Two hands resting on a belly, just below the ribs"), so it is
 * passed through rather than replaced with the name.
 *
 * THE TIME IS SAID TWICE, which is the system's own pattern for a fact with a
 * long form and a short one (the facts row in §7.14): the short form beside
 * the glyph for the eye, the whole sentence as visually-hidden text for a
 * screen reader, which would otherwise meet a bare "2–12 min" and a decorative
 * icon with no word saying what was measured.
 */
function ExerciseFace({ exercise }: { exercise: Exercise }) {
  const t = useT();
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);

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
        <p className="musie-exercise-card__text">{exercise.description}</p>
      </div>
      <p className="musie-exercise-card__foot">
        <Icon glyph={Timer} size="sm" inline />
        <span aria-hidden="true">{t('exercises.fact.timeShort', { min, max })}</span>
        <span className="musy-sr-only">{t('exercises.fact.time', { min, max })}</span>
      </p>
    </div>
  );
}

/**
 * A content image path, made root-relative.
 *
 * THE ROW STORES IT RELATIVE — `assets/web/exercises/body-scan.webp`, with no
 * leading slash — so the browser resolves it against the CURRENT PATH. On
 * `/exercises` that happens to be right: one segment, so it lands on
 * `/assets/web/…`. On `/dev/deck` it is two segments and the same string
 * resolves to `/dev/assets/web/…`, which is a 404 and an empty band where the
 * picture should be. Nothing in the product renders one below the first path
 * segment today, so nothing is broken — but it is luck rather than design, and
 * this POC is what found it. Logged in OPEN-QUESTIONS.md.
 */
function fromRoot(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) return url;
  return `/${url}`;
}
