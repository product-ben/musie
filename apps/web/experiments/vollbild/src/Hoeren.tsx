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
  instruction: string;
  /** 0–1: the share of the minimum time listened. */
  progress: number;
  player: Player;
  onClose: () => void;
}

export function Hoeren({ imageSrc, imageAlt, instruction, progress, player, onClose }: HoerenProps) {
  const [showInstruction, setShowInstruction] = React.useState(false);
  const [tone, setTone] = React.useState<Tone>('light');
  const mediaRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  /* The X's tone, again whenever the crop changes: the image loading, the
     window resizing (fullscreen is a resize), the instruction opening. */
  const measure = React.useCallback(() => {
    const media = mediaRef.current;
    const img = imgRef.current;
    const close = closeRef.current;
    if (media === null || img === null || close === null || !img.complete) return;
    setTone(toneUnder(img, media.getBoundingClientRect(), close.getBoundingClientRect()));
  }, []);

  React.useEffect(() => {
    const media = mediaRef.current;
    if (media === null) return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(media);
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
    <div className="musie-hoeren" role="dialog" aria-modal="true" aria-label="Hören">
      <div ref={mediaRef} className="musie-hoeren__media">
        <img ref={imgRef} src={imageSrc} alt={imageAlt} onLoad={measure} />
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
        <div className="musie-hoeren__actions">
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
