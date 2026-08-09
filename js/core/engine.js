// Game loop + scene manager.
//
// Fixed 60 Hz update accumulator so enemy march speed is identical on a 60 Hz
// laptop, a 120 Hz phone, and in an automated test. Rendering still happens once
// per animation frame.

const STEP = 1 / 60;
const MAX_FRAME = 0.1; // clamp: a backgrounded tab must not fast-forward the game

/**
 * Scene contract — every field optional except render:
 *   enter(params), exit(), update(dt), render(ctx, view), onPointer(type, x, y, e)
 * Scenes may also own DOM inside #ui; build it in enter(), tear it down in exit().
 */
export class Engine {
  constructor(screen, ctxObj = {}) {
    this.screen = screen;
    this.game = ctxObj;
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.acc = 0;
    this.last = 0;
    this.paused = false;
    this.fade = { t: 0, dir: 0, next: null, params: null };
    this._raf = null;

    screen.onPointer((type, x, y, e) => {
      if (this.fade.dir !== 0) return; // swallow taps mid-transition
      this.current?.onPointer?.(type, x, y, e);
    });
    screen.onResize((w, h) => this.current?.onLayout?.(w, h));

    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!document.hidden) this.last = performance.now();
      this.game.audio?.setSuspended?.(document.hidden);
    });
  }

  add(name, scene) {
    this.scenes.set(name, scene);
    return this;
  }

  /** Cross-fade to another scene. */
  go(name, params = {}) {
    if (!this.scenes.has(name)) throw new Error(`Unknown scene: ${name}`);
    if (this.fade.dir === -1) return; // already leaving
    if (!this.current) {
      this._swap(name, params);
      this.fade = { t: 1, dir: 1, next: null, params: null };
      return;
    }
    this.fade = { t: 0, dir: -1, next: name, params };
  }

  _swap(name, params) {
    this.current?.exit?.();
    this.current = this.scenes.get(name);
    this.currentName = name;
    this.current.enter?.(params, this.game);
    this.current.onLayout?.(this.screen.w, this.screen.h);
  }

  start() {
    this.last = performance.now();
    const frame = (now) => {
      this._raf = requestAnimationFrame(frame);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (this.paused) return;
      if (dt > MAX_FRAME) dt = MAX_FRAME;

      // Transition state machine.
      if (this.fade.dir !== 0) {
        this.fade.t += this.fade.dir * dt * 4;
        if (this.fade.dir === -1 && this.fade.t <= 0) {
          this._swap(this.fade.next, this.fade.params);
          this.fade = { t: 0, dir: 1, next: null, params: null };
        } else if (this.fade.dir === 1 && this.fade.t >= 1) {
          this.fade = { t: 1, dir: 0, next: null, params: null };
        }
      }

      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.current?.update?.(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (steps === 5) this.acc = 0; // give up on catching up rather than spiral

      const { ctx, w, h } = this.screen;
      ctx.save();
      this.current?.render?.(ctx, { w, h });
      ctx.restore();

      const f = this.fade.dir !== 0 ? 1 - Math.max(0, Math.min(1, this.fade.t)) : 0;
      if (f > 0.001) {
        ctx.save();
        ctx.globalAlpha = f;
        ctx.fillStyle = '#2b1b38';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    };
    this._raf = requestAnimationFrame(frame);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}
