// rAF loop with fixed 60Hz update accumulator + scene manager with fades.
// Scene contract: { enter(params), exit(), update(dt), render(ctx, w, h),
//                   onPointer(e)?, onLayout(w, h)? }

const STEP = 1 / 60;
const MAX_FRAME = 0.1; // clamp so a backgrounded tab doesn't fast-forward

export class Engine {
  constructor(screen) {
    this.screen = screen;
    this.scenes = new Map();
    this.scene = null;
    this.sceneName = '';
    this.paused = false;      // modal pause: update stops, render continues
    this.fade = 0;            // 0 clear .. 1 black
    this.fadeDir = 0;
    this.pending = null;
    this.acc = 0;
    this.last = 0;
    this.time = 0;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.last = performance.now();
    });
  }

  register(name, scene) { this.scenes.set(name, scene); }

  go(name, params = {}, instant = false) {
    if (!this.scenes.has(name)) throw new Error(`unknown scene ${name}`);
    if (instant || !this.scene) {
      this.swap(name, params);
      this.fade = 0; this.fadeDir = 0;
    } else {
      this.pending = { name, params };
      this.fadeDir = 1;
    }
  }

  swap(name, params) {
    this.scene?.exit?.();
    this.scene = this.scenes.get(name);
    this.sceneName = name;
    this.scene.enter?.(params);
    this.scene.onLayout?.(this.screen.w, this.screen.h);
  }

  onPointer(e) { if (!this.fadeDir && !this.pending) this.scene?.onPointer?.(e); }
  onLayout(w, h) { this.scene?.onLayout?.(w, h); }

  start() {
    this.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(MAX_FRAME, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      // fade bookkeeping (runs even while paused so transitions finish)
      if (this.fadeDir) {
        this.fade += this.fadeDir * dt * 4;
        if (this.fade >= 1 && this.pending) {
          const p = this.pending; this.pending = null;
          this.swap(p.name, p.params);
          this.fadeDir = -1;
        }
        if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; }
      }
      if (!this.paused && !document.hidden) {
        this.acc = Math.min(this.acc + dt, MAX_FRAME * 2);
        while (this.acc >= STEP) {
          this.time += STEP;
          this.scene?.update?.(STEP);
          this.acc -= STEP;
        }
      }
      const { ctx, w, h } = this.screen;
      ctx.clearRect(0, 0, w, h);
      this.scene?.render?.(ctx, w, h);
      if (this.fade > 0) {
        ctx.fillStyle = `rgba(26,16,38,${Math.min(1, this.fade)})`;
        ctx.fillRect(0, 0, w, h);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
