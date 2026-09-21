/**
 * A step's own sentences — `exercise_i18n.{intro,scan,listen,reflect}_text`.
 *
 * ONE ELEMENT, ONE PARAGRAPH. The columns are `text[]` and the array boundary
 * IS the paragraph break, which is the whole reason they are arrays: a screen
 * that split prose on punctuation would break German at the first
 * abbreviation. So this maps; it never joins and never splits.
 *
 * ── THE FALLBACK IS OURS, AND IT IS NOT A PLACEHOLDER ──────────────────────
 * Twenty-eight strings of step copy are owed by the Mindfulness Cards
 * spreadsheet and null for all three exercises today. A screen cannot wait for
 * them, so `fallbackKey` is what the step says when the exercise says nothing.
 *
 * That copy is CHROME — ours, permanent, written to
 * docs/GERMAN-UI-WRITING.md — rather than a stand-in for content we do not
 * have: it is true of every exercise, which is exactly why it can be written
 * without the spreadsheet. It simply stops rendering the day an exercise has
 * words of its own.
 *
 * Only two steps pass one. `listen` and `reflect` both carry the question and
 * a control that says what to do, so an empty list there leaves nothing
 * missing; `intro` with no copy is a heading and a button, which is why it has
 * a fallback and `scan` — whose one real string survived the re-cut — does not
 * need one.
 */
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';

export interface StepTextProps {
  /** The exercise's own lines. Already coalesced from null at the boundary. */
  lines: string[];
  /** Shown instead when `lines` is empty. Omit to render nothing. */
  fallbackKey?: MessageKey;
}

export function StepText({ lines, fallbackKey }: StepTextProps) {
  const t = useT();

  const shown = lines.length > 0
    ? lines
    : fallbackKey === undefined ? [] : [t(fallbackKey)];

  /* Nothing at all, rather than an empty block that still takes its margin. */
  if (shown.length === 0) return null;

  return (
    <div className="musie-steps">
      {shown.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}
