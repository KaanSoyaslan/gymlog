// Gelişim ekranının üstündeki kas gösterisi yapan karakter.
// Kasların boyutu son 12 haftadaki çalışmaya, rengi son 7 güne göre belirlenir. Karakter poz değiştirir, arkasını döner.
// Çizim tek bir simetrik iskeletten üretilir: sol taraf hesaplanır, sağ taraf onun aynasıdır.
// Boy, cinsiyet ve kilo bedeni; saç, şapka ve aksesuarlar görünümü belirler (herogear.js).
import { t } from './i18n.js';
import { h, icon, sheet, chips, segmented, toast } from './ui.js';
import { GROUP_NAME } from './exercises.js';
import { state, commit, groupSets, sessionsSince } from './store.js';
import { haptic } from './juice.js';
import { num, parseNum } from './format.js';
import { HAIRS, HATS, GLASSES, BEARDS, EXTRAS, SKINS, HAIR_COLORS, OUTFITS, CHAIN_SVG, BASE_LOOK, heroLook, headParts, applyLookVars } from './herogear.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 240, CX = 120, RAD = Math.PI / 180;
const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
const GROUND_Y = 262;

// Haftada 14 set "tam gelişmiş" sayılır; son 4 hafta daha ağırlıklı. Ara verilince kas küçülür.
export function muscleScores() {
  const last4 = groupSets(sessionsSince(28));
  const last12 = groupSets(sessionsSince(84));
  const week = groupSets(sessionsSince(7));
  const out = {};
  for (const g of [...MUSCLES, 'cardio']) {
    const recent = (last4.get(g) || 0) / 4;
    const older = ((last12.get(g) || 0) - (last4.get(g) || 0)) / 8;
    const weekly = recent * 0.6 + older * 0.4;
    const full = g === 'cardio' ? 3 : 14;
    out[g] = { size: Math.min(1, Math.sqrt(weekly / full)), fresh: Math.min(1, (week.get(g) || 0) / (g === 'cardio' ? 3 : 12)), weekly, week: Math.round(week.get(g) || 0) };
  }
  return out;
}

// Açılar sol kol için: 180 = dışa, 90 = aşağı, 270 = yukarı.
export const POSES = [
  { name: 'Çift biceps', view: 'front', ua: 190, fa: 288, flex: 1, lat: 0.75, chest: 0.9, trap: 2, th: 97, sh: 91, grin: 0.7 },
  { name: 'Lat açış', view: 'front', ua: 138, fa: 380, flex: 0.15, lat: 1.4, chest: 1, trap: 0, th: 99, sh: 92, grin: 0.3 },
  { name: 'En kaslı', view: 'front', ua: 112, fa: 352, flex: 0.55, lat: 0.9, chest: 1.3, trap: 6, th: 102, sh: 88, grin: 1 },
  { name: 'Karın ve bacak', view: 'front', ua: 232, fa: 350, flex: 0.3, lat: 0.8, chest: 0.7, trap: 0, th: 103, sh: 86, grin: 0.4 },
  { name: 'Arkadan çift biceps', view: 'back', ua: 190, fa: 288, flex: 1, lat: 1.1, chest: 0.9, trap: 2, th: 97, sh: 91, grin: 0 },
  { name: 'Arkadan lat açış', view: 'back', ua: 138, fa: 380, flex: 0.15, lat: 1.4, chest: 1, trap: 0, th: 99, sh: 92, grin: 0 },
];
const KEYS = ['ua', 'fa', 'flex', 'lat', 'chest', 'trap', 'th', 'sh', 'grin'];

const el = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};
const n1 = (v) => v.toFixed(1);
const dir = (a, l) => [Math.cos(a * RAD) * l, Math.sin(a * RAD) * l];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// İki daire arasında konik uzuv
function capsule(a, ra, b, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(ra - rb) + 0.01) {
    const big = ra > rb ? a : b, r = Math.max(ra, rb);
    return `M${n1(big[0] - r)} ${n1(big[1])}a${r} ${r} 0 1 0 ${n1(r * 2)} 0a${r} ${r} 0 1 0 ${n1(-r * 2)} 0Z`;
  }
  const th = Math.atan2(dy, dx), ph = Math.acos((ra - rb) / d);
  const pt = (c, r, ang) => [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)];
  const a1 = pt(a, ra, th + ph), b1 = pt(b, rb, th + ph), b2 = pt(b, rb, th - ph), a2 = pt(a, ra, th - ph);
  const bigB = 2 * ph > Math.PI ? 1 : 0, bigA = 2 * Math.PI - 2 * ph > Math.PI ? 1 : 0;
  return `M${n1(a1[0])} ${n1(a1[1])}L${n1(b1[0])} ${n1(b1[1])}A${n1(rb)} ${n1(rb)} 0 ${bigB} 0 ${n1(b2[0])} ${n1(b2[1])}L${n1(a2[0])} ${n1(a2[1])}A${n1(ra)} ${n1(ra)} 0 ${bigA} 0 ${n1(a1[0])} ${n1(a1[1])}Z`;
}

