/**
 * The instrument on the focus sheet: a canvas, the session that sounds it,
 * and everything between a finger and an adapter — 2026-11-09.
 *
 * ── WHAT THE STAGE OWNS ───────────────────────────────────────────────────
 * The engine's session (`instruments/engine/host.ts`) builds the host, the
 * adapter, the clock, the answer and the demo; it draws once it has a canvas
 * and a layout. What it cannot do from inside an engine, the stage does here,
 * and the lanes that built the adapters wrote the list (plan, "What the lanes
 * left for integration"):
 *
 *   · size the canvas to box × dpr — adapters set their own transform;
 *   · pass pointers with the touch's radius (`Touch.radiusX` semantics:
 *     half of `PointerEvent.width`, which is a diameter) and its force;
 *   · capture pointers, and pass `pointercancel` on as `pointerUp`;
 *   · forward a mouse's moves with no button down (the harp's A-key strum);
 *   · send `keyUp` for held keys when the window loses focus;
 *   · tell the session about every touch (`touched`), so a touch that hits
 *     no note still stops the demo and an answer.
 *
 * ── ONE SESSION PER OPENING ───────────────────────────────────────────────
 * Created when the sheet mounts this, disposed when it unmounts. The clock is
 * carried across: the parent hands back the last clock state, so closing the
 * sheet and opening it again continues the same 1:30 rather than starting a
 * new one.
 */
import * as React from 'react';
import { createInstrumentSession } from '../instruments/engine/host';
import type { InstrumentSession } from '../instruments/engine/host';
import type { ClockState } from '../instruments/engine/clock';
import { createHarp } from '../instruments/harp';
import { createKalimba } from '../instruments/kalimba';
import { createMarimba } from '../instruments/marimba';
import type { InstrumentDefinition, InstrumentFactory, InstrumentId, StagePointer } from '../instruments/types';
import type { PlayMode } from '../lib/content';

const FACTORIES: Record<InstrumentId, InstrumentFactory> = {
  harp: createHarp,
  kalimba: createKalimba,
  marimba: createMarimba,
};

export interface InstrumentStageProps {
  definition: InstrumentDefinition;
  /** `exercises.listen_gate_seconds` — the timer. */
  durationSeconds: number;
  /** Read on every note, so the settings dialogue takes effect at once. */
  mode: PlayMode;
  vibration: boolean;
  /** The clock as the last opening left it, or undefined for a fresh one. */
  clock?: ClockState;
  onClock: (state: ClockState) => void;
  /** The session, once it exists — the countdown and *Weiter* drive it. */
  onSession: (session: InstrumentSession | null) => void;
  /** The demo note sounded (degree), for the screen reader's sentence. */
  onDemo: (degree: number) => void;
  /** The person played their first note: the onboarding sentence goes. */
  onPlayed: () => void;
  /** The marimba wants the phone turned (portrait on a touch screen). */
  onOrientationHint?: (show: boolean) => void;
  /** Samples failed to load. */
  onError: (error: unknown) => void;
  /** The accessible name of the canvas. */
  label: string;
}

function pointerOf(e: React.PointerEvent<HTMLCanvasElement>, box: DOMRect): StagePointer {
  const native = e.nativeEvent;
  const coalesced = typeof native.getCoalescedEvents === 'function'
    ? native.getCoalescedEvents().map((c) => ({ x: c.clientX - box.left, y: c.clientY - box.top, t: c.timeStamp }))
    : undefined;
  return {
    id: e.pointerId,
    x: e.clientX - box.left,
    y: e.clientY - box.top,
    t: e.timeStamp,
    type: e.pointerType === 'mouse' || e.pointerType === 'pen' ? e.pointerType : 'touch',
    radius: e.pointerType === 'touch' && e.width > 0 ? e.width / 2 : undefined,
    force: e.pointerType === 'touch' && e.pressure > 0 ? e.pressure : undefined,
    coalesced,
  };
}

