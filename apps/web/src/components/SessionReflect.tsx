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
import { Plus } from 'lucide-react';
import { ButtonGroup, Chip, ChipRow, CtaButton, IconButton, InlineLink } from '@musie/design-system';
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
      {/* ── THE WELCOME, AND THE THIRD DOOR INSIDE IT ──────────────────
          Two words and one sentence. The headline was the whole sentence in
          display type until 2026-10-16, which ran three lines on a laptop
          and read as a wall at the moment somebody's eyes are still
          adjusting.

          THE SENTENCE OPENS ON THE BREATH, which is the only instruction on
          the step and is first because it is what to do before reading any
          of the rest.

          AND IT ENDS ON THE QUESTION — Ben, 2026-10-16. *Was soll das
          bringen?* was a third `CtaButton` in the group below; it is an
          `InlineLink` on the end of this sentence now. The reason is what
          the two kinds of control mean: the group holds the things to DO,
          and asking what any of it is for is not one of them. A box with a
          label in it standing beside two offers reads as a third offer.

          `InlineLink` is built for exactly this — it inherits its type from
          the paragraph, so it is body copy that happens to be pressable
          rather than a button that broke a line. Its own header makes the
          argument against `CtaButton size="min"` here. */}
      <section className="musie-reflect__section">
        <h2 className="musie-reflect__welcome">{t('reflect.welcome.headline')}</h2>
        <p className="musie-reflect__why">
          {t('reflect.welcome.breathe')}{' '}
          <InlineLink onClick={onUnderstand}>{t('reflect.understand.cta')}</InlineLink>
        </p>
      </section>

      {/* ── SECTION · FEELINGS, WHEN THERE ARE SOME ─────────────────────
          Only the FILLED state is a section of its own. The empty state's
          button has moved into the group at the foot, with the other two —
          an offer is not a section, and three offers in three sections is
          the step pretending to be longer than it is. */}
      {hasFeelings && (
        <section className="musie-reflect__section">
          <h3 className="musie-reflect__held">{t('reflect.feelings.held')}</h3>
          {/* ── CHIPS, AND THE × IS THE ONLY CONTROL IN THEM ──────────────
              They were words in a line with a loose × beside each, held
              together by an app pattern. `Chip` is the component for it as
              of 2026-10-16 — background only, no border, and not hoverable,
              because a chip is a NOUN rather than a control: it is a word
              somebody already chose, sitting there being true.

              `ChipRow as="ul"` because it IS a list to anything that cannot
              see the gaps, and the gap itself is the component's — L2's rung
              for atoms that belong together, shipped with it so a screen
              cannot pick a different number.

              THE COMMA IS GONE WITH THE LINE OF TEXT. It was doing a list's
              work when the feelings were prose; chips carry their own
              boundaries, and a comma between two filled pills is punctuation
              with nothing to punctuate. */}
          <div className="musie-feeling-row">
            <ChipRow as="ul">
              {feelings.map((feeling) => (
                <Chip
                  key={feeling.id}
                  onRemove={() => onRemoveFeeling(feeling.id)}
                  /* Per row. Four buttons called "Remove" are four identical
                     buttons to anyone who cannot see which chip they are on. */
                  removeLabel={t('reflect.feelings.remove', { feeling: feeling.label })}
                >
                  {feeling.label}
                </Chip>
              ))}
            </ChipRow>
            <IconButton
              glyph={Plus}
              size="primary"
              variant="outline"
              label={t('reflect.feelings.add')}
              onClick={onAddFeeling}
            />
          </div>
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
          *"Put the buttons by default into a button group."* One
          `ButtonGroup`, so the row behaviour and the stacking rule are
          §7.4a's rather than re-derived per button, and the offers read as
          one set of things you could do rather than two unrelated controls
          stacked down the page.

          THE THIRD DOOR IS NOT IN HERE. *Was soll das bringen?* was, and
          came out the same day: it is an `InlineLink` on the end of the
          sentence above now. This group holds the things to DO, and asking
          what any of it is for is not one of them.

          A DOOR LEAVES THE GROUP WHEN ITS SECTION FILLS — the feelings CTA
          is replaced by the + beside the chips it collected, the thoughts
          CTA by the block you tap to edit. ONCE BOTH ARE ANSWERED THERE IS
          NO GROUP AT ALL, which is why this is guarded: an empty section
          would still spend a section's worth of space saying nothing.

          `hug` AND `align="start"`, not the default `fill`. These are
          OFFERS, and the component's own header says `fill` is for a step's
          final actions: a column of full-width buttons reads as the end of
          the step, which is what the row below this one actually is.

          THE ORDER IS PRIORITY AND THE TREATMENTS SAY SO. Feelings is the
          thing to do first and the cheapest to answer — three taps and a
          word — so it holds the filled primary; thoughts is outlined until
          feelings is answered and takes the primary afterwards. */}
      {(!hasFeelings || !hasThoughts) && (
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
      </ButtonGroup>
      </section>
      )}
    </>
  );
}