export function buildFigure(scores, look = BASE_LOOK) {
  const svg = el('svg', { viewBox: `0 -34 ${W} 306`, class: 'hero-svg', role: 'img' });
  applyLookVars(svg, look);
  svg.append(el('ellipse', { class: 'hero-floor', cx: CX, cy: GROUND_Y + 2, rx: 72, ry: 8 }));
  const root = el('g');
  svg.append(root);
  const has = (x) => look.extras.includes(x);
  const parts = headParts(look);
  const markup = (html, cls) => {
    const g = el('g', cls ? { class: cls } : {});
    g.innerHTML = html;
    return g;
  };

  const paint = (e, g) => {
    const s = scores[g];
    e.dataset.g = g;
    e.style.fill = `color-mix(in srgb, var(--accent) ${s.week ? Math.round(30 + 70 * s.fresh) : 0}%, var(--hero-0))`;
  };
  // Aynalı katman: sol ve sağ grup aynı öğeleri taşır
  const sideLayer = (host = root) => {
    const pair = [el('g'), el('g', { transform: `translate(${W} 0) scale(-1 1)` })];
    host.append(...pair);
    return pair;
  };
  const both = (pair, tag, cls, g) => pair.map((host) => {
    const e = el(tag, { class: cls });
    if (g) paint(e, g);
    host.append(e);
    return e;
  });
  const setAll = (list, attrs) => { for (const e of list) for (const k in attrs) e.setAttribute(k, attrs[k]); };
  const ell = (list, c, rx, ry, rot) => setAll(list, { cx: n1(c[0]), cy: n1(c[1]), rx: n1(rx), ry: n1(ry), transform: `rotate(${n1(rot)} ${n1(c[0])} ${n1(c[1])})` });

  const cape = has('cape') ? el('path', { class: 'hero-cape' }) : null;
  if (cape) root.append(cape);

  const latL = sideLayer();
  const lats = both(latL, 'path', 'm', 'back');
  const hairBehind = markup(parts.behind, 'hero-hairs');
  root.append(hairBehind);

  const legL = sideLayer();
  const calfB = both(legL, 'path', 'b'), thighB = both(legL, 'path', 'b'), footB = both(legL, 'ellipse', 'b');
  const quadO = both(legL, 'ellipse', 'm', 'legs'), quadI = both(legL, 'ellipse', 'm', 'legs'), calfM = both(legL, 'ellipse', 'm', 'legs');
  const kneeBand = has('knee') ? both(legL, 'ellipse', 'hero-band') : null;

  const torso = el('path', { class: 'b' });
  const trunks = el('path', { class: 'hero-trunks' });
  root.append(torso, trunks);

  // Önden görünen kaslar. Kadın karakterde göğüs kası spor üstünün içinde kalır.
  const front = el('g');
  root.append(front);
  const topF = look.fem >= 0.75 ? el('path', { class: 'hero-trunks' }) : null;
  if (topF) front.append(topF);
  const frontL = sideLayer(front);
  const trapF = both(frontL, 'path', 'm', 'back');
  const pecs = both(frontL, 'ellipse', 'm', 'chest');
  const abs = [0, 1, 2].map(() => both(frontL, 'rect', 'm', 'core'));
  const heart = el('path', { class: 'hero-heart', d: 'M0 -2C-3 -6 -8 -3 -6 1L0 7L6 1C8 -3 3 -6 0 -2Z' });
  if (scores.cardio.weekly > 0) front.append(heart);

  // Arkadan görünen kaslar
  const back = el('g');
  root.append(back);
  const trapB = el('path', { class: 'm' });
  paint(trapB, 'back');
  back.append(trapB);
  const backL = sideLayer(back);
  const upper = both(backL, 'ellipse', 'm', 'back'), lower = both(backL, 'ellipse', 'm', 'back');
  const spine = el('rect', { class: 'm', rx: 3 });
  paint(spine, 'back');
  back.append(spine);
  const topB = look.fem >= 0.75 ? el('rect', { class: 'hero-trunks', rx: 3 }) : null;
  if (topB) back.append(topB);

  const belt = has('belt') ? el('rect', { class: 'hero-belt', rx: 3 }) : null;
  const buckle = has('belt') ? el('rect', { class: 'hero-buckle', rx: 3 }) : null;
  if (belt) root.append(belt, buckle);

  const neck = el('path', { class: 'b' });
  root.append(neck);
  const chain = has('chain') ? markup(CHAIN_SVG) : null;
  if (chain) root.append(chain);

  const armL = sideLayer();
  const uaB = both(armL, 'path', 'b'), faB = both(armL, 'path', 'b');
  const tri = both(armL, 'ellipse', 'm', 'triceps'), delt = both(armL, 'ellipse', 'm', 'shoulders'), bi = both(armL, 'ellipse', 'm', 'biceps');
  const wristBand = has('wrist') ? both(armL, 'ellipse', 'hero-band') : null;
  const fist = both(armL, 'circle', 'b');

  const headG = el('g');
  root.append(headG);
  const head = el('circle', { class: 'b', r: 14 + look.fat });
  const hairFront = markup(parts.hairFront, 'hero-hairs'), hairBack = markup(parts.hairBack, 'hero-hairs');
  const beard = markup(parts.beard, 'hero-hairs');
  const face = el('g', { class: 'hero-face' });
  const brows = [el('path', {}), el('path', {})];
  const mouth = el('ellipse', { class: 'mouth', cx: 0, cy: 6.5 });
  face.append(el('circle', { r: 1.9, cx: -5.5, cy: -1 }), el('circle', { r: 1.9, cx: 5.5, cy: -1 }), ...brows, mouth);
  const glasses = markup(parts.glasses);
  const phones = markup(parts.phones);
  const hatFront = markup(parts.hatFront), hatBack = markup(parts.hatBack);
  headG.append(head, hairFront, hairBack, beard, face, glasses, phones, hatFront, hatBack);
  const frontOnly = [front, hairBehind, hairFront, beard, face, glasses, hatFront, buckle, chain].filter(Boolean);
  const backOnly = [back, hairBack, hatBack];

  const { fem, leg, fat, lean } = look;
  let shown = null;
  const draw = (p, sz, y0, pulse, sx, view, beat) => {
    if (view !== shown) {
      shown = view;
      for (const e of frontOnly) e.style.display = view === 'front' ? '' : 'none';
      for (const e of backOnly) e.style.display = view === 'back' ? '' : 'none';
    }
    root.setAttribute('transform', `translate(${CX} 0) scale(${sx.toFixed(3)} 1) translate(${-CX} 0)`);
    const pump = 1 + 0.08 * pulse;
    const S = (g) => sz * scores[g].size;
    const up = 1 - 0.25 * fem; // kadın karakterde üst vücut kasları daha az hacimli
    const sCh = S('chest') * up, sBk = S('back') * up, sSh = S('shoulders') * up, sBi = S('biceps') * up, sTr = S('triceps') * up, sLg = S('legs'), sCo = S('core');
    const armK = 1 - 0.14 * fem;

    const sw = 31 + 6 * sSh + 4 * sBk - 6 * fem;
    const cw = 25 + 7 * sCh + 3 * sBk - 4.5 * fem;
    const wa = 19 + 2 * sCo - 1.5 * fem + 9 * fat - 1.5 * lean;
    const hw = 20 + 1.5 * sLg + 6 * fem + 3 * fat;
    // Boy: ayaklar yerde kalır, bacak uzadıkça üst vücut yükselir
    const shift = -101 * (leg - 1);
    const y = y0 + shift, hipY = 152 + shift, tr = p.trap;

    if (cape) {
      const w = (p.wave || 0) * 3;
      cape.setAttribute('d', `M${n1(CX - sw + 3)} ${n1(62 + y)}C${n1(CX - sw - 16)} ${n1(105 + y)} ${n1(CX - sw - 20 + w)} ${n1(160 + y)} ${n1(CX - sw - 26 + w)} ${n1(hipY + 58)}Q${CX} ${n1(hipY + 72 + w)} ${n1(CX + sw + 26 - w)} ${n1(hipY + 58)}C${n1(CX + sw + 20 - w)} ${n1(160 + y)} ${n1(CX + sw + 16)} ${n1(105 + y)} ${n1(CX + sw - 3)} ${n1(62 + y)}Z`);
    }

    // Gövde
    torso.setAttribute('d', `M${CX - 11} ${n1(54 + y)}Q${n1(CX - sw + 3)} ${n1(56 + y - tr * 0.6)} ${n1(CX - sw + 1)} ${n1(72 + y)}L${n1(CX - cw - 2)} ${n1(96 + y)}Q${n1(CX - wa - 1)} ${n1(118 + y)} ${n1(CX - wa)} ${n1(138 + y)}L${n1(CX - hw)} ${n1(hipY + 4)}L${n1(CX + hw)} ${n1(hipY + 4)}L${n1(CX + wa)} ${n1(138 + y)}Q${n1(CX + wa + 1)} ${n1(118 + y)} ${n1(CX + cw + 2)} ${n1(96 + y)}L${n1(CX + sw - 1)} ${n1(72 + y)}Q${n1(CX + sw - 3)} ${n1(56 + y - tr * 0.6)} ${CX + 11} ${n1(54 + y)}Z`);
    trunks.setAttribute('d', `M${n1(CX - hw - 1)} ${n1(hipY - 6)}L${n1(CX + hw + 1)} ${n1(hipY - 6)}L${n1(CX + hw + 8)} ${n1(hipY + 24)}L${CX + 4} ${n1(hipY + 26)}L${CX} ${n1(hipY + 16)}L${CX - 4} ${n1(hipY + 26)}L${n1(CX - hw - 8)} ${n1(hipY + 24)}Z`);
    neck.setAttribute('d', capsule([CX, 44 + y - tr * 0.5], 7 + 2 * sBk - 1.5 * fem, [CX, 60 + y], 9 + 3 * sBk - 2 * fem));
    if (chain) chain.setAttribute('transform', `translate(${CX} ${n1(62 + y - tr * 0.3)})`);
    if (belt) {
      setAll([belt], { x: n1(CX - wa - 3), y: n1(126 + y), width: n1(2 * wa + 6), height: 13 });
      setAll([buckle], { x: CX - 8, y: n1(124 + y), width: 16, height: 17 });
    }

    // Kanatlar (lat)
    const latOut = cw + 3 + (5 + 18 * sBk) * p.lat * pump;
    setAll(lats, { d: `M${n1(CX - sw + 5)} ${n1(78 + y)}Q${n1(CX - latOut)} ${n1(100 + y)} ${n1(CX - wa - 1)} ${n1(134 + y)}L${n1(CX - wa + 8)} ${n1(134 + y)}L${n1(CX - sw + 14)} ${n1(78 + y)}Z` });

    // Bacaklar
    const hip = [CX - hw + 8, hipY];
    const knee = add(hip, dir(p.th, 52 * leg));
    const ankle = add(knee, dir(p.sh, 50 * leg));
    setAll(thighB, { d: capsule(hip, 10 + 6 * sLg + 1.5 * fem + 2 * fat, knee, 7.5 + 1.5 * sLg) });
    setAll(calfB, { d: capsule(knee, 7 + 2 * sLg, ankle, 4.5 + 0.5 * sLg) });
    ell(footB, [ankle[0] - 3, ankle[1] + 4], 9.5, 4.8, 0);
    const out = dir(p.th + 90, 1);
    const q = mix(hip, knee, 0.5);
    ell(quadO, [q[0] + out[0] * (3 + 3.5 * sLg), q[1] + out[1] * (3 + 3.5 * sLg)], (5.5 + 6.5 * sLg) * pump, (19 + 3 * sLg) * leg, p.th - 90);
    const q2 = mix(hip, knee, 0.56);
    ell(quadI, [q2[0] - out[0] * (2.5 + 1.5 * sLg), q2[1] - out[1] * (2.5 + 1.5 * sLg)], (4.5 + 4 * sLg) * pump, (15 + 2 * sLg) * leg, p.th - 90);
    const c = mix(knee, ankle, 0.32);
    ell(calfM, [c[0] + (1.5 + 1.5 * sLg) * -1, c[1]], (4.5 + 4 * sLg) * pump, (12 + 2 * sLg) * leg, p.sh - 90);
    if (kneeBand) ell(kneeBand, knee, 8.5 + 2 * sLg, 6.5, p.th - 90);

    // Önden: göğüs, karın, trapez
    if (view === 'front') {
      setAll(trapF, { d: `M${CX - 6} ${n1(47 + y - tr)}Q${n1(CX - 13 - 3 * sBk)} ${n1(57 + y - tr * 0.5)} ${n1(CX - sw + 4)} ${n1(65 + y - tr * 0.5)}L${n1(CX - sw + 10)} ${n1(70 + y)}L${CX - 4} ${n1(68 + y)}Z` });
      if (topF) topF.setAttribute('d', `M${n1(CX - cw + 3)} ${n1(77 + y)}L${CX - 13} ${n1(58 + y)}L${CX - 7} ${n1(58 + y)}L${CX - 4} ${n1(72 + y)}L${CX + 4} ${n1(72 + y)}L${CX + 7} ${n1(58 + y)}L${CX + 13} ${n1(58 + y)}L${n1(CX + cw - 3)} ${n1(77 + y)}L${n1(CX + cw)} ${n1(101 + y)}Q${CX} ${n1(105 + y)} ${n1(CX - cw)} ${n1(101 + y)}Z`);
      const lerp = (a, b) => a + (b - a) * fem;
      const pc = [CX - cw * lerp(0.5, 0.46) - lerp(0.5, 0), lerp(84, 88) + y];
      ell(pecs, pc, (cw * lerp(0.5, 0.44) + lerp(1, 0) + p.chest * lerp(1, 0.6)) * pump, (lerp(9, 8) + lerp(4.5, 3.5) * sCh + p.chest * lerp(0.8, 0.4)) * pump, lerp(-6, -10));
      const aw = 8 + 2.5 * sCo, ah = 9;
      abs.forEach((row, i) => {
        setAll(row, { x: n1(CX - 1.2 - aw), y: n1(105 + i * (ah + 2) + y), width: n1(aw), height: ah, rx: 3 });
        for (const e of row) e.style.opacity = ((0.4 + 0.6 * sCo) * (1 - 0.65 * fat)).toFixed(2);
      });
      if (scores.cardio.weekly > 0) {
        const hs = (0.55 + 0.5 * S('cardio')) * beat;
        heart.setAttribute('transform', `translate(${CX + 13} ${n1(lerp(83, 86) + y)}) scale(${hs.toFixed(2)})`);
      }
    } else {
      // Arkadan: trapez, sırt, omurga
      const tw = 16 + 11 * sBk;
      trapB.setAttribute('d', `M${CX} ${n1(50 + y - tr)}L${n1(CX + tw)} ${n1(66 + y)}L${CX + 7} ${n1(104 + y)}L${CX - 7} ${n1(104 + y)}L${n1(CX - tw)} ${n1(66 + y)}Z`);
      ell(upper, [CX - cw * 0.58, 87 + y], (cw * 0.42) * pump, (11 + 4 * sBk) * pump, 12);
      ell(lower, [CX - wa * 0.62, 118 + y], wa * 0.5, 15 + 2 * sBk, 6);
      setAll([spine], { x: CX - 3, y: n1(106 + y), width: 6, height: 34 });
      if (topB) setAll([topB], { x: n1(CX - cw + 1), y: n1(88 + y), width: n1(2 * cw - 2), height: 8 });
    }

    // Kol
    const sh = [CX - sw, 72 + y - tr];
    const el_ = add(sh, dir(p.ua, 38));
    const hand = add(el_, dir(p.fa, 34));
    const big = Math.max(sBi, sTr);
    setAll(uaB, { d: capsule(sh, (9 + 3 * big) * armK, el_, (6.5 + 1.5 * big) * armK) });
    setAll(faB, { d: capsule(el_, (6.5 + 1.5 * sBi) * armK, hand, (4.5 + 0.5 * sBi) * armK) });
    setAll(fist, { cx: n1(hand[0]), cy: n1(hand[1]), r: n1(6.5 * armK) });
    if (wristBand) ell(wristBand, mix(el_, hand, 0.8), 3.6, (5 + 0.5 * sBi) * armK + 1.2, p.fa);
    const ux = dir(p.ua, 1), fx = dir(p.fa, 1);
    const side = ux[0] * fx[1] - ux[1] * fx[0] >= 0 ? 1 : -1;
    const nv = [-ux[1] * side, ux[0] * side];
    const bend = Math.min(1, Math.acos(Math.max(-1, Math.min(1, ux[0] * fx[0] + ux[1] * fx[1]))) / (150 * RAD));
    const peak = bend * p.flex;
    const bc = mix(sh, el_, 0.6);
    const lift = (3 + 2.5 * sBi + 4.5 * peak * (0.5 + sBi)) * armK;
    ell(bi, [bc[0] + nv[0] * lift, bc[1] + nv[1] * lift], (10 + 4.5 * sBi) * armK * (1 - 0.12 * peak) * pump, (5 + 4.5 * sBi) * armK * (1 + 0.5 * peak) * pump, p.ua);
    const tc = mix(sh, el_, 0.52), td = (2 + 3 * sTr) * armK;
    const trSize = (view === 'back' ? 1 : 0.82) * armK;
    ell(tri, [tc[0] - nv[0] * td, tc[1] - nv[1] * td], (12 + 4 * sTr) * trSize * pump, (4.5 + 4.5 * sTr) * trSize * pump, p.ua);
    const dc = add(sh, dir(p.ua, 2));
    ell(delt, dc, (10 + 4.5 * sSh) * armK * pump, (9 + 4 * sSh) * armK * pump, p.ua);

    // Baş: parçaları kendi merkezine göre çizili
    const headAt = `translate(${CX} ${n1(31 + y - tr * 0.7)})`;
    headG.setAttribute('transform', headAt);
    hairBehind.setAttribute('transform', headAt);
    if (view === 'front') {
      const fr = (1.2 + 1.4 * p.grin) * (1 - 0.45 * fem);
      brows[0].setAttribute('d', `M-9 ${n1(-5.5 - fr * 0.4)}L-2.5 ${n1(-5 + fr)}`);
      brows[1].setAttribute('d', `M9 ${n1(-5.5 - fr * 0.4)}L2.5 ${n1(-5 + fr)}`);
      setAll([mouth], { rx: n1(3.5 + 2.5 * p.grin), ry: n1(1 + 2 * p.grin) });
    }
  };
  return { svg, draw };
}

