/**
 * THE NEW LISTENING VIEW — Figma „Achtsame Pause · Hören · digitale Karte ·
 * Anweisung an“ (Layer 1 file, page 30), with Ben's four comments, 2026-11-27.
 * Quick and dirty, to be tried on a phone; it replaces the immersive Sheet in
 * this experiment only.
 *
 *   · The card fills what the layout leaves it, cropped (cover), corners
 *     radius/card. Progress bar and X lie over its top edge.
 *   · „make the icon white! Wenn bg is dark → icon white, when bg is light →
 *     icon dark“: the X's colour follows the brightness of the picture under
 *     it, sampled from the crop that is actually on screen (`toneUnder`).
 *   · „this is sticky to the bottom of the screen“ (twice): the action row —
 *     and the instruction under it, when open — sit at the bottom edge.
 *   · „Image mask: if the panel on the bottom is open, the image gets
 *     masked“: opening the instruction takes its height from the card, which
 *     is cropped further rather than scaled.
 *
 * The progress bar is the share of the minimum time listened (Figma
 * „Progress“: it replaces the countdown figure). Continuous here; the 10 %
 * steps are only how Figma can draw it.
 *
 * ── THE PICTURE CAN BE PLAYED WITH (2026-11-27) ──────────────────────────
 * Over the card lies one of four effects from „Mit dem Bild spielen“, picked
 * per tab (`effect.ts`), in an iframe. The card `<img>` stays underneath: it
 * shows until the effect has drawn, and the X's tone is measured from it.
 *
 * THE MASK IS A MASK NOW. Card and effect sit in a LAYER as tall as the card
 * is with the instruction closed; opening the instruction shortens the box
 * and the layer is cut off at the bottom — nothing rescales. That is Ben's
 * comment taken literally, and it is also what keeps the effect alive: a
 * resized iframe would start its effect over and lose what was played.
 */
import * as React from 'react';
import { Info, Pause, Play, RotateCcw, X } from 'lucide-react';
import { Button, IconButton } from '@musie/design-system';
import type { Player } from './player';

type Tone = 'light' | 'dark';

/**
 * Light or dark, for the picture under `box` — where `img` is drawn with
 * `object-fit: cover` (centred) into `media`. Reads the source pixels of
 * exactly that crop into an 8×8 canvas and averages their luminance.
 */
function toneUnder(img: HTMLImageElement, media: DOMRect, box: DOMRect): Tone {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (width === 0 || height === 0 || media.width === 0 || media.height === 0) return 'light';
  const scale = Math.max(media.width / width, media.height / height);
  const offsetX = (media.width - width * scale) / 2;
  const offsetY = (media.height - height * scale) / 2;
  const sx = (box.left - media.left - offsetX) / scale;
  const sy = (box.top - media.top - offsetY) / scale;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) return 'light';
  try {
    context.drawImage(img, sx, sy, box.width / scale, box.height / scale, 0, 0, 8, 8);
    const data = context.getImageData(0, 0, 8, 8).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const luminance = sum / (data.length / 4) / 255;
    /* A GUESS, not tuned: below the middle reads as dark under a thin X. */
    return luminance < 0.55 ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export interface HoerenProps {
  imageSrc: string;
  imageAlt: string;
  /** The embedded effect page over the card, or null for the plain card. */
  effectSrc: string | null;
  /** What the effect is, for the iframe's accessible name. */
  effectName: string;
  instruction: string;
  /** 0–1: the share of the minimum time listened. */
  progress: number;
  player: Player;
  onClose: () => void;
}

export function Hoeren({
  imageSrc, imageAlt, effectSrc, effectName, instruction, progress, player, onClose,
}: HoerenProps) {
  const [showInstruction, setShowInstruction] = React.useState(false);
  const [tone, setTone] = React.useState<Tone>('light');
  /* The layer's height: what the card's box is with the instruction CLOSED.
     Null until measured, and then the layer simply fills the box. */
  const [layerHeight, setLayerHeight] = React.useState<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mediaRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  /* The X's tone, from the card as the layer draws it — which is the same
     crop the effect shows (its `fit` is cover too). */
  const measure = React.useCallback(() => {
    const img = imgRef.current;
    const close = closeRef.current;
    if (img === null || close === null || !img.complete) return;
    setTone(toneUnder(img, img.getBoundingClientRect(), close.getBoundingClientRect()));
  }, []);

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
      measure();
    };
    const observer = new ResizeObserver(update);
    observer.observe(root);
    update();
    return () => observer.disconnect();
  }, [measure]);

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
  else if (player.ended) transport = { label: 'Nochmal hören', icon: RotateCcw, onClick: player.play };
  else transport = { label: 'Abspielen', icon: Play, onClick: player.play };

  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div ref={rootRef} className="musie-hoeren" role="dialog" aria-modal="true" aria-label="Hören">
      <div ref={mediaRef} className="musie-hoeren__media">
        <div
          className="musie-hoeren__layer"
          style={layerHeight === null ? undefined : { blockSize: `${layerHeight}px` }}
        >
          <img ref={imgRef} src={imageSrc} alt={imageAlt} onLoad={measure} />
          {effectSrc !== null && (
            <iframe
              className="musie-hoeren__effect"
              src={effectSrc}
              title={`Mit dem Bild spielen: ${effectName}`}
            />
          )}
        </div>
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
          <IconButton
            ref={closeRef}
            className="musie-hoeren__close"
            data-tone={tone}
            glyph={X}
            label="Hören beenden"
            tooltip={false}
            onClick={onClose}
          />
        </div>
      </div>
      <div className="musie-hoeren__foot">
        <div ref={actionsRef} className="musie-hoeren__actions">
          <Button
            variant="ghost"
            size="min"
            leadingIcon={transport.icon}
            disabled={!player.ready}
            onClick={transport.onClick}
          >
            {transport.label}
          </Button>
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
