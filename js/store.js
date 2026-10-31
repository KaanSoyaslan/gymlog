// Veriler sadece bu cihazda (localStorage) tutulur. Demo modu ayrı bir anahtar kullanır.
import { BUILTIN, GROUP_NAME } from './exercises.js';
import { num, daysBetween, weekStart, today, addDays } from './format.js';
import { getLang, t } from './i18n.js';

export const DEMO = new URLSearchParams(location.search).has('demo');
const KEY = DEMO ? 'gymlog.demo.v1' : 'gymlog.v1';

function blank() {
  return {
    v: 1,
    sessions: [],   // { id, date, bodyWeight, groups, items: [{ exId, sets: [{ w, r, x, t, d }], note, skipped }], note, mood, createdAt, updatedAt }
    templates: [],  // { id, name, groups, items: [{ exId, sets }] }
    weighIns: [],   // { date, kg } — antrenman olmayan günlerde girilen kilo
    customEx: [],   // kullanıcının eklediği hareketler
    measurements: [], // { date, waist, chest, arm, thigh, hip } (cm)
    exEdits: {},    // hazır hareketlerde yapılan değişiklikler { id: { name, short, ... , hidden } }
    draft: null,    // devam eden antrenman
    settings: { goalWeight: null, theme: 'auto', lang: 'auto', lastBackup: null, weeklyGoal: 3, restDefault: 90, keepAwake: true, haptics: true },
  };
}

function migrate(s) {
  const b = blank();
  return { ...b, ...s, settings: { ...b.settings, ...(s.settings || {}) } };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Veri okunamadı', e);
  }
  return blank();
}

export let state = load();
export const isEmpty = () => !state.sessions.length && !state.weighIns.length;

let rev = 0;
const memo = new Map();
function cached(key, fn) {
  const hit = memo.get(key);
  if (hit && hit.rev === rev) return hit.value;
  const value = fn();
  memo.set(key, { rev, value });
  return value;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Kaydedilemedi', e);
  }
}
let timer = 0;
export function saveSoon() {
  clearTimeout(timer);
  timer = setTimeout(save, 300);
}
export function commit() {
  rev++;
  save();
}
export function replaceState(s) {
  state = migrate(s);
  commit();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- Hareketler ----------
// Hazır hareketler seçili dilde gelir; diğer dildeki adı da aramada ve içe aktarmada eşleşsin diye takma adlara eklenir.
function localize(e) {
  const en = getLang() === 'en';
  const name = en ? e.nameEn || e.name : e.name;
  const short = en ? e.shortEn || e.short : e.short;
  const other = [e.name, e.nameEn, e.short, e.shortEn].filter((x) => x && x !== name && x !== short);
  return { ...e, name, short, tip: en ? e.tipEn || e.tip : e.tip, aliases: [...new Set([...(e.aliases || []), ...other])] };
}
export function exercises() {
  return cached('ex:' + getLang(), () => {
    const list = BUILTIN.map((e) => ({ ...localize(e), ...(state.exEdits[e.id] || {}), builtin: true }));
    for (const e of state.customEx) list.push({ ...e, custom: true });
    return list;
  });
}
function exMap() {
  return cached('exMap:' + getLang(), () => new Map(exercises().map((e) => [e.id, e])));
}
export function ex(id) {
  return exMap().get(id) || { id, name: id, short: id, groups: [], type: 'w', anim: 'dbCurl', aliases: [], missing: true };
}
export function saveExercise(data) {
  const isBuiltin = BUILTIN.some((e) => e.id === data.id);
  if (isBuiltin) {
    state.exEdits[data.id] = { ...(state.exEdits[data.id] || {}), ...data };
  } else if (data.id && state.customEx.some((e) => e.id === data.id)) {
    state.customEx = state.customEx.map((e) => (e.id === data.id ? { ...e, ...data } : e));
  } else {
    data = { ...data, id: 'c-' + uid() };
    state.customEx.push(data);
  }
  commit();
  return data.id;
}
export function resetExercise(id) {
  delete state.exEdits[id];
  commit();
}
export function deleteExercise(id) {
  state.customEx = state.customEx.filter((e) => e.id !== id);
  commit();
}

// ---------- Antrenmanlar ----------
export function sessions() {
  return cached('sessions', () => state.sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)));
}
export const getSession = (id) => state.sessions.find((s) => s.id === id);
export function upsertSession(s) {
  s.updatedAt = Date.now();
  const i = state.sessions.findIndex((x) => x.id === s.id);
  if (i >= 0) state.sessions[i] = s;
  else state.sessions.push({ ...s, createdAt: s.createdAt || Date.now() });
  commit();
}
export function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  commit();
}
export function sessionGroups(s) {
  if (s.groups?.length) return s.groups;
  const set = new Set();
  for (const it of s.items) for (const g of ex(it.exId).groups.slice(0, 1)) set.add(g);
  return [...set];
}
export const groupLabel = (groups) => groups.map((g) => GROUP_NAME[g] || g).join(' · ');

