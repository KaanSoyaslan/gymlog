// Bağımlılıksız küçük SVG grafikler: çizgi, sütun, yatay çubuk ve takvim ısı haritası.
// Her grafik dokunma/üzerine gelme ile değeri gösterir.
import { monthShort, parseYmd, addDays, fmtDate } from './format.js';
import { t } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function niceStep(range, count) {
  const raw = range / Math.max(1, count);
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p;
  return 10 * p;
}

function tooltip(host) {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  host.append(tip);
  return {
    show(html, x, y) {
      tip.innerHTML = html;
      tip.style.display = 'block';
      const w = tip.offsetWidth, hw = host.clientWidth;
      tip.style.left = `${Math.max(0, Math.min(hw - w, x - w / 2))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 10)}px`;
    },
    hide() { tip.style.display = 'none'; },
  };
}

// data: [{ date: 'YYYY-AA-GG', y, tip? }]
export function lineChart(host, { data, height = 190, yFmt = (v) => v, tipFmt, goal = null, unit = '' }) {
  host.classList.add('chart');
  host.innerHTML = '';
  if (!data.length) { host.innerHTML = `<p class="muted small">${t('Henüz veri yok.')}</p>`; return; }
  const W = Math.max(260, host.clientWidth || 320), H = height;
  const pl = 34, pr = 14, pt = 14, pb = 24;
  const xs = data.map((d) => parseYmd(d.date).getTime());
  let x0 = xs[0], x1 = xs[xs.length - 1];
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ys = data.map((d) => d.y).concat(goal != null ? [goal] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const step = niceStep(y1 - y0, 4);
  y0 = Math.floor(y0 / step) * step; y1 = Math.ceil(y1 / step) * step;
  if (y1 - y0 < step * 2) y1 = y0 + step * 2;
  const X = (t) => pl + ((t - x0) / (x1 - x0)) * (W - pl - pr);
  const Y = (v) => pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb);

  let g = '';
  for (let v = y0; v <= y1 + 1e-9; v += step) {
    g += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tick" x="${pl - 6}" y="${Y(v) + 3.5}" text-anchor="end">${esc(yFmt(Math.round(v * 100) / 100))}</text>`;
  }
  // Ay etiketleri
  const start = new Date(x0); start.setDate(1); start.setHours(12);
  const months = [];
  for (let d = new Date(start); d.getTime() <= x1; d.setMonth(d.getMonth() + 1)) if (d.getTime() >= x0 - 864e5) months.push(new Date(d));
  const every = Math.ceil(months.length / Math.max(2, Math.floor((W - pl - pr) / 48)));
  months.forEach((d, i) => {
    if (i % every) return;
    const label = monthShort(d.getMonth()) + (d.getMonth() === 0 && months.length > 6 ? ` ’${String(d.getFullYear()).slice(2)}` : '');
    g += `<text class="tick" x="${X(d.getTime())}" y="${H - 6}" text-anchor="middle">${label}</text>`;
  });
  g += `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>`;
  if (goal != null) {
    g += `<line class="goal" x1="${pl}" x2="${W - pr}" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="goal-label" x="${W - pr}" y="${Y(goal) - 5}" text-anchor="end">${esc(t('Hedef {v}', { v: yFmt(goal) }))}</text>`;
  }
  const pts = data.map((d, i) => [X(xs[i]), Y(d.y)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const area = `${path}L${pts[pts.length - 1][0].toFixed(1)} ${H - pb}L${pts[0][0].toFixed(1)} ${H - pb}Z`;
  g += `<path class="area" d="${area}"/><path class="line" d="${path}"/>`;
  if (data.length <= 30) for (const p of pts) g += `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="3.2"/>`;
  const last = pts[pts.length - 1];
  g += `<circle class="end" cx="${last[0]}" cy="${last[1]}" r="4.5"/>`;
  g += `<g class="hover" style="display:none"><line class="cross" y1="${pt}" y2="${H - pb}"/><circle class="end" r="5"/></g>`;
  g += `<rect class="hit" x="${pl}" y="0" width="${W - pl - pr}" height="${H}" fill="transparent"/>`;

  host.insertAdjacentHTML('beforeend', `<svg class="chart-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Çizgi grafik')}">${g}</svg>`);
  const svg = host.querySelector('svg');
  const hover = svg.querySelector('.hover');
  const tip = tooltip(host);
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const mx = ev.clientX - r.left;
    let bi = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - mx) < Math.abs(pts[bi][0] - mx)) bi = i;
    const [px, py] = pts[bi];
    hover.style.display = '';
    hover.querySelector('line').setAttribute('x1', px); hover.querySelector('line').setAttribute('x2', px);
    hover.querySelector('circle').setAttribute('cx', px); hover.querySelector('circle').setAttribute('cy', py);
    const d = data[bi];
    tip.show(tipFmt ? tipFmt(d) : `<b>${esc(yFmt(d.y))}${unit}</b><span>${fmtDate(d.date, { year: true })}</span>`, px, py);
  };
  const hit = svg.querySelector('.hit');
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { hover.style.display = 'none'; tip.hide(); });
}

