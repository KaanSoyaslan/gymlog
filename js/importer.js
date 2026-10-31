// Telefondaki metin notlarını antrenmanlara çevirir.
// Biçim: "02 01 26 (80.9) not" satırı bir antrenman başlatır; altındaki satırlar "hareket ağırlık x tekrar x set".
// Desteklenenler: "50x12 x3", "54 54 54 12 12 10+2", "59 63 63 10x3", "4x10 55 60 60 60", "7(+3)", "pass", yazım hataları.
import { exercises } from './store.js';
import { addDays } from './format.js';

export const norm = (s) => s.toLocaleLowerCase('tr')
  .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/\s+/g, ' ').trim();

// Kısa kısaltmalarda bulanık eşleşme çalışmadığı için birkaç yaygın yazım hatası.
const TYPOS = {
  kpd: 'lat-pulldown', vargix: 'pullup', 'd uperr': 'incline-db-press', cable: 'triceps-pushdown',
  'tek tek tri': 'single-arm-pushdown', 'arka omuz makinesi': 'rear-delt-machine',
};

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const allowed = (len) => (len >= 12 ? 3 : len >= 8 ? 2 : len >= 4 ? 1 : 0);

function aliasTable() {
  const out = [];
  const push = (alias, id) => {
    const a = norm(alias);
    if (a) out.push({ a, id, words: a.split(' ').length });
  };
  for (const e of exercises()) {
    push(e.short, e.id);
    push(e.name, e.id);
    for (const al of e.aliases || []) push(al, e.id);
  }
  for (const [a, id] of Object.entries(TYPOS)) push(a, id);
  return out.sort((x, y) => y.words - x.words || y.a.length - x.a.length);
}

function matchExercise(line, table) {
  const words = norm(line).split(' ');
  let best = null;
  for (const { a, id, words: k } of table) {
    if (words.length < k) continue;
    const cand = words.slice(0, k).join(' ');
    if (cand !== a && cand.split(' ').some((w) => /^x?\d/.test(w))) continue; // sayıyla başlayan kelime isim olamaz
    const d = cand === a ? 0 : lev(cand, a);
    if (d > allowed(a.length)) continue;
    const score = k * 10 - d * 4;
    if (!best || score > best.score) best = { id, k, d, score };
  }
  return best;
}

// ---- Sayı kısmı ----
const SKIP = /^(pas+s*e*|skip+|atla(dim)?|yapmadim)$/;
const NUM = /^(\d+(?:[.,]\d+)?)(\+\+|\(?\+(\d*)\)?)?/;