// Bir hareketin tüm geçmişi, eskiden yeniye (pas geçilenler hariç).
export function exHistory(exId) {
  return cached('hist:' + exId, () => {
    const out = [];
    for (const s of sessions()) {
      s.items.forEach((it, i) => {
        if (it.exId === exId && !it.skipped && it.sets.some(hasValue)) out.push({ date: s.date, sessionId: s.id, item: it, order: (s.createdAt || 0) + i });
      });
    }
    return out.reverse();
  });
}
export const hasValue = (set) => ['w', 'r', 't', 'd'].some((k) => set[k] != null);

// Verilen tarihten önceki son performans (aynı antrenman hariç).
export function lastPerf(exId, { before, excludeId } = {}) {
  const h = exHistory(exId);
  for (let i = h.length - 1; i >= 0; i--) {
    const e = h[i];
    if (e.sessionId === excludeId) continue;
    if (before && e.date > before) continue;
    return e;
  }
  return null;
}

export const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));

export function itemStats(item, type) {
  let maxW = 0, vol = 0, reps = 0, best = null, bestE1 = 0, maxR = 0, time = 0, dist = 0;
  for (const s of item.sets) {
    const r = (s.r || 0) + (s.x || 0);
    reps += r;
    if (r > maxR) maxR = r;
    time += s.t || 0;
    dist += s.d || 0;
    if (s.w != null) {
      vol += s.w * r;
      if (s.w > maxW || (s.w === maxW && r > (best?.r || 0))) { maxW = s.w; best = s; }
      const e = e1rm(s.w, s.r || 0); // yardımlı tekrarlar (+x) tahmini 1RM'e katılmaz
      if (e > bestE1) bestE1 = e;
    }
  }
  if (type === 'bw') vol = reps;
  return { maxW, vol, reps, best, e1: bestE1, maxR, time, dist };
}

// Tüm zamanların en iyileri (verilen antrenman hariç, istenirse belli bir tarihten önce).
export function records(exId, { before, excludeId } = {}) {
  const type = ex(exId).type;
  let maxW = 0, e1 = 0, maxR = 0, maxT = 0, maxVol = 0, wDate = null;
  for (const h of exHistory(exId)) {
    if (h.sessionId === excludeId) continue;
    if (before && h.date >= before) continue;
    const st = itemStats(h.item, type);
    if (st.maxW > maxW) { maxW = st.maxW; wDate = h.date; }
    e1 = Math.max(e1, st.e1);
    maxR = Math.max(maxR, st.maxR);
    maxT = Math.max(maxT, st.time);
    maxVol = Math.max(maxVol, st.vol);
  }
  return { maxW, e1, maxR, maxT, maxVol, wDate };
}

// Bir antrenmandaki rekorlar: önceki en iyiyi geçen hareketler.
export function sessionPRs(s) {
  const out = [];
  for (const it of s.items) {
    if (it.skipped || !it.sets.some(hasValue)) continue;
    const e = ex(it.exId);
    const prev = records(it.exId, { before: s.date, excludeId: s.id });
    if (!exHistory(it.exId).some((h) => h.date < s.date && h.sessionId !== s.id)) continue; // ilk kez yapılan hareket rekor sayılmaz
    const st = itemStats(it, e.type);
    if (e.type === 'w' && st.maxW > prev.maxW) out.push({ exId: it.exId, label: `${num(st.maxW)} kg`, prev: prev.maxW ? `${num(prev.maxW)} kg` : null });
    else if (e.type === 'w' && st.e1 > prev.e1 + 0.01 && st.maxW === prev.maxW) out.push({ exId: it.exId, label: `${num(st.best.w)} × ${(st.best.r || 0) + (st.best.x || 0)}`, prev: null, kind: 'reps' });
    else if (e.type === 'bw' && st.maxR > prev.maxR) out.push({ exId: it.exId, label: `${st.maxR} tekrar`, prev: `${prev.maxR}` });
    else if (e.type === 'time' && st.time > prev.maxT) out.push({ exId: it.exId, label: `${st.time} sn`, prev: `${prev.maxT}` });
  }
  return out;
}

