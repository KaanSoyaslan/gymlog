// ?demo adresi için uydurma örnek veri (gerçek verilerden bağımsız, sabit tohumlu).
import { addDays, parseYmd } from './format.js';
import { t } from './i18n.js';

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// [hareket, başlangıç kg, tekrar, set, birkaç haftada bir artış]
const PLANS = [
  { id: 'demo-push', name: 'Omuz + Triceps', groups: ['shoulders', 'triceps'], items: [
    ['db-shoulder-press', 20, 12, 4, 1.25], ['lateral-raise', 7.5, 12, 4, 0.5], ['incline-db-press', 20, 10, 3, 1.25], ['triceps-pushdown', 32.5, 12, 3, 1.25], ['single-arm-pushdown', 10, 12, 3, 0.75]] },
  { id: 'demo-pull', name: 'Sırt + Biceps', groups: ['back', 'biceps'], items: [
    ['pullup', null, 6, 2, 0], ['lat-pulldown', 50, 12, 3, 2.5], ['seated-row', 45, 12, 3, 2.5], ['rear-delt-machine', 35, 12, 3, 1.25], ['hammer-curl', 12.5, 10, 3, 0.75]] },
  { id: 'demo-legs', name: 'Bacak + Karın', groups: ['legs', 'core'], items: [
    ['squat', 50, 8, 4, 5], ['leg-press', 100, 12, 3, 5], ['leg-extension', 35, 12, 3, 2.5], ['leg-curl', 30, 12, 3, 1.25], ['crunch', null, 20, 3, 0]] },
];

export function demoState() {
  const r = rng(42);
  const sessions = [];
  let date = '2026-01-05';
  let bw = 84.2;
  let k = 0;
  const end = '2026-10-30';
  while (date <= end) {
    const inBreak = date >= '2026-07-20' && date <= '2026-08-09';
    if (!inBreak) {
      const plan = PLANS[k % 3];
      const weeks = Math.floor((parseYmd(date) - parseYmd('2026-01-05')) / (7 * 864e5));
      bw = Math.max(78.6, bw - 0.04 + (r() - 0.5) * 0.5);
      const items = plan.items.map(([exId, w, reps, sets, step]) => {
        const lvl = Math.floor(weeks / (5 + (exId.length % 3)));
        const weight = w == null ? null : Math.round((w + lvl * step) * 2) / 2;
        const out = [];
        for (let i = 0; i < sets; i++) {
          const tired = i === sets - 1 && r() < 0.35;
          out.push({ w: weight ?? undefined, r: w == null ? reps + Math.floor(weeks / 6) - (tired ? 1 : 0) : tired ? reps - 2 : reps, ...(tired && r() < 0.5 ? { x: 2 } : {}) });
        }
        return { exId, sets: out, note: '', skipped: r() < 0.03 };
      });
      sessions.push({
        id: 'demo-' + sessions.length, date, bodyWeight: Math.round(bw * 10) / 10, groups: plan.groups, items,
        note: r() < 0.12 ? t(['Enerjim yüksekti', 'Uykusuzdum, hafif geçti', 'Makine bozuktu, değiştirdim', 'Harika antrenman'][Math.floor(r() * 4)]) : '',
        mood: 3 + Math.floor(r() * 3), createdAt: sessions.length, duration: 44 + Math.floor(r() * 32),
      });
      k++;
    }
    date = addDays(date, r() < 0.55 ? 2 : r() < 0.8 ? 3 : 4);
  }
  return {
    v: 1, sessions,
    templates: PLANS.map((p) => ({ id: p.id, name: t(p.name), groups: p.groups, items: p.items.map(([exId, w, reps, sets]) => ({ exId, sets: Array.from({ length: sets }, () => ({ w: w ?? undefined, r: reps })) })) })),
    weighIns: [{ date: '2026-07-28', kg: 80.9 }, { date: '2026-08-04', kg: 80.6 }],
    customEx: [], exEdits: { 'rear-delt-machine': { setup: t('Koltuk 4, kollar 2. kademe') } }, draft: null,
    measurements: ['2026-01-10', '2026-03-07', '2026-05-09', '2026-07-04', '2026-09-05', '2026-10-24'].map((date, i) => ({
      date, waist: Math.round((91 - i * 1.1) * 10) / 10, chest: Math.round((100 + i * 0.5) * 10) / 10, arm: Math.round((34.5 + i * 0.35) * 10) / 10,
      thigh: Math.round((57 + i * 0.2) * 10) / 10, hip: Math.round((101 - i * 0.6) * 10) / 10,
    })),
    settings: { goalWeight: 78, theme: 'auto', lastBackup: null, weeklyGoal: 3 },
  };
}
