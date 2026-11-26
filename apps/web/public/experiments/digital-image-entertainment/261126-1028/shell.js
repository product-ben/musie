/* Gemeinsamer Rahmen der Effekt-Seiten (Musie-Experiment, CLAUDE.md Regel 10): Karte, Musik, Zeiger.
   Jede Seite bringt nur ihren Effekt mit und ruft am Ende boot(effect) auf.
   Erwartet im Markup: #stage, #play, #time, #next und optional #reset.
   Kein PostHog, nichts nach Supabase. */

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ── Die Karte ─────────────────────────────────────────────────────────────────────────── */
const CARD_COUNT = 9;          // mc-01 … mc-09: so viele liegen unter /assets/web/cards
const cardSrc = (i) => `/assets/web/cards/mc-${String(i + 1).padStart(2, '0')}.webp`;
let cardIndex = (() => {
  const n = Number.parseInt(new URLSearchParams(location.search).get('card') ?? '', 10);
  return n >= 1 && n <= CARD_COUNT ? n - 1 : 0;
})();

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

/* Das Bild füllt die Höhe der Bühne. Hochkant auf dem Handy wird es links und rechts
   beschnitten, auf breiten Bildschirmen bleibt daneben Sand. Alles Malen bleibt im Bild.
   sx…sh ist der Ausschnitt in Bildpixeln. */
function fit(im) {
  const box = stage.getBoundingClientRect();
  const cssH = Math.max(1, Math.round(box.height));
  const s = cssH / im.naturalHeight;
  const cssW = Math.max(1, Math.round(Math.min(im.naturalWidth * s, box.width)));
  const sw = cssW / s;
  return { cssW, cssH, left: Math.round((box.width - cssW) / 2), sx: (im.naturalWidth - sw) / 2, sy: 0, sw, sh: im.naturalHeight };
}

function place(el, g) {
  el.style.left = `${g.left}px`;
  el.style.width = `${g.cssW}px`;
  el.style.height = `${g.cssH}px`;
}

/* Der sichtbare Ausschnitt der Karte, gezeichnet in w × h Pixel. */
function pictureCanvas(im, g, w, h) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  x.drawImage(im, g.sx, g.sy, g.sw, g.sh, 0, 0, c.width, c.height);
  return c;
}

/* Zeiger in CSS-Pixeln des Elements; mehrere Finger zugleich. */
function track(el, { down, move, up }) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    down(e.pointerId, e.clientX - r.left, e.clientY - r.top);
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const r = el.getBoundingClientRect();
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const c of list.length ? list : [e]) move(e.pointerId, c.clientX - r.left, c.clientY - r.top);
  });
  const end = (e) => up(e.pointerId);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

/* Ein Bild je Bildschirmbild, mit begrenztem Zeitschritt (nach einem Tab-Wechsel kein Sprung). */
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

/* ── Musik ─────────────────────────────────────────────────────────────────────────────────
   Ganz geladen und aus dem Speicher gespielt: musie.org beantwortet keine Range-Anfragen, und
   iOS spielt dann Stille (Reflexion 01, 2026-11-19). Lokal egal, später nicht. */
const TRACK = '/experiments/reflexion/media/aura.mp3';
const audio = new Audio();
audio.preload = 'auto';
fetch(TRACK)
  .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
  .then((b) => { if (!audio.src) audio.src = URL.createObjectURL(b); })
  .catch(() => { if (!audio.src) audio.src = TRACK; });
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');
function renderPlay() {
  const playing = !audio.paused;
  $('play').innerHTML = `${playing ? ICON_PAUSE : ICON_PLAY}<span>${playing ? 'Pause' : 'Abspielen'}</span>`;
}
function renderTime() { $('time').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`; }
$('play').addEventListener('click', () => {
  if (audio.paused) {
    if (!audio.src) audio.src = TRACK;
    audio.play().catch(() => {});
  } else audio.pause();
});
for (const ev of ['play', 'pause', 'ended']) audio.addEventListener(ev, renderPlay);
for (const ev of ['timeupdate', 'loadedmetadata']) audio.addEventListener(ev, renderTime);
renderPlay();

/* ── Start ───────────────────────────────────────────────────────────────────────────────── */
function boot(effect) {
  let img = null;
  let size = '';
  async function show(i) {
    cardIndex = (i + CARD_COUNT) % CARD_COUNT;
    const u = new URL(location.href);
    u.searchParams.set('card', String(cardIndex + 1));
    history.replaceState(null, '', u);
    img = await loadImage(cardSrc(cardIndex));
    effect.setImage(img);
  }
  $('next').addEventListener('click', () => show(cardIndex + 1));
  if ($('reset') && effect.reset) $('reset').addEventListener('click', () => effect.reset());
  new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (key === size) return;
    size = key;
    if (img) effect.setImage(img);
  }).observe(stage);
  show(cardIndex);
}