function lex(rest) {
  const s = rest
    .replace(/(\d)\s+\(\s*\+/g, '$1(+')
    .replace(/(\d)\s+\+\s*(\d)/g, '$1+$2');
  const tokens = [];
  const words = [];
  let skipped = false;
  for (const w of s.split(/\s+/).filter(Boolean)) {
    const nw = norm(w);
    if (SKIP.test(nw)) { skipped = true; continue; }
    if (!/\d/.test(w) && !/^[xz×*]+$/i.test(w)) { words.push(w); continue; }
    let i = 0;
    while (i < w.length) {
      const rest2 = w.slice(i);
      const m = rest2.match(NUM);
      if (m) {
        let x = 0;
        if (m[2] === '++') x = 2;
        else if (m[2]) x = m[3] ? Number(m[3]) : 1;
        tokens.push({ n: Number(m[1].replace(',', '.')), x });
        i += m[0].length;
        continue;
      }
      const lm = rest2.match(/^[^\d]+/);
      const letters = lm[0];
      if (/^[xz×*]+$/i.test(letters)) tokens.push('x');
      else if (letters.length > 1 && !/^[()+.,]+$/.test(letters)) words.push(letters);
      i += letters.length;
    }
  }
  return { tokens, words, skipped };
}

function chains(tokens) {
  const groups = [];
  let join = false;
  for (const t of tokens) {
    if (t === 'x') { join = groups.length > 0; continue; }
    if (join) groups[groups.length - 1].push(t);
    else groups.push([t]);
    join = false;
  }
  // "15x10 10 x4" gibi tekrar eden yazımı tek zincire çevir
  for (let i = 0; i < groups.length - 1; i++) {
    const a = groups[i], b = groups[i + 1];
    if (a.length === 2 && b.length === 2 && a[1].n === b[0].n) {
      groups.splice(i, 2, [a[0], a[1], b[1]]);
    }
  }
  return groups;
}

const isInt = (n) => Number.isInteger(n);
const close = (a, ref) => ref > 0 && Math.abs(a - ref) <= 0.3 * ref;
const median = (arr) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function resolve3(g, prevW) {
  let wi = 0;
  if (isInt(g[0].n) && g[0].n <= 6) {
    if (prevW) {
      wi = Math.abs(g[1].n - prevW) <= Math.abs(g[2].n - prevW) ? 1 : 2;
    } else wi = g[1].n >= g[2].n ? 1 : 2;
  }
  const W = g[wi];
  const others = g.filter((_, i) => i !== wi);
  const [S, R] = others[0].n <= others[1].n ? [others[0], others[1]] : [others[1], others[0]];
  return { w: W.n, r: R.n, x: R.x, count: Math.max(1, Math.min(S.n, 12)) };
}

function weightedSets(groups, prevW) {
  const sets = [];
  let pending = [];
  const push = (w, r, x = 0) => sets.push({ w: w ?? null, r: r ?? null, x: x || 0 });
  const spread = (weights, count, r, x) => {
    const n = Math.max(count, weights.length);
    for (let i = 0; i < n; i++) push(weights[Math.min(i, weights.length - 1)] ?? prevW ?? null, r, x);
  };
  const flushPending = () => {
    const vals = pending;
    pending = [];
    if (!vals.length) return;
    const ns = vals.map((v) => v.n);
    const half = ns.length / 2;
    if (ns.length >= 2 && ns.length % 2 === 0) {
      const ws = ns.slice(0, half), rs = vals.slice(half);
      if (rs.every((v) => isInt(v.n) && v.n <= 30) && Math.min(...ws) > Math.max(...rs.map((v) => v.n)) * 0.9) {
        ws.forEach((w, i) => push(w, rs[i].n, rs[i].x));
        return;
      }
    }
    for (let k = 1; k < ns.length; k++) {
      const maxBefore = Math.max(...ns.slice(0, k));
      if (ns[k] < 0.65 * maxBefore && vals.slice(k).every((v) => isInt(v.n) && v.n <= 30)) {
        const ws = ns.slice(0, k), rs = vals.slice(k);
        ws.forEach((w, i) => push(w, rs[i]?.n ?? null, rs[i]?.x));
        return;
      }
    }
    ns.forEach((w) => push(w, null));
  };

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    if (g.length === 1) { pending.push(g[0]); continue; }
    if (g.length >= 3) {
      flushPending();
      const { w, r, x, count } = resolve3(g.slice(0, 3), prevW);
      for (let i = 0; i < count; i++) push(w, r, x);
      prevW = w;
      continue;
    }
    const [a, b] = g;
    if (pending.length) {
      const ref = median(pending.map((v) => v.n));
      const ws = pending.map((v) => v.n);
      pending = [];
      if (close(a.n, ref)) ws.concat(a.n).forEach((w) => push(w, b.n, b.x));
      else spread(ws, b.n <= 12 ? b.n : ws.length, a.n, a.x);
      continue;
    }
    // "4x10 55 60 60 60": set x tekrar, ardından ağırlıklar
    const following = [];
    while (groups[gi + 1]?.length === 1) following.push(groups[++gi][0].n);
    if (following.length) { spread(following, a.n, b.n, b.x); continue; }
    if (isInt(a.n) && a.n <= 6 && prevW && !close(a.n, prevW)) spread([prevW], a.n, b.n, b.x);
    else push(a.n, b.n, b.x);
  }
  flushPending();
  return sets;
}

