/**
 * A step's HEADLINE and DESCRIPTION — `exercise_i18n.{intro,scan,listen,
 * reflect}_md`, rendered.
 *
 * Replaces `StepText`, which mapped a `text[]` to a run of identical
 * paragraphs. That shape could not carry what Ben asked for on 2026-09-23 — a
 * headline and a description per step — because every element in it was the
 * same kind of thing at the same weight, and because the new copy is NUMBERED.
 * `lib/markdown.ts` says why the format is Markdown and what of it renders.
 *
 * ── IT BUILDS ELEMENTS; IT NEVER SETS HTML ────────────────────────────────
 * No `dangerouslySetInnerHTML` anywhere, and the parser has no branch that
 * produces an <a>, an <img> or an element named by the content. The tag is
 * chosen HERE, from a closed set, so a content string cannot introduce a node
 * type this file does not already name.
 *
 * ── THE HEADING IS THE STEP'S, AND IT IS AN <h2> ──────────────────────────
 * `14-reflect-step.md` put it plainly for the question it replaces: inside a
 * wizard panel the step's question IS the heading. It sits under the exercise
 * name's <h1>, which `ContentBox` renders, so each step contributes an outline
 * entry rather than a panel of anonymous prose. The level is clamped in the
 * parser rather than trusted from the content.
 *
 * ── THE FALLBACK IS OURS, AND IT IS NOT A PLACEHOLDER ─────────────────────
 * Carried over from `StepText` unchanged, including the reasoning: an exercise
 * with no copy of its own for a step still has to render something, and
 * `session.intro.fallback` is CHROME — ours, permanent, true of every
 * exercise — rather than a stand-in for content we do not have. It renders as
 * one paragraph and no heading, because chrome has no business naming an
 * exercise's step.
 *
 * Only the intro passes one. `scan`, `listen` and `reflect` all carry a
 * control that says what to do, so an empty description there leaves nothing
 * missing; `intro` with no copy is a heading and a button.
 */
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { parseMarkdown } from '../lib/markdown';
import type { Span } from '../lib/markdown';

export interface MarkdownProps {
  /** The step's Markdown. Already coalesced from null at the boundary. */
  md: string;
  /** Shown as a single paragraph when `md` is empty. Omit to render nothing. */
  fallbackKey?: MessageKey;
}

export function Markdown({ md, fallbackKey }: MarkdownProps) {
  const t = useT();

  const fallback = fallbackKey === undefined ? '' : t(fallbackKey);
  const blocks = parseMarkdown(md.trim() === '' ? fallback : md);

  /* Nothing at all, rather than an empty block that still takes its margin. */
  if (blocks.length === 0) return null;

  return (
    <div className="musie-md">
      {blocks.map((block, index) => {
        /* The index is the key, and it is stable: these blocks are re-derived
           only when the Markdown itself changes, and when it does every block
           is a different block anyway. Nothing here is reordered or edited. */
        const key = index;

        if (block.kind === 'heading') {
          /* The one place a tag name is computed, and it is computed from a
             number the parser has already clamped to 2–6 — not from content. */
          const Heading = `h${block.level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          return <Heading key={key}>{spans(block.spans)}</Heading>;
        }

        if (block.kind === 'paragraph') {
          return <p key={key}>{spans(block.spans)}</p>;
        }

        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List key={key}>
            {block.items.map((item, i) => <li key={i}>{spans(item)}</li>)}
          </List>
        );
      })}
    </div>
  );
}

/**
 * The two emphases, as elements.
 *
 * `<strong>` and `<em>` rather than `<b>` and `<i>`: the difference is
 * announced, and a content author writing `**` means importance rather than
 * "draw this heavier".
 */
function spans(runs: Span[]) {
  return runs.map((run, index) => {
    if (run.strong === true) return <strong key={index}>{run.text}</strong>;
    if (run.em === true) return <em key={index}>{run.text}</em>;
    return run.text;
  });
}
