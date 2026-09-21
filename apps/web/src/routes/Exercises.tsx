/**
 * `/exercises` — the library, and the only screen that starts a session.
 *
 * ── PICKING OPENS THE DETAIL; THE DETAIL STARTS THE RUN ────────────────────
 * Two steps, as in the prototype. A card is a summary — a name, a sentence and
 * three conditions — and committing fifteen minutes to it on one tap would make
 * the conditions decoration. The lightbox is where `needs` and `duration_label`
 * are read, and it carries the only control that writes anything.
 *
 * ── THE GUIDELINE ROW IS GONE, AND THAT IS A CONTENT DECISION ──────────────
 * The prototype's detail box had three rows: You need · Guideline · Duration.
 * The middle one read `exercise_i18n.guideline`, and C.0's re-cut renamed that
 * column to `scan_text` — it is now the SCAN STEP's own copy. Showing it here
 * would put the same sentence on screen twice in one session, once before the
 * run and once inside it. So the lightbox keeps two rows. Ben, 2026-09-19.
 *
 * ── "LET MUSIE PICK" PICKS AMONG THE IMPLEMENTED ONES ──────────────────────
 * The prototype picked among all three and then opened the not-implemented
 * lightbox two times in three, which is a coin toss that usually loses. It
 * still routes through the same `choose()` as a tapped card, so a random start
 * and a chosen one are one event and nothing downstream has to know which.
 *
 * ── STARTING CAN BE REFUSED, AND THE REFUSAL IS NOT AN ERROR ───────────────
 * `sessions_one_running_per_user` is a partial unique index, so the insert can
 * come back 23505. That is a real outcome rather than a defensive branch: the
 * session it collides with is this person's own. The Message says so and
 * offers to go there.
 */
import * as React from 'react';
import { GalleryHorizontalEnd, Headphones, Shuffle, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  ButtonGroup, ContentBox, ContentList, CtaButton, Lightbox, Message,
  RadioCardLegend, RadioCards,
} from '@musie/design-system';
import type { ContentListItem, RadioCardFact } from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { createSession } from '../lib/session';
import { useExercises } from '../lib/useContent';
import type { Exercise } from '../lib/content';

/** What the three fact glyphs mean, as a key above the cards. */
const LEGEND_GLYPHS = [
  { id: 'time', glyph: Timer, labelKey: 'exercises.legend.time' },
  { id: 'cards', glyph: GalleryHorizontalEnd, labelKey: 'exercises.legend.cards' },
  { id: 'sound', glyph: Headphones, labelKey: 'exercises.legend.sound' },
] as const;

/** What the lightbox is doing, which is three things and never two at once. */
type Open =
  | { kind: 'none' }
  | { kind: 'detail'; exercise: Exercise }
  | { kind: 'refused'; exercise: Exercise };

