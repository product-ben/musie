/**
 * The feelings a session held on to — the wheel, the table, and the join.
 *
 * ── A FEELING IS A PATH, NOT A WORD ───────────────────────────────────────
 * `content/emotionWheel.ts` is emphatic that a label cannot be a key:
 * *Powerful* appears twice in the wheel and *Delighted* appears twice, so the
 * identity is the ROUTE taken through it. `public.session_feelings` stores
 * that route in three columns and no label at all, and this file is what
 * turns one into the other in both directions.
 *
 * Levels 1 and 2 carry stable string ids. Level 3 carries only `i`, its
 * 0-based index clockwise within its parent, because the wheel does not give
 * it one — which is why `specific_i` is a number where the other two are
 * text.
 *
 * ── THE STOP IS A NULL ────────────────────────────────────────────────────
 * The sheet offers *einfach nur Glücklich* and *einfach nur Optimistisch*, so
 * a path can end at any of the three levels. A shorter path is a shorter row:
 * nulls from the point it stopped. `session_feelings_path_ordered` is what
 * stops a path with a hole in it reaching the table.
 *
 * ── THE LABEL IS RESOLVED, NEVER STORED ───────────────────────────────────
 * Both languages sit on every node, because these are CONTENT words rather
 * than chrome (rule 6: `tracks` has no `_i18n` sibling for the mirror-image
 * reason). Storing the German would make this table a third copy of a
 * vocabulary that already has two homes, and would hand an English reader the
 * German back.
 */
import * as React from 'react';
import { EMOTION_WHEEL } from '../content/emotionWheel';
import type { WheelDetailed, WheelEmotion, WheelWord } from '../content/emotionWheel';
import { getSupabase } from './supabase';
import type { Locale } from '../i18n';

/** Where a feeling sits in the wheel. The three columns, in their own shape. */
export interface FeelingPath {
  emotionId: string;
  /** Null when the path stopped at level 1. */
  detailedId: string | null;
  /** Null when the path stopped at level 2. */
  specificI: number | null;
}

/** A row as the app holds it: the path, its id, and the word for right now. */
export interface HeldFeeling extends FeelingPath {
  id: string;
  /** Resolved from the wheel in the active locale. Never from the database. */
  label: string;
}

/** The side of each node the active locale shows. */
function word(node: WheelWord, locale: Locale): string {
  return locale === 'de' ? node.de : node.en;
}

function emotionOf(id: string): WheelEmotion | undefined {
  return EMOTION_WHEEL.find((e) => e.id === id);
}

function detailedOf(emotion: WheelEmotion, id: string): WheelDetailed | undefined {
  return emotion.detailed.find((d) => d.id === id);
}

/**
 * The word for a path, in the active locale.
 *
 * ── IT FALLS BACK UP THE PATH, AND RETURNS NULL ONLY AT THE ROOT ──────────
 * A word retired from the wheel leaves rows pointing at nothing. Rather than
 * draw a blank or an id, this resolves the deepest level it still can:
 * a missing level-3 index gives the level-2 word, a missing level-2 id gives
 * the level-1 word. Only an unknown level-1 id has nothing to fall back to,
 * and that returns null so the caller can drop the row rather than render a
 * mystery.
 *
 * No word has ever been retired and nothing decides what SHOULD happen —
 * logged in OPEN-QUESTIONS.md. This is the behaviour that does the least harm
 * in the meantime, not a ruling.
 */
export function resolveFeeling(path: FeelingPath, locale: Locale): string | null {
  const emotion = emotionOf(path.emotionId);
  if (emotion === undefined) return null;
  if (path.detailedId === null) return word(emotion, locale);

  const detailed = detailedOf(emotion, path.detailedId);
  if (detailed === undefined) return word(emotion, locale);
  if (path.specificI === null) return word(detailed, locale);

  const specific = detailed.specific.find((s) => s.i === path.specificI);
  if (specific === undefined) return word(detailed, locale);
  return word(specific, locale);
}

