import type { SegmentationMode } from './config';

/** Sentence terminators, including the ellipsis used for trailing-off speech. */
const TERMINATOR = /(?<=[.!?…])\s+/;

/**
 * Abbreviations whose full stop does not end a sentence. German first, since
 * that is the primary language here.
 */
const ABBREVIATIONS = new Set([
  'z.b.', 'd.h.', 'u.a.', 'o.ä.', 'bzw.', 'bspw.', 'ca.', 'usw.', 'evtl.',
  'ggf.', 'inkl.', 'exkl.', 'nr.', 'abb.', 'vgl.', 'dr.', 'prof.', 'hr.',
  'fr.', 'st.', 'mr.', 'mrs.', 'ms.', 'vs.', 'etc.', 'e.g.', 'i.e.',
]);

/**
 * Splits a transcript into sentences on punctuation.
 *
 * Two guards stop false splits: a known abbreviation before the full stop, and
 * a following fragment that begins in lower case — real sentences start with a
 * capital, so "nicht… vielleicht" stays together as the one hesitant thought
 * it actually is. This is a heuristic, not a parser.
 */
export function splitOnPunctuation(text: string): string[] {
  const pieces = text.split(TERMINATOR).map((piece) => piece.trim()).filter(Boolean);

  const sentences: string[] = [];
  for (const piece of pieces) {
    const previous = sentences[sentences.length - 1];
    const lastWord = previous ? (previous.split(/\s+/).pop() ?? '').toLowerCase() : '';
    const continuesInLowerCase = /^\p{Ll}/u.test(piece);

    if (previous && (ABBREVIATIONS.has(lastWord) || continuesInLowerCase)) {
      sentences[sentences.length - 1] = `${previous} ${piece}`;
    } else {
      sentences.push(piece);
    }
  }
  return sentences;
}

/** Turns one finalised transcript into the units handed to onSentenceFinal. */
export function segment(text: string, mode: SegmentationMode): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // silence and semantic already arrive one chunk per turn.
  return mode === 'punctuation' ? splitOnPunctuation(trimmed) : [trimmed];
}
