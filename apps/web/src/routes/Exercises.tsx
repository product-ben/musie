/**
 * `/exercises` — choosing an exercise from a pile you deal with.
 *
 * ── IT REPLACED A LIST, AND THE LIST IS STILL HERE ────────────────────────
 * This screen was five cards in a column, all visible, each a radio. It is a
 * deck now: one card at a time under a thumb, swipe either way to see another
 * and PRESS the one you want. The column did not go — the switch at the top of
 * the actions turns it back on, and it is `RadioCards`, the same component the
 * screen used to be built from. So the two ways of choosing differ in layout
 * and in nothing else, which is what made the comparison worth keeping.
 *
 * It began as /dev/deck, a proof of concept beside the list rather than
 * instead of it. Ben took the swap on 2026-10-02.
 *
 * ── AND THE TWO VIEWS NOW AGREE ABOUT WHAT A PRESS DOES (2026-10-05) ──────
 * The list has started a run on a tap since 2026-09-24 — the note against
 * `exercises.start` in en.ts is where that is written down. The deck did not:
 * a press went nowhere and a right swipe started the exercise, which is what
 * Ben reported as unintuitive. Pressing a card starts it in both views now,
 * and the deck's swipe browses the pile instead; `CardDeck`'s own header
 * carries the reasoning for the component half of the change.
 *
 * ── THE DECK IS THE DESIGN SYSTEM'S; THE CARD IS THIS SCREEN'S ────────────
 * `CardDeck` owns the pile, the gesture, the thresholds, the overlay that
 * names where a swipe is going, and every button. This file owns what is ON a
 * card — picture, name, description, time — and what the three actions MEAN.
 * That split is why the deck has a Storybook story at all: nothing in it knows
 * what an exercise is.
 *
 * ── THE PRESS IS THE ONE-WAY DOOR, AND IT CAN BE REFUSED ──────────────────
 * Starting is `createSession()`: it writes a row, navigates into the session,
 * and the database refuses a second running one through a partial unique
 * index. So the press has three outcomes and all three are drawn:
 *
 *   started  → /session/:id/intro.
 *   refused  → the card COMES BACK and SessionRunningLightbox asks the
 *              question. A dialog, not a Message: the card has already lifted
 *              off the pile, so there is nothing left for an inline notice to
 *              sit beside.
 *   failed   → the card comes back and the failure is named.
 *
 * `busy` is what holds the card out there. CardDeck's contract is that the
 * card returns when `busy` falls with the item still in `items`, so every path
 * that does not navigate simply stops being busy and the deck puts itself
 * back.
 *
 * ── ALL FIVE EXERCISES, INCLUDING THE THREE THAT ARE NOT BUILT ────────────
 * A press on an unbuilt one opens `NotImplementedLightbox`, which is the same
 * refusal the list gives. Filtering them out would quietly show two exercises
 * where the product has five.
 *
 * ── NOTHING ON A CARD GOES THROUGH THE CATALOGUE ──────────────────────────
 * The name, the description, the picture and the timeframe are the exercise's,
 * read through `useExercises()`. The two time strings are the exception that
 * proves it: they are CHROME wrapped around a content number, and they are the
 * catalogue's own `exercises.fact.time*`.
 */
