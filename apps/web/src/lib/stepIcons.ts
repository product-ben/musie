/**
 * One glyph per step, for the rail.
 *
 * Extracted from `Session.tsx` on 2026-10-27, when `/exercise-builder` grew a
 * preview that draws the REAL `InteractiveWizard` and needed the same six.
 * Two copies of a six-entry map is two copies that drift, and the one that
 * drifts is the one nobody is looking at — the builder, where a wrong glyph
 * would be read as the app's.
 *
 * A `Record<StepId, …>`, so a seventh step is a compile error here rather
 * than a rail with a gap in it.
 */
import { DoorOpen, Headphones, Image as ImageIcon, Images, Quote, ScanQrCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StepId } from '../routeHandle';

export const STEP_ICON: Record<StepId, LucideIcon> = {
  intro: DoorOpen,
  scan: ScanQrCode,
  /* One picture for the step that shows you one, a stack for the step that
     asks you to choose between five. */
  view: ImageIcon,
  select: Images,
  listen: Headphones,
  reflect: Quote,
};