export function usageCount(exId) {
  return cached('usage', () => {
    const m = new Map();
    for (const s of state.sessions) for (const it of s.items) m.set(it.exId, (m.get(it.exId) || 0) + 1);
    return m;
  }).get(exId) || 0;
}

// ---------- Kilo ----------
export function weightSeries() {
  return cached('weights', () => {
    const m = new Map();
    for (const w of state.weighIns) m.set(w.date, w.kg);
    for (const s of state.sessions) if (s.bodyWeight) m.set(s.date, s.bodyWeight);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, kg]) => ({ date, kg }));
  });
}
export function addWeighIn(date, kg) {
  state.weighIns = state.weighIns.filter((w) => w.date !== date);
  state.weighIns.push({ date, kg });
  commit();
}
export function lastWeight() {
  const w = weightSeries();
  return w.length ? w[w.length - 1] : null;
}

// ---------- Planlar ----------
export function upsertTemplate(t) {
  const i = state.templates.findIndex((x) => x.id === t.id);
  if (i >= 0) state.templates[i] = t;
  else state.templates.push({ ...t, id: t.id || uid() });
  commit();
}
export function deleteTemplate(id) {
  state.templates = state.templates.filter((t) => t.id !== id);
  commit();
}

const exSet = (items) => new Set(items.filter((it) => !it.skipped).map((it) => it.exId));
function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const x of a) if (b.has(x)) common++;
  return common / (a.size + b.size - common);
}

export function templateLastDone(t) {
  const set = exSet(t.items);
  for (const s of sessions()) if (similarity(set, exSet(s.items)) >= 0.5) return s.date;
  return null;
}

// Sıradaki önerilen plan: en uzun süredir yapılmayan plan (son antrenmana benzeyen hariç).
export function suggestNext() {
  if (!state.templates.length) return null;
  const last = sessions()[0];
  const lastSet = last ? exSet(last.items) : new Set();
  let best = null;
  for (const t of state.templates) {
    const done = templateLastDone(t);
    const sameAsLast = last && similarity(exSet(t.items), lastSet) >= 0.5;
    const score = sameAsLast ? -Infinity : done ? daysBetween(done, '2100-01-01') : Infinity;
    if (!best || score > best.score) best = { t, done, score };
  }
  return best;
}

// Geçmişten plan önerisi: son aylardaki antrenmanları benzerliğe göre kümeler.
export function suggestPlans() {
  const list = sessions().filter((s) => s.items.filter((it) => !it.skipped).length >= 3);
  if (!list.length) return [];
  const since = list[0].date;
  const recent = list.filter((s) => daysBetween(s.date, since) <= 150);
  const clusters = [];
  for (const s of recent) {
    const set = exSet(s.items);
    const c = clusters.find((c) => similarity(c.set, set) >= 0.5);
    if (c) c.count++;
    else clusters.push({ set, rep: s, count: 1 });
  }
  return clusters
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((c) => ({ session: c.rep, count: c.count, name: groupLabel(sessionGroups(c.rep)).replace(/ · /g, ' + ') || t('Antrenman') }));
}

export function templateFromSession(s, name) {
  return {
    id: uid(),
    name: name || groupLabel(sessionGroups(s)).replace(/ · /g, ' + ') || t('Antrenman'),
    groups: sessionGroups(s),
    items: s.items.filter((it) => !it.skipped).map((it) => ({ exId: it.exId, sets: clone(it.sets).map(({ w, r, t, d }) => ({ w, r, t, d })), ...(it.ss ? { ss: it.ss } : {}) })),
  };
}