// Canlı karakter: poz değiştirir, nefes alır, gösterdiği an kasları şişer. refresh görünüm değişince yeniden çizer.
function makeStage(scores, { intro = true, poseEl = null, onMuscle = null, label = '' } = {}) {
  const wrap = h('div.hero-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cur = {};
  for (const k of KEYS) cur[k] = POSES[0][k];
  const created = performance.now(), born = intro ? created : -1e6;
  let fig = null, idx = 0, view = POSES[0].view, shownView = view;
  let raf = 0, visible = true, lastT = 0, poseT = 0, pulse = 0, seen = false, turn = 0, settled = false;
  const growth = (now) => 0.15 + 0.85 * (1 - (1 - Math.min(1, (now - born) / 1200)) ** 3);

  const setPose = (i) => {
    idx = (i + POSES.length) % POSES.length;
    view = POSES[idx].view;
    if (poseEl) poseEl.textContent = t(POSES[idx].name);
    poseT = 0;
    settled = false;
  };
  const still = () => {
    for (const k of KEYS) cur[k] = POSES[idx][k];
    shownView = view;
    fig.draw(cur, 1, 0, 0, 1, shownView, 1);
  };

  function frame(now) {
    raf = 0;
    if (!wrap.isConnected) {
      if (seen || now - created > 3000) return;
      raf = requestAnimationFrame(frame);
      return;
    }
    seen = true;
    if (!visible) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    poseT += dt;

    // Dönüş: ortasında ön ve arka görünüm değişir
    let sx = 1;
    if (view !== shownView || turn > 0) {
      turn = Math.min(1, turn + dt / 0.6);
      if (turn >= 0.5) shownView = view;
      sx = Math.max(0.04, Math.abs(Math.cos(turn * Math.PI)));
      if (turn >= 1) turn = 0;
    }
    const target = POSES[idx];
    const k = 1 - Math.exp(-dt * 6.5);
    let moving = 0;
    for (const key of KEYS) {
      const d = target[key] - cur[key];
      cur[key] += d * k;
      moving = Math.max(moving, Math.abs(d));
    }
    if (!settled && moving < 6) { settled = true; pulse = 1; }
    pulse = Math.max(0, pulse - dt * 1.6);
    if (poseT > 3.6) setPose(idx + 1);

    const breathe = Math.sin(now / 850);
    const beat = 1 + 0.18 * Math.max(0, Math.sin(now / 130)) * (Math.sin(now / 520) > 0 ? 1 : 0);
    const flexPulse = Math.sin(pulse * Math.PI);
    fig.draw({ ...cur, chest: cur.chest + breathe * 0.35, wave: Math.sin(now / 520) }, growth(now), breathe * 1.1 - flexPulse * 1.5, flexPulse, sx, shownView, beat);
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !reduced) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };

  const refresh = () => {
    fig = buildFigure(scores, heroLook());
    if (label) fig.svg.setAttribute('aria-label', label);
    wrap.replaceChildren(fig.svg);
    if (reduced) still();
    else fig.draw(cur, growth(performance.now()), 0, 0, 1, shownView, 1);
  };

  wrap.addEventListener('click', (e) => {
    const g = e.target.closest?.('[data-g]')?.dataset.g;
    if (g) onMuscle?.(g);
    haptic(12);
    setPose(idx + 1);
    if (reduced) still();
  });

  setPose(0);
  refresh();
  if (!reduced) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(wrap);
    }
    kick();
  }
  return { el: wrap, refresh };
}

