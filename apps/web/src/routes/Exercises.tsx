/**
 * `/exercises` — choosing an exercise from a pile you deal with.
 *
 * ── IT REPLACED A LIST, AND THE LIST IS STILL HERE ────────────────────────
 * This screen was five cards in a column, all visible, each a radio. It is a
 * deck now: one card at a time under a thumb, swipe RIGHT to start it and LEFT
 * to see another. The column did not go — the switch at the top of the actions
 * turns it back on, and it is `RadioCards`, the same component the screen used
 * to be built from. So the two ways of choosing differ in layout and in
 * nothing else, which is what made the comparison worth keeping.
 *
 * It began as /dev/deck, a proof of concept beside the list rather than
 * instead of it. Ben took the swap on 2026-10-02.
 *
 * ── THE DECK IS THE DESIGN SYSTEM'S; THE CARD IS THIS SCREEN'S ────────────
 * `CardDeck` owns the pile, the gesture, the thresholds, the chips, the
 * verdict overlay and the buttons. This file owns what is ON a card — picture,
 * name, description, time — and what the two actions MEAN. That split is why
 * the deck has a Storybook story at all: nothing in it knows what an exercise
 * is.
 *
 * ── RIGHT IS THE ONE-WAY DOOR, AND IT CAN BE REFUSED ──────────────────────
 * Starting is `createSession()`: it writes a row, navigates into the session,
 * and the database refuses a second running one through a partial unique
 * index. So the swipe has three outcomes and all three are drawn:
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
 * ── ALL FIVE EXERCISES, INCLUDING THE THREE THAT ARE NOT BUILT ────────────
 * A right swipe on an unbuilt one opens `NotImplementedLightbox`, which is the
 * same refusal the list gave. Filtering them out would quietly show two
 * exercises where the product has five.
 *
 * ── NOTHING ON A CARD GOES THROUGH THE CATALOGUE ──────────────────────────
 * The name, the description, the picture and the timeframe are the exercise's,
 * read through `useExercises()`. The two time strings are the exception that
 * proves it: they are CHROME wrapped around a content number, and they are the
 * catalogue's own `exercises.fact.time*`.
 */
