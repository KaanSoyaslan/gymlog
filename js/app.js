// GymLog: ekranlar ve akış. Veri katmanı store.js'te, animasyonlar anim.js'te.
import { GROUPS, GROUP_NAME, TYPES, DEFAULT_ANIM } from './exercises.js';
import { t, setLang, getLang } from './i18n.js';
import { animSvg, ANIM_CHOICES } from './anim.js';
import {
  state, DEMO, save, saveSoon, commit, replaceState, uid, clone,
  exercises, ex, saveExercise, resetExercise, deleteExercise,
  sessions, getSession, upsertSession, deleteSession, sessionGroups, groupLabel,
  exHistory, hasValue, lastPerf, itemStats, records, sessionPRs, usageCount,
  weightSeries, addWeighIn, lastWeight,
  upsertTemplate, deleteTemplate, templateLastDone, suggestNext, suggestPlans, templateFromSession,
  newDraft, itemsFromTemplate, itemsFromSession,
} from './store.js';
import { today, fmtDate, relDays, num, parseNum, daysBetween, addDays, weekStart, monthName, monthShort, dayShort, parseYmd, compact } from './format.js';
import { h, icon, sheet, confirmBox, menu, toast, chips, segmented, closeAll, settled } from './ui.js';
import { lineChart, columnChart, barList, heatmap } from './charts.js';
import { parseNotes, norm } from './importer.js';
import { demoState } from './demo.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const REPO_URL = 'https://github.com/KaanSoyaslan/gymlog';

setLang(state.settings.lang);
if (DEMO && !state.sessions.length) replaceState(demoState());
applyTheme();

// ---------- Ortak parçalar ----------
const FIELDS = {
  w: [{ k: 'w', label: 'kg', mode: 'decimal' }, { k: 'r', label: 'tekrar', mode: 'numeric' }, { k: 'x', label: '+', mode: 'numeric', small: true }],
  bw: [{ k: 'w', label: '+kg', mode: 'decimal' }, { k: 'r', label: 'tekrar', mode: 'numeric' }, { k: 'x', label: '+', mode: 'numeric', small: true }],
  time: [{ k: 't', label: 'saniye', mode: 'numeric' }],
  cardio: [{ k: 't', label: 'dakika', mode: 'decimal' }, { k: 'd', label: 'km', mode: 'decimal' }],
};
const MOODS = [
  { v: 1, e: '😫', t: 'Kötü' }, { v: 2, e: '😕', t: 'Zayıf' }, { v: 3, e: '😐', t: 'Normal' }, { v: 4, e: '🙂', t: 'İyi' }, { v: 5, e: '🔥', t: 'Harika' },
];
const moodOf = (v) => MOODS.find((m) => m.v === v);
const dk = () => t('dk');
const sn = () => t('sn');

export function summarize(item, type) {
  const sets = item.sets.filter(hasValue);
  if (!sets.length) return item.skipped ? t('pas') : '—';
  if (type === 'cardio') {
    const d = sets.reduce((a, s) => a + (s.d || 0), 0);
    const mins = sets.reduce((a, s) => a + (s.t || 0), 0);
    return [mins ? `${num(mins)} ${dk()}` : '', d ? `${num(d)} km` : ''].filter(Boolean).join(' · ');
  }
  if (type === 'time') return sets.map((s) => s.t ?? '?').join('/') + ' ' + sn();
  const rep = (s) => (s.r == null ? '?' : s.x ? `${s.r}+${s.x}` : `${s.r}`);
  const ws = sets.map((s) => s.w ?? null), rs = sets.map(rep);
  const allW = ws.every((w) => w === ws[0]), allR = rs.every((r) => r === rs[0]);
  const n = sets.length;
  if (type === 'bw' && allW && ws[0] == null) return allR ? (n > 1 ? `${rs[0]} × ${n}` : rs[0]) : rs.join('/');
  const wStr = allW ? num(ws[0]) : ws.map((w) => (w == null ? '–' : num(w))).join('/');
  const pre = type === 'bw' ? '+' : '';
  if (allW && allR) return `${pre}${wStr} × ${rs[0]}${n > 1 ? ` × ${n}` : ''}`;
  if (allW) return `${pre}${wStr} × ${rs.join('/')}`;
  if (allR) return `${pre}${wStr} × ${rs[0]}`;
  return `${pre}${wStr} × ${rs.join('/')}`;
}

function animBox(exId, size = 'md') {
  return h('div.anim-box.' + size, null, animSvg(ex(exId).anim));
}

function pageHead(title, sub, action) {
  return h('header.page-head', null,
    h('div', null, h('h1', null, title), sub ? h('p.sub', null, sub) : null),
    action || null);
}

function section(title, ...kids) {
  return h('section.section', null, title ? h('h2.section-title', null, title) : null, ...kids);
}

function empty(text, action) {
  return h('div.empty', null, h('p', null, text), action || null);
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0d0e10' : '#f4f4f1');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------- Yönlendirme ----------
const TABS = [
  { id: 'workout', name: 'Antrenman', icon: 'dumbbell' },
  { id: 'history', name: 'Geçmiş', icon: 'history' },
  { id: 'progress', name: 'Gelişim', icon: 'chart' },
  { id: 'library', name: 'Hareketler', icon: 'grid' },
  { id: 'settings', name: 'Ayarlar', icon: 'gear' },
];
let current = null;

function buildNav() {
  nav.setAttribute('aria-label', t('Ana menü'));
  nav.replaceChildren(...TABS.map((tab) => h('a.nav-item', { href: `#/${tab.id}`, dataset: { tab: tab.id } }, icon(tab.icon), h('span', null, t(tab.name)))));
}
buildNav();

function parseRoute() {
  const [tab = 'workout', sub = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { tab: TABS.some((t) => t.id === tab) ? tab : 'workout', sub };
}

function render({ keepScroll = false, top = false } = {}) {
  const { tab, sub } = parseRoute();
  const changed = current !== `${tab}/${sub}`;
  current = `${tab}/${sub}`;
  const y = window.scrollY;
  const page = VIEWS[tab](sub);
  view.replaceChildren(page);
  nav.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  if ((changed && !keepScroll) || top) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
}
const rerender = () => render({ keepScroll: true });
window.addEventListener('hashchange', () => { closeAll(); render(); });
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (parseRoute().tab === 'progress') rerender(); }, 250);
});
const go = (hash) => settled().then(() => { if (location.hash === hash) render({ top: true }); else location.hash = hash; });

// ---------- Antrenman sekmesi ----------
function WorkoutView() {
  return state.draft ? DraftView() : StartView();
}

function StartView() {
  const page = h('div.page');
  page.append(pageHead(t('Antrenman'), fmtDate(today(), { weekday: true, long: true, year: false })));
  if (DEMO) page.append(demoBanner());
  const all = sessions();
  if (!all.length && !state.templates.length) {
    page.append(h('div.card.welcome', null,
      h('h2', null, t('Hoş geldin 👋')),
      h('p', null, t('Antrenmanlarını hareket hareket kaydet, önceki antrenmanı tek dokunuşla kopyala, ağırlıklarını güncelle. Gelişimini grafiklerde izle.')),
      h('div.stack', null,
        h('button.btn.primary', { onclick: () => importSheet() }, icon('file'), t('Eski notlarımı içe aktar')),
        h('button.btn', { onclick: () => startBlank() }, icon('plus'), t('İlk antrenmanı başlat')),
        h('a.btn.ghost', { href: '?demo' }, icon('play'), t('Örnek verilerle dene')))));
    return page;
  }

  const last = all[0];
  if (last) {
    const week = all.filter((s) => s.date >= weekStart(today())).length;
    page.append(h('div.status', null,
      h('div', null, h('span.muted', null, t('Son antrenman')), h('b', null, `${relDays(last.date)}`)),
      h('div', null, h('span.muted', null, t('Bu hafta')), h('b', null, t('{n} antrenman', { n: week }))),
      lastWeight() ? h('div', null, h('span.muted', null, t('Kilo')), h('b', null, `${num(lastWeight().kg)} kg`)) : null));
  }

  const sug = suggestNext();
  if (sug) {
    const plan = sug.t;
    page.append(h('div.card.suggest', null,
      h('div.suggest-top', null,
        h('span.kicker', null, icon('sparkle'), t('Sıradaki')),
        h('span.muted.small', null, sug.done ? t('son: {d}', { d: relDays(sug.done) }) : t('henüz yapılmadı'))),
      h('h2', null, plan.name),
      h('div.mini-anims', null, plan.items.slice(0, 6).map((it) => animBox(it.exId, 'xs'))),
      h('p.muted.small', null, plan.items.map((it) => ex(it.exId).short).join(' · ')),
      h('button.btn.primary.block', { onclick: () => startFromTemplate(plan) }, icon('play'), t('Başla'))));
  }

  const others = state.templates.filter((p) => p !== sug?.t);
  if (others.length) {
    page.append(section(t('Planlarım'), h('div.list', null, others.map((p) => {
      const done = templateLastDone(p);
      return h('div.row-card', null,
        h('div.grow', null, h('b', null, p.name), h('div.muted.small', null, t('{n} hareket', { n: p.items.length }) + (done ? t(' · son {d}', { d: relDays(done) }) : ''))),
        h('button.btn.sm', { onclick: () => startFromTemplate(p) }, t('Başla')));
    }))));
  }

  const recent = all.filter((s) => s.items.length).slice(0, 4);
  if (recent.length) {
    page.append(section(t('Önceki antrenmanı kopyala'), h('div.list', null, recent.map((s) =>
      h('div.row-card.copy', null,
        h('div.date-badge', null, h('b', null, parseYmd(s.date).getDate()), h('span', null, monthShort(parseYmd(s.date).getMonth()))),
        h('div.grow', { onclick: () => sessionDetail(s.id) },
          h('b', null, groupLabel(sessionGroups(s)) || t('Antrenman')),
          h('div.muted.small.clamp', null, s.items.map((it) => ex(it.exId).short).join(' · '))),
        h('button.btn.sm', { onclick: () => startFromSession(s) }, icon('copy'), t('Kopyala')))))));
  }

  page.append(h('div.stack.mt', null,
    h('button.btn.block', { onclick: () => startBlank() }, icon('plus'), t('Boş antrenman başlat')),
    weighInCard()));
  return page;
}