export function heroCard() {
  const scores = muscleScores();
  const ranked = MUSCLES.map((g) => [g, scores[g].size]).sort((a, b) => b[1] - a[1]);
  const [best, worst] = [ranked[0], ranked[ranked.length - 1]];
  const summary = best[1] <= 0
    ? t('Son 12 haftada kayıt yok; çalıştıkça kasları büyür.')
    : best[1] - worst[1] > 0.12
      ? `${t('En gelişmiş: {g}', { g: GROUP_NAME[best[0]] })} · ${t('Geride kalan: {g}', { g: GROUP_NAME[worst[0]] })}`
      : t('Bölgeler dengeli, böyle devam.');
  const poseEl = h('b.hero-pose');
  const info = h('p.hero-info.small', null, summary);
  const stage = makeStage(scores, {
    poseEl,
    label: t('Kas gösterisi yapan karakter. {s}', { s: summary }),
    onMuscle: (g) => {
      const s = scores[g];
      info.textContent = `${GROUP_NAME[g]}: ${t('son 7 günde {n} set · haftada ortalama {m} set', { n: s.week, m: num(s.weekly, 1) })}`;
    },
  });
  const card = h('div.card.hero-card', null,
    h('button.icon-btn.hero-gear', {
      type: 'button', 'aria-label': t('Karakteri özelleştir'), title: t('Karakteri özelleştir'),
      onclick: () => heroEditor(() => card.replaceWith(heroCard())),
    }, icon('gear')),
    stage.el,
    h('div.hero-cap', null, poseEl, info,
      h('p.muted.hero-legend', null, t('Boyut son 12 haftaya, renk son 7 güne göre. Dokun: sıradaki poz.'))));
  return card;
}