/**
 * The id a `DrillDown` node carries, and the path it decodes to.
 *
 * `DrillDown` is generic over a tree of `{ id, label, children? }`, so the
 * whole path has to survive in the id — the component hands back nodes, and
 * only the leaf's id reaches here in one piece. Serialising it means
 * `pathOf()` needs no second lookup and cannot disagree with the tree it came
 * from.
 *
 * `/` is safe as the separator: every id in the wheel is a lower-case slug
 * and `specific_i` is a number.
 */
function nodeId(emotionId: string, detailedId?: string, specificI?: number): string {
  if (detailedId === undefined) return emotionId;
  if (specificI === undefined) return `${emotionId}/${detailedId}`;
  return `${emotionId}/${detailedId}/${specificI}`;
}

/** The wheel as `DrillDown` wants it, in one locale. */
export function wheelAsTree(locale: Locale) {
  return EMOTION_WHEEL.map((emotion) => ({
    id: nodeId(emotion.id),
    label: word(emotion, locale),
    children: emotion.detailed.map((detailed) => ({
      id: nodeId(emotion.id, detailed.id),
      label: word(detailed, locale),
      children: detailed.specific.map((specific) => ({
        id: nodeId(emotion.id, detailed.id, specific.i),
        label: word(specific, locale),
      })),
    })),
  }));
}

/** A `DrillDown` node id back to a path. Null for anything malformed. */
export function pathOf(id: string): FeelingPath | null {
  const parts = id.split('/');
  if (parts.length === 0 || parts[0] === '') return null;
  if (parts.length === 1) {
    return { emotionId: parts[0], detailedId: null, specificI: null };
  }
  if (parts.length === 2) {
    return { emotionId: parts[0], detailedId: parts[1], specificI: null };
  }
  if (parts.length === 3) {
    const i = Number(parts[2]);
    if (!Number.isInteger(i)) return null;
    return { emotionId: parts[0], detailedId: parts[1], specificI: i };
  }
  return null;
}

/** The node id a held feeling corresponds to — for `DrillDown`'s disabledIds. */
export function idOf(path: FeelingPath): string {
  return nodeId(
    path.emotionId,
    path.detailedId ?? undefined,
    path.specificI ?? undefined,
  );
}

/**
 * HOW MANY FEELINGS THE SHEET STOPS OFFERING TO ADD TO.
 *
 * A UI rule and not a constraint, deliberately: past five the sheet offers
 * only *Ich bin fertig*, nothing is blocked, no error is shown, and removing
 * one on /reflect makes room. A sixth row inserted by any other route is
 * legal, which is the honest state of it — logged in OPEN-QUESTIONS.md.
 */
export const FEELINGS_SOFT_CAP = 5;

export async function listFeelings(
  sessionId: string,
  locale: Locale,
): Promise<HeldFeeling[]> {
  const { data, error } = await getSupabase()
    .from('session_feelings')
    .select('id, emotion_id, detailed_id, specific_i')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error !== null) {
    throw new Error(`[musie] could not read the feelings: ${error.message}`);
  }

  /* A row whose level-1 id is gone is DROPPED rather than drawn blank. See
     resolveFeeling — this is the one case it cannot fall back from. */
  return (data ?? []).flatMap((row) => {
    const path: FeelingPath = {
      emotionId: row.emotion_id,
      detailedId: row.detailed_id,
      specificI: row.specific_i,
    };
    const label = resolveFeeling(path, locale);
    return label === null ? [] : [{ id: row.id, ...path, label }];
  });
}

/** Postgres' unique_violation. A feeling already held, not a failure. */
const UNIQUE_VIOLATION = '23505';

export type AddFeelingResult = 'added' | 'already-held';

/**
 * WRITTEN THE MOMENT IT IS CONFIRMED — Ben, 2026-10-16, and it is the one
 * place this feature departs from how the reflection works.
 *
 * The session row already exists, so nothing blocks the write, and a closed
 * tab then keeps the feelings somebody named. The cost is that *Session im
 * Tagebuch speichern* no longer saves everything on the step, which the
 * dialog's copy has to be honest about.
 *
 * A UNIQUE VIOLATION IS NOT AN ERROR. The sheet already draws a held feeling
 * as disabled; this is the race the constraint exists for — two taps, a
 * retry, a second tab — and the right answer to it is "you have that one",
 * not a red box.
 */