function weighInCard() {
  const input = h('input.input', { inputmode: 'decimal', placeholder: lastWeight() ? num(lastWeight().kg) : 'kg', 'aria-label': t('Bugünkü kilo') });
  const saveIt = () => {
    const kg = parseNum(input.value);
    if (!kg || kg < 30 || kg > 300) { toast(t('Geçerli bir kilo yaz')); return; }
    addWeighIn(today(), kg);
    toast(t('Kilo kaydedildi: {kg} kg', { kg: num(kg) }));
    rerender();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveIt(); });
  return h('div.card.weigh', null,
    h('div.row.gap', null, icon('scale'), h('b.grow', null, t('Sadece kilo gir')), input, h('button.btn.sm', { onclick: saveIt }, t('Kaydet'))),
    h('p.muted.small', null, t('Spora gitmediğin günlerde de kilonu girebilirsin; kilo grafiğine eklenir.')));
}

function demoBanner() {
  return h('div.banner', null, icon('info'), h('span.grow', null, t('Demo modu: örnek verilerle çalışıyor, kendi verilerin etkilenmez.')), h('a', { href: './' }, t('Çık')));
}

async function setDraft(d) {
  if (state.draft && state.draft.items.length) {
    const ok = await confirmBox(t('Devam eden bir antrenman var. Onu silip yenisini başlatayım mı?'), { ok: t('Yenisini başlat'), danger: true });
    if (!ok) return;
  }
  state.draft = d;
  save();
  go('#/workout');
}

function startBlank() {
  setDraft(newDraft({ date: today() }));
}
function startFromTemplate(t) {
  setDraft(newDraft({ date: today(), groups: t.groups.slice(), items: itemsFromTemplate(t), fromTemplate: t.id }));
}
function startFromSession(s) {
  setDraft(newDraft({ date: today(), groups: sessionGroups(s).slice(), items: itemsFromSession(s) }));
}

function DraftView() {
  const d = state.draft;
  const page = h('div.page');
  const editor = Editor(d, { mode: 'draft', changed: saveSoon });
  page.append(
    h('header.page-head.sticky', null,
      h('div', null, h('h1', null, t('Bugünkü antrenman')), h('p.sub', null, t('{n} hareket', { n: d.items.length }))),
      h('button.btn.primary.sm', { onclick: () => saveDraft() }, icon('check'), t('Kaydet'))),
    editor,
    h('div.stack.mt', null,
      h('button.btn.primary.block.lg', { onclick: () => saveDraft() }, icon('check'), t('Antrenmanı kaydet')),
      h('button.btn.ghost.block', { onclick: discardDraft }, t('Antrenmanı sil'))));
  return page;
}

async function discardDraft() {
  const ok = await confirmBox(t('Bu antrenman kaydedilmeden silinsin mi?'), { ok: t('Sil'), danger: true });
  if (!ok) return;
  state.draft = null;
  save();
  rerender();
}

function cleanSet(s) {
  const o = {};
  for (const k of ['w', 'r', 'x', 't', 'd']) if (s[k] != null && !(k === 'x' && !s[k])) o[k] = s[k];
  return o;
}

function finalize(doc) {
  const s = clone(doc);
  s.items = s.items
    .map((it) => ({ exId: it.exId, sets: it.sets.filter(hasValue).map(cleanSet), note: (it.note || '').trim(), skipped: !!it.skipped }))
    .filter((it) => it.sets.length || it.skipped || it.note);
  s.note = (s.note || '').trim();
  if (!s.groups?.length) s.groups = sessionGroups(s);
  delete s.startedAt;
  return s;
}

async function saveDraft() {
  const s = finalize(state.draft);
  if (!s.date) { toast(t('Tarih seç')); return; }
  if (!s.items.length) {
    if (s.bodyWeight) {
      const ok = await confirmBox(t('Hiç hareket girilmedi. Sadece kilo olarak kaydedilsin mi?'), { ok: t('Kilo olarak kaydet') });
      if (!ok) return;
      addWeighIn(s.date, s.bodyWeight);
      state.draft = null;
      save();
      toast(t('Kilo kaydedildi'));
      rerender();
      return;
    }
    toast(t('Önce bir hareket ekle'));
    return;
  }
  const prs = sessionPRs(s);
  upsertSession(s);
  state.draft = null;
  save();
  render({ top: true });
  summarySheet(s, prs);
}

function summarySheet(s, prs) {
  let sets = 0, vol = 0;
  for (const it of s.items) {
    if (it.skipped) continue;
    sets += it.sets.length;
    const e = ex(it.exId);
    if (e.type === 'w') vol += itemStats(it, 'w').vol;
  }
  const prev = sessions().find((x) => x.id !== s.id && x.date <= s.date && similarItems(x, s));
  let prevVol = 0;
  if (prev) for (const it of prev.items) if (!it.skipped && ex(it.exId).type === 'w') prevVol += itemStats(it, 'w').vol;
  const diff = prevVol ? Math.round(((vol - prevVol) / prevVol) * 100) : null;
  const hasPlan = state.templates.some((t) => similarItems(t, s));
  const sh = sheet({
    title: t('Antrenman kaydedildi 💪'),
    body: h('div', null,
      h('div.tiles', null,
        tile(t('Hareket'), s.items.filter((it) => !it.skipped).length),
        tile(t('Set sayısı'), sets),
        tile(t('Hacim'), `${compact(vol)} kg`, diff != null ? t('{diff}% geçen sefere göre', { diff: `${diff >= 0 ? '+' : ''}${diff}` }) : null),
        s.bodyWeight ? tile(t('Kilo'), `${num(s.bodyWeight)} kg`) : null),
      prs.length ? h('div.prs', null,
        h('h3', null, icon('trophy'), t(prs.length > 1 ? 'Yeni rekorlar' : 'Yeni rekor')),
        prs.map((p) => h('div.pr-row', null, h('b', null, ex(p.exId).name), h('span', null, p.prev ? `${p.prev} → ${p.label}` : p.label))))
        : h('p.muted', null, t('Bu sefer rekor yok; düzenli devam etmek de kazanç.'))),
    footer: h('div.row.gap', null,
      !hasPlan ? h('button.btn.grow', { onclick: () => { sh.close(); planFromSession(s); } }, t('Plan olarak kaydet')) : null,
      h('button.btn.primary.grow', { onclick: () => sh.close() }, t('Tamam'))),
  });
}

function similarItems(a, b) {
  const A = new Set(a.items.map((i) => i.exId)), B = new Set(b.items.map((i) => i.exId));
  let c = 0;
  for (const x of A) if (B.has(x)) c++;
  return c / (A.size + B.size - c || 1) >= 0.5;
}

function tile(label, value, delta) {
  return h('div.tile', null, h('span.tile-label', null, label), h('b.tile-value', null, String(value)), delta ? h('span.tile-delta', null, delta) : null);
}

