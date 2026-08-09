// The question card: prompt, visual-aid canvas, big answer buttons,
// aria-live feedback. Dumb display component - the play scene owns logic.

import { el } from './dom.js';
import { sfx } from '../audio/audio.js';
import { drawQuestionVisual } from '../gfx/fx.js';

export class QuestionPanel {
  constructor(root, pal) {
    this.pal = pal;
    this.wrap = el('div', 'qwrap', root);
    this.card = el('div', 'qcard', this.wrap);
    this.prompt = el('div', 'qprompt', this.card);
    this.prompt.setAttribute('role', 'status');
    this.canvas = el('canvas', 'qvisual', this.card);
    this.choicesEl = el('div', 'qchoices', this.card);
    this.feedback = el('div', 'qfeedback', this.card);
    this.feedback.setAttribute('aria-live', 'polite');
    this.question = null;
    this.buttons = [];
    this.onAnswer = null;
    this.revealed = false;
    this.ro = new ResizeObserver(() => this.redrawVisual());
    this.ro.observe(this.card);
  }

  get height() { return this.wrap.offsetHeight; }
  get width() { return this.wrap.offsetWidth; }

  ask(question, onAnswer) {
    this.question = question;
    this.onAnswer = onAnswer;
    this.revealed = false;
    this.prompt.textContent = question.prompt;
    this.feedback.textContent = '';
    this.feedback.className = 'qfeedback';
    this.choicesEl.innerHTML = '';
    this.buttons = [];
    question.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qbtn';
      b.textContent = choice;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (this.revealed && i !== this.question.answerIndex) return;
        sfx.tap();
        this.onAnswer?.(i, { revealed: this.revealed });
      });
      this.choicesEl.appendChild(b);
      this.buttons.push(b);
    });
    this.card.classList.remove('qcard-msg');
    this.redrawVisual();
  }

  message(text) {
    this.question = null;
    this.prompt.textContent = text;
    this.choicesEl.innerHTML = '';
    this.buttons = [];
    this.feedback.textContent = '';
    this.feedback.className = 'qfeedback';
    this.canvas.style.display = 'none';
    this.card.classList.add('qcard-msg');
  }

  redrawVisual() {
    const q = this.question;
    if (!q || !q.visual) { this.canvas.style.display = 'none'; return; }
    this.canvas.style.display = 'block';
    const w = Math.max(10, this.card.clientWidth - 24);
    const h = q.visual.kind === 'shape' || q.visual.kind === 'fractionCircle' ? 110
      : q.visual.kind === 'compareGroups' || q.visual.kind === 'countGroups' ? 104
      : 92;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = `${h}px`;
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawQuestionVisual(ctx, w, h, q.visual, this.pal);
  }

  markWrong(idx, hint, praiseLine) {
    const b = this.buttons[idx];
    if (b) { b.disabled = true; b.classList.add('qbtn-dim', 'qbtn-shake'); }
    sfx.wrong();
    this.feedback.className = 'qfeedback fb-effort';
    this.feedback.innerHTML = `<b>${praiseLine}</b>${hint ? `<span class="qhint">💡 ${hint}</span>` : ''}`;
  }

  reveal(explain, line) {
    this.revealed = true;
    sfx.reveal();
    this.buttons.forEach((b, i) => {
      if (i === this.question.answerIndex) { b.disabled = false; b.classList.remove('qbtn-dim'); b.classList.add('qbtn-glow'); }
      else { b.disabled = true; b.classList.add('qbtn-dim'); }
    });
    this.feedback.className = 'qfeedback fb-reveal';
    this.feedback.innerHTML = `<b>${line}</b><span class="qhint">${explain}</span>`;
  }

  markCorrect(idx, praiseLine, coinsText) {
    const b = this.buttons[idx];
    if (b) b.classList.add('qbtn-right');
    this.buttons.forEach((x) => { x.disabled = true; });
    this.feedback.className = 'qfeedback fb-good';
    this.feedback.innerHTML = `<b>${praiseLine}</b>${coinsText ? `<span class="qcoins">${coinsText}</span>` : ''}`;
  }

  destroy() { this.ro.disconnect(); this.wrap.remove(); }
}