export async function addFeeling(
  sessionId: string,
  path: FeelingPath,
): Promise<AddFeelingResult> {
  const { error } = await getSupabase()
    .from('session_feelings')
    .insert({
      session_id: sessionId,
      emotion_id: path.emotionId,
      detailed_id: path.detailedId,
      specific_i: path.specificI,
    });

  if (error !== null) {
    if (error.code === UNIQUE_VIOLATION) return 'already-held';
    throw new Error(`[musie] could not hold on to that feeling: ${error.message}`);
  }
  return 'added';
}

export async function removeFeeling(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('session_feelings')
    .delete()
    .eq('id', id);
  if (error !== null) {
    throw new Error(`[musie] could not remove that feeling: ${error.message}`);
  }
}

export interface SessionFeelings {
  feelings: HeldFeeling[];
  /** True until the first read lands. */
  loading: boolean;
  /** The last read or write that failed. Cleared by the next one that works. */
  error: Error | null;
  add: (path: FeelingPath) => Promise<AddFeelingResult>;
  remove: (id: string) => Promise<void>;
}

/**
 * The step and the sheet read one source.
 *
 * NOT `useAsync`. That hook is for a read whose only job is to land; this one
 * is read AND written, by two components, and the list has to be right
 * between a write and the reload that confirms it. So the list is state here
 * and every mutation re-reads: one extra round trip per tap, against a list
 * that is never more than five rows, in exchange for never having to
 * reconcile an optimistic row with a real one.
 *
 * RE-READS ON LOCALE CHANGE, because the label is resolved at read time and
 * switching language mid-session must not leave German words on an English
 * screen. `locale` is an argument rather than a `useLocale()` call so the
 * module stays drivable from a test with no provider around it.
 */
export function useSessionFeelings(
  sessionId: string,
  locale: Locale,
  /**
   * ONLY THE REFLECT STEP ASKS. A session has four steps and the feelings
   * belong to one of them, so the other three would otherwise each open the
   * run with a query for a list nothing on screen can show.
   *
   * A FLAG AND NOT A CONDITIONAL CALL, because a hook cannot be conditional —
   * and the flag is honest about what it does: `false` means the list stays
   * empty and `loading` stays false, which is the same thing the step would
   * see before its first read landed anyway.
   */
  enabled = true,
): SessionFeelings {
  const [feelings, setFeelings] = React.useState<HeldFeeling[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  /* Latest-ref, read inside callbacks and never a dependency of them — the
     same shape `useAsync` uses, and for the same reason: a new closure every
     render must not re-fire the request. */
  const localeRef = React.useRef(locale);
  React.useEffect(() => { localeRef.current = locale; }, [locale]);

  const load = React.useCallback(async () => {
    const next = await listFeelings(sessionId, localeRef.current);
    setFeelings(next);
    return next;
  }, [sessionId]);

  /* THE FIRST READ, AND EVERY RE-READ THE LOCALE ASKS FOR. `cancelled` is not
     decoration: switch language mid-flight and the German response can land
     after the English one. */
  React.useEffect(() => {
    if (!enabled) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    listFeelings(sessionId, locale)
      .then((next) => {
        if (cancelled) return;
        setFeelings(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId, locale, enabled]);

  const add = React.useCallback(async (path: FeelingPath) => {
    try {
      const result = await addFeeling(sessionId, path);
      await load();
      setError(null);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      throw cause;
    }
  }, [sessionId, load]);

  const remove = React.useCallback(async (id: string) => {
    try {
      await removeFeeling(id);
      await load();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      throw cause;
    }
    /* `sessionId` is not a dependency: `load` already closes over it and
       changes when it changes, so naming it here would be a second claim
       about the same fact. */
  }, [load]);

  return { feelings, loading, error, add, remove };
}
