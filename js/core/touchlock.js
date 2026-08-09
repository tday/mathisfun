// Keeps stray touches from resizing or shifting the game.
//
// Small children rest palms on the screen, tap with several fingers at once and
// double-tap out of excitement. On a phone that pinch-zooms the page, drags the
// layout around, or pops a text-selection menu — and a five-year-old has no idea
// how to undo any of it.
//
// What this deliberately does NOT block: single taps, scrolling inside the world
// list, and the operating system's own accessibility zoom, which lives outside
// the page and must keep working.

export function installTouchLock() {
  const root = document.documentElement;

  // 1. Multi-touch pinch. Chrome/Android honour touch-action, but a second
  //    finger can still start a page zoom on some builds, so drop any touch
  //    event that arrives with more than one contact point.
  const blockMultiTouch = (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  for (const type of ['touchstart', 'touchmove']) {
    document.addEventListener(type, blockMultiTouch, { passive: false });
  }

  // 2. iOS Safari's gesture events, which are how pinch-zoom actually arrives
  //    there. touch-action alone does not stop these.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // 3. Double-tap zoom. `touch-action: manipulation` covers most cases, but
  //    Safari still zooms on a fast double tap in some contexts. Swallow the
  //    second tap only — a single tap must stay untouched.
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // 4. Ctrl/⌘ + wheel and ⌘ +/- zoom on desktop, which kids hit by accident on
  //    a laptop trackpad.
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) {
      e.preventDefault();
    }
  });

  // 5. Long-press selection and the iOS callout menu.
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => {
    // Leave real inputs alone (the volume sliders in settings).
    if (!e.target.closest?.('input, textarea')) e.preventDefault();
  });

  // 6. If the page ever does get scrolled or scaled — by the keyboard, a rotate,
  //    or an OS quirk — put it straight back.
  const resetViewport = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  window.addEventListener('scroll', resetViewport, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resetViewport, 200));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resetViewport);
    window.visualViewport.addEventListener('scroll', resetViewport);
  }
  resetViewport();
}
