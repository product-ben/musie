/**
 * Step 4 · Reflect — the calm default.
 *
 * ── WHAT THIS STEP USED TO BE ─────────────────────────────────────────────
 * A rotating question, the exercise's own questions, three answer modes, a
 * text field, a privacy line, a three-point mood scale and two actions — all
 * on one screen, reached immediately after ten minutes with your eyes closed.
 *
 * User testing found three failures, and they compound. People cannot find
 * words for what they experienced. They cannot name the feeling at all —
 * nothing in the product ever offered a vocabulary. And nobody had told them
 * why putting an observation into words is worth doing, so the whole step
 * read as homework.
 *
 * ── WHAT IT IS NOW ───────────────────────────────────────────────────────
 * Two words, one sentence, and three doors. All the work is behind them:
 *
 *   FeelingsSheet     `?focus-feelings`   — the emotion wheel, narrowed
 *   ThoughtsSheet     `?focus-thoughts`   — everything this file used to hold
 *   UnderstandSheet   `?focus-understand` — why any of it is worth doing
 *
 * The third door is new on 2026-10-16 and it is where the step's own
 * justification went. It used to be a four-sentence paragraph here, which
 * was the right content in the wrong place — the point of this step is that
 * it carries less, and a paragraph arguing for the two doors is what
 * somebody who already wants to reflect has to read past to reach them.
 *
 * The mood scale is behind none of them: it moved to the success toast on
 * /diary, where the session is over and "how was that?" is a question about
 * something finished.
 *
 * ── THE ORDER IS FEELINGS, THEN THOUGHTS ─────────────────────────────────
 * The feeling is the thing people cannot name, and it is CHEAP to answer —
 * three taps and a word. The thoughts field is the expensive one, and it is
 * the one they stalled in front of. Putting the cheap, blocked thing first
 * gives somebody a win before the field that stopped them, and the thoughts
 * button's own treatment follows along to say which is next: outlined while
 * feelings is empty, filled primary once it is not.
 *
 * ── THE SECTIONS ARE WRITTEN IN THE USER'S VOICE ─────────────────────────
 * *Was ich gerade gefühlt habe*, *Was ich gerade wahrgenommen habe*.
 * GERMAN-UI-WRITING.md §1 permits first person beside the du of everything
 * around it, for copy that is the user speaking — the user-type labels set
 * the precedent. These are the reader's own words played back, which is the
 * whole point of a filled state.
 */
import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { ButtonGroup, CtaButton, IconButton } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import type { HeldFeeling } from '../lib/feelings';

export interface SessionReflectProps {
  /** What the session is holding. Read, never written, by this file. */
  feelings: HeldFeeling[];
  onAddFeeling: () => void;
  onRemoveFeeling: (id: string) => void;
  /**
   * The captured thoughts, as ONE BLOCK of text — Ben, 2026-10-16.
   *
   * Typed text renders as typed; a spoken answer renders as its statements
   * joined into prose, which is what `reflections.body` holds in both cases
   * anyway. Photo captures nothing today and so can never fill this.
   */
  thoughts: string;
  onEditThoughts: () => void;
  onUnderstand: () => void;
}