// Boy ve cinsiyet: hem Ayarlar'da hem özelleştirme ekranında aynı alanlar kullanılır.
export function profileFields(onChange = () => {}) {
  const s = state.settings;
  const input = h('input.input.w-kg', {
    inputmode: 'numeric', value: s.height ?? '', placeholder: 'cm', 'aria-label': t('Boy (cm)'),
    onchange: (e) => {
      const v = parseNum(e.target.value);
      if (v != null && (v < 120 || v > 230)) {
        toast(t('120 ile 230 cm arasında bir boy yaz'));
        e.target.value = s.height ?? '';
        return;
      }
      s.height = v;
      commit();
      onChange();
    },
  });
  return h('div', null,
    h('div.row.gap.between', null,
      h('div', null, h('b', null, t('Boy')), h('p.muted.small', null, t('Karakterin boyunu belirler; kilonla birlikte yapısını da etkiler.'))),
      input),
    h('div.field.mt', null, h('span', null, t('Cinsiyet')),
      segmented([{ id: 'male', name: t('Erkek') }, { id: 'female', name: t('Kadın') }, { id: 'none', name: t('Belirtme') }], s.gender || 'none', (v) => {
        s.gender = v === 'none' ? null : v;
        commit();
        onChange();
      })));
}

function miniHead(look) {
  const svg = el('svg', { viewBox: '-30 -40 60 76', class: 'hero-svg hero-mini', 'aria-hidden': 'true' });
  applyLookVars(svg, look);
  const p = headParts(look);
  svg.innerHTML = `<g class="hero-hairs">${p.behind}</g><rect class="b" x="-7" y="8" width="14" height="30" rx="5"/><circle class="b" r="14"/><g class="hero-hairs">${p.hairFront}</g><g class="hero-hairs">${p.beard}</g>`
    + '<g class="hero-face"><circle r="1.9" cx="-5.5" cy="-1"/><circle r="1.9" cx="5.5" cy="-1"/><path d="M-9 -6L-2.5 -4M9 -6L2.5 -4"/><ellipse class="mouth" cy="6.5" rx="4" ry="1.4"/></g>'
    + `${p.glasses}${p.phones}${p.hatFront}`;
  return svg;
}