export function Exercises() {
  const t = useT();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data, loading, error } = useExercises();

  const [open, setOpen] = React.useState<Open>({ kind: 'none' });
  /** The session that refused us, once we have read it back. */
  const [collision, setCollision] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);

  /* One entry point for a tapped card AND for the random pick, so the two
     cannot diverge. */
  function choose(exercise: Exercise) {
    setCollision(null);
    setOpen(exercise.implemented ? { kind: 'detail', exercise } : { kind: 'refused', exercise });
  }

  function surpriseMe() {
    const available = (data ?? []).filter((exercise) => exercise.implemented);
    if (available.length === 0) return;
    choose(available[Math.floor(Math.random() * available.length)]);
  }

  async function start(exercise: Exercise) {
    if (userId === null || starting) return;
    setStarting(true);
    try {
      const result = await createSession(userId, exercise.id);
      if (result.kind === 'started') {
        navigate(`/session/${encodeURIComponent(result.session.id)}/intro`);
        return;
      }
      /* Refused. Close the lightbox so the message is not behind a scrim, and
         remember where the running session is — null only if reading it back
         also failed, in which case the message stands without its way out. */
      setOpen({ kind: 'none' });
      setCollision(result.session === null ? null : `/session/${encodeURIComponent(result.session.id)}/${result.session.step}`);
    } catch (thrown: unknown) {
      console.error('[musie] could not start a session:', thrown);
      setOpen({ kind: 'none' });
      setCollision(null);
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
          /* THE SELECTION IS THE OPEN LIGHTBOX, and nothing else.
             `value` is DERIVED from `open` rather than held: the card you are
             reading about is checked while you read about it, and the moment
             the popup closes there is nothing selected again.

             It has to be derived, not merely left unset. An unset `value`
             makes base-ui's RadioGroup UNCONTROLLED, so it kept its own
             selection — dismiss the lightbox and the card stayed filled,
             claiming a choice the session never made. Ben found that one.

             '' rather than undefined for the empty case: a defined value is
             what makes the group controlled, and no card has that value, so
             none is checked. */
          value={open.kind === 'none' ? '' : open.exercise.id}
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
        {/* The refusal, when there is one. Above the list, because it is about
            the action the person just took rather than about the list. */}
        {collision !== null && (
          <Message
            variant="warning"
            live="assertive"
            headingLevel={2}
            headline={t('exercises.alreadyRunning')}
            text={t('exercises.alreadyRunningDetail')}
            onDismiss={() => setCollision(null)}
            dismissLabel={t('common.closeLabel')}
            action={
              <CtaButton variant="secondary" render={<Link to={collision} />}>
                {t('exercises.goToSession')}
              </CtaButton>
            }
          />
        )}
        {body}
      </ContentBox>

      {open.kind === 'detail' && (
        <ExerciseDetail
          exercise={open.exercise}
          starting={starting}
          onStart={() => void start(open.exercise)}
          onClose={() => setOpen({ kind: 'none' })}
        />
      )}

      {open.kind === 'refused' && (
        <NotImplementedLightbox
          what={open.exercise.name}
          onClose={() => setOpen({ kind: 'none' })}
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

/**
 * The detail, and the one control on this screen that writes.
 *
 * `titleHidden` with the box's headline visible, which is the pattern
 * `DiaryEntry` established and argued: the name is already the ContentBox's
 * headline, and hiding that to draw the same string above the box would move
 * the headline out of the header it belongs to. The known cost is one
 * duplicated announcement, logged against `Lightbox` in the design system's own
 * questions and unchanged here.
 */
function ExerciseDetail({ exercise, starting, onStart, onClose }: {
  exercise: Exercise;
  starting: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const t = useT();

  /* Built rather than written out: both rows can be absent, and an absent fact
     must not leave a labelled row with nothing in it. Both ARE absent for the
     two unimplemented exercises, which is why this is not hypothetical. */
  const facts: ContentListItem[] = [];
  if (exercise.needs !== null) {
    facts.push({ label: t('exercises.detail.needs'), content: exercise.needs });
  }
  /* The duration row survives its column. It read `duration_label`, a free-text
     string that contradicted the timeframe columns beside it; it now reads the
     timeframe itself, through the same key the card's fact chip uses. So the
     lightbox still answers "how long is this", and there is one source for the
     answer instead of two that could disagree. Unconditional, because every
     exercise has a timeframe — both columns are `not null`. */
  facts.push({
    label: t('exercises.detail.duration'),
    content: t('exercises.timeframe', {
      min: String(exercise.timeframeMin),
      max: String(exercise.timeframeMax),
    }),
  });

  return (
    <Lightbox
      open
      title={exercise.name}
      titleHidden
      closeLabel={t('common.closeLabel')}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <ContentBox
        headline={exercise.name}
        /* h2 inside the popup — the lightbox's own sr-only title is the h2's
           sibling, and this is the visible one. */
        headingLevel={2}
        headlineStep="heading-md"
        text={exercise.description}
      >
        {facts.length > 0 && (
          <ContentList items={facts} emptyLabel={t('content.empty')} />
        )}

        {/* L6: the forward action hugs the trailing edge, at 393px as much as
            anywhere — that is where a right-handed thumb already is. */}
        <ButtonGroup align="end">
          <CtaButton
            loading={starting}
            loadingLabel={t('content.loading')}
            onClick={onStart}
          >
            {t('exercises.start')}
          </CtaButton>
        </ButtonGroup>
      </ContentBox>
    </Lightbox>
  );
}
