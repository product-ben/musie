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
 *     no note still stops the demo and an answer;
 *   · show the harp's green cursor dot over the canvas (`InstrumentCursor`);
 *   · turn the marimba a quarter turn when its box stands upright.
 *
 * ── THE MARIMBA UPRIGHT ───────────────────────────────────────────────────
 * Landscape is the marimba's orientation, and its experiment asked for the
 * phone to be turned. Ben, 2026-11-09: held upright, the instrument turns
 * instead — the bars lie across the screen, the low ones at the bottom, and
 * the words stay upright. The adapter never knows: it is handed a landscape
 * box (the head and foot become its right and left insets), the canvas is
 * drawn landscape and rotated a quarter turn counter-clockwise in CSS, and
 * every pointer is turned back before the adapter sees it. So the experiment's
 * drawing and hit test stay exactly what their parity tests compare.
 *
 * ── ONE SESSION PER OPENING ───────────────────────────────────────────────
 * Created when the sheet mounts this, disposed when it unmounts. The clock is
 * carried across: the parent hands back the last clock state, so closing the
 * sheet and opening it again continues the same 1:30 rather than starting a
 * new one.
 */
import * as React from 'react';
import { InstrumentCursor } from '@musie/design-system';
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

/** Which instruments turn a quarter turn in an upright box. */
const TURNS_UPRIGHT: Record<InstrumentId, boolean> = {
  harp: false,
  kalimba: false,
  marimba: true,
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
  /** The instrument is turned a quarter turn (the marimba in an upright box). */
  onTurn?: (turned: boolean) => void;
  /** Samples failed to load. */
  onError: (error: unknown) => void;
  /** The accessible name of the canvas. */
  label: string;
  /**
   * The sheet's head and foot, laid over the stage: their edges are the
   * instrument's insets — where the kalimba's and the marimba's experiments
   * measured their header's bottom and their foot's top. The harp ignores
   * them, as its experiment did: its strings run the full height.
   */
  insetTop?: React.RefObject<HTMLElement | null>;
  insetBottom?: React.RefObject<HTMLElement | null>;
}

function pointerOf(e: React.PointerEvent<HTMLCanvasElement>, box: DOMRect, turned: boolean): StagePointer {
  /* A turned canvas is the landscape picture rotated counter-clockwise: its
     x runs up the screen from the bottom, its y across from the left. `box`
     is the rotated canvas's box on screen, which is the upright one. */
  const at = (clientX: number, clientY: number) => (turned
    ? { x: box.bottom - clientY, y: clientX - box.left }
    : { x: clientX - box.left, y: clientY - box.top });
  const native = e.nativeEvent;
  const coalesced = typeof native.getCoalescedEvents === 'function'
    ? native.getCoalescedEvents().map((c) => ({ ...at(c.clientX, c.clientY), t: c.timeStamp }))
    : undefined;
  return {
    id: e.pointerId,
    ...at(e.clientX, e.clientY),
    t: e.timeStamp,
    type: e.pointerType === 'mouse' || e.pointerType === 'pen' ? e.pointerType : 'touch',
    radius: e.pointerType === 'touch' && e.width > 0 ? e.width / 2 : undefined,
    force: e.pointerType === 'touch' && e.pressure > 0 ? e.pressure : undefined,
    coalesced,
  };
}

export function InstrumentStage({
  definition, durationSeconds, mode, vibration, clock, onClock, onSession, onDemo, onPlayed,
  onTurn, onError, label, insetTop, insetBottom,
}: InstrumentStageProps) {
  const scopeRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sessionRef = React.useRef<InstrumentSession | null>(null);
  const turnedRef = React.useRef(false);

  /* The settings are read through refs: the session asks on every note, and
     re-creating it on every switch would cut the sound. */
  const modeRef = React.useRef(mode);
  const vibrationRef = React.useRef(vibration);
  modeRef.current = mode;
  vibrationRef.current = vibration;

  const callbacks = React.useRef({ onClock, onSession, onDemo, onPlayed, onTurn, onError });
  callbacks.current = { onClock, onSession, onDemo, onPlayed, onTurn, onError };
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
      const turned = TURNS_UPRIGHT[definition.id] && rect.height > rect.width;
      const width = turned ? rect.height : rect.width;
      const height = turned ? rect.width : rect.height;
      /* Only on a change: assigning a canvas's size clears it, even to the
         same number, and the foot's opening row re-measures every frame. */
      const pxWidth = Math.round(width * dpr);
      const pxHeight = Math.round(height * dpr);
      if (canvas.width !== pxWidth) canvas.width = pxWidth;
      if (canvas.height !== pxHeight) canvas.height = pxHeight;
      /* The CSS turns the canvas (`.musie-instrument[data-turned]`); the
         pointers are turned back in `pointerOf`. */
      scope.toggleAttribute('data-turned', turned);
      turnedRef.current = turned;
      const head = insetTop?.current?.getBoundingClientRect();
      const foot = insetBottom?.current?.getBoundingClientRect();
      const above = head === undefined ? 0 : Math.max(0, head.bottom - rect.top);
      const below = foot === undefined ? 0 : Math.max(0, rect.bottom - foot.top);
      session.layout({
        width,
        height,
        dpr,
        /* Turned, the screen's top is the picture's right and its bottom
           the picture's left. */
        inset: turned
          ? { top: 0, right: above, bottom: 0, left: below }
          : { top: above, right: 0, bottom: below, left: 0 },
      });
      callbacks.current.onTurn?.(turned);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scope);
    if (insetTop?.current) observer.observe(insetTop.current);
    if (insetBottom?.current) observer.observe(insetBottom.current);

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
      /* CLOSING THE SHEET IS A PAUSE, but not the person's. The clock is
         handed back paused, so the step shows *Weiter zum Reflektieren* and
         reopening continues from where it stood — while the sheet itself
         offers Weiter only after the person pauses (`showContinueInSheet`). */
      if (session.clock.state().phase === 'running') {
        session.clock.dispatch({ type: 'CLOSE', at: performance.now() });
      }
      sessionRef.current = null;
      callbacks.current.onSession(null);
      session.dispose();
    };
  }, [definition, durationSeconds, insetTop, insetBottom]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const session = sessionRef.current;
    if (session === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    session.touched();
    session.adapter.pointerDown(pointerOf(e, e.currentTarget.getBoundingClientRect(), turnedRef.current));
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    sessionRef.current?.adapter.pointerMove(pointerOf(e, e.currentTarget.getBoundingClientRect(), turnedRef.current));
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    sessionRef.current?.adapter.pointerUp(pointerOf(e, e.currentTarget.getBoundingClientRect(), turnedRef.current));
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
      {/* THE HARP'S GREEN DOT, for every instrument (Ben, round 2): it stands
          in for mouse and pen over the canvas and while a string is held past
          its edge; the normal pointer over controls; nothing for touch. The
          design system's, so its size and colour are tokens. */}
      <InstrumentCursor target={canvasRef} />
    </div>
  );
}