function bodyweightSets(groups) {
  const sets = [];
  for (const g of groups) {
    if (g.length === 1) { sets.push({ w: null, r: g[0].n, x: g[0].x }); continue; }
    const [S, R] = g[0].n <= g[1].n ? [g[0], g[1]] : [g[1], g[0]];
    for (let i = 0; i < Math.min(S.n, 12); i++) sets.push({ w: null, r: R.n, x: R.x });
  }
  return sets;
}

function parseItem(line, table, prevW) {
  const m = matchExercise(line, table);
  if (!m) return null;
  const words = line.trim().split(/\s+/);
  const rest = words.slice(m.k).join(' ');
  const { tokens, words: noteWords, skipped } = lex(rest);
  const groups = chains(tokens);
  const type = exercises().find((e) => e.id === m.id)?.type || 'w';
  let sets;
  if (type === 'bw') sets = groups.length ? bodyweightSets(groups) : [{ w: null, r: null, x: 0 }];
  else sets = groups.length ? weightedSets(groups, prevW[m.id]) : [];
  const ws = sets.map((s) => s.w).filter((w) => w != null);
  if (ws.length) prevW[m.id] = ws[ws.length - 1];
  const odd = groups.length > 1 && groups.filter((g) => g.length > 1).length > 1;
  return {
    exId: m.id,
    sets: sets.map((s) => ({ w: s.w, r: s.r, x: s.x || undefined })),
    note: noteWords.join(' ').trim(),
    skipped,
    raw: line.trim(),
    fuzzy: m.d > 0,
    check: odd || sets.length > 6 || sets.some((s) => s.r == null && type !== 'bw'),
  };
}

const DATE = /^\s*(\d{1,2})[\s./-]+(\d{1,2})[\s./-]+(\d{2}|\d{4})(?!\d)(.*)$/;

function parseDateLine(line) {
  const m = line.match(DATE);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  let rest = m[4] || '';
  let bodyWeight = null;
  const wm = rest.match(/\(\s*[a-zA-Z]?\s*(\d{2,3}(?:[.,]\d+)?)[,.]?\s*\)?/);
  if (wm) {
    bodyWeight = Number(wm[1].replace(',', '.'));
    rest = rest.replace(wm[0], ' ');
  }
  rest = rest.replace(/\(\s*\?+\s*\)/, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  return { date: `${y}-${pad(mo)}-${pad(d)}`, bodyWeight, note: rest };
}

export function parseNotes(text) {
  const table = aliasTable();
  const prevW = {};
  const sessions = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dl = parseDateLine(line);
    if (dl) {
      cur = { date: dl.date, bodyWeight: dl.bodyWeight, note: dl.note, items: [], unknown: [] };
      sessions.push(cur);
      continue;
    }
    if (!cur) continue;
    const it = parseItem(line, table, prevW);
    if (it) cur.items.push(it);
    else cur.unknown.push(line);
  }

  for (const s of sessions) {
    // Aynı gün ikinci kez yazılan barfiks dar tutuştur (ör. "barfix 5" sonra "barfix 5x2")
    let seen = false;
    for (const it of s.items) {
      if (it.exId !== 'pullup') continue;
      if (seen) it.exId = 'pullup-close';
      seen = true;
    }
    if (s.unknown.length) s.note = [s.note, ...s.unknown].filter(Boolean).join(' · ');
  }

  // Sırası bozuk tarihler için öneri (notlar kronolojik yazıldığı varsayılır)
  let prevDate = null;
  sessions.forEach((s, i) => {
    const next = sessions[i + 1];
    const earlier = prevDate && s.date < prevDate;
    const dup = prevDate && s.date === prevDate && s.items.length > 0;
    const spike = prevDate && next && s.date > next.date && next.date > prevDate;
    if (earlier || dup || spike) {
      let sug = addDays(prevDate, 2);
      if (next && next.date > prevDate && sug >= next.date) sug = addDays(prevDate, 1);
      s.warn = 'Tarih sırası bozuk';
      s.suggest = sug;
    }
    prevDate = s.suggest || s.date;
  });
  return sessions;
}