import * as React from 'react';
import { GalleryHorizontalEnd, Headphones, LayoutList, Layers, Play, Shuffle, SkipForward, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CardDeck, CtaButton, Icon, RadioCardLegend, RadioCards, SegmentedControl } from '@musie/design-system';
import type { CardDeckItem, RadioCardFact } from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { SessionRunningLightbox } from '../components/SessionRunningLightbox';
import { useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { createSession, endSession } from '../lib/session';
import type { ActiveSession } from '../lib/session';
import { useExercises } from '../lib/useContent';
import type { Exercise } from '../lib/content';
import '../exercises.css';

type View = 'deck' | 'list';

export function Exercises() {
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

  /* ONE SWITCH, TWO HOMES. In the deck it rides in CardDeck's top row beside
     the dots; in the list there are no dots — a list has no position to show —
     so it stands in a row of its own. Declared once either way, because two
     copies of a control are two controls that will disagree. */
  const viewSwitch = (
    <SegmentedControl
      name="exercises-view"
      legend={t('exercises.view.legend')}
      legendHidden
      size="min"
      iconOnly
      value={view}
      onValueChange={(next) => setView(next === 'list' ? 'list' : 'deck')}
      options={[
        { value: 'deck', label: t('exercises.view.deck'), glyph: Layers },
        { value: 'list', label: t('exercises.view.list'), glyph: LayoutList },
      ]}
    />
  );

  const items: CardDeckItem[] = exercises.map((exercise, index) => ({
    id: exercise.id,
    /* Fixed by the exercise's place in the printed order, NOT by its place in
       the pile, so a card keeps its colour as the deck is dealt. */
    accent: ((index % 3) + 1) as 1 | 2 | 3,
    content: <ExerciseFace exercise={exercise} />,
  }));

  return (
    <>
      {/* HEADLINE AND SUBLINE ARE ONE MOLECULE, so they are wrapped as one:
          `--space-gap-related` between them, which Layer 1 documents as
          "title+subtitle", and `--space-gap-group` below the pair, which it
          documents as "molecules that do NOT belong together". The deck is
          the other molecule. */}
      <div className="musie-deck-intro">
        <h1 className="musie-placeholder">
          {t('exercises.headline', { count: String(exercises.length) })}
        </h1>
        <p className="musie-note">{t('exercises.intro')}</p>
      </div>

      {loading && <p className="musie-note">{t('content.loading')}</p>}
      {error !== null && <p className="musie-note">{t('content.errorDetail')}</p>}
      {data !== null && exercises.length === 0 && <p className="musie-note">{t('content.empty')}</p>}
      {/* NOT `content.error`, which says a list did not load — this says a
          swipe did not start anything, which is a different sentence. */}
      {failed && <p className="musie-note" role="alert">{t('exercises.startFailed')}</p>}

      {exercises.length > 0 && (
        <>
          {view === 'deck' ? (
            <CardDeck
              className="musie-deck-stage"
              items={items}
              busy={busy}
              onAccept={onAccept}
              onDefer={onDefer}
              acceptLabel={t('exercises.start')}
              deferLabel={t('exercises.another')}
              acceptSubline={t('exercises.startSubline')}
              deferSubline={t('exercises.anotherSubline')}
              acceptGlyph={Play}
              /* SkipForward, not RotateCcw. The old glyph was an undo arrow,
                 which is what this action is NOT: the card is not being put
                 back, it is being passed over for the next one. */
              deferGlyph={SkipForward}
              label={t('exercises.deckLabel')}
              /* THE SWITCH SITS WITH THE DOTS, in the deck's own top row:
                 both say where you are among the five, one as a position and
                 one as a way of looking at them. */
              toolbar={viewSwitch}
              /* Under the deck's own two, in the same column. It acts on the
                 deck as a whole rather than on the card in front, which is why
                 it is last and why it is the quiet one. */
              actions={
                <CtaButton variant="ghost" leadingIcon={Shuffle} disabled={busy} onClick={pickForMe}>
                  {t('exercises.surpriseMeShort')}
                </CtaButton>
              }
              positionLabel={(position, total, id) =>
                t('exercises.deckPosition', {
                  name: byId.get(id)?.name,
                  index: String(position),
                  total: String(total),
                })}
            />
          ) : (
            /* THE LIST IS /exercises' OWN COMPONENT. RadioCards is what that
               screen chooses an exercise with, down to the facts row, so the
               two halves of this comparison differ in the one thing being
               compared — a pile you deal with against a column you read — and
               in nothing else. A bespoke list here would have compared the
               deck against something nobody is proposing to ship. */
            <>
            <div className="musie-deck-toolbar">{viewSwitch}</div>
            {/* WHAT THE THREE GLYPHS MEAN. It was a key above the cards on the
                screen this replaced, and it belongs here rather than over the
                deck: a card in the pile carries only the timeframe, and these
                are the facts the LIST shows. Dropping it with the old screen
                would have been a quiet subtraction. */}
            <RadioCardLegend
              className="musie-legend-row"
              items={[
                { id: 'time', glyph: Timer, label: t('exercises.legend.time') },
                { id: 'cards', glyph: GalleryHorizontalEnd, label: t('exercises.legend.cards') },
                { id: 'sound', glyph: Headphones, label: t('exercises.legend.sound') },
              ]}
            />
            <RadioCards
              name="exercises-list"
              /* THE SCREEN'S OWN QUESTION, not the view switch's name. The
                 switch borrowed this slot while the deck was a POC beside the
                 list; now that the list IS this screen's other half it gets
                 the legend the screen always had. */
              legend={t('exercises.legend')}
              legendHidden
              accent="accent"
              headingLevel={2}
              options={exercises.map((exercise) => ({
                value: exercise.id,
                headline: exercise.name,
                description: exercise.description,
                facts: factsFor(exercise, t),
                image: exercise.imageUrl === null ? '' : fromRoot(exercise.imageUrl),
                imageAlt: exercise.imageAlt,
              }))}
              /* Choosing IS starting, exactly as on /exercises: there is no
                 second confirming tap there and there is none here. */
              onValueChange={(id) => {
                const exercise = byId.get(id);
                if (exercise === undefined) return;
                if (!exercise.implemented) { setUnbuilt(exercise.name); return; }
                void start(exercise, null);
              }}
              disabled={busy}
              emptyLabel={t('content.empty')}
            />
            </>
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
 * The three conditions, built from the row rather than written out — the same
 * shape /exercises builds, from the same keys.
 *
 * TIME IS ALWAYS THERE; the other two are flags. A card states what is true of
 * it, and padding the row to a fixed three would mean drawing a crossed-out
 * headphone for an exercise that simply makes no sound.
 */
function factsFor(exercise: Exercise, t: ReturnType<typeof useT>): RadioCardFact[] {
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);

  const facts: RadioCardFact[] = [{
    id: 'time',
    glyph: Timer,
    text: t('exercises.fact.time', { min, max }),
    shortText: t('exercises.fact.timeShort', { min, max }),
  }];
  if (exercise.needsCards) {
    facts.push({ id: 'cards', glyph: GalleryHorizontalEnd, text: t('exercises.fact.cards') });
  }
  if (exercise.needsSound) {
    facts.push({ id: 'sound', glyph: Headphones, text: t('exercises.fact.sound') });
  }
  return facts;
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
