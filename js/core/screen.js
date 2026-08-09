// Canvas sizing (DPR-aware, capped) + pointer normalization.
// The canvas fills its flex container; scenes adapt to any aspect via (w, h).

export class Screen {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1; this.h = 1;
    this.dpr = 1;
    this.listeners = [];
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas.parentElement);
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    this.resize();

    const norm = (ev, type) => {
      const rect = canvas.getBoundingClientRect();
      const t = ev.changedTouches ? ev.changedTouches[0] : ev;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top, type };
    };
    canvas.addEventListener('pointerdown', (ev) => { this.emit(norm(ev, 'down')); });
    canvas.addEventListener('pointermove', (ev) => { this.emit(norm(ev, 'move')); });
    canvas.addEventListener('pointerup', (ev) => { this.emit(norm(ev, 'up')); });
    // stop iOS rubber-band scrolling on the play surface
    canvas.addEventListener('touchmove', (ev) => ev.preventDefault(), { passive: false });
  }

  onPointer(fn) { this.listeners.push(fn); }
  emit(e) { for (const fn of this.listeners) fn(e); }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
    this.onResize?.(w, h);
  }
}
