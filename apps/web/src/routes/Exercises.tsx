/**
 * `/exercises` — the library, and the only screen that starts a session.
 *
 * ── A TAP ON A CARD STARTS THE RUN — Ben, 2026-09-24 ───────────────────────
 * It used to open a detail lightbox, and that lightbox carried the only
 * control that wrote anything: two taps and a scrim between the library and
 * the session. What it added over the card underneath was one labelled row —
 * *You need* — because the name, the description and the duration are all on
 * the card already, the last of them as a fact chip. A popup that repeats the
 * thing you just tapped is a confirmation step, and nothing here needs
 * confirming: starting is reversible from inside the session, and *Close
 * session* is on every step of it.
 *
 * So the card IS the control. `onValueChange` starts the run, and the
 * conditions somebody weighs before committing are the fact chips, which can
 * be read without opening anything.
 *
 * WHAT WENT WITH IT: `exercise_i18n.needs` has no surface left. It is the one
 * fact the detail carried that the card does not, and it is logged in
 * `OPEN-QUESTIONS.md` rather than quietly moved onto the card — where it goes,
 * and whether it goes anywhere, is a content decision.
 *
 * ── "LET MUSIE PICK" PICKS AMONG THE IMPLEMENTED ONES ──────────────────────
 * The prototype picked among all three and then opened the not-implemented
 * lightbox two times in three, which is a coin toss that usually loses. It
 * still routes through the same `choose()` as a tapped card, so a random start
 * and a chosen one are one event and nothing downstream has to know which.
 *
 * ── STARTING CAN BE REFUSED, AND THE REFUSAL IS A FORK ─────────────────────
 * `sessions_one_running_per_user` is a partial unique index, so the insert can
 * come back 23505. That is a real outcome rather than a defensive branch: the
 * session it collides with is this person's own.
 *
 * Ben, 2026-09-24: it used to be a dead end with a way back to the old session
 * and nothing else — the person had to go there, close it, come back, and find
 * the exercise again. So the Message now carries BOTH ways forward, and the
 * screen behind it holds still while it is open:
 *
 *   CARRY ON WITH THE RUNNING ONE — the primary, because it is what most
 *   people who hit this want and because the other one throws work away.
 *   END IT AND START THIS ONE — named after the exercise that was refused, so
 *   the button says which one it means rather than "this one".
 *   THE LIST IS DISABLED AND KEEPS ITS SELECTION, so the card the message is
 *   talking about stays on screen, checked, while the question is open.
 *
 * Ending is `abandoned`, never `finished`: `finished` means reflected
 * (DOMAIN-MODEL.md's state diagram, and `sessionMachine`'s FINISH guard), and a
 * session ended from the library to make room for another one has not been.
 * The diary already draws it as unfinished.
 */
import * as React from 'react';
import { GalleryHorizontalEnd, Headphones, Shuffle, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  ButtonGroup, ContentBox, CtaButton, Message, RadioCardLegend, RadioCards,
} from '@musie/design-system';
import type { RadioCardFact } from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { createSession, endSession } from '../lib/session';
import type { ActiveSession } from '../lib/session';
import { useExercises } from '../lib/useContent';
import type { Exercise } from '../lib/content';

/** What the three fact glyphs mean, as a key above the cards. */
const LEGEND_GLYPHS = [
  { id: 'time', glyph: Timer, labelKey: 'exercises.legend.time' },
  { id: 'cards', glyph: GalleryHorizontalEnd, labelKey: 'exercises.legend.cards' },
  { id: 'sound', glyph: Headphones, labelKey: 'exercises.legend.sound' },
] as const;

/**
 * What the lightbox is doing — ONE thing now, where it used to do two.
 *
 * The detail is gone, so the only popup this screen still opens is the refusal
 * for an exercise that is not built. Kept as a union rather than collapsed to
 * `Exercise | null`: the next popup this screen acquires is then a third
 * member rather than a second piece of state that can contradict the first.
 */
type Open =
  | { kind: 'none' }
  | { kind: 'refused'; exercise: Exercise };