// data: [{ label, value, tip }]
export function columnChart(host, { data, height = 170, fmt = (v) => v }) {
  host.classList.add('chart');
  host.innerHTML = '';
  const W = Math.max(260, host.clientWidth || 320), H = height;
  const pl = 8, pr = 8, pt = 20, pb = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const band = (W - pl - pr) / data.length;
  const bw = Math.min(24, band * 0.62);
  const Y = (v) => pt + (1 - v / max) * (H - pt - pb);
  let g = `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>`;
  data.forEach((d, i) => {
    const cx = pl + band * (i + 0.5);
    const y = Y(d.value), h = H - pb - y;
    if (d.value > 0) {
      const r = Math.min(4, h);
      const x = cx - bw / 2;
      g += `<path class="bar${d.dim ? ' dim' : ''}" d="M${x} ${H - pb}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${H - pb}Z"/>`;
      g += `<text class="val" x="${cx}" y="${y - 5}" text-anchor="middle">${esc(fmt(d.value))}</text>`;
    }
    g += `<text class="tick" x="${cx}" y="${H - 7}" text-anchor="middle">${esc(d.label)}</text>`;
    g += `<rect class="hit" data-i="${i}" x="${cx - band / 2}" y="0" width="${band}" height="${H}" fill="transparent"/>`;
  });
  host.insertAdjacentHTML('beforeend', `<svg class="chart-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Sütun grafik')}">${g}</svg>`);
  const tip = tooltip(host);
  host.querySelectorAll('.hit').forEach((el) => {
    const show = () => {
      const d = data[el.dataset.i];
      if (d.tip) tip.show(d.tip, pl + band * (Number(el.dataset.i) + 0.5), Y(d.value));
    };
    el.addEventListener('pointerenter', show);
    el.addEventListener('pointerdown', show);
    el.addEventListener('pointerleave', () => tip.hide());
  });
}

// Yatay çubuklar (HTML): [{ label, value, display }]
export function barList(host, { data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  host.innerHTML = data.map((d) => `
    <div class="hbar">
      <span class="hbar-label">${esc(d.label)}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${(d.value / max) * 100}%"></span></span>
      <span class="hbar-val">${esc(d.display ?? d.value)}</span>
    </div>`).join('');
}

// Takvim: haftalar sütun, günler satır (Pzt üstte). days: Map(tarih → { level: 1|2, tip })
export function heatmap(host, { from, to, days }) {
  host.classList.add('chart', 'heat');
  host.innerHTML = '';
  const startD = parseYmd(from);
  const start = addDays(from, -((startD.getDay() + 6) % 7));
  const weeks = Math.ceil((parseYmd(to) - parseYmd(start)) / (7 * 864e5)) + 1;
  const avail = Math.max(240, host.clientWidth || 320) - 22;
  const cell = Math.max(9, Math.min(16, Math.floor(avail / weeks) - 2));
  const gap = 2, size = cell + gap;
  const W = 22 + weeks * size, H = 16 + 7 * size;
  let g = '';
  [t('Pzt'), '', t('Çar'), '', t('Cum'), '', ''].forEach((l, i) => { if (l) g += `<text class="tick" x="0" y="${16 + i * size + cell - 1}">${l}</text>`; });
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > to) continue;
      if (date < from) continue;
      const dd = parseYmd(date);
      if (d === 0 || date === from) {
        if (dd.getMonth() !== lastMonth && dd.getDate() <= 7) {
          lastMonth = dd.getMonth();
          g += `<text class="tick" x="${22 + w * size}" y="10">${monthShort(lastMonth)}</text>`;
        }
      }
      const v = days.get(date);
      g += `<rect class="cell l${v?.level || 0}" data-d="${date}" x="${22 + w * size}" y="${16 + d * size}" width="${cell}" height="${cell}" rx="2.5"/>`;
    }
  }
  const wrap = document.createElement('div');
  wrap.className = 'heat-scroll';
  wrap.innerHTML = `<svg class="chart-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Spor takvimi')}">${g}</svg>`;
  host.append(wrap);
  requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
  const tip = tooltip(host);
  wrap.addEventListener('pointerover', (ev) => {
    const el = ev.target.closest('.cell');
    if (!el) { tip.hide(); return; }
    const date = el.dataset.d;
    const v = days.get(date);
    const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
    tip.show(v?.tip || `<b>${fmtDate(date, { weekday: true, year: true })}</b><span>${t('Antrenman yok')}</span>`, r.left - hr.left + r.width / 2, r.top - hr.top);
  });
  wrap.addEventListener('pointerleave', () => tip.hide());
}

