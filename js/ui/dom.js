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
  const { cls = '', audio, ariaLabel, disabled = false } = opts;
  const b = el('button', {
    class: `btn ${cls}`.trim(),
    type: 'button',
    'aria-label': ariaLabel,
    disabled: disabled || undefined,
  });
  if (typeof label === 'string') b.textContent = label;
  else b.append(label);
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

/** Full-screen modal sheet. Returns a close() function. */
export function showModal(contentNode, { onClose, dismissable = true } = {}) {
  const host = modalHost();
  clear(host);
  host.hidden = false;
  const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, contentNode);
  host.append(sheet);

  const close = () => {
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
