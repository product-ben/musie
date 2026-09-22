/* Musy theming — manual toggle only, persisted. Load this SYNCHRONOUSLY in
   <head>, before any stylesheet, so the attribute is set before first paint
   (FOUC prevention). The system preference is deliberately not consulted.   */
(function () {
  var KEY = 'musy-theme';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
  window.musyTheme = {
    get: function () { return document.documentElement.getAttribute('data-theme'); },
    set: function (t) {
      document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      try { localStorage.setItem(KEY, t === 'dark' ? 'dark' : 'light'); } catch (e) {}
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); }
  };
})();
/* Nested override: put data-theme="dark" on any element. Because every token
   is declared on `:root, [data-theme]`, the subtree re-declares the whole set
   and light-dark() re-resolves against that element's color-scheme.         */

/* ── The measured viewport ──────────────────────────────────────────────────
   `--viewport-block` is declared in the foundations as `100svh` and replaced
   here with the real number, because on a phone the unit and the number are
   not the same thing:

     · `100vh` is the LARGE viewport on iOS — a view sized to it puts its own
       buttons underneath Safari's toolbar, which is precisely where a thumb
       goes looking for them;
     · `100dvh` tracks the browser chrome sliding away, so a full-height view
       resizes UNDER the reader while they are scrolling through it;
     · `100svh` is stable and always visible, which is why it is the fallback,
       but it is also the SMALLEST it ever gets, so on a desktop it leaves a
       band of the window unused.

   `visualViewport.height` is the one number that is true at the moment it is
   read. It is written here, synchronously, before first paint, so nothing
   renders at a guessed height and then jumps.

   ROUNDED DOWN. A fractional viewport is normal on a scaled display, and a
   view one third of a pixel taller than the window is a scrollbar that
   appears for no reason.

   The listener is passive and coalesced into a frame: `resize` fires in a
   stream during a rotation, and writing a custom property on <html> on every
   one of them invalidates layout each time.                                */
(function () {
  var frame = 0;
  function write() {
    frame = 0;
    var vv = window.visualViewport;
    var h = Math.floor(vv ? vv.height : window.innerHeight);
    if (h > 0) document.documentElement.style.setProperty('--viewport-block', h + 'px');
  }
  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(write);
  }
  write();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }
})();