export function SessionReflect({
  feelings, onAddFeeling, onRemoveFeeling, thoughts, onEditThoughts,
  onUnderstand,
}: SessionReflectProps) {
  const t = useT();

  const hasFeelings = feelings.length > 0;
  const hasThoughts = thoughts.trim().length > 0;

  return (
    <>
      {/* ── THE WELCOME ─────────────────────────────────────────────────
          Two words and one sentence. The headline was the whole paragraph
          in display type until 2026-10-16, which ran three lines on a
          laptop and read as a wall at the moment somebody's eyes are still
          adjusting.

          THE SENTENCE OPENS ON THE BREATH, which is the only instruction on
          the step and is first because it is what to do before reading any
          of the rest. */}
      <section className="musie-reflect__section">
        <h2 className="musie-reflect__welcome">{t('reflect.welcome.headline')}</h2>
        <p className="musie-reflect__why">{t('reflect.welcome.breathe')}</p>
      </section>

      {/* ── SECTION · FEELINGS, WHEN THERE ARE SOME ─────────────────────
          Only the FILLED state is a section of its own. The empty state's
          button has moved into the group at the foot, with the other two —
          an offer is not a section, and three offers in three sections is
          the step pretending to be longer than it is. */}
      {hasFeelings && (
        <section className="musie-reflect__section">
          <h3 className="musie-reflect__held">{t('reflect.feelings.held')}</h3>
          {/* THE FEELINGS AS A LINE OF TEXT, not a list of chips. They are
              what somebody felt, read back as a sentence fragment — the
              comma is doing the work a list's bullets would do, at a
              fraction of the furniture.

              A <ul> underneath, because it IS a list to a screen reader and
              the commas are not announced. The stylesheet takes the markers
              and the bullets off; the semantics stay. */}
          <ul className="musie-feeling-row">
            {feelings.map((feeling, index) => (
              <li key={feeling.id} className="musie-feeling-row__item">
                <span className="musie-feeling-row__word">{feeling.label}</span>
                <IconButton
                  glyph={X}
                  size="min"
                  variant="ghost"
                  /* Per row. Four buttons called "Remove" are four
                     identical buttons to anyone who cannot see which row
                     they are on. */
                  label={t('reflect.feelings.remove', { feeling: feeling.label })}
                  tooltip={false}
                  onClick={() => onRemoveFeeling(feeling.id)}
                />
                {/* The comma is DECORATION — it separates words visually and
                    the <li> boundary is what separates them semantically, so
                    announcing it would be the punctuation read out loud. */}
                {index < feelings.length - 1 && (
                  <span className="musie-feeling-row__comma" aria-hidden="true">,</span>
                )}
              </li>
            ))}
            <li className="musie-feeling-row__item">
              <IconButton
                glyph={Plus}
                size="primary"
                variant="outline"
                label={t('reflect.feelings.add')}
                onClick={onAddFeeling}
              />
            </li>
          </ul>
        </section>
      )}

      {/* ── SECTION · THOUGHTS, WHEN THERE ARE SOME ─────────────────── */}
      {hasThoughts && (
        <section className="musie-reflect__section">
          <h3 className="musie-reflect__held">{t('reflect.thoughts.held')}</h3>
          {/* Tapping it reopens the sheet. A button and not a div with a
              click handler: it is a control, and it has to be reachable by
              keyboard and announced as one. */}
          <button
            type="button"
            className="musie-reflect__thoughts"
            onClick={onEditThoughts}
          >
            <span className="musy-sr-only">{t('reflect.thoughts.edit')}: </span>
            {thoughts}
          </button>
        </section>
      )}

      {/* ── THE DOORS, AS ONE GROUP — Ben, 2026-10-16 ────────────────────
          *"Put the three buttons by default into a button group."* One
          `ButtonGroup`, so the row behaviour and the stacking rule are
          §7.4a's rather than re-derived per button, and the three offers
          read as one set of things you could do rather than three unrelated
          controls stacked down the page.

          A DOOR LEAVES THE GROUP WHEN ITS SECTION FILLS. The feelings CTA is
          replaced by the + beside the words it collected, and the thoughts
          CTA by the block you tap to edit — so the group shrinks as the step
          is answered, and on a finished step it holds only the third door.

          `hug` AND `align="start"`, not the default `fill`. These are
          OFFERS, and the component's own header says `fill` is for a step's
          final actions: a column of full-width buttons reads as the end of
          the step, which is what the row below this one actually is.

          THE ORDER IS PRIORITY AND THE TREATMENTS SAY SO. Feelings is the
          thing to do first and the cheapest to answer — three taps and a
          word — so it holds the filled primary; thoughts is outlined until
          feelings is answered and takes the primary afterwards; the third
          door is ghost throughout, because reading about why is never the
          thing to do next. */}
      {/* IN A SECTION, which is not decoration: `.musie-reflect__section`
          is what carries the distance between subjects on this step, and
          `.musie-reflect__section + .musy-wizard__actions` is what gives the
          action row below its own. A loose ButtonGroup here got neither —
          measured on screen, the paragraph above it ran into the buttons. */}
      <section className="musie-reflect__section">
      <ButtonGroup stacked="hug" align="start">
        {!hasFeelings && (
          <CtaButton variant="primary" onClick={onAddFeeling}>
            {t('reflect.feelings.cta')}
          </CtaButton>
        )}
        {!hasThoughts && (
          <CtaButton
            variant={hasFeelings ? 'primary' : 'outline'}
            onClick={onEditThoughts}
          >
            {t('reflect.thoughts.cta')}
          </CtaButton>
        )}
        <CtaButton variant="ghost" onClick={onUnderstand}>
          {t('reflect.understand.cta')}
        </CtaButton>
      </ButtonGroup>
      </section>
    </>
  );
}
