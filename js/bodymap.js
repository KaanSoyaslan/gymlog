// Kas haritası: önden ve arkadan sade bir vücut çizimi; bölgeler set sayısına göre renklenir.
import { t } from './i18n.js';
import { GROUP_NAME } from './exercises.js';

const FRONT = [
  ['b', '<rect x="39" y="38" width="42" height="84" rx="16"/>'],
  ['b', '<circle cx="60" cy="19" r="11"/><rect x="54" y="28" width="12" height="11" rx="4"/>'],
  ['b', '<ellipse cx="25" cy="104" rx="6" ry="14"/><ellipse cx="95" cy="104" rx="6" ry="14"/><circle cx="23" cy="124" r="5"/><circle cx="97" cy="124" r="5"/>'],
  ['b', '<path d="M46 116 L74 116 L72 134 L48 134 Z"/><ellipse cx="49" cy="203" rx="7" ry="18"/><ellipse cx="71" cy="203" rx="7" ry="18"/>'],
  ['shoulders', '<ellipse cx="35" cy="49" rx="10" ry="9"/><ellipse cx="85" cy="49" rx="10" ry="9"/>'],
  ['chest', '<path d="M58.5 44 Q45 41 41 52 Q40 66 50 70 Q58.5 70 58.5 62 Z"/><path d="M61.5 44 Q75 41 79 52 Q80 66 70 70 Q61.5 70 61.5 62 Z"/>'],
  ['biceps', '<ellipse cx="29" cy="74" rx="7" ry="14"/><ellipse cx="91" cy="74" rx="7" ry="14"/>'],
  ['core', '<rect x="49" y="73" width="22" height="42" rx="8"/>'],
  ['legs', '<ellipse cx="50" cy="160" rx="10.5" ry="28"/><ellipse cx="70" cy="160" rx="10.5" ry="28"/>'],
];
const BACK = [
  ['b', '<rect x="39" y="38" width="42" height="84" rx="16"/>'],
  ['b', '<circle cx="60" cy="19" r="11"/><rect x="54" y="28" width="12" height="11" rx="4"/>'],
  ['b', '<ellipse cx="25" cy="104" rx="6" ry="14"/><ellipse cx="95" cy="104" rx="6" ry="14"/><circle cx="23" cy="124" r="5"/><circle cx="97" cy="124" r="5"/>'],
  ['shoulders', '<ellipse cx="35" cy="49" rx="10" ry="9"/><ellipse cx="85" cy="49" rx="10" ry="9"/>'],
  ['back', '<path d="M50 36 L70 36 L79 47 L60 57 L41 47 Z"/><path d="M42 53 Q60 62 78 53 L73 97 Q60 104 47 97 Z"/><rect x="50" y="100" width="20" height="15" rx="5"/>'],
  ['triceps', '<ellipse cx="29" cy="74" rx="7" ry="14"/><ellipse cx="91" cy="74" rx="7" ry="14"/>'],
  ['legs', '<ellipse cx="51" cy="127" rx="10" ry="9"/><ellipse cx="69" cy="127" rx="10" ry="9"/><ellipse cx="50" cy="162" rx="9.5" ry="24"/><ellipse cx="70" cy="162" rx="9.5" ry="24"/><ellipse cx="49" cy="203" rx="7.5" ry="17"/><ellipse cx="71" cy="203" rx="7.5" ry="17"/>'],
];

const level = (n) => (!n ? 0 : n < 5 ? 1 : n < 10 ? 2 : 3);

function figure(parts, counts, label) {
  let i = 0;
  const body = parts.map(([g, shape]) => {
    if (g === 'b') return `<g class="b">${shape}</g>`;
    const n = Math.round(counts.get(g) || 0);
    return `<g class="m lv${level(n)}" data-g="${g}" data-n="${n}" style="--d:${(i++) * 70}ms">${shape}</g>`;
  }).join('');
  return `<figure class="bm-fig"><svg viewBox="0 0 120 226" role="img" aria-label="${label}">${body}</svg><figcaption>${label}</figcaption></figure>`;
}

// counts: Map(bölge → set sayısı)
export function bodyMap(counts, { caption = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'bm';
  wrap.innerHTML = `<div class="bm-figs">${figure(FRONT, counts, t('Ön'))}${figure(BACK, counts, t('Arka'))}</div>`;
  if (caption) {
    const cap = document.createElement('p');
    cap.className = 'bm-cap muted small';
    cap.textContent = t('Bir bölgeye dokun');
    wrap.append(cap);
    wrap.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]');
      if (!g) return;
      wrap.querySelectorAll('.m.sel').forEach((x) => x.classList.remove('sel'));
      wrap.querySelectorAll(`[data-g="${g.dataset.g}"]`).forEach((x) => x.classList.add('sel'));
      cap.textContent = `${GROUP_NAME[g.dataset.g]} · ${t('{n} set', { n: Number(g.dataset.n) })}`;
    });
  }
  return wrap;
}