// ---------- Düzenleyici (taslak, kayıtlı antrenman ve plan için ortak) ----------
function Editor(doc, { mode, changed = () => {} }) {
  const wrap = h('div.editor');
  const isPlan = mode === 'template';

  // Üst bilgiler
  const meta = h('div.card.meta');
  if (isPlan) {
    meta.append(h('label.field', null, h('span', null, t('Plan adı')),
      h('input.input', { value: doc.name || '', placeholder: t('ör. Sırt + Biceps'), oninput: (e) => { doc.name = e.target.value; changed(); } })));
  } else {
    const lw = lastWeight();
    meta.append(h('div.row.gap', null,
      h('label.field.grow', null, h('span', null, t('Tarih')),
        h('input.input', { type: 'date', value: doc.date || today(), max: addDays(today(), 1), onchange: (e) => { doc.date = e.target.value; changed(); paintItems(); } })),
      h('label.field.w-kg', null, h('span', null, t('Kilon')),
        h('input.input', { inputmode: 'decimal', value: doc.bodyWeight ?? '', placeholder: lw ? num(lw.kg) : 'kg', oninput: (e) => { doc.bodyWeight = parseNum(e.target.value); changed(); } }))));
  }
  meta.append(h('div.field', null, h('span', null, t(isPlan ? 'Bölgeler' : 'Bugün çalışılan bölgeler')),
    chips(GROUPS, doc.groups || [], (sel) => { doc.groups = sel; changed(); })));
  wrap.append(meta);

  const list = h('div.items');
  wrap.append(list);
  const ctx = { mode, doc, changed, repaint: () => paintItems() };
  function paintItems() {
    list.replaceChildren(...doc.items.map((_, i) => ItemCard(doc, i, ctx)));
    if (!doc.items.length) list.append(h('p.muted.center.pad', null, t('Henüz hareket yok. Aşağıdan ekle ya da önceki antrenmanı kopyala.')));
    const sub = wrap.closest('.page')?.querySelector('.page-head .sub');
    if (sub && mode === 'draft') sub.textContent = t('{n} hareket', { n: doc.items.length });
  }
  paintItems();

  wrap.append(h('button.add-ex', {
    onclick: () => pickExercise({
      title: t('Hareket ekle'),
      groups: doc.groups,
      onPick: (id) => {
        doc.items.push({ exId: id, sets: defaultSets(id, isPlan), note: '', skipped: false });
        changed();
        paintItems();
        requestAnimationFrame(() => list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      },
    }),
  }, icon('plus'), t('Hareket ekle')));

  if (!isPlan) {
    const moodRow = h('div.moods');
    const paintMood = () => moodRow.replaceChildren(...MOODS.map((m) => h('button.mood' + (doc.mood === m.v ? '.on' : ''), {
      type: 'button', title: t(m.t), 'aria-label': t(m.t), 'aria-pressed': String(doc.mood === m.v),
      onclick: () => { doc.mood = doc.mood === m.v ? null : m.v; changed(); paintMood(); },
    }, h('span', null, m.e), h('small', null, t(m.t)))));
    paintMood();
    wrap.append(h('div.card', null,
      h('label.field', null, h('span', null, t('Genel not')),
        h('textarea.input', { rows: 3, placeholder: t('ör. uykusuzdum, sırtım ağrıdı, keyifli antrenman…'), value: doc.note || '', oninput: (e) => { doc.note = e.target.value; changed(); } })),
      h('div.field', null, h('span', null, t('Nasıldı?')), moodRow)));
  }
  return wrap;
}

function defaultSets(exId, isPlan) {
  const e = ex(exId);
  if (!isPlan) {
    const last = lastPerf(exId);
    if (last) return clone(last.item.sets).map(cleanSet);
  }
  const n = e.type === 'time' || e.type === 'cardio' ? 1 : 3;
  return Array.from({ length: n }, () => ({}));
}

function ItemCard(doc, i, ctx) {
  const it = doc.items[i];
  const e = ex(it.exId);
  const fields = FIELDS[e.type] || FIELDS.w;
  const isPlan = ctx.mode === 'template';
  const prev = isPlan ? null : lastPerf(it.exId, { before: doc.date, excludeId: doc.id });
  const rec = isPlan ? null : records(it.exId, { excludeId: doc.id });
  const card = h('div.ex-card' + (it.skipped ? '.skipped' : ''));

  const more = h('button.icon-btn', { 'aria-label': t('Hareket seçenekleri'), onclick: () => menu(e.name, [
    { label: t('Hareketi değiştir'), icon: 'swap', action: () => swapItem(doc, i, ctx) },
    i > 0 && { label: t('Yukarı taşı'), icon: 'up', action: () => { [doc.items[i - 1], doc.items[i]] = [doc.items[i], doc.items[i - 1]]; ctx.changed(); ctx.repaint(); } },
    i < doc.items.length - 1 && { label: t('Aşağı taşı'), icon: 'down', action: () => { [doc.items[i + 1], doc.items[i]] = [doc.items[i], doc.items[i + 1]]; ctx.changed(); ctx.repaint(); } },
    { label: t('Hareket bilgisi'), icon: 'info', action: () => exerciseDetail(it.exId) },
    { label: t('Kaldır'), icon: 'trash', danger: true, action: () => { doc.items.splice(i, 1); ctx.changed(); ctx.repaint(); } },
  ]) }, icon('more'));

  const info = [];
  if (prev) info.push(h('span', null, t('Son: '), h('b', null, summarize(prev.item, e.type)), ` · ${fmtDate(prev.date)}`));
  else if (!isPlan) info.push(h('span', null, t('İlk kez')));
  if (rec?.maxW && e.type === 'w') info.push(h('span', null, t(' · En iyi {kg} kg', { kg: num(rec.maxW) })));
  if (prev?.item.note) info.push(h('span.prev-note', null, ` · “${prev.item.note}”`));

  card.append(h('div.ex-head', null,
    h('button.anim-btn', { 'aria-label': t('{name} animasyonu', { name: e.name }), onclick: () => exerciseDetail(it.exId) }, animBox(it.exId, 'sm')),
    h('div.ex-title', null,
      h('b', null, e.name),
      h('span.muted.small', null, [e.short !== e.name && e.short, ...e.groups.map((g) => GROUP_NAME[g])].filter((x, k, a) => x && a.indexOf(x) === k).join(' · ')),
      info.length ? h('span.ex-prev.small', null, info) : null),
    more));

  if (it.skipped) card.append(h('div.skip-badge', null, icon('skip'), t('Pas geçildi')));

  // Setler
  const table = h('div.sets', { style: `--cols:${fields.length}` });
  table.append(h('div.set-row.head', null, h('span.set-no', null, t('Set')), fields.map((f) => h('span.set-label' + (f.small ? '.small' : ''), null, t(f.label))), h('span.set-del')));
  it.sets.forEach((set, j) => {
    const row = h('div.set-row');
    const markPR = () => {
      const pr = e.type === 'w' && rec?.maxW && set.w > rec.maxW;
      row.classList.toggle('pr', !!pr);
    };
    row.append(h('span.set-no', null, String(j + 1)));
    for (const f of fields) {
      const ph = prev?.item.sets[j]?.[f.k] ?? prev?.item.sets[prev.item.sets.length - 1]?.[f.k];
      const input = h('input.set-in' + (f.small ? '.small' : ''), {
        inputmode: f.mode, enterkeyhint: 'next', autocomplete: 'off',
        value: set[f.k] != null && !(f.k === 'x' && !set[f.k]) ? num(set[f.k]) : '',
        placeholder: f.k === 'x' ? '+' : ph != null ? num(ph) : '–',
        'aria-label': t('{n}. set {label}', { n: j + 1, label: t(f.label) }),
      });
      input.addEventListener('focus', () => { input.dataset.old = input.value; setTimeout(() => input.select(), 0); });
      input.addEventListener('input', () => {
        set[f.k] = parseNum(input.value);
        if (set[f.k] == null) delete set[f.k];
        ctx.changed();
        markPR();
      });
      input.addEventListener('change', () => {
        const oldV = parseNum(input.dataset.old), newV = parseNum(input.value);
        if (oldV === newV) return;
        // İlk setteki değişikliği aynı değere sahip sonraki setlere de uygula
        for (let m = j + 1; m < it.sets.length; m++) {
          if ((it.sets[m][f.k] ?? null) !== oldV) continue;
          if (newV == null) delete it.sets[m][f.k]; else it.sets[m][f.k] = newV;
          const other = table.querySelectorAll('.set-row:not(.head)')[m]?.querySelectorAll('.set-in')[fields.indexOf(f)];
          if (other) other.value = newV == null ? '' : num(newV);
        }
        ctx.changed();
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        const all = [...card.querySelectorAll('.set-in')];
        all[all.indexOf(input) + 1]?.focus();
      });
      row.append(input);
    }
    row.append(h('button.icon-btn.sm.set-del', { 'aria-label': t('{n}. seti sil', { n: j + 1 }), onclick: () => { it.sets.splice(j, 1); ctx.changed(); ctx.repaint(); } }, icon('x')));
    markPR();
    table.append(row);
  });
  card.append(table);

  const noteInput = h('input.input.note-in', {
    value: it.note || '', placeholder: t('Bu hareket için not (ör. alet bozuk)'),
    oninput: (ev) => { it.note = ev.target.value; ctx.changed(); },
  });
  const noteWrap = h('div.note-wrap', { hidden: !it.note }, noteInput);
  card.append(noteWrap);

  card.append(h('div.ex-actions', null,
    h('button.btn.sm.ghost', { onclick: () => { const last = it.sets[it.sets.length - 1]; it.sets.push(last ? cleanSet(last) : {}); ctx.changed(); ctx.repaint(); } }, icon('plus'), t('Set')),
    h('button.btn.sm.ghost', { onclick: () => { noteWrap.hidden = false; noteInput.focus(); } }, icon('note'), t('Not')),
    !isPlan ? h('button.btn.sm.ghost' + (it.skipped ? '.on' : ''), { onclick: () => { it.skipped = !it.skipped; ctx.changed(); ctx.repaint(); } }, icon('skip'), t(it.skipped ? 'Pas geri al' : 'Pas geç')) : null,
    h('button.btn.sm.ghost', { onclick: () => swapItem(doc, i, ctx) }, icon('swap'), t('Değiştir'))));
  return card;
}

function swapItem(doc, i, ctx) {
  const it = doc.items[i];
  const groups = [...new Set([...(ex(it.exId).groups || []), ...(doc.groups || [])])];
  pickExercise({
    title: t('Değiştir: {name}', { name: ex(it.exId).short }),
    groups,
    exclude: it.exId,
    onPick: (id) => {
      const last = ctx.mode === 'template' ? null : lastPerf(id);
      it.exId = id;
      if (last) it.sets = clone(last.item.sets).map(cleanSet);
      ctx.changed();
      ctx.repaint();
    },
  });
}

// ---------- Hareket seçici ----------
// "Tümü" seçimi temizler; bölgeler birden çok seçilebilir.
function groupFilter(initial, onChange) {
  let sel = initial.slice();
  const wrap = h('div.chips.scroll-x');
  const paint = () => wrap.replaceChildren(
    h('button.chip' + (!sel.length ? '.on' : ''), { type: 'button', onclick: () => { sel = []; paint(); onChange(sel); } }, t('Tümü')),
    ...GROUPS.map((g) => h('button.chip' + (sel.includes(g.id) ? '.on' : ''), {
      type: 'button',
      onclick: () => { sel = sel.includes(g.id) ? sel.filter((x) => x !== g.id) : [...sel, g.id]; paint(); onChange(sel); },
    }, g.name)));
  paint();
  return wrap;
}

function pickExercise({ title, groups = [], onPick, exclude }) {
  let sel = groups.slice();
  let q = '';
  const listEl = h('div.pick-list');
  const search = h('input.input', { type: 'search', placeholder: t('Ara: lpd, hammer, squat…'), oninput: (e) => { q = e.target.value; paint(); } });
  const groupChips = groupFilter(sel, (v) => { sel = v; paint(); });
  const sh = sheet({
    title, full: true,
    body: h('div', null, h('div.pick-tools', null, search, groupChips), listEl),
    footer: h('button.btn.block', { onclick: () => { sh.close(); exerciseForm(null, { groups: sel, onSaved: onPick }); } }, icon('plus'), t('Listede yok mu? Yeni hareket oluştur')),
  });
  function paint() {
    const nq = norm(q);
    let list = exercises().filter((e) => !e.hidden && e.id !== exclude);
    if (nq) list = list.filter((e) => [e.name, e.short, ...(e.aliases || [])].some((s) => norm(s).includes(nq)));
    else if (sel.length) list = list.filter((e) => e.groups.some((g) => sel.includes(g)));
    list.sort((a, b) => usageCount(b.id) - usageCount(a.id) || a.name.localeCompare(b.name, getLang()));
    listEl.replaceChildren(...list.map((e) => {
      const n = usageCount(e.id);
      const last = lastPerf(e.id);
      return h('button.pick-row', { onclick: () => { sh.close(); onPick(e.id); } },
        animBox(e.id, 'sm'),
        h('span.grow', null, h('b', null, e.name), h('span.muted.small', null, [e.short, e.groups.map((g) => GROUP_NAME[g]).join(', ')].join(' · ')),
          last ? h('span.small.ex-prev', null, `${t('Son: ')}${summarize(last.item, e.type)} · ${fmtDate(last.date)}`) : null),
        n ? h('span.count', null, `${n}×`) : null);
    }));
    if (!list.length) listEl.append(h('p.muted.center.pad', null, t('Bulunamadı. Aşağıdan yeni hareket oluşturabilirsin.')));
  }
  paint();
}

// ---------- Hareket detayı ve düzenleme ----------
function exerciseDetail(id) {
  const e = ex(id);
  const hist = exHistory(id);
  const rec = records(id);
  const last = hist[hist.length - 1];
  const body = h('div.ex-detail');
  body.append(h('div.anim-hero', null, animBox(id, 'lg')));
  body.append(h('div.center', null,
    h('h3.ex-name', null, e.name),
    h('p.muted', null, [e.short !== e.name && e.short, ...e.groups.map((g) => GROUP_NAME[g]), TYPES.find((ty) => ty.id === e.type)?.name].filter(Boolean).join(' · '))));
  if (e.tip) body.append(h('p.tip', null, icon('info'), e.tip));
  if (hist.length) {
    body.append(h('div.tiles', null,
      tile(t('Yapıldı'), t('{n} kez', { n: hist.length })),
      last ? tile(t('Son'), summarize(last.item, e.type), fmtDate(last.date)) : null,
      e.type === 'w' && rec.maxW ? tile(t('En ağır'), `${num(rec.maxW)} kg`, rec.wDate ? fmtDate(rec.wDate) : null) : null,
      e.type === 'w' && rec.e1 ? tile(t('Tahmini 1RM'), `${num(rec.e1, 1)} kg`) : null,
      e.type === 'bw' ? tile(t('En çok tekrar'), rec.maxR) : null));
    if (hist.length >= 2) {
      const chart = h('div.chart-host');
      body.append(h('h4.section-title', null, t(e.type === 'w' ? 'En ağır set (kg)' : 'Toplam tekrar')), chart);
      requestAnimationFrame(() => lineChart(chart, {
        data: hist.map((x) => ({ date: x.date, y: e.type === 'w' ? itemStats(x.item, 'w').maxW : itemStats(x.item, e.type).reps, s: summarize(x.item, e.type) })),
        height: 160, yFmt: (v) => num(v), tipFmt: (d) => `<b>${d.s}</b><span>${fmtDate(d.date, { year: true })}</span>`,
      }));
    }
    body.append(h('h4.section-title', null, t('Son kayıtlar')), h('div.hist-mini', null, hist.slice(-8).reverse().map((x) =>
      h('div.hist-row', null, h('span.muted', null, fmtDate(x.date, { year: true })), h('b', null, summarize(x.item, e.type)), x.item.note ? h('span.muted.small', null, x.item.note) : null))));
  } else body.append(h('p.muted.center', null, t('Bu hareketi henüz kaydetmedin.')));
  if (e.aliases?.length) body.append(h('p.muted.small', null, t('Diğer adları: ') + e.aliases.join(', ')));

  const sh = sheet({
    title: e.short, body,
    footer: h('div.row.gap', null,
      h('button.btn.grow', { onclick: () => { sh.close(); exerciseForm(id); } }, icon('edit'), t('Düzenle')),
      e.custom
        ? h('button.btn.ghost', { onclick: async () => {
          if (usageCount(id) && !(await confirmBox(t('Bu hareket antrenmanlarında kullanılıyor. Yine de silinsin mi? Eski kayıtlarda adı görünmez.'), { ok: t('Sil'), danger: true }))) return;
          deleteExercise(id); sh.close(); rerender(); toast(t('Hareket silindi'));
        } }, icon('trash'))
        : h('button.btn.ghost', { onclick: () => { saveExercise({ id, hidden: !e.hidden }); sh.close(); rerender(); toast(t(e.hidden ? 'Listede tekrar görünecek' : 'Seçim listesinden gizlendi')); } }, t(e.hidden ? 'Göster' : 'Gizle'))),
  });
}

function exerciseForm(id, { groups = [], onSaved } = {}) {
  const e = id ? ex(id) : null;
  const data = e
    ? { id: e.id, name: e.name, short: e.short, groups: e.groups.slice(), type: e.type, anim: e.anim, aliases: (e.aliases || []).join(', '), tip: e.tip || '' }
    : { name: '', short: '', groups: groups.slice(0, 2), type: 'w', anim: DEFAULT_ANIM[groups[0]] || 'dbCurl', aliases: '', tip: '' };
  let animTouched = !!e;
  const animGrid = h('div.anim-grid');
  const paintAnims = () => animGrid.replaceChildren(...ANIM_CHOICES.map(([key, tr, en]) => h('button.anim-choice' + (data.anim === key ? '.on' : ''), {
    type: 'button', 'aria-pressed': String(data.anim === key),
    onclick: () => { data.anim = key; animTouched = true; paintAnims(); },
  }, h('div.anim-box.sm', null, animSvg(key)), h('span', null, getLang() === 'en' ? en : tr))));
  paintAnims();
  const body = h('div.form',
    null,
    h('label.field', null, h('span', null, t('Hareket adı')), h('input.input', { value: data.name, placeholder: t('ör. Machine Chest Fly'), oninput: (ev) => { data.name = ev.target.value; } })),
    h('label.field', null, h('span', null, t('Kısaltma (notlardaki adı)')), h('input.input', { value: data.short, placeholder: t('ör. CF'), oninput: (ev) => { data.short = ev.target.value; } })),
    h('div.field', null, h('span', null, t('Bölgeler')), chips(GROUPS, data.groups, (v) => {
      data.groups = v;
      if (!animTouched && DEFAULT_ANIM[v[0]]) { data.anim = DEFAULT_ANIM[v[0]]; paintAnims(); }
    })),
    h('div.field', null, h('span', null, t('Kayıt türü')), segmented(TYPES, data.type, (v) => { data.type = v; })),
    h('div.field', null, h('span', null, t('Animasyon')), animGrid),
    h('label.field', null, h('span', null, t('Diğer adları (virgülle)')), h('input.input', { value: data.aliases, placeholder: t('ör. göğüs açış, fly'), oninput: (ev) => { data.aliases = ev.target.value; } })),
    h('label.field', null, h('span', null, t('İpucu')), h('textarea.input', { rows: 2, value: data.tip, placeholder: t('Kendine hatırlatma'), oninput: (ev) => { data.tip = ev.target.value; } })));
  const sh = sheet({
    title: t(e ? 'Hareketi düzenle' : 'Yeni hareket'), full: true, body,
    footer: h('div.row.gap', null,
      e?.builtin && h('button.btn.ghost', { onclick: () => { resetExercise(e.id); sh.close(); rerender(); toast(t('Varsayılana döndü')); } }, t('Varsayılan')),
      h('button.btn.primary.grow', { onclick: () => {
        if (!data.name.trim()) { toast(t('Hareket adını yaz')); return; }
        if (!data.groups.length) { toast(t('En az bir bölge seç')); return; }
        const saved = saveExercise({
          ...data, name: data.name.trim(), short: data.short.trim() || data.name.trim(),
          aliases: data.aliases.split(',').map((s) => s.trim()).filter(Boolean), tip: data.tip.trim(),
        });
        sh.close();
        toast(t(e ? 'Hareket güncellendi' : 'Hareket eklendi'));
        rerender();
        onSaved?.(saved);
      } }, t('Kaydet'))),
  });
}

// ---------- Geçmiş ----------
let histFilter = [];
function HistoryView() {
  const page = h('div.page');
  const all = sessions();
  page.append(pageHead(t('Geçmiş'), t('{n} antrenman', { n: all.length })));
  if (!all.length && !state.weighIns.length) {
    page.append(empty(t('Henüz kayıtlı antrenman yok.'), h('button.btn.primary', { onclick: () => importSheet() }, t('Eski notlarımı içe aktar'))));
    return page;
  }
  page.append(chips(GROUPS.filter((g) => all.some((s) => sessionGroups(s).includes(g.id))), histFilter, (v) => { histFilter = v; rerender(); }, { className: 'scroll-x' }));
  let list = all;
  if (histFilter.length) list = list.filter((s) => s.items.some((it) => ex(it.exId).groups.some((g) => histFilter.includes(g))));
  const entries = list.map((s) => ({ date: s.date, s }));
  if (!histFilter.length) {
    const dates = new Set(all.map((s) => s.date));
    for (const w of state.weighIns) if (!dates.has(w.date)) entries.push({ date: w.date, w });
    entries.sort((a, b) => b.date.localeCompare(a.date));
  }
  let month = '';
  let box = null;
  for (const en of entries) {
    const d = parseYmd(en.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== month) {
      month = key;
      const count = list.filter((s) => s.date.startsWith(en.date.slice(0, 7))).length;
      page.append(h('h2.month', null, `${monthName(d.getMonth())} ${d.getFullYear()}`, h('span.muted', null, t('{n} antrenman', { n: count }))));
      box = h('div.list');
      page.append(box);
    }
    box.append(en.s ? sessionCard(en.s) : h('div.row-card.weigh-row', null, icon('scale'), h('span.grow', null, fmtDate(en.date, { weekday: true })), h('b', null, `${num(en.w.kg)} kg`)));
  }
  return page;
}

function sessionCard(s) {
  const d = parseYmd(s.date);
  const prs = sessionPRs(s);
  const mood = moodOf(s.mood);
  const lines = s.items.slice(0, 7).map((it) => {
    const e = ex(it.exId);
    return h('div.line' + (it.skipped ? '.skipped' : ''), null,
      h('b', null, e.short, prs.some((p) => p.exId === it.exId) ? icon('trophy', 'pr-ic') : null),
      h('span', null, it.skipped ? t('pas') : summarize(it, e.type)));
  });
  if (s.items.length > 7) lines.push(h('div.muted.small', null, t('+{n} hareket', { n: s.items.length - 7 })));
  return h('button.session-card', { onclick: () => sessionDetail(s.id) },
    h('div.date-badge', null, h('b', null, d.getDate()), h('span', null, dayShort(d.getDay()))),
    h('div.grow', null,
      h('div.session-top', null,
        h('b', null, groupLabel(sessionGroups(s)) || t(s.items.length ? 'Antrenman' : 'Spor günü')),
        h('span.muted.small', null, [s.bodyWeight ? `${num(s.bodyWeight)} kg` : '', mood ? mood.e : ''].filter(Boolean).join(' '))),
      lines.length ? h('div.lines', null, lines) : null,
      s.note ? h('p.session-note', null, s.note) : null));
}

function sessionDetail(id) {
  const s = getSession(id);
  if (!s) return;
  const prs = sessionPRs(s);
  const mood = moodOf(s.mood);
  const body = h('div.detail');
  body.append(h('div.chips.static', null,
    sessionGroups(s).map((g) => h('span.chip.on', null, GROUP_NAME[g])),
    s.bodyWeight ? h('span.chip', null, `⚖ ${num(s.bodyWeight)} kg`) : null,
    mood ? h('span.chip', null, `${mood.e} ${t(mood.t)}`) : null));
  if (prs.length) body.append(h('div.prs', null, h('h3', null, icon('trophy'), t('Rekorlar')), prs.map((p) => h('div.pr-row', null, h('b', null, ex(p.exId).name), h('span', null, p.prev ? `${p.prev} → ${p.label}` : p.label)))));
  for (const it of s.items) {
    const e = ex(it.exId);
    body.append(h('div.detail-ex' + (it.skipped ? '.skipped' : ''), null,
      animBox(it.exId, 'sm'),
      h('div.grow', null,
        h('b', null, e.name, it.skipped ? h('span.tag', null, t('pas')) : null),
        h('div.detail-sets', null, it.sets.filter(hasValue).map((st, j) => h('span', null, `${j + 1}. ${setText(st, e.type)}`))),
        it.note ? h('p.muted.small', null, `“${it.note}”`) : null)));
  }
  if (s.note) body.append(h('p.session-note.big', null, s.note));
  const sh = sheet({
    title: fmtDate(s.date, { weekday: true, long: true, year: true }), body,
    footer: h('div.row.gap', null,
      h('button.btn.primary.grow', { onclick: () => { sh.close(); startFromSession(s); } }, icon('copy'), t('Kopyala, başlat')),
      h('button.btn', { onclick: () => { sh.close(); editSession(s.id); } }, icon('edit'), t('Düzenle')),
      h('button.icon-btn', { 'aria-label': t('Diğer'), onclick: () => menu(t('Antrenman'), [
        { label: t('Plan olarak kaydet'), icon: 'file', action: () => { sh.close(); planFromSession(s); } },
        { label: t('Metin olarak kopyala'), icon: 'copy', action: () => copyText(s) },
        { label: t('Sil'), icon: 'trash', danger: true, action: async () => {
          if (!(await confirmBox(t('Bu antrenman silinsin mi?'), { ok: t('Sil'), danger: true }))) return;
          deleteSession(s.id); sh.close(); rerender(); toast(t('Silindi'));
        } },
      ]) }, icon('more'))),
  });
}

function setText(st, type) {
  if (type === 'cardio') return [st.t != null ? `${num(st.t)} ${dk()}` : '', st.d != null ? `${num(st.d)} km` : ''].filter(Boolean).join(' · ');
  if (type === 'time') return `${st.t ?? '?'} ${sn()}`;
  const r = st.r == null ? '?' : st.x ? `${st.r}+${st.x}` : st.r;
  if (type === 'bw') return st.w ? `+${num(st.w)} kg × ${r}` : t('{r} tekrar', { r });
  return `${st.w != null ? num(st.w) + ' kg' : '?'} × ${r}`;
}

function copyText(s) {
  const d = parseYmd(s.date);
  const pad = (n) => String(n).padStart(2, '0');
  const lines = [`${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${String(d.getFullYear()).slice(2)}${s.bodyWeight ? ` (${num(s.bodyWeight)})` : ''}${s.note ? '  ' + s.note : ''}`];
  for (const it of s.items) {
    const e = ex(it.exId);
    lines.push(`${e.short.toLowerCase()} ${it.skipped ? (getLang() === 'en' ? 'skip' : 'pas') : summarize(it, e.type).replace(/ × /g, 'x')}${it.note ? '  ' + it.note : ''}`);
  }
  navigator.clipboard?.writeText(lines.join('\n')).then(() => toast(t('Panoya kopyalandı')), () => toast(t('Kopyalanamadı')));
}

function editSession(id) {
  const doc = clone(getSession(id));
  const sh = sheet({
    title: t('Antrenmanı düzenle'), full: true,
    body: Editor(doc, { mode: 'session' }),
    footer: h('div.row.gap', null,
      h('button.btn.ghost.grow', { onclick: () => sh.close() }, t('Vazgeç')),
      h('button.btn.primary.grow', { onclick: () => {
        const s = finalize(doc);
        if (!s.items.length && !s.bodyWeight) { toast(t('En az bir hareket olmalı')); return; }
        upsertSession(s); sh.close(); rerender(); toast(t('Kaydedildi'));
      } }, t('Kaydet'))),
  });
}

// ---------- Planlar ----------
function planFromSession(s) {
  const t = templateFromSession(s);
  editTemplate(t, true);
}

function editTemplate(plan, isNew = false) {
  const doc = clone(plan || { id: uid(), name: '', groups: [], items: [] });
  const sh = sheet({
    title: t(isNew || !plan ? 'Yeni plan' : 'Planı düzenle'), full: true,
    body: h('div', null, h('p.muted.small.pad-x', null, t('Planı başlattığında her hareket için son yaptığın ağırlıklar otomatik gelir; buradaki setler sadece hiç yapılmamış hareketler için kullanılır.')), Editor(doc, { mode: 'template' })),
    footer: h('div.row.gap', null,
      plan && !isNew ? h('button.btn.ghost', { onclick: async () => {
        if (!(await confirmBox(t('“{name}” planı silinsin mi?', { name: doc.name }), { ok: t('Sil'), danger: true }))) return;
        deleteTemplate(doc.id); sh.close(); rerender(); toast(t('Plan silindi'));
      } }, icon('trash')) : null,
      h('button.btn.primary.grow', { onclick: () => {
        if (!doc.name?.trim()) { toast(t('Plana bir ad ver')); return; }
        if (!doc.items.length) { toast(t('Plana hareket ekle')); return; }
        doc.name = doc.name.trim();
        doc.items = doc.items.map((it) => ({ exId: it.exId, sets: it.sets.map(cleanSet) }));
        upsertTemplate(doc); sh.close(); rerender(); toast(t('Plan kaydedildi'));
      } }, t('Planı kaydet'))),
  });
}

function planSuggestions({ afterImport = false } = {}) {
  const list = suggestPlans().filter((p) => !state.templates.some((tp) => similarItems(tp, p.session)));
  if (!list.length) { if (!afterImport) toast(t('Önerilecek yeni plan bulunamadı')); return; }
  const picks = list.map((p) => ({ ...p, on: true }));
  const body = h('div', null,
    h('p.muted', null, t(afterImport ? 'Notlarında sık tekrarlanan antrenmanları buldum. Plan olarak kaydedersen tek dokunuşla başlatabilirsin.' : 'Geçmişinde sık tekrarlanan antrenmanlar:')),
    h('div.list', null, picks.map((p) => {
      const name = h('input.input', { value: p.name, oninput: (e) => { p.name = e.target.value; } });
      return h('div.card.plan-pick', null,
        h('label.row.gap', null, h('input', { type: 'checkbox', checked: true, onchange: (e) => { p.on = e.target.checked; } }), name),
        h('p.muted.small', null, `${t('{n} kez', { n: p.count })} · ` + p.session.items.filter((i) => !i.skipped).map((i) => ex(i.exId).short).join(' · ')));
    })));
  const sh = sheet({
    title: t('Plan önerileri'), body,
    footer: h('div.row.gap', null,
      h('button.btn.ghost.grow', { onclick: () => sh.close() }, t('Şimdi değil')),
      h('button.btn.primary.grow', { onclick: () => {
        const chosen = picks.filter((p) => p.on);
        for (const p of chosen) upsertTemplate(templateFromSession(p.session, p.name.trim() || undefined));
        sh.close(); rerender();
        if (chosen.length) toast(t('{n} plan kaydedildi', { n: chosen.length }));
      } }, t('Seçilenleri kaydet'))),
  });
}

// ---------- Gelişim ----------
let weightRange = '6m';
let progEx = null;
let progMetric = 'w';
function ProgressView() {
  const page = h('div.page.progress');
  const all = sessions();
  page.append(pageHead(t('Gelişim'), t('Kilo, güç ve düzen')));
  if (!all.length && !state.weighIns.length) {
    page.append(empty(t('Grafikler için önce birkaç antrenman kaydet ya da eski notlarını içe aktar.'), h('button.btn.primary', { onclick: () => importSheet() }, t('Eski notlarımı içe aktar'))));
    return page;
  }
  const td = today();
  const year = td.slice(0, 4);
  const yearCount = all.filter((s) => s.date.startsWith(year)).length;
  const last12 = all.filter((s) => daysBetween(s.date, td) < 84).length;
  const thisMonth = all.filter((s) => s.date.startsWith(td.slice(0, 7))).length;
  const asc = all.slice().reverse();
  let gap = { days: 0 };
  for (let i = 1; i < asc.length; i++) {
    const g = daysBetween(asc[i - 1].date, asc[i].date);
    if (g > gap.days) gap = { days: g, from: asc[i - 1].date, to: asc[i].date };
  }
  const ws = weightSeries();
  const lw = ws[ws.length - 1];
  const ref = lw && [...ws].reverse().find((w) => daysBetween(w.date, lw.date) >= 28);
  const firstYear = ws.find((w) => w.date.startsWith(year));

  page.append(h('div.hero', null,
    h('span.muted', null, t('{year} yılında', { year })),
    h('b.hero-num', null, String(yearCount)),
    h('span', null, t('antrenman', { n: yearCount })),
    h('span.muted.small', null, t('Son 12 haftada haftalık ortalama {n}', { n: num(last12 / 12, 1) }))));

  page.append(h('div.tiles', null,
    tile(t('Bu ay'), thisMonth),
    tile(t('Son antrenman'), all[0] ? relDays(all[0].date) : '—'),
    lw ? tile(t('Güncel kilo'), `${num(lw.kg)} kg`, ref ? t('{d} kg son 1 ayda', { d: `${lw.kg - ref.kg >= 0 ? '+' : ''}${num(lw.kg - ref.kg, 1)}` }) : null) : null,
    lw && firstYear && firstYear !== lw ? tile(t('Yıl başından beri'), `${lw.kg - firstYear.kg >= 0 ? '+' : ''}${num(lw.kg - firstYear.kg, 1)} kg`, `${num(firstYear.kg)} → ${num(lw.kg)}`) : null,
    gap.days > 7 ? tile(t('En uzun ara'), t('{n} gün', { n: gap.days }), `${fmtDate(gap.from)} → ${fmtDate(gap.to)}`) : null));

  // Kilo grafiği
  if (ws.length) {
    const host = h('div.chart-host');
    const card = h('div.card', null,
      h('div.card-head', null, h('h2', null, t('Kilo')), segmented([{ id: '3m', name: t('3A') }, { id: '6m', name: t('6A') }, { id: '1y', name: t('1Y') }, { id: 'all', name: t('Tümü') }], weightRange, (v) => { weightRange = v; drawW(); })),
      host);
    const drawW = () => {
      const days = { '3m': 92, '6m': 183, '1y': 366, all: 99999 }[weightRange];
      const data = ws.filter((w) => daysBetween(w.date, td) <= days).map((w) => ({ date: w.date, y: w.kg }));
      lineChart(host, { data, yFmt: (v) => num(v, 1), unit: ' kg', goal: state.settings.goalWeight });
    };
    page.append(card);
    requestAnimationFrame(drawW);
  }

  // Takvim
  const from = all.length ? (all[all.length - 1].date < `${year}-01-01` ? addDays(td, -364) : `${year}-01-01`) : td;
  const daysMap = new Map();
  for (const s of all) {
    const prev = daysMap.get(s.date);
    const names = s.items.map((it) => ex(it.exId).short).join(', ');
    daysMap.set(s.date, { level: s.items.length ? 2 : 1, tip: `<b>${fmtDate(s.date, { weekday: true, year: true })}</b><span>${groupLabel(sessionGroups(s)) || t('Spor günü')}</span>${names ? `<span class="tip-small">${names}</span>` : ''}${prev ? `<span>${t('+1 antrenman')}</span>` : ''}` });
  }
  const heatHost = h('div.chart-host');
  page.append(h('div.card', null, h('div.card-head', null, h('h2', null, t('Spor takvimi')),
    h('span.legend', null, h('i.l2'), t('antrenman'), h('i.l1'), t('sadece kayıt'))), heatHost));
  requestAnimationFrame(() => heatmap(heatHost, { from, to: td, days: daysMap }));

  // Aylık sayılar
  const months = [];
  const start = parseYmd(from);
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= parseYmd(td); d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const n = all.filter((s) => s.date.startsWith(key)).length;
    months.push({ label: monthShort(d.getMonth()), value: n, tip: `<b>${t('{n} antrenman', { n })}</b><span>${monthName(d.getMonth())} ${d.getFullYear()}</span>` });
  }
  const monthHost = h('div.chart-host');
  page.append(h('div.card', null, h('div.card-head', null, h('h2', null, t('Aylık antrenman sayısı'))), monthHost));
  requestAnimationFrame(() => columnChart(monthHost, { data: months.slice(-12) }));

  // Hareket gelişimi
  const used = exercises().filter((e) => exHistory(e.id).length >= 2).sort((a, b) => usageCount(b.id) - usageCount(a.id));
  if (used.length) {
    if (!progEx || !used.some((e) => e.id === progEx)) progEx = (used.find((e) => e.type === 'w') || used[0]).id;
    const exHost = h('div.chart-host');
    const stats = h('div.ex-stats');
    const select = h('select.input', { 'aria-label': t('Hareket seç'), onchange: (e) => { progEx = e.target.value; progMetric = ex(progEx).type === 'w' ? 'w' : 'reps'; drawEx(); paintMetric(); } },
      used.map((e) => h('option', { value: e.id, selected: e.id === progEx }, `${e.name} (${exHistory(e.id).length})`)));
    const metricBox = h('div');
    const paintMetric = () => {
      const type = ex(progEx).type;
      const opts = (type === 'w' ? [{ id: 'w', name: 'En ağır' }, { id: 'e1', name: 'Tahmini 1RM' }, { id: 'vol', name: 'Hacim' }]
        : type === 'cardio' ? [{ id: 'time', name: 'Süre' }, { id: 'dist', name: 'Mesafe' }]
          : type === 'time' ? [{ id: 'time', name: 'Süre' }] : [{ id: 'reps', name: 'Toplam tekrar' }, { id: 'maxR', name: 'En çok tekrar' }])
        .map((o) => ({ ...o, name: t(o.name) }));
      if (!opts.some((o) => o.id === progMetric)) progMetric = opts[0].id;
      metricBox.replaceChildren(segmented(opts, progMetric, (v) => { progMetric = v; drawEx(); }));
    };
    const drawEx = () => {
      const e = ex(progEx);
      const hist = exHistory(progEx);
      const unit = { w: ' kg', e1: ' kg', vol: ' kg', time: ' ' + (e.type === 'cardio' ? dk() : sn()), dist: ' km', reps: '', maxR: '' }[progMetric];
      const data = hist.map((x) => {
        const st = itemStats(x.item, e.type);
        const key = { w: 'maxW', e1: 'e1', vol: 'vol', time: 'time', dist: 'dist', reps: 'reps', maxR: 'maxR' }[progMetric];
        return { date: x.date, y: Math.round(st[key] * 10) / 10, s: summarize(x.item, e.type) };
      }).filter((d) => d.y > 0);
      lineChart(exHost, { data, height: 180, yFmt: (v) => num(v, 1), tipFmt: (d) => `<b>${num(d.y, 1)}${unit}</b><span>${d.s}</span><span>${fmtDate(d.date, { year: true })}</span>` });
      const rec = records(progEx);
      const first = hist[0], last = hist[hist.length - 1];
      const fs = itemStats(first.item, e.type), ls = itemStats(last.item, e.type);
      stats.replaceChildren(
        e.type === 'w' ? tile(t('En ağır'), `${num(rec.maxW)} kg`, rec.wDate ? fmtDate(rec.wDate) : null) : tile(t('En çok tekrar'), rec.maxR),
        e.type === 'w' ? tile(t('Tahmini 1RM'), `${num(rec.e1, 1)} kg`) : tile(t('Kayıt'), t('{n} kez', { n: hist.length })),
        e.type === 'w' && fs.maxW ? tile(t('İlk → son'), `${num(fs.maxW)} → ${num(ls.maxW)}`, `${ls.maxW - fs.maxW >= 0 ? '+' : ''}${num(ls.maxW - fs.maxW)} kg`) : null);
    };
    page.append(h('div.card', null, h('div.card-head', null, h('h2', null, t('Hareket gelişimi'))), select, metricBox, exHost, stats));
    paintMetric();
    requestAnimationFrame(drawEx);
  }

  // Bölge dağılımı (son 30 gün)
  const counts = new Map();
  for (const s of all) {
    if (daysBetween(s.date, td) > 30) continue;
    for (const it of s.items) {
      if (it.skipped) continue;
      const g = ex(it.exId).groups[0];
      if (g) counts.set(g, (counts.get(g) || 0) + it.sets.length);
    }
  }
  const barHost = h('div');
  if (counts.size) {
    barList(barHost, { data: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g, n]) => ({ label: GROUP_NAME[g], value: n, display: t('{n} set', { n }) })) });
    page.append(h('div.card', null, h('div.card-head', null, h('h2', null, t('Bölge dağılımı')), h('span.muted.small', null, t('son 30 gün'))), barHost));
  }

  // Rekorlar
  const prs = exercises().filter((e) => e.type === 'w' && exHistory(e.id).length).map((e) => ({ e, r: records(e.id) }))
    .filter((x) => x.r.maxW).sort((a, b) => usageCount(b.e.id) - usageCount(a.e.id)).slice(0, 12);
  if (prs.length) {
    page.append(h('div.card', null, h('div.card-head', null, h('h2', null, t('Kişisel rekorlar'))),
      h('div.pr-table', null, prs.map(({ e, r }) => h('button.pr-line', { onclick: () => exerciseDetail(e.id) },
        h('span.grow', null, e.name), h('b', null, `${num(r.maxW)} kg`), h('span.muted.small', null, r.wDate ? fmtDate(r.wDate) : ''))))));
  }
  return page;
}

