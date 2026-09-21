import type { DraggableItem } from '@musie/design-system';

/**
 * A finalised statement.
 *
 * It EXTENDS the design system's `DraggableItem` rather than redeclaring `id`
 * and `text`, which is the whole point: §7.24's Draggable List is the editing
 * surface this list is destined for (F.4), and a list of `Sentence` is already
 * a valid `items` prop. The POC declared its own shape and its own `DropMode`
 * and `DropTarget` beside it, all three of which the system already owns —
 * CLAUDE.md 1, and the reason those two types did not come across.
 *
 * Ids are needed so reordering survives re-renders, which is also why
 * `DraggableItem` marks `id` REQUIRED and says an index cannot stand in.
 */
export type Sentence = DraggableItem & {
  language: string;
  /** When the statement was finalised, ISO 8601. */
  createdAt: string;
};
