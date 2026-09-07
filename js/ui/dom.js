// Minimal DOM helpers. The overlay UI is real HTML on purpose: real <button>
// elements give us focus rings, screen-reader labels and native touch targets
// that canvas-drawn buttons would all have to reinvent.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** A chunky game button that always makes its tap sound. */
export function button(label, opts = {}, onClick) {
  const { cls = '', audio, ariaLabel, disabled = false, icon, game, iconOpts } = opts;
  const b = el('button', {
    class: `btn ${cls}`.trim(),
    type: 'button',
    'aria-label': ariaLabel,
    disabled: disabled || undefined,
  });
  // A drawn icon always renders; an emoji may not, and a child cannot recover
  // from a control that shows up as an empty box.
  if (icon && game) {
    const size = cls.includes('icon') ? 30 : 26;
    b.append(spriteImg(game.sprites.prop(icon, size, iconOpts || {}), size));
  }
  if (typeof label === 'string') {
    if (label) b.append(el('span', {}, label));
  } else if (label) {
    b.append(label);
  }
  b.addEventListener('click', (e) => {
    if (b.disabled) return;
    audio?.tap();
    onClick?.(e);
  });
  return b;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export const overlay = () => document.getElementById('overlay');
export const panel = () => document.getElementById('panel');
export const modalHost = () => document.getElementById('modal');

/** Render a baked sprite into a small inline canvas (HUD icons, collection). */
export function spriteImg(sprite, size, alt = '') {
  const c = el('canvas', { width: size, height: size, role: alt ? 'img' : 'presentation', 'aria-label': alt || undefined });
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (sprite) ctx.drawImage(sprite, 0, 0, size, size);
  return c;
}

// How many modals are open. The game can open one from inside another (buy a
// heart from the pause sheet), so the app behind them is only woken back up
// when the last one closes.
let modalDepth = 0;

/** Full-screen modal sheet. Returns a close() function. */
export function showModal(contentNode, { onClose, dismissable = true } = {}) {
  const host = modalHost();
  clear(host);
  host.hidden = false;
  const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, contentNode);
  host.append(sheet);

  // The dialog covers the game, but covering it is not the same as switching it
  // off: the answer buttons underneath stay focusable and stay in the screen
  // reader's list, so tabbing walks straight into questions nobody can see.
  const app = document.getElementById('app');
  if (app && modalDepth === 0) {
    app.inert = true;
    app.setAttribute('aria-hidden', 'true');
  }
  modalDepth++;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    modalDepth = Math.max(0, modalDepth - 1);
    if (app && modalDepth === 0) {
      app.inert = false;
      app.removeAttribute('aria-hidden');
    }
    host.hidden = true;
    clear(host);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  document.addEventListener('keydown', onKey);
  if (dismissable) {
    host.addEventListener('click', (e) => { if (e.target === host) close(); });
  }
  // Move focus in so keyboard and screen-reader users land inside the dialog.
  setTimeout(() => sheet.querySelector('button, [tabindex]')?.focus(), 30);
  return close;
}

/** Announce a message to assistive tech without changing the visuals. */
export function announce(msg) {
  let live = document.getElementById('live-region');
  if (!live) {
    live = el('div', { id: 'live-region', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(live);
  }
  live.textContent = msg;
}
