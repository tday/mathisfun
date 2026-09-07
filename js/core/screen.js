// Canvas sizing, device-pixel-ratio handling and pointer normalisation.
//
// The canvas simply fills whatever box the CSS layout gives it — there is no
// letterboxing. World geometry is authored in normalised 0..1 coordinates and
// mapped through `view`, so portrait and landscape both look intentional.

const MAX_DPR = 2; // guards canvas memory and fill-rate on low-end phones

export class Screen {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this._listeners = new Set();
    this._resizeCbs = new Set();

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    // The canvas box also changes with no window event at all: a scene swaps
    // the controls in #panel, the flex column gives the stage less room, and
    // the canvas silently gets shorter. Without this the backing store keeps
    // the old size, the browser stretches the old picture into the new box,
    // and every tap lands where the art *used* to be — by up to half a screen.
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas);
    }

    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      canvas.addEventListener(type, (e) => this._emit(type, e), { passive: type === 'pointermove' });
    }
    // Stop the page from panning/zooming when a child drags across the board.
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    // setTransform (not scale) so repeated resizes don't compound.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    for (const cb of this._resizeCbs) cb(w, h);
  }

  onResize(cb) {
    this._resizeCbs.add(cb);
    return () => this._resizeCbs.delete(cb);
  }

  onPointer(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _emit(type, e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const cb of this._listeners) cb(type, x, y, e);
  }

  get isPortrait() {
    return this.h >= this.w;
  }

  /** Shortest side, handy for scaling UI drawn inside the canvas. */
  get unit() {
    return Math.min(this.w, this.h);
  }
}