// ---------- Hareket kütüphanesi ve planlar ----------
let libGroup = '*';
let libQuery = '';
function LibraryView(sub) {
  const page = h('div.page');
  page.append(pageHead(t('Hareketler'), t('Kütüphane ve planlar')));
  page.append(segmented([{ id: '', name: t('Hareketler') }, { id: 'plans', name: t('Planlar') }], sub === 'plans' ? 'plans' : '', (v) => go(v ? '#/library/plans' : '#/library')));
  if (sub === 'plans') {
    page.append(h('div.row.gap.mt', null,
      h('button.btn.primary.grow', { onclick: () => editTemplate(null, true) }, icon('plus'), t('Yeni plan')),
      sessions().length ? h('button.btn.grow', { onclick: () => planSuggestions() }, icon('sparkle'), t('Geçmişten öner')) : null));
    if (!state.templates.length) page.append(empty(t('Henüz plan yok. Sık yaptığın antrenmanları plan olarak kaydedersen tek dokunuşla başlatırsın.')));
    page.append(h('div.list.mt', null, state.templates.map((p) => {
      const done = templateLastDone(p);
      return h('div.card.plan-card', null,
        h('div.row.gap', null, h('div.grow', null, h('b', null, p.name), h('div.muted.small', null, groupLabel(p.groups) + (done ? t(' · son {d}', { d: relDays(done) }) : ''))),
          h('button.icon-btn', { 'aria-label': t('Düzenle'), onclick: () => editTemplate(p) }, icon('edit'))),
        h('div.mini-anims', null, p.items.map((it) => animBox(it.exId, 'xs'))),
        h('p.muted.small', null, p.items.map((it) => ex(it.exId).short).join(' · ')),
        h('button.btn.primary.block', { onclick: () => startFromTemplate(p) }, icon('play'), t('Başla')));
    })));
    return page;
  }

  const listHost = h('div');
  const search = h('input.input', { type: 'search', placeholder: t('Hareket ara'), value: libQuery, oninput: (e) => { libQuery = e.target.value; paint(); } });
  page.append(h('div.row.gap.mt', null, search, h('button.btn.primary', { onclick: () => exerciseForm(null, { groups: libGroup === '*' ? [] : [libGroup] }) }, icon('plus'), t('Yeni'))));
  page.append(chips([{ id: '*', name: t('Tümü') }, ...GROUPS], [libGroup], (v) => { libGroup = v[0]; paint(); }, { multi: false, className: 'scroll-x' }));
  page.append(listHost);
  function paint() {
    const nq = norm(libQuery);
    let list = exercises();
    if (nq) list = list.filter((e) => [e.name, e.short, ...(e.aliases || [])].some((s) => norm(s).includes(nq)));
    const groups = libGroup === '*' ? GROUPS : GROUPS.filter((g) => g.id === libGroup);
    const out = [];
    for (const g of groups) {
      const items = list.filter((e) => !e.hidden && e.groups[0] === g.id).sort((a, b) => usageCount(b.id) - usageCount(a.id) || a.name.localeCompare(b.name, getLang()));
      if (!items.length) continue;
      out.push(h('h2.section-title', null, g.name), h('div.ex-grid', null, items.map(exTile)));
    }
    const hidden = list.filter((e) => e.hidden);
    if (hidden.length) out.push(h('details.hidden-ex', null, h('summary', null, t('Gizlenen hareketler ({n})', { n: hidden.length })), h('div.ex-grid', null, hidden.map(exTile))));
    if (!out.length) out.push(h('p.muted.center.pad', null, t('Bulunamadı.')));
    listHost.replaceChildren(...out);
  }
  paint();
  return page;
}