import * as React from 'react';
import { LayoutList, Layers, Play, Shuffle, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CardDeck, CtaButton, Icon, RadioCards, SegmentedControl } from '@musie/design-system';
import type { CardDeckCard, CardDeckItem, RadioCardFact } from '@musie/design-system';
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
  /** Pressed an exercise that is not built yet. Names it, nothing more. */
  const [unbuilt, setUnbuilt] = React.useState<string | null>(null);

  /* ALL FIVE, not just the built ones.
     An earlier pass filtered to `implemented` on the theory that a deck whose
     cards cannot be started lies about its one gesture. It did something
     worse: it silently showed two exercises where the product has five, so the
     POC stopped being a prototype of the real choice. /exercises shows all
     five and refuses the three that are not built yet, and the deck does the
     same — a press on one opens the same lightbox, which is the honest
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
       there is nothing to insert, and a press that evaporated would be
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
           unmount, and dropping busy first would bring the card back for a
           frame on the way out. */
        navigate(`/session/${encodeURIComponent(result.session.id)}/intro`);
        return;
      }
      /* Refused. `busy` falls, so CardDeck brings the card back, and the
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

  /* BOTH DIRECTIONS ARE FREE AND REPORT NOTHING. CardDeck has already turned
     its own pile, and this screen keeps no order of its own to update. The
     handlers exist because the component requires them — a deck that could not
     tell its consumer the top card had changed is a deck nothing could be
     counted on — and here there is nothing to count. */
  const onNext = React.useCallback(() => {}, []);
  const onPrevious = React.useCallback(() => {}, []);

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

  /* ONE SWITCH, TWO HOMES. In the deck it rides at the head of CardDeck's
     action column; in the list there is no column to ride in, so it stands in
     a row of its own. Declared once either way, because two copies of a
     control are two controls that will disagree. */
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
    /* A FUNCTION, SO THE FACE CAN PLACE THE DECK'S ACCEPT ITSELF. The deck
       drew that button into the card's corner until 2026-10-05 and could not
       know how wide this card's own bottom row was — see the note over
       `.musie-exercise-card__foot`. */
    content: (card: CardDeckCard) => <ExerciseFace exercise={exercise} card={card} />,
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
          press did not start anything, which is a different sentence. */}
      {failed && <p className="musie-note" role="alert">{t('exercises.startFailed')}</p>}

      {exercises.length > 0 && (
        <>
          {view === 'deck' ? (
            <CardDeck
              className="musie-deck-stage"
              items={items}
              busy={busy}
              onAccept={onAccept}
              onNext={onNext}
              onPrevious={onPrevious}
              acceptLabel={t('exercises.start')}
              /* ONE WORD FOR BOTH DIRECTIONS, which is the component's own
                 arrangement since 2026-10-05: the overlay says `nextLabel`
                 whichever way the card is going, and `previousLabel` is read
                 by a screen reader off the back button rather than seen. */
              nextLabel={t('exercises.next')}
              previousLabel={t('exercises.previous')}
              /* The only glyph the deck is given. The two directions carry its
                 own arrows — which way is back is not this screen's decision,
                 and `SkipForward` used to sit here saying it was. */
              acceptGlyph={Play}
              label={t('exercises.deckLabel')}
              /* AT THE HEAD OF THE ACTION COLUMN. It does not act on the card
                 in front — it changes what you are looking at altogether,
                 which is a decision you make before the ones underneath it. */
              toolbar={viewSwitch}
              /* Under the deck's own controls, in the same column. It acts on
                 the deck as a whole rather than on the card in front, which is
                 why it is last and why it is the quiet one. */
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
 * THE TIME, AND NOTHING ELSE.
 *
 * There were three facts here — the duration, "needs your deck" and "sound on"
 * — each with its own glyph, and a legend above the list saying what the three
 * glyphs meant. Ben cut the deck and headphone glyphs and the legend with them
 * (2026-10-02). The duration is the one that varies in a way worth comparing
 * two exercises on; the other two were true of almost all of them, so they
 * spent a row of every card and a block of chrome to say very little.
 *
 * `needsCards` and `needsSound` are still on the row and still read by the
 * session — this screen just stops drawing them.
 */
function factsFor(exercise: Exercise, t: ReturnType<typeof useT>): RadioCardFact[] {
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);

  return [{
    id: 'time',
    glyph: Timer,
    text: t('exercises.fact.time', { min, max }),
    shortText: t('exercises.fact.timeShort', { min, max }),
  }];
}

/**
 * The face: picture, name, description, and a bottom row carrying the time and
 * the way in. The first four are the exercise's own, straight off the row.
 *
 * ── THE START BUTTON IS IN THIS ROW, AND THAT IS THE POINT ────────────────
 * `CardDeck` drew it itself for half a day, absolutely positioned in the
 * card's bottom-trailing corner, and it could not be made safe from there: at
 * 320px the German *5–8 Min.* ran 18px under it and the English *5–8 min*
 * cleared it by four. A button's width is its label's width, and no token
 * knows that — so the component now hands the action over (`CardDeckItem`'s
 * function form) and this row lays the two out together. They cannot overlap,
 * the time wraps inside its own share if it ever has to, and one `align-items`
 * puts the two on the same baseline because both sit at the same type step.
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
function ExerciseFace({ exercise, card }: { exercise: Exercise; card: CardDeckCard }) {
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
      <div className="musie-exercise-card__foot">
        <p className="musie-exercise-card__time">
          <Icon glyph={Timer} size="sm" inline />
          <span aria-hidden="true">{t('exercises.fact.timeShort', { min, max })}</span>
          <span className="musy-sr-only">{t('exercises.fact.time', { min, max })}</span>
        </p>
        {/* THE CONDENSED RUNG (Ben, 2026-10-05). §5.4 permits --target-min for
            a card control and never for a primary action, and this is both at
            once; it renders at 36px, over 2.5.8's 24 and under §5.4's 44. The
            full-size button beside the deck is the same action, so nothing is
            out of reach — logged in OPEN-QUESTIONS.md.

            `card.accept` rather than `start()` directly: the deck owns what an
            accept DOES to the pile — the card lifts, the deck goes inert, a
            refusal brings it back — and a screen that reached past that would
            be the one place the card did not move when it was taken. */}
        <CtaButton
          variant="primary"
          size="min"
          leadingIcon={Play}
          className="musie-exercise-card__start"
          disabled={card.disabled}
          onClick={card.accept}
        >
          {t('exercises.startShort')}
        </CtaButton>
      </div>
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
