// The question card: prompt, optional visual support, and the answer buttons.
//
// Real DOM rather than canvas-drawn buttons — that buys us focus rings, screen
// reader labels, crisp text at any DPR and native-sized touch targets for free.

import { el, clear, announce, spriteImg } from './dom.js';
import { drawQuestionVisual, drawShapePath } from '../gfx/fx.js';
import { ink } from '../gfx/toybox.js';

export class QuestionPanel {
  constructor(game, { onAnswer } = {}) {
    this.game = game;
    this.onAnswer = onAnswer;
    this.locked = false;
    this.question = null;

    this.promptEl = el('p', { class: 'qprompt', id: 'q-prompt' });
    this.visualCanvas = el('canvas', { class: 'qvisual', 'aria-hidden': 'true' });
    this.answersEl = el('div', { class: 'answers', role: 'group', 'aria-labelledby': 'q-prompt' });
    this.feedbackEl = el('p', { class: 'feedback', 'aria-live': 'polite' });

    this.head = el('div', { class: 'qhead' }, this.promptEl, this.visualCanvas);
    this.root = el('div', { class: 'qcard' }, this.head, this.answersEl, this.feedbackEl);
  }

  mount(host) {
    host.append(this.root);
    this._ro = new ResizeObserver(() => this._paintVisual());
    this._ro.observe(this.visualCanvas);
  }

  destroy() {
    this._ro?.disconnect();
    this.root.remove();
  }

  show(question, { band = 0 } = {}) {
    this.question = question;
    this.locked = false;
    this.tries = 0;

    clear(this.promptEl);
    // A drawn chip in front of the prompt carries direction (more / fewer) for
    // children who cannot yet read the word that distinguishes them.
    if (question.promptIcon) {
      const size = 40;
      const img = spriteImg(this.game.sprites.prop(question.promptIcon, size), size);
      img.style.verticalAlign = 'middle';
      img.style.marginRight = '10px';
      img.style.display = 'inline-block';
      this.promptEl.append(img);
    }
    if (question.prompt) this.promptEl.append(document.createTextNode(question.prompt));
    this.promptEl.classList.toggle('small', (question.prompt || '').length > 18);
    this.promptEl.hidden = !question.prompt && !question.promptIcon;

    this.visualCanvas.hidden = !question.visual;
    this._paintVisual();

    clear(this.answersEl);
    this.answersEl.dataset.n = String(question.choices.length);
    this.buttons = question.choices.map((choice, i) => {
      const b = el('button', {
        class: `btn choice-${i}`,
        type: 'button',
        'aria-label': choice.draw ? choice.text : undefined,
      });
      if (choice.draw) {
        b.append(this._graphic(choice.draw, 46));
        b.append(el('span', { class: 'sr-only' }, choice.text));
      } else {
        b.textContent = choice.text;
      }
      b.addEventListener('click', () => this._pick(i));
      this.answersEl.append(b);
      return b;
    });

    this.feedbackEl.textContent = '';
    this.feedbackEl.className = 'feedback';
    announce(question.prompt || 'New question');
    void band;
  }

  _graphic(draw, size) {
    const c = el('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(size / 2, size / 2);
    if (draw.kind === 'shape') {
      drawShapePath(ctx, draw.shape, size * 0.4);
      ctx.fillStyle = draw.color || '#ffd34e';
      ctx.fill();
      ink(ctx, 3);
    }
    return c;
  }

  _paintVisual() {
    const q = this.question;
    if (!q?.visual) return;
    const cv = this.visualCanvas;
    const rect = cv.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawQuestionVisual(ctx, q.visual, this.game.sprites, rect.width, rect.height);
  }

  _pick(i) {
    if (this.locked) return;
    const btn = this.buttons[i];
    if (btn.classList.contains('wrong')) return; // already ruled out
    this.onAnswer?.(i, this.question);
  }

  markWrong(i) {
    this.buttons[i]?.classList.add('wrong');
    this.buttons[i]?.setAttribute('aria-disabled', 'true');
  }

  markCorrect(i) {
    this.buttons[i]?.classList.add('right');
    this.locked = true;
  }

  /** Second miss: show the answer and let the child tap it to move on. */
  reveal(i) {
    this.buttons.forEach((b, k) => {
      if (k !== i) b.classList.add('wrong');
    });
    this.buttons[i]?.classList.add('reveal');
    this.buttons[i]?.classList.remove('wrong');
  }

  lock() { this.locked = true; }

  setFeedback(text, { kind = '', hint = '' } = {}) {
    clear(this.feedbackEl);
    this.feedbackEl.className = `feedback ${kind}`.trim();
    this.feedbackEl.append(document.createTextNode(text));
    if (hint) this.feedbackEl.append(el('span', { class: 'hint' }, hint));
  }

  clearFeedback() {
    clear(this.feedbackEl);
    this.feedbackEl.className = 'feedback';
  }
}