/**
 * A START THE DATABASE REFUSED, and everything the way out of it needs.
 *
 * Both halves, because the two buttons need different ones: carrying on needs
 * the RUNNING session's id and step, and ending-and-starting needs that id AND
 * the exercise that was refused — which the screen would otherwise have to
 * re-derive from `chosen` and hope the list had not reloaded underneath it.
 *
 * `session` is null only when reading the collision back ALSO failed. Then
 * neither button can be honest — one would link nowhere and the other would
 * end nothing — so the message stands with no actions at all, which is what it
 * did before either of them existed.
 */
interface Refused {
  exercise: Exercise;
  session: ActiveSession | null;
}

export function Exercises() {
  const t = useT();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data, loading, error } = useExercises();

  const [open, setOpen] = React.useState<Open>({ kind: 'none' });
  /** The start that was refused, or null. See `Refused`. */
  const [refused, setRefused] = React.useState<Refused | null>(null);
  const [starting, setStarting] = React.useState(false);
  /**
   * WHICH CARD IS CHECKED, and it has to be held now.
   *
   * It used to be DERIVED from the open lightbox — the card you were reading
   * about was checked while you read about it, and nothing was checked once
   * the popup closed. There is no popup on the way to a session any more, so
   * the derivation has nothing left to read: this is the tapped card, and it
   * is cleared only when the tap comes to nothing that can still be acted on.
   *
   * A REFUSED START IS NOT THAT. The card stays checked and the list goes
   * disabled beneath the message, because the message is a question ABOUT that
   * card — "carry on with the other one, or end it and start this one" — and a
   * question about a card the screen has stopped showing as chosen is a
   * question about nothing.
   *
   * Still a controlled value, and still `''` for "none". An unset `value`
   * makes base-ui's RadioGroup UNCONTROLLED, which is how a dismissed popup
   * used to leave a card filled and claiming a choice the session never made.
   */
  const [chosen, setChosen] = React.useState('');
  /**
   * A START THAT WENT NOWHERE AND WAS NOT A REFUSAL — the insert threw, or
   * there is no user to insert for.
   *
   * It has a Message because otherwise it has NOTHING. The detail lightbox
   * used to carry a spinner, so a start that failed at least stopped spinning
   * in front of somebody; a card that starts the run on tap has no such
   * surface, and a failure was a tap that did nothing at all, explained only
   * on the console. Ben, 2026-09-24, reporting exactly that symptom.
   */
  const [failed, setFailed] = React.useState(false);

  /**
   * LET THE TAPPED CARD GO — and every way of closing a question about a card
   * has to call this.
   *
   * THE BUG IT EXISTS TO PREVENT, because it is not obvious and it bit:
   * `RadioCards` reports CHANGES. Tapping the card that is already the group's
   * value is not a change, so `onValueChange` never fires and `choose()` is
   * never called. Leave a card checked after its question is answered and that
   * card is dead — the person taps it, nothing happens, and the only way out
   * is a reload.
   *
   * Measured on 2026-09-24: start refused → dismiss the message → tap the same
   * card → nothing at all. `NotImplementedLightbox` had the clear and the
   * refusal did not, which is the drift this one function removes.
   */
  function releaseChoice() {
    setChosen('');
  }

  /* One entry point for a tapped card AND for the random pick, so the two
     cannot diverge. */
  function choose(exercise: Exercise) {
    setRefused(null);
    setFailed(false);
    setChosen(exercise.id);
    if (!exercise.implemented) {
      setOpen({ kind: 'refused', exercise });
      return;
    }
    void start(exercise);
  }

  function surpriseMe() {
    const available = (data ?? []).filter((exercise) => exercise.implemented);
    if (available.length === 0) return;
    choose(available[Math.floor(Math.random() * available.length)]);
  }

  /**
   * THE ONLY THING ON THIS SCREEN THAT WRITES, and it has two callers that are
   * one act apart: a tapped card, and *end the running one and start this*.
   *
   * `replacing` is why they are ONE function rather than two. The refusal is a
   * partial unique index, so the insert can only succeed once the row it
   * collides with is no longer `started` — the end and the start are a
   * sequence, not two independent buttons, and splitting them across two
   * handlers is how you get a screen that ends somebody's session and then
   * fails to start anything because a second `starting` guard was already
   * true. One flag, one path, one refusal branch.
   *
   * THE ORDER IS END THEN CREATE, and it is not reversible: creating first is
   * the thing the database refuses.
   */
  async function start(exercise: Exercise, replacing: ActiveSession | null = null) {
    if (starting) return;
    /* NO USER, NO SESSION — and it says so. This used to return silently,
       which is indistinguishable from a broken button: `sessions.user_id` is
       not null, so there is nothing to insert, and the person is owed the
       reason rather than a tap that evaporates. `AuthProvider` publishes
       `status: 'error'` for exactly this and documents that there is no UI for
       it; this is the UI for the one place it stops somebody. */
    if (userId === null) {
      releaseChoice();
      setFailed(true);
      return;
    }
    setStarting(true);
    try {
      if (replacing !== null) {
        /* `abandoned`, not `finished` — see the note at the top of the file.
           If this throws, nothing was ended and nothing is started: the catch
           below leaves the message standing and the person can press again. */
        await endSession(replacing.id, 'abandoned', new Date().toISOString());
      }

      const result = await createSession(userId, exercise.id);
      if (result.kind === 'started') {
        navigate(`/session/${encodeURIComponent(result.session.id)}/intro`);
        return;
      }

      /* Refused. The card STAYS CHOSEN — the message below is a question about
         it, and both of its answers need to know which exercise was asked for.
         `result.session` is the running one, or null if reading it back also
         failed; `Refused` says what that costs. */
      setRefused({ exercise, session: result.session });
    } catch (thrown: unknown) {
      console.error('[musie] could not start a session:', thrown);
      releaseChoice();
      setRefused(null);
      setFailed(true);
    } finally {
      setStarting(false);
    }
  }

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
      <>
        {/* ONE ROW: the key, and the alternative to reading it.
            The key explains what the cards say; the escape hatch is for
            somebody who came to do something rather than to choose. Both
            belong WITH the instruction to choose rather than stacked above and
            below it — the prototype puts them on one line for the same reason.
            At 393px the row wraps and the button goes under the key. */}
        <div className="musie-legend-row">
          <RadioCardLegend
            items={LEGEND_GLYPHS.map((item) => ({
              id: item.id,
              glyph: item.glyph,
              label: t(item.labelKey),
            }))}
          />
          <CtaButton variant="ghost" leadingIcon={Shuffle} onClick={surpriseMe}>
            {t('exercises.surpriseMe')}
          </CtaButton>
        </div>

        <RadioCards
          name="exercise"
          /* The h1 above already asks the question, so the legend is the same
             question twice. Hidden, never removed: an unnamed radio group
             announces as a bare set of options. */
          legend={t('exercises.legend')}
          legendHidden
          accent="accent"
          /* h2, under the page's h1. */
          headingLevel={2}
          options={data.map((exercise) => ({
            value: exercise.id,
            headline: exercise.name,
            description: exercise.description,
            facts: factsFor(exercise, t),
            /* NO `label`. It carried `duration_label` — "About 15 minutes" —
               against a `time` fact chip already reading "2–12 minutes" from
               the timeframe columns, and the two disagreed. The column is gone
               (20260921120000) and the chip is the survivor: it is the same
               fact, structured, and it cannot drift from itself. */
            image: exercise.imageUrl ?? '',
            imageAlt: exercise.imageAlt,
          }))}
          /* THE SELECTION IS THE TAP THAT IS STILL IN FLIGHT — or the one the
             message above is asking about. See `chosen`. */
          value={chosen}
          /* FROZEN WHILE A REFUSAL IS ON SCREEN — Ben, 2026-09-24.
             Tapping a second card while the message is up would start a
             different exercise than the one the message names, or (more
             likely) collide again and rewrite the question mid-read. The list
             keeps its selection, greys, and comes back the moment the message
             is dismissed or acted on.

             The group's own prop, not a pointer-events trick: base-ui puts
             `disabled` on every radio, so the cards leave the tab order and
             announce as disabled instead of silently swallowing taps. */
          disabled={refused !== null}
          onValueChange={(id) => {
            const exercise = data.find((row) => row.id === id);
            if (exercise !== undefined) choose(exercise);
          }}
          emptyLabel={t('content.empty')}
        />
      </>
    );
  }

  return (
    <>
      <ContentBox
        headingLevel={1}
        headlineStep="display-xl"
        headline={t('exercises.headline')}
      >
        {/* THE REFUSAL, AND BOTH WAYS OUT OF IT.
            Above the list, because it is about the action the person just took
            rather than about the list — and because the list behind it is
            disabled while this is open, so this is the only thing on the screen
            that can be acted on.

            `ButtonGroup` rather than two buttons loose in `action`: `Message`
            takes exactly one node and says so, and the group is the system's
            own answer to "a row of actions that has to stack on a phone" (it
            goes to one full-width column below --bp-md, in DOM order). The
            tension with that prop's stated contract is logged in
            OPEN-QUESTIONS.md.

            THE PRIMARY IS *Continue that session*. It is what most people who
            reach this want, it is first in the DOM so it is the top of the
            stacked column, and the alternative throws a run away — a filled
            button is not what that should be. Ben, 2026-09-24.

            NO ACTIONS AT ALL when the collision could not be read back: one
            button would link nowhere and the other would end nothing. */}
        {/* A START THAT FAILED, which is not a refusal: a refusal is the
            database saying no for a reason the person can act on, and this is
            the request not landing at all. Error rather than warning, and
            dismissible, because there is nothing to do about it here but try
            again. */}
        {failed && (
          <Message
            variant="error"
            live="assertive"
            headingLevel={2}
            headline={t('exercises.startFailed')}
            text={t('content.errorDetail')}
            onDismiss={() => setFailed(false)}
            dismissLabel={t('common.closeLabel')}
          />
        )}

        {refused !== null && (
          <Message
            variant="warning"
            live="assertive"
            headingLevel={2}
            headline={t('exercises.alreadyRunning')}
            text={t('exercises.alreadyRunningDetail')}
            onDismiss={() => {
              setRefused(null);
              /* AND THE CARD GOES WITH IT. See `releaseChoice`: a card left
                 checked after its question is closed cannot be tapped again,
                 because tapping the current value is not a change. */
              releaseChoice();
            }}
            dismissLabel={t('common.closeLabel')}
            action={refused.session === null ? undefined : (
              <ButtonGroup>
                <CtaButton
                  render={(
                    <Link
                      to={`/session/${encodeURIComponent(refused.session.id)}/${refused.session.step}`}
                    />
                  )}
                >
                  {t('exercises.goToSession')}
                </CtaButton>
                <CtaButton
                  variant="secondary"
                  loading={starting}
                  loadingLabel={t('content.loading')}
                  onClick={() => void start(refused.exercise, refused.session)}
                >
                  {t('exercises.endAndStart', { name: refused.exercise.name })}
                </CtaButton>
              </ButtonGroup>
            )}
          />
        )}
        {body}
      </ContentBox>

      {open.kind === 'refused' && (
        <NotImplementedLightbox
          what={open.exercise.name}
          onClose={() => {
            setOpen({ kind: 'none' });
            /* The card goes with it — same rule, same reason as the message's
               dismiss above. `releaseChoice` is where both are argued. */
            releaseChoice();
          }}
        />
      )}
    </>
  );
}

/**
 * The three conditions, built from the row rather than written out.
 *
 * TIME IS ALWAYS THERE; the other two are flags. A card states what is true of
 * it, and padding the row to a fixed three would mean drawing a crossed-out
 * headphone for an exercise that simply makes no sound.
 *
 * Only the duration has a short form drawn beside its glyph. The other two are
 * conditions rather than measurements — "needs your deck" has no useful
 * abbreviation — so the glyph plus the legend is the whole of what they show,
 * and the full sentence is what a screen reader gets either way.
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
