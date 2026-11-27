/* Rahmen für die eingebetteten Effekte des Fokus-Sheet-Experiments (CLAUDE.md Regel 10).
   Eine abgespeckte Kopie von /experiments/digital-image-entertainment/261126-1028/shell.js
   (Ben, 2026-11-27: „Implementiere dazu die Experimente Wasser, Morphen, Farbe verrühren und
   Marmorieren“). Gestrichen: Kopf, Knöpfe, „Andere Karte“ und die eigene Musik – die spielt die
   Hören-Ansicht. Geändert: `fit` beschneidet wie `object-fit: cover`, damit der Effekt genau
   den Ausschnitt zeigt, den die Karte darunter zeigt. Die Karte kommt aus `?src=`.
   Kein PostHog, nichts nach Supabase. */

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const cardSrc = new URLSearchParams(location.search).get('src') || '/assets/web/cards/mc-01.webp';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`Bild fehlt: ${src}`));
    im.src = src;
  });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* COVER: das Bild füllt die Bühne ganz und wird mittig beschnitten. sx…sh ist der Ausschnitt in
   Bildpixeln. (Im Original füllte es nur die Höhe und ließ auf breiten Bildschirmen Sand stehen.) */
function fit(im) {
  const box = stage.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(box.width));
  const cssH = Math.max(1, Math.round(box.height));
  const s = Math.max(cssW / im.naturalWidth, cssH / im.naturalHeight);
  const sw = cssW / s;
  const sh = cssH / s;
  return { cssW, cssH, left: 0, sx: (im.naturalWidth - sw) / 2, sy: (im.naturalHeight - sh) / 2, sw, sh };
}

function place(el, g) {
  el.style.left = `${g.left}px`;
  el.style.width = `${g.cssW}px`;
  el.style.height = `${g.cssH}px`;
}

function pictureCanvas(im, g, w, h) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  x.drawImage(im, g.sx, g.sy, g.sw, g.sh, 0, 0, c.width, c.height);
  return c;
}

/* Der Hören-Ansicht sagen, dass das Bild berührt wurde – sie zeigt dann „Bild zurücksetzen“. */
function tell(type) {
  if (window.parent !== window) window.parent.postMessage({ source: 'focus-sheet-effect', type }, location.origin);
}

/* Zeiger in CSS-Pixeln des Elements; mehrere Finger zugleich. */
function track(el, { down, move, up }) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    down(e.pointerId, e.clientX - r.left, e.clientY - r.top);
    tell('touch');
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const r = el.getBoundingClientRect();
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const c of list.length ? list : [e]) move(e.pointerId, c.clientX - r.left, c.clientY - r.top);
  });
  const end = (e) => {
    up(e.pointerId);
    tell('release');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function loop(fn) {
  let last = performance.now();
  const f = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fn(dt, now);
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

function notice(text) {
  stage.insertAdjacentHTML('beforeend', `<p class="notice">${text}</p>`);
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function boot(effect) {
  let img = null;
  let size = '';
  new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (key === size) return;
    size = key;
    if (img) effect.setImage(img);
  }).observe(stage);
  loadImage(cardSrc).then((im) => {
    img = im;
    effect.setImage(im);
  });
  /* „Bild zurücksetzen“ aus der Hören-Ansicht: der Effekt seine eigene Rücksetzung, wo er eine
     hat (Verrühren, Marmorieren), sonst von vorn mit demselben Bild (Wasser, Morphen). */
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.source !== 'focus-sheet' || e.data.type !== 'reset' || !img) return;
    if (typeof effect.reset === 'function') effect.reset();
    else effect.setImage(img);
  });
}
