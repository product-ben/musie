import { useCallback, useEffect, useRef, useState } from 'react';
import type { CombineOrder } from '@musie/design-system';
import type { Sentence } from './transcript/types';
import type { UndoReason } from './messages';
import { onSentenceFinal } from './onSentenceFinal';

/** How long the undo offer stays on screen after a destructive change. */
const UNDO_SECONDS = 6;

type Undoable = { reason: UndoReason; snapshot: Sentence[] } | null;

const newId = () =>
  typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}`;

/**
 * Owns the list of finalised statements and every edit the user can make to it.
 *
 * Combining and deleting destroy text, so both snapshot the list first and
 * offer an undo. Editing does not: it has an explicit Discard.
 *
 * `combine` and `move` take exactly the arguments §7.24's Draggable List hands
 * its `onCombine` and `onMove`, and `CombineOrder` is the system's own type
 * rather than a second declaration of the same two words. That is what makes
 * F.4 a wiring job: `<DraggableList items={sentences} onCombine={combine}
 * onMove={move} …>` type-checks with no adapter in between.
 */
export function useSentences() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [undoable, setUndoable] = useState<Undoable>(null);
  const undoTimer = useRef<number | null>(null);

  const offerUndo = useCallback((reason: UndoReason, snapshot: Sentence[]) => {
    setUndoable({ reason, snapshot });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoable(null), UNDO_SECONDS * 1000);
  }, []);

  const dismissUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoable(null);
  }, []);

  const undo = useCallback(() => {
    setUndoable((current) => {
      if (current) setSentences(current.snapshot);
      return null;
    });
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  /** Called by the transcriber as each turn finalises. Newest goes last. */
  const append = useCallback((texts: string[], language: string) => {
    const at = new Date().toISOString();
    // Ids and the timestamp are computed out here: a state updater may run twice.
    const fresh = texts.map((text) => ({ id: newId(), text, language, createdAt: at }));
    setSentences((previous) => [...previous, ...fresh]);
  }, []);

  const reset = useCallback(() => {
    setSentences([]);
    dismissUndo();
  }, [dismissUndo]);

  const edit = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSentences((previous) =>
      previous.map((sentence) => {
        if (sentence.id !== id || sentence.text === trimmed) return sentence;
        // The corrected text is what downstream logic should judge.
        onSentenceFinal(trimmed, sentence.language);
        return { ...sentence, text: trimmed };
      }),
    );
  }, []);

  /** Merges the dragged statement into the one it was dropped on. */
  const combine = useCallback(
    (sourceId: string, targetId: string, order: CombineOrder = 'targetFirst') => {
      if (sourceId === targetId) return;
      setSentences((previous) => {
        const source = previous.find((s) => s.id === sourceId);
        const target = previous.find((s) => s.id === targetId);
        if (!source || !target) return previous;

        offerUndo('combined', previous);
        const parts =
          order === 'sourceFirst' ? [source.text, target.text] : [target.text, source.text];
        const merged = parts.join(' ').replace(/\s+/g, ' ').trim();
        onSentenceFinal(merged, target.language);

        return previous
          .filter((s) => s.id !== sourceId)
          .map((s) => (s.id === targetId ? { ...s, text: merged } : s));
      });
    },
    [offerUndo],
  );

  /** Moves a statement to just before or just after another one. */
  const move = useCallback((sourceId: string, targetId: string, position: 'before' | 'after') => {
    if (sourceId === targetId) return;
    setSentences((previous) => {
      const from = previous.findIndex((s) => s.id === sourceId);
      const target = previous.findIndex((s) => s.id === targetId);
      if (from === -1 || target === -1) return previous;

      const next = [...previous];
      const [moved] = next.splice(from, 1);
      // Recompute after removal so the index still points at the same box.
      const anchor = next.findIndex((s) => s.id === targetId);
      next.splice(position === 'before' ? anchor : anchor + 1, 0, moved);
      return next;
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      setSentences((previous) => {
        if (!previous.some((s) => s.id === id)) return previous;
        offerUndo('deleted', previous);
        return previous.filter((s) => s.id !== id);
      });
    },
    [offerUndo],
  );

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  return {
    sentences,
    /**
     * WHY a reason and not a label. The POC returned the finished sentence
     * "Statements combined" from here, which is a user-visible string produced
     * below the app — see messages.ts for why none of those survived the
     * import.
     */
    undoReason: undoable?.reason ?? null,
    append,
    reset,
    edit,
    combine,
    move,
    remove,
    undo,
    dismissUndo,
  };
}