function exTile(e) {
  const n = usageCount(e.id);
  return h('button.ex-tile', { onclick: () => exerciseDetail(e.id) },
    animBox(e.id, 'md'),
    h('b', null, e.name),
    h('span.muted.small', null, e.short + (n ? ` · ${n}×` : '') + (e.custom ? t(' · senin') : '')));
}

// ---------- Ayarlar ----------
function SettingsView() {
  const page = h('div.page');
  page.append(pageHead(t('Ayarlar')));
  if (DEMO) page.append(demoBanner());
  const lb = state.settings.lastBackup;
  page.append(section(t('Veriler'),
    h('div.list', null,
      settingRow('file', t('Eski notlarımı içe aktar'), t('Telefondaki metin notlarını yapıştır, antrenmanlara çevireyim.'), () => importSheet()),
      settingRow('download', t('Yedeği indir'), lb ? t('Son yedek: {d}', { d: relDays(lb) }) : t('Henüz yedek alınmadı. Verilerin sadece bu cihazda.'), exportBackup),
      settingRow('upload', t('Yedekten geri yükle'), t('Daha önce indirdiğin .json dosyasını seç.'), importBackup),
      sessions().length ? settingRow('sparkle', t('Geçmişten plan öner'), t('Sık tekrarladığın antrenmanları plan yap.'), () => planSuggestions()) : null)));

  const goal = h('input.input.w-kg', { inputmode: 'decimal', value: state.settings.goalWeight ?? '', placeholder: 'kg', onchange: (e) => { state.settings.goalWeight = parseNum(e.target.value); commit(); toast(t('Hedef kaydedildi')); } });
  page.append(section(t('Tercihler'), h('div.card', null,
    h('div.field', null, h('span', null, getLang() === 'en' ? 'Language · Dil' : 'Dil · Language'),
      segmented([{ id: 'auto', name: t('Otomatik') }, { id: 'tr', name: 'Türkçe' }, { id: 'en', name: 'English' }], state.settings.lang || 'auto', (v) => {
        state.settings.lang = v;
        commit();
        setLang(v);
        buildNav();
        rerender();
      })),
    h('div.row.gap.between.mt', null, h('div', null, h('b', null, t('Hedef kilo')), h('p.muted.small', null, t('Kilo grafiğinde çizgi olarak görünür.'))), goal),
    h('div.field.mt', null, h('span', null, t('Tema')), segmented([{ id: 'auto', name: t('Otomatik') }, { id: 'dark', name: t('Koyu') }, { id: 'light', name: t('Açık') }], state.settings.theme, (v) => { state.settings.theme = v; commit(); applyTheme(); })))));

  page.append(section(t('Tehlikeli bölge'), h('div.list', null,
    settingRow('trash', t('Tüm verileri sil'), t('Antrenmanlar, planlar ve kendi hareketlerin silinir.'), async () => {
      if (!(await confirmBox(t('Tüm veriler silinsin mi? Bu geri alınamaz. Önce yedek almanı öneririm.'), { ok: t('Hepsini sil'), danger: true }))) return;
      replaceState({ settings: { lang: state.settings.lang, theme: state.settings.theme } });
      rerender();
      toast(t('Tüm veriler silindi'));
    }, true))));

  page.append(h('div.about', null,
    h('p', null, h('b', null, 'GymLog'), t(' · spor defteri')),
    h('p.muted.small', null, t('Veriler sadece bu cihazda (tarayıcıda) saklanır; hiçbir sunucuya gönderilmez. Telefonu değiştirmeden ya da tarayıcı verisini silmeden önce yedek al.')),
    h('p.small', null, h('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, icon('github'), 'GitHub'), ' · ', DEMO ? h('a', { href: './' }, t('Demodan çık')) : h('a', { href: '?demo' }, t('Demoyu aç')))));
  return page;
}

function settingRow(ic, title, desc, onclick, danger = false) {
  return h('button.setting-row' + (danger ? '.danger' : ''), { onclick }, icon(ic), h('span.grow', null, h('b', null, title), h('span.muted.small', null, desc)), icon('back', 'chev'));
}

function exportBackup() {
  const data = JSON.stringify({ app: 'gymlog', version: 1, exportedAt: new Date().toISOString(), data: { ...state, draft: state.draft } }, null, 1);
  const name = `gymlog-${t('yedek')}-${today()}.json`;
  const file = new File([data], name, { type: 'application/json' });
  const finish = () => { state.settings.lastBackup = today(); commit(); rerender(); };
  if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    navigator.share({ files: [file], title: t('GymLog yedeği') }).then(finish).catch(() => {});
    return;
  }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  finish();
  toast(t('Yedek indirildi'));
}

function importBackup() {
  const input = h('input', { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const data = json.data || json;
      if (!Array.isArray(data.sessions)) throw new Error('format');
      const ok = await confirmBox(t('Yedekte {n} antrenman var. Mevcut verilerin yerine yüklensin mi?', { n: data.sessions.length }), { ok: t('Geri yükle'), danger: true });
      if (!ok) return;
      replaceState(data);
      setLang(state.settings.lang);
      buildNav();
      applyTheme();
      rerender();
      toast(t('Yedek geri yüklendi'));
    } catch {
      toast(t('Bu dosya bir GymLog yedeği değil'));
    }
  });
  input.click();
}

// ---------- Eski notları içe aktarma ----------
function importSheet() {
  const area = h('textarea.input.mono', { rows: 12, placeholder: '02 01 26 (80.9)\nbarfix 5\nlpd 54 54 54 12 12 10+2\nsr 50x12 x3\nhammer 15x10 x3  ' + t('keyifsizim') + '\n\n05 01 26 (80.3)\ndp 22.5x12 x4\nd rise 7.5 x12 x5' });
  const sh = sheet({ title: t('Eski notlarımı içe aktar'), full: true });
  const step1 = () => {
    sh.setBody(h('div.form', null,
      h('p', null, t('Telefondaki not dosyanı olduğu gibi kopyalayıp aşağıya yapıştır. Tarih satırları ('), h('code', null, '02 01 26 (80.9)'), t(') yeni antrenman başlatır; altındaki satırlar hareket, ağırlık, tekrar ve set olarak okunur.')),
      h('ul.muted.small.help', null,
        h('li', null, h('code', null, '50x12 x3'), t(' → 50 kg, 12 tekrar, 3 set')),
        h('li', null, h('code', null, '68 68 73  10 10 7(+3)'), t(' → set set ağırlık ve tekrar, (+3) yardımlı tekrar')),
        h('li', null, h('code', null, '4x10 55 60 60 60'), t(' → 4 set 10 tekrar, ağırlıklar sırayla')),
        h('li', null, h('code', null, 'pass'), ', ', h('code', null, 'skip'), t(' → pas geçildi; diğer kelimeler not olur'))),
      area,
      h('p.muted.small', null, t('Hiçbir şey internete gönderilmez; okuma bu cihazda yapılır.'))));
    sh.setFooter(h('button.btn.primary.block', { onclick: () => {
      if (!area.value.trim()) { toast(t('Önce notlarını yapıştır')); return; }
      const parsed = parseNotes(area.value);
      if (!parsed.length) { toast(t('Tarih satırı bulunamadı (ör. 02 01 26)')); return; }
      step2(parsed);
    } }, t('Önizle')));
  };
  const step2 = (parsed) => {
    for (const p of parsed) if (p.suggest) { p.origDate = p.date; p.date = p.suggest; }
    const warn = parsed.filter((p) => p.origDate);
    const checks = parsed.reduce((a, p) => a + p.items.filter((it) => it.check).length, 0);
    const exCount = new Set(parsed.flatMap((p) => p.items.map((i) => i.exId))).size;
    let mode = state.sessions.length ? 'add' : 'replace';
    const body = h('div.form');
    body.append(h('div.tiles', null, tile(t('Antrenman sayısı'), parsed.length), tile(t('Hareket türü'), exCount), tile(t('Kilo kaydı'), parsed.filter((p) => p.bodyWeight).length)));
    if (warn.length) body.append(h('div.banner.warn', null, icon('info'), h('span', null, t('{n} tarih sıraya uymuyor (muhtemelen yazım hatası). Tahmini tarihleri yazdım, aşağıdan düzeltebilirsin.', { n: warn.length }))));
    if (checks) body.append(h('p.muted.small', null, t('⚠ işaretli {n} satırı kontrol etmek isteyebilirsin; içe aktardıktan sonra da düzenleyebilirsin.', { n: checks })));
    if (state.sessions.length) {
      body.append(h('div.field', null, h('span', null, t('Uygulamada zaten {n} antrenman var', { n: state.sessions.length })),
        segmented([{ id: 'add', name: t('Üstüne ekle') }, { id: 'replace', name: t('Yerine koy') }], mode, (v) => { mode = v; })));
    }
    body.append(h('div.list', null, parsed.slice().reverse().map((p) => {
      const dateIn = h('input.input.sm', { type: 'date', value: p.date, onchange: (e) => { p.date = e.target.value; } });
      return h('div.card.import-card' + (p.origDate ? '.warn' : ''), null,
        h('div.row.gap.between', null,
          p.origDate ? h('div.grow', null, dateIn, h('div.muted.small', null, t('Notta: {d}', { d: fmtDate(p.origDate, { year: true }) }))) : h('b.grow', null, fmtDate(p.date, { weekday: true, year: true })),
          p.bodyWeight ? h('span.chip', null, `${num(p.bodyWeight)} kg`) : null),
        p.items.length ? h('div.lines', null, p.items.map((it) => {
          const e = ex(it.exId);
          return h('div.line' + (it.skipped ? '.skipped' : ''), { title: it.raw }, h('b', null, e.short), h('span', null, it.skipped && !it.sets.length ? t('pas') : summarize(it, e.type) + (it.skipped ? t(' (pas)') : '')), it.check ? h('span.warn-ic', { title: t('Notta: {d}', { d: it.raw }) }, '⚠') : null, it.note ? h('span.muted.small', null, it.note) : null);
        })) : null,
        p.note ? h('p.session-note', null, p.note) : null);
    })));
    sh.setBody(body);
    sh.el.querySelector('.sheet-body').scrollTop = 0;
    sh.setFooter(h('div.row.gap', null,
      h('button.btn.ghost', { onclick: step1 }, t('Geri')),
      h('button.btn.primary.grow', { onclick: () => {
        const n = applyImport(parsed, mode);
        sh.close();
        go('#/history');
        toast(t('{n} antrenman içe aktarıldı', { n }));
        if (!state.templates.length) setTimeout(() => planSuggestions({ afterImport: true }), 400);
      } }, t('İçe aktar ({n})', { n: parsed.length }))));
  };
  step1();
}

function applyImport(parsed, mode) {
  const base = Date.now();
  const imported = parsed.map((p, i) => ({
    id: uid(), date: p.date, bodyWeight: p.bodyWeight || null,
    groups: [],
    items: p.items.map((it) => ({ exId: it.exId, sets: it.sets.map(cleanSet), note: it.note, skipped: it.skipped })),
    note: p.note || '', mood: null, createdAt: base + i, imported: true,
  }));
  for (const s of imported) s.groups = sessionGroups(s);
  if (mode === 'replace') {
    state.sessions = imported;
  } else {
    const key = (s) => s.date + '|' + s.items.map((i) => i.exId).join(',');
    const have = new Set(state.sessions.map(key));
    for (const s of imported) if (!have.has(key(s))) state.sessions.push(s);
  }
  commit();
  return imported.length;
}

// ---------- Başlat ----------
const VIEWS = { workout: WorkoutView, history: HistoryView, progress: ProgressView, library: LibraryView, settings: SettingsView };
if (!location.hash) history.replaceState(null, '', '#/workout');
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