export function InstrumentStage({
  definition, durationSeconds, mode, vibration, clock, onClock, onSession, onDemo, onPlayed,
  onOrientationHint, onError, label,
}: InstrumentStageProps) {
  const scopeRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sessionRef = React.useRef<InstrumentSession | null>(null);

  /* The settings are read through refs: the session asks on every note, and
     re-creating it on every switch would cut the sound. */
  const modeRef = React.useRef(mode);
  const vibrationRef = React.useRef(vibration);
  modeRef.current = mode;
  vibrationRef.current = vibration;

  const callbacks = React.useRef({ onClock, onSession, onDemo, onPlayed, onOrientationHint, onError });
  callbacks.current = { onClock, onSession, onDemo, onPlayed, onOrientationHint, onError };
  const initialClock = React.useRef(clock);

  /* Solo means no answer NOW, not only no next answer. */
  React.useEffect(() => {
    if (mode === 'solo') sessionRef.current?.quiet();
  }, [mode]);

  React.useEffect(() => {
    const scope = scopeRef.current;
    const canvas = canvasRef.current;
    if (scope === null || canvas === null) return undefined;

    let session: InstrumentSession;
    try {
      session = createInstrumentSession({
        definition,
        factory: FACTORIES[definition.id],
        scope,
        canvas,
        durationSeconds,
        getMode: () => modeRef.current,
        getVibration: () => vibrationRef.current,
        clock: initialClock.current,
        onClock: (state) => callbacks.current.onClock(state),
        onPlayed: () => callbacks.current.onPlayed(),
        onDemo: (meta) => callbacks.current.onDemo(meta.degree),
      });
    } catch (error) {
      callbacks.current.onError(error);
      return undefined;
    }
    sessionRef.current = session;
    callbacks.current.onSession(session);
    session.ready.catch((error: unknown) => callbacks.current.onError(error));

    /* ── THE BOX ── measured, not guessed: the sheet decides how much room the
       instrument gets, and a rotation or a keyboard changes it. */
    const measure = () => {
      const rect = scope.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      session.layout({
        width: rect.width,
        height: rect.height,
        dpr,
        inset: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      const hint = (session.adapter as { orientationHint?: boolean }).orientationHint;
      callbacks.current.onOrientationHint?.(hint === true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scope);

    /* ── KEYS ── the experiments' keyboards, on the window while the sheet is
       up; never while typing, never with a modifier. Held keys are released
       on blur, or the harp's A-key strum would stay down forever. */
    const held = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      /* A key on a control is the control's: Space on a switch toggles it,
         Enter on Weiter goes on. The sheet itself is a dialog too, so the
         filter names controls rather than dialogs. */
      if (target?.closest?.('input, textarea, select, button, a, [role="switch"], [role="radio"], [contenteditable="true"]')) return;
      if (session.adapter.keyDown(e.key, e.shiftKey)) {
        held.add(e.key);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      held.delete(e.key);
      session.adapter.keyUp(e.key);
    };
    const onBlur = () => {
      held.forEach((key) => session.adapter.keyUp(key));
      held.clear();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      /* CLOSING THE SHEET IS A PAUSE. The clock is handed back paused, so the
         step shows *Weiter zum Reflektieren* — the same answer a press on
         Pause gives — and reopening continues from where it stood. */
      if (session.clock.state().phase === 'running') {
        session.clock.dispatch({ type: 'PAUSE', at: performance.now() });
      }
      sessionRef.current = null;
      callbacks.current.onSession(null);
      session.dispose();
    };
  }, [definition, durationSeconds]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const session = sessionRef.current;
    if (session === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    session.touched();
    session.adapter.pointerDown(pointerOf(e, e.currentTarget.getBoundingClientRect()));
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    sessionRef.current?.adapter.pointerMove(pointerOf(e, e.currentTarget.getBoundingClientRect()));
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    sessionRef.current?.adapter.pointerUp(pointerOf(e, e.currentTarget.getBoundingClientRect()));
  }

  return (
    <div ref={scopeRef} className="musie-instrument">
      {/* `role="application"`: inside it the keys play notes rather than
          scroll or move focus, and a screen reader needs to be told so. The
          label names the instrument and the keys. */}
      <canvas
        ref={canvasRef}
        className="musie-instrument__canvas"
        role="application"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