// ---------- Taslak ----------
export function newDraft(base = {}) {
  return {
    id: uid(),
    date: base.date,
    bodyWeight: null,
    groups: base.groups || [],
    items: base.items || [],
    note: '',
    mood: null,
    fromTemplate: base.fromTemplate || null,
    startedAt: Date.now(),
  };
}

// Plandan başlarken her hareketin son yapılan ağırlıkları getirilir.
export function itemsFromTemplate(t) {
  return t.items.map((it) => {
    const last = lastPerf(it.exId);
    const sets = last ? clone(last.item.sets).map(({ w, r, x, t: tt, d }) => ({ w, r, x, t: tt, d })) : clone(it.sets);
    return { exId: it.exId, sets: sets.length ? sets : [{}], note: '', skipped: false, ...(it.ss ? { ss: it.ss } : {}) };
  });
}

export function itemsFromSession(s) {
  return s.items.map((it) => ({ exId: it.exId, sets: clone(it.sets).map(({ w, r, x, t, d }) => ({ w, r, x, t, d })), note: '', skipped: false, ...(it.ss ? { ss: it.ss } : {}) }));
}

export const groupName = (g) => GROUP_NAME[g] || g;

// ---------- Antrenman sırasında ----------
export const restFor = (exId) => Number(ex(exId).rest) || state.settings.restDefault || 90;

// Geçen sefer bütün setler aynı tekrarla bittiyse (ya da "bir dahakine artır" işaretlendiyse) bir üst ağırlığı önerir.
// Üst ağırlık, bu harekette daha önce kullandığın ağırlıklardan seçilir (makine kademeleri için); yoksa olağan artış eklenir.
export function suggestIncrease(exId, opts = {}) {
  if (ex(exId).type !== 'w') return null;
  const last = lastPerf(exId, opts);
  if (!last) return null;
  const sets = last.item.sets.filter((s) => s.w != null && s.r != null);
  if (!sets.length) return null;
  const top = Math.max(...sets.map((s) => s.w));
  const clean = sets.length >= 2 && sets.every((s) => !s.x && s.r >= sets[0].r);
  if (!last.item.bump && !clean) return null;
  const used = [...new Set(exHistory(exId).flatMap((h) => h.item.sets.map((s) => s.w)).filter((w) => w != null))].sort((a, b) => a - b);
  const diffs = [];
  for (let i = 1; i < used.length; i++) diffs.push(used[i] - used[i - 1]);
  diffs.sort((a, b) => a - b);
  const step = Math.min(5, Math.max(1, diffs.length ? diffs[Math.floor(diffs.length / 2)] : 2.5));
  let to = used.find((w) => w > top + 0.01);
  if (to == null || to - top > step * 1.6) to = Math.round((top + step) * 4) / 4;
  return { from: top, to, flagged: !!last.item.bump };
}

// ---------- Haftalık hedef ----------
export function weekProgress() {
  const goal = state.settings.weeklyGoal || 3;
  const counts = new Map();
  for (const s of state.sessions) {
    const w = weekStart(s.date);
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const cur = weekStart(today());
  const thisWeek = counts.get(cur) || 0;
  let streak = 0;
  let w = thisWeek >= goal ? cur : addDays(cur, -7);
  while ((counts.get(w) || 0) >= goal) { streak++; w = addDays(w, -7); }
  return { goal, thisWeek, streak, counts, cur };
}

// Bölge başına set sayısı: ana bölge tam, yardımcı bölgeler yarım sayılır.
export function groupSets(list) {
  const m = new Map();
  for (const s of list) {
    for (const it of s.items) {
      if (it.skipped) continue;
      const n = it.sets.filter(hasValue).length;
      ex(it.exId).groups.forEach((g, i) => m.set(g, (m.get(g) || 0) + (i === 0 ? n : n / 2)));
    }
  }
  return m;
}
export const sessionsSince = (days) => sessions().filter((s) => daysBetween(s.date, today()) < days);

// ---------- Vücut ölçüleri ----------
export const MEASURES = ['waist', 'chest', 'arm', 'thigh', 'hip'];
export function addMeasurement(m) {
  state.measurements = state.measurements.filter((x) => x.date !== m.date);
  state.measurements.push(m);
  state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  commit();
}
export function deleteMeasurement(date) {
  state.measurements = state.measurements.filter((x) => x.date !== date);
  commit();
}
