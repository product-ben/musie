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
 * A welcome, a reason, and two doors. The work is behind the doors:
 *
 *   FeelingsSheet   `?focus-feelings`  — the emotion wheel, narrowed
 *   ThoughtsSheet   `?focus-thoughts`  — everything this file used to hold
 *
 * The mood scale is on neither: it moved to the success toast on /diary,
 * where the session is over and "how was that?" is a question about
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
import { CtaButton, IconButton } from '@musie/design-system';
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
}

export function SessionReflect({
  feelings, onAddFeeling, onRemoveFeeling, thoughts, onEditThoughts,
}: SessionReflectProps) {
  const t = useT();

  const hasFeelings = feelings.length > 0;
  const hasThoughts = thoughts.trim().length > 0;

  return (
    <>
      {/* ── THE WELCOME, AND THE REASON ─────────────────────────────────
          Two paragraphs and no heading above them: this IS the step's
          headline, and `ContentBox` already carries the exercise's name as
          the h1. A second heading here would be the screen naming its own
          furniture before saying anything. */}
      <section className="musie-reflect__section">
        <h2 className="musie-reflect__welcome">{t('reflect.welcome.headline')}</h2>
        <p className="musie-reflect__why">{t('reflect.welcome.text')}</p>
      </section>

      {/* ── SECTION · FEELINGS ──────────────────────────────────────────── */}
      <section className="musie-reflect__section">
        {!hasFeelings ? (
          /* HUGGING, not full width. The two doors are offers; a pair of
             full-width buttons reads as the end of a step, which is what the
             action row below actually is. `.musie-reflect__door` is the
             align-self — a CtaButton is inline-flex and a flex column
             stretches it, which is the note `.musie-voice__controls` makes
             for the same reason. */
          <CtaButton className="musie-reflect__door" variant="primary" onClick={onAddFeeling}>
            {t('reflect.feelings.cta')}
          </CtaButton>
        ) : (
          <>
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
          </>
        )}
      </section>

      {/* ── SECTION · THOUGHTS ──────────────────────────────────────────── */}
      <section className="musie-reflect__section">
        {!hasThoughts ? (
          /* THE VARIANT FOLLOWS THE SECTION ABOVE — Ben, 2026-10-16. Outlined
             while feelings is empty, because feelings is the thing to do
             first; filled primary once it is not, because it is now the next
             thing. Two primaries at once would be the overload this change
             exists to remove. */
          <CtaButton
            className="musie-reflect__door"
            variant={hasFeelings ? 'primary' : 'outline'}
            onClick={onEditThoughts}
          >
            {t('reflect.thoughts.cta')}
          </CtaButton>
        ) : (
          <>
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
          </>
        )}
      </section>
    </>
  );
}
