/**
 * THE NEW LISTENING VIEW — Figma „Achtsame Pause · Hören · digitale Karte ·
 * Anweisung an“ (Layer 1 file, page 30), with Ben's comments and annotations,
 * 2026-11-27. Quick and dirty, to be tried on a phone; it replaces the
 * immersive Sheet in this experiment only.
 *
 *   · The card fills what the layout leaves it, cropped (cover), corners 32 px.
 *     Progress bar and X lie over its top edge at Figma's exact insets
 *     („consider spacing here“, „consider the exact gap“): 10 px from the top,
 *     22 px from the left, 11 px from the right — so the bar starts 22 px in
 *     and the X's glyph ends 23 px in.
 *   · „ONLY dark palette inside image“ (X and reset): the controls laid on the
 *     picture sit under `data-theme="dark"`, so every token they read is the
 *     dark one. This replaced the X that measured the picture's brightness.
 *   · The track is „bg with opacity“: rgb(199 204 192 / 0.7).
 *   · „this is sticky to the bottom of the screen“: the action row — and the
 *     instruction under it, when open — sit at the bottom edge.
 *   · „Image mask: if the panel on the bottom is open, the image gets masked“.
 *   · Pause is an icon button now.
 *
 * ── THE PICTURE CAN BE PLAYED WITH ───────────────────────────────────────
 * Over the card lies one of four effects from „Mit dem Bild spielen“, picked
 * per tab (`effect.ts`), in an iframe. The card `<img>` stays underneath and
 * shows until the effect has drawn.
 *
 * THE RESET (annotation: „a reset button to reset the image. Only appears
 * when the user has manipulated the image“). The effect page reports each
 * touch and release by `postMessage`; the button shows on the first touch and
 * goes on reset — or by itself once an effect that heals on its own has had
 * time to (`Effect.settleMs`). Marmorieren never heals, so there it stays.
 *
 * THE MASK IS A MASK. Card and effect sit in a LAYER as tall as the card is
 * with the instruction closed; opening the instruction shortens the box and
 * the layer is cut off at the bottom — nothing rescales, so the effect keeps
 * what was played.
 */
import * as React from 'react';
import { Info, Pause, Play, RotateCcw, X } from 'lucide-react';
import { Button, IconButton } from '@musie/design-system';
import type { Player } from './player';

export interface HoerenProps {
  imageSrc: string;
  imageAlt: string;
  /** The embedded effect page over the card, or null for the plain card. */
  effectSrc: string | null;
  /** What the effect is, for the iframe's accessible name. */
  effectName: string;
  /** How long after the last release the effect has healed by itself; null if never. */
  effectSettleMs: number | null;
  instruction: string;
  /** 0–1: the share of the minimum time listened. */
  progress: number;
  player: Player;
  onClose: () => void;
}

/** What the embedded effect page says (see `effects/embed.js`). */
interface EffectMessage {
  source: 'vollbild-effect';
  type: 'touch' | 'release';
}

function isEffectMessage(data: unknown): data is EffectMessage {
  return typeof data === 'object' && data !== null
    && (data as { source?: unknown }).source === 'vollbild-effect';
}

export function Hoeren({
  imageSrc, imageAlt, effectSrc, effectName, effectSettleMs, instruction, progress, player, onClose,
}: HoerenProps) {
  const [showInstruction, setShowInstruction] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  /* The layer's height: what the card's box is with the instruction CLOSED.
     Null until measured, and then the layer simply fills the box. */
  const [layerHeight, setLayerHeight] = React.useState<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  /* COMPUTED FROM THE VIEW, NOT FROM THE BOX: the view's inner height minus
     the gap and the action row. So the instruction opening and closing does
     not move it by even a pixel — a pixel would restart the effect. Again
     only when the view itself resizes (fullscreen is a resize). */
  React.useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;
    const update = () => {
      const style = getComputedStyle(root);
      const inner = root.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
      const gap = Number.parseFloat(style.rowGap) || 0;
      const actions = actionsRef.current?.getBoundingClientRect().height ?? 0;
      setLayerHeight(Math.round(inner - gap - actions));
    };
    const observer = new ResizeObserver(update);
    observer.observe(root);
    update();
    return () => observer.disconnect();
  }, []);

  /* The effect page's touches: show the reset on a touch, and — for an effect
     that heals by itself — hide it again once it has had time to. */
  React.useEffect(() => {
    let settle: number | undefined;
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow || !isEffectMessage(event.data)) return;
      window.clearTimeout(settle);
      if (event.data.type === 'touch') setTouched(true);
      else if (effectSettleMs !== null) settle = window.setTimeout(() => setTouched(false), effectSettleMs);
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(settle);
    };
  }, [effectSettleMs]);

  const reset = React.useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ source: 'vollbild', type: 'reset' }, window.location.origin);
    setTouched(false);
  }, []);

  /* Escape closes, as the old sheet's did. */
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* The page behind does not scroll under a thumb while this is open. */
  React.useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, []);

  let transport: { label: string; icon: typeof Pause; onClick: () => void };
  if (player.playing) transport = { label: 'Pause', icon: Pause, onClick: player.pause };
  else if (player.ended) transport = { label: 'Nochmal hören', icon: Play, onClick: player.play };
  else transport = { label: 'Abspielen', icon: Play, onClick: player.play };

  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div ref={rootRef} className="musie-hoeren" role="dialog" aria-modal="true" aria-label="Hören">
      <div className="musie-hoeren__media">
        <div
          className="musie-hoeren__layer"
          style={layerHeight === null ? undefined : { blockSize: `${layerHeight}px` }}
        >
          <img src={imageSrc} alt={imageAlt} />
          {effectSrc !== null && (
            <iframe
              ref={frameRef}
              className="musie-hoeren__effect"
              src={effectSrc}
              title={`Mit dem Bild spielen: ${effectName}`}
            />
          )}
        </div>
        {/* Darkens the corner under the X so it keeps 3:1 (Ben: 40 %). */}
        <div className="musie-hoeren__scrim" aria-hidden="true" />
        <div className="musie-hoeren__head">
          <div
            className="musie-hoeren__progress"
            role="progressbar"
            aria-label="Mindestzeit"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="musie-hoeren__fill" style={{ inlineSize: `${percent}%` }} />
          </div>
          {/* „ONLY dark palette inside image“ */}
          <div className="musie-hoeren__on-image" data-theme="dark">
            <IconButton glyph={X} label="Hören beenden" tooltip={false} onClick={onClose} />
          </div>
        </div>
        {touched && (
          <div className="musie-hoeren__reset musie-hoeren__on-image" data-theme="dark">
            <IconButton glyph={RotateCcw} label="Bild zurücksetzen" tooltip={false} onClick={reset} />
          </div>
        )}
      </div>
      <div className="musie-hoeren__foot">
        <div ref={actionsRef} className="musie-hoeren__actions">
          <IconButton
            glyph={transport.icon}
            label={transport.label}
            tooltip={false}
            disabled={!player.ready}
            onClick={transport.onClick}
          />
          <Button
            variant="ghost"
            size="min"
            leadingIcon={Info}
            aria-expanded={showInstruction}
            onClick={() => setShowInstruction((open) => !open)}
          >
            {showInstruction ? 'Anweisung ausblenden' : 'Was sollte ich machen?'}
          </Button>
        </div>
        {showInstruction && <p className="musie-hoeren__instruction">{instruction}</p>}
      </div>
    </div>
  );
}