// Karakteri özelleştirme ekranı: üstte canlı önizleme, altta seçenekler.
export function heroEditor(onClose) {
  const poseEl = h('b.hero-pose');
  const stage = makeStage(muscleScores(), { intro: false, poseEl });
  const opts = h('div.hero-opts');
  const gear = () => (state.settings.hero = state.settings.hero || {});
  const changed = () => { stage.refresh(); paint(); };
  const set = (key, value) => {
    gear()[key] = value;
    commit();
    haptic(8);
    changed();
  };
  const block = (title, ...kids) => h('div.hero-opt', null, h('h4.section-title', null, t(title)), ...kids);
  // Küçük resim sadece o seçeneği gösterir; şapka saçın farkını örtmesin
  const bare = { hair: { hat: 'none', glasses: 'none', beard: 'none' }, glasses: { hat: 'none' }, beard: { hat: 'none', glasses: 'none' } };
  const tiles = (list, key, look) => h('div.opt-grid', null, list.map((o) => h('button.opt-tile' + (look[key] === o.id ? '.on' : ''), {
    type: 'button', 'aria-pressed': String(look[key] === o.id), onclick: () => set(key, o.id),
  }, miniHead({ ...look, extras: [], ...bare[key], [key]: o.id }), h('span', null, t(o.name)))));
  const dots = (list, key, look, themeColor) => h('div.opt-dots', null, list.map((o) => h('button.opt-dot' + (look[key] === o.id ? '.on' : ''), {
    type: 'button', 'aria-pressed': String(look[key] === o.id), 'aria-label': t(o.name), title: t(o.name),
    style: `background:${o.color || themeColor}`, onclick: () => set(key, o.id),
  })));
  function paint() {
    const look = heroLook();
    opts.replaceChildren(
      block('Beden', profileFields(changed)),
      block('Ten rengi', dots(SKINS, 'skin', look, 'var(--fig)')),
      block('Saç', tiles(HAIRS, 'hair', look)),
      block('Saç rengi', dots(HAIR_COLORS, 'hairColor', look, 'var(--scene)')),
      block('Şapka', tiles(HATS, 'hat', look)),
      block('Gözlük', tiles(GLASSES, 'glasses', look)),
      block('Sakal', tiles(BEARDS, 'beard', look)),
      block('Aksesuar', chips(EXTRAS.map((x) => ({ id: x.id, name: t(x.name) })), look.extras, (v) => set('extras', v))),
      block('Kıyafet rengi', dots(OUTFITS, 'outfit', look, 'var(--gear)')));
  }
  paint();
  const pick = (list) => list[Math.floor(Math.random() * list.length)].id;
  const sh = sheet({
    title: t('Karakteri özelleştir'), full: true, onClose,
    body: h('div', null, h('div.hero-edit-stage', null, stage.el, poseEl), opts),
    footer: h('div.row.gap', null,
      h('button.btn.ghost', { type: 'button', onclick: () => { state.settings.hero = {}; commit(); changed(); } }, t('Sıfırla')),
      h('button.btn.grow', { type: 'button', onclick: () => {
        state.settings.hero = {
          skin: pick(SKINS), hair: pick(HAIRS), hairColor: pick(HAIR_COLORS), hat: pick(HATS), glasses: pick(GLASSES), beard: pick(BEARDS), outfit: pick(OUTFITS),
          extras: EXTRAS.filter(() => Math.random() < 0.3).map((x) => x.id),
        };
        commit();
        haptic([10, 30, 10]);
        changed();
      } }, '🎲 ', t('Rastgele')),
      h('button.btn.primary.grow', { type: 'button', onclick: () => sh.close() }, t('Tamam'))),
  });
}
