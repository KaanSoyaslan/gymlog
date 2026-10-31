// Küçük arayüz yardımcıları: element oluşturma, alt sayfa (sheet), onay penceresi, bildirim, ikonlar.
import { t } from './i18n.js';

export function h(tag, props, ...kids) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const icon = (name, cls = '') => {
  const span = document.createElement('span');
  span.className = `ic ${cls}`;
  span.innerHTML = ICONS[name] || '';
  return span;
};

const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICONS = {
  dumbbell: s('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  history: s('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
  chart: s('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  grid: s('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  x: s('<path d="M18 6 6 18M6 6l12 12"/>'),
  more: s('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>', 'fill="currentColor"'),
  swap: s('<path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 4 4"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8a4 4 0 0 1-4-4"/>'),
  note: s('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  skip: s('<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>'),
  copy: s('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  trash: s('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),
  up: s('<path d="m18 15-6-6-6 6"/>'),
  down: s('<path d="m6 9 6 6 6-6"/>'),
  check: s('<path d="M20 6 9 17l-5-5"/>'),
  trophy: s('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4"/>'),
  scale: s('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a4 4 0 0 1 8 0"/><path d="m12 9 1.5-2"/>'),
  play: s('<path d="M7 4v16l13-8Z"/>', 'fill="currentColor"'),
  edit: s('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  download: s('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  upload: s('<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>'),
  file: s('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  back: s('<path d="m15 18-6-6 6-6"/>'),
  calendar: s('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  fire: s('<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8 0 4.3 3 7 7 7Z"/>'),
  sparkle: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  github: s('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
};

// ---------- Alt sayfalar ----------
// Her açık sayfa geçmişe bir kayıt ekler; telefonun geri tuşu uygulamadan çıkmak yerine sayfayı kapatır.
const stack = [];
let popping = false;
let skipPop = 0;
const waiters = [];
// Kapanan sayfaların geri adımları bitince çözülür; ardından yapılan yönlendirme geri alınmaz.
export const settled = () => new Promise((r) => (skipPop ? waiters.push(r) : r()));

window.addEventListener('popstate', () => {
  if (skipPop > 0) {
    skipPop--;
    if (!skipPop) waiters.splice(0).forEach((f) => f());
    return;
  }
  if (stack.length) {
    popping = true;
    stack[stack.length - 1].close();
    popping = false;
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
});

export function sheet({ title, body, footer, full = false, onClose, className = '' }) {
  const panel = h('div.sheet' + (full ? '.full' : '') + (className ? '.' + className : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' });
  const head = h('div.sheet-head', null,
    h('h2.sheet-title', null, title || ''),
    h('button.icon-btn', { 'aria-label': t('Kapat'), onclick: () => api.close() }, icon('x')));
  const content = h('div.sheet-body');
  const foot = h('div.sheet-foot');
  panel.append(head, content, foot);
  const backdrop = h('div.backdrop', { onclick: () => api.close() });
  const root = h('div.sheet-wrap', null, backdrop, panel);
  document.body.append(root);
  document.body.classList.add('no-scroll');
  let closed = false;
  const api = {
    el: panel,
    body: content,
    setTitle(t) { head.querySelector('.sheet-title').textContent = t; },
    setBody(node) { content.replaceChildren(...[].concat(node).filter(Boolean)); },
    setFooter(node) { foot.replaceChildren(...[].concat(node).filter(Boolean)); foot.hidden = !node; },
    close() {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      if (!popping && history.state?.sheet) { skipPop++; history.back(); }
      root.classList.remove('open');
      setTimeout(() => root.remove(), 220);
      if (!stack.length) document.body.classList.remove('no-scroll');
      onClose?.();
    },
  };
  api.setBody(body);
  api.setFooter(footer || null);
  stack.push(api);
  settled().then(() => history.pushState({ sheet: stack.length }, ''));
  requestAnimationFrame(() => root.classList.add('open'));
  return api;
}

export function closeAll() {
  while (stack.length) stack[stack.length - 1].close();
}

export function confirmBox(message, { ok = t('Tamam'), cancel = t('Vazgeç'), danger = false, title = '' } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v) => { if (!answered) { answered = true; resolve(v); } sh.close(); };
    const sh = sheet({
      title,
      className: 'dialog',
      body: h('p.dialog-text', null, message),
      footer: h('div.row.gap', null,
        h('button.btn.ghost.grow', { onclick: () => done(false) }, cancel),
        h('button.btn.grow' + (danger ? '.danger' : '.primary'), { onclick: () => done(true) }, ok)),
      onClose: () => { if (!answered) { answered = true; resolve(false); } },
    });
  });
}

export function menu(title, items) {
  const sh = sheet({
    title,
    className: 'menu-sheet',
    body: h('div.menu', null, items.filter(Boolean).map((it) =>
      h('button.menu-item' + (it.danger ? '.danger' : ''), { onclick: () => { sh.close(); setTimeout(it.action, 10); } },
        icon(it.icon || 'check'), h('span', null, it.label)))),
  });
  return sh;
}

let toastTimer = 0;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div.toast', { role: 'status' });
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

export function chips(options, selected, onChange, { multi = true, className = '' } = {}) {
  const wrap = h('div.chips' + (className ? '.' + className : ''));
  const paint = () => {
    wrap.replaceChildren(...options.map((o) => h('button.chip' + (selected.includes(o.id) ? '.on' : ''), {
      type: 'button',
      'aria-pressed': String(selected.includes(o.id)),
      onclick: () => {
        if (multi) selected = selected.includes(o.id) ? selected.filter((x) => x !== o.id) : [...selected, o.id];
        else selected = [o.id];
        paint();
        onChange(selected);
      },
    }, o.name)));
  };
  paint();
  return wrap;
}

export function segmented(options, value, onChange) {
  const wrap = h('div.seg', { role: 'tablist' });
  const paint = () => wrap.replaceChildren(...options.map((o) => h('button.seg-btn' + (o.id === value ? '.on' : ''), {
    type: 'button', role: 'tab', 'aria-selected': String(o.id === value),
    onclick: () => { value = o.id; paint(); onChange(value); },
  }, o.name)));
  paint();
  return wrap;
}
