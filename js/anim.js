// Hareket animasyonları: açılarla tanımlanan basit bir çöp adam iskeleti.
// Her desen iki poz (A ve B) arasında gidip gelir; koşu ve bisiklet gibi olanlar döngüseldir (fn).
// Açılar derece: 0 = sağ, 90 = aşağı, -90 = yukarı (SVG koordinatları). Yan görünümde adam sağa bakar.
// Uzuv tanımı ya [üstAçı, altAçı] (ileri kinematik) ya da { t: [x, y], b: ±1 } (hedefe uzanan, ters kinematik).

const NS = 'http://www.w3.org/2000/svg';
const LEN = { torso: 26, neck: 9, ua: 14, fa: 13, th: 20, sh: 20, foot: 7 };
const RAD = Math.PI / 180;
const dir = (a, l) => [Math.cos(a * RAD) * l, Math.sin(a * RAD) * l];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
const rot = (v, a) => {
  const c = Math.cos(a * RAD), s = Math.sin(a * RAD);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};

function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.05);
  const base = Math.atan2(dy, dx);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = base + bend * Math.acos(Math.max(-1, Math.min(1, c)));
  const joint = [root[0] + Math.cos(a) * l1, root[1] + Math.sin(a) * l1];
  const b2 = Math.atan2(target[1] - joint[1], target[0] - joint[0]);
  return [joint, [joint[0] + Math.cos(b2) * l2, joint[1] + Math.sin(b2) * l2]];
}

function lerp(a, b, t) {
  if (typeof a === 'number') return typeof b === 'number' ? a + (b - a) * t : a;
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b?.[i], t));
  if (a && typeof a === 'object') {
    const o = {};
    for (const k in a) o[k] = b && k in b ? lerp(a[k], b[k], t) : a[k];
    return o;
  }
  return a;
}

function solve(p, view) {
  const top = view === 'top';
  const hip = p.hip;
  const neck = add(hip, dir(p.torso, top ? 0 : LEN.torso));
  const head = add(neck, dir(p.head ?? p.torso, top ? 0 : LEN.neck));
  let sL, sR, pL, pR;
  if (view === 'side') {
    sL = sR = [neck[0], neck[1] + (p.shY || 0)];
    pL = pR = hip;
  } else {
    const w = top ? 12 : 9;
    const px = dir(p.torso + 90, 1);
    const up = p.shY || 0;
    sL = [neck[0] - px[0] * w, neck[1] - px[1] * w + up];
    sR = [neck[0] + px[0] * w, neck[1] + px[1] * w + up];
    pL = [hip[0] - px[0] * 5, hip[1] - px[1] * 5];
    pR = [hip[0] + px[0] * 5, hip[1] + px[1] * 5];
  }
  const refs = { hip, neck, head };
  const limb = (root, spec, l1, l2, off = 0) => {
    if (Array.isArray(spec)) {
      const j = add(root, dir(spec[0] + off, l1));
      return [j, add(j, dir(spec[1] + off, l2))];
    }
    let t = spec.t;
    if (spec.rel) t = add(refs[spec.rel], spec.rot ? rot(spec.t, p.torso + 90) : spec.t);
    return ik(root, t, l1, l2, spec.b);
  };
  const armOff = p.armsRel ? p.torso + 90 : 0;
  const ua = p.ua ?? LEN.ua, fa = p.fa2 ?? LEN.fa, th = p.th ?? LEN.th, sh = p.shn ?? LEN.sh;
  const [eL, hL] = limb(sL, p.aL, ua, fa, armOff);
  const [eR, hR] = limb(sR, p.aR ?? p.aL, ua, fa, armOff);
  const out = { hip, neck, head, sL, sR, eL, eR, hL, hR, pL, pR, mid: mid(hL, hR), torso: p.torso };
  if (!top && p.lL) {
    [out.kL, out.fL] = limb(pL, p.lL, th, sh);
    [out.kR, out.fR] = limb(pR, p.lR ?? p.lL, th, sh);
    const front = view === 'front';
    out.tL = add(out.fL, dir(p.fa ?? (front ? 168 : 8), front ? 4 : LEN.foot));
    out.tR = add(out.fR, dir(p.faR ?? p.fa ?? (front ? 12 : 8), front ? 4 : LEN.foot));
  }
  return out;
}

// ---------- Sahne parçaları ----------
const GROUND = '<line class="sc" x1="6" y1="95" x2="94" y2="95"/>';
const BENCH = '<rect class="sc-fill" x="16" y="70" width="56" height="4" rx="1.5"/><line class="sc" x1="22" y1="74" x2="22" y2="95"/><line class="sc" x1="64" y1="74" x2="64" y2="95"/>';
const BENCH_LOW = '<rect class="sc-fill" x="28" y="75" width="28" height="4" rx="1.5"/><line class="sc" x1="32" y1="79" x2="32" y2="95"/><line class="sc" x1="52" y1="79" x2="52" y2="95"/>';
const SIDE_BENCH = '<rect class="sc-fill" x="64" y="73" width="28" height="4" rx="1.5"/><line class="sc" x1="68" y1="77" x2="68" y2="95"/><line class="sc" x1="88" y1="77" x2="88" y2="95"/>';
const PULLEY_TOP = '<line class="sc" x1="74" y1="2" x2="74" y2="95"/><circle class="sc" cx="70" cy="6" r="2.6"/>';
const PULLEY_LOW = '<line class="sc" x1="80" y1="40" x2="80" y2="95"/><circle class="sc" cx="76" cy="90" r="2.6"/>';
const POSTS = '<line class="sc" x1="6" y1="4" x2="6" y2="95"/><line class="sc" x1="94" y1="4" x2="94" y2="95"/>';
const SEAT_FRONT = '<rect class="sc-fill soft" x="39" y="33" width="22" height="37" rx="3"/><rect class="sc-fill" x="34" y="69" width="32" height="4" rx="1.5"/>';

const STAND = { hip: [48, 54], torso: -90, lL: [90, 90], lR: [90, 90] };
const FRONT_STAND = { hip: [50, 54], torso: -90, lL: [94, 92], lR: [86, 88] };
const FRONT_SEAT = { hip: [50, 68], torso: -90, th: 7, lL: [104, 93], lR: [76, 87] };

const curl = { view: 'side', hl: ['ua'], scene: GROUND, A: { ...STAND, aL: [92, 90] }, B: { aL: [84, -56] } };
const pushdown = {
  view: 'side', hl: ['ua'], scene: GROUND + PULLEY_TOP,
  A: { hip: [46, 54], torso: -82, aL: [100, -18], lL: [88, 90], lR: [96, 92] },
  B: { aL: [97, 88] },
};
const squat = {
  view: 'side', hl: ['th'], scene: GROUND,
  A: { hip: [50, 54], torso: -86, head: -86, armsRel: true, aL: [150, -45], lL: { t: [54, 94], b: -1 } },
  B: { hip: [37, 75], torso: -52, head: -40 },
};
const row = {
  view: 'side', hl: ['torso'], scene: GROUND,
  A: { hip: [42, 56], torso: -25, head: -15, aL: [90, 90], lL: { t: [50, 94], b: -1 } },
  B: { aL: [196, 100] },
};
const bench = {
  view: 'side', hl: ['torso'], scene: GROUND + BENCH,
  A: { hip: [60, 66], torso: 180, head: 182, aL: { t: [37, 56], b: 1 }, lL: { t: [80, 94], b: -1 } },
  B: { aL: { t: [35, 40], b: 1 } },
};
const fly = {
  view: 'top', hl: ['torso'],
  A: { hip: [50, 60], torso: -90, aL: [-178, -100], aR: [-2, -80] },
  B: { aL: [-110, -60], aR: [-70, -120] },
};

export const PATTERNS = {
  // Kollar
  dbCurl: { ...curl, gear: [{ t: 'dbEnd', at: 'hL' }] },
  hammerCurl: { ...curl, gear: [{ t: 'db', at: 'hL', rot: 'fa', add: 90 }] },
  barbellCurl: { ...curl, gear: [{ t: 'bb', at: 'hL', r: 7 }] },
  cableCurl: { ...curl, scene: GROUND + PULLEY_LOW, gear: [{ t: 'cable', from: [76, 90], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 'fa', add: 90 }] },
  preacher: {
    view: 'side', hl: ['ua'],
    scene: GROUND + '<line class="sc thick" x1="40" y1="52" x2="53" y2="62"/><line class="sc" x1="52" y1="62" x2="52" y2="70"/><rect class="sc-fill" x="28" y="74" width="20" height="4" rx="1.5"/><line class="sc" x1="38" y1="78" x2="38" y2="95"/>',
    A: { hip: [38, 72], torso: -88, aL: [40, 38], lL: [0, 92], lR: [0, 92] },
    B: { aL: [40, -80] }, gear: [{ t: 'bb', at: 'hL', r: 6 }],
  },
  pushdown: { ...pushdown, gear: [{ t: 'cable', from: [70, 6], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 'fa', add: 90, len: 7 }] },
  pushdownSingle: {
    ...pushdown, A: { ...pushdown.A, aR: [94, 92] },
    gear: [{ t: 'cable', from: [70, 6], to: 'hL', back: true }, { t: 'grip', at: 'hL' }],
  },
  overheadExt: {
    view: 'side', hl: ['ua'], scene: GROUND + BENCH_LOW,
    A: { hip: [42, 71], torso: -90, aL: [-98, 100], lL: [0, 92], lR: [4, 94] },
    B: { aL: [-98, 265] }, gear: [{ t: 'db', at: 'hL', rot: 90 }],
  },
  skullCrusher: {
    view: 'side', hl: ['ua'], scene: GROUND + BENCH,
    A: { hip: [60, 66], torso: 180, head: 182, aL: [-100, -95], lL: { t: [80, 94], b: -1 } },
    B: { aL: [-100, -190] }, gear: [{ t: 'bb', at: 'hL', r: 6 }],
  },
  kickback: {
    view: 'side', hl: ['ua'], scene: GROUND + SIDE_BENCH,
    A: { hip: [42, 56], torso: -22, head: -12, aL: [192, 90], aR: [70, 85], lL: { t: [50, 94], b: -1 }, lR: { t: [40, 94], b: -1 } },
    B: { aL: [192, 188] }, gear: [{ t: 'dbEnd', at: 'hL' }],
  },
  dips: {
    view: 'side', hl: ['ua', 'torso'],
    scene: GROUND + '<line class="sc thick" x1="34" y1="49" x2="68" y2="49"/><line class="sc" x1="38" y1="49" x2="38" y2="95"/><line class="sc" x1="64" y1="49" x2="64" y2="95"/>',
    A: { hip: [49, 48], torso: -88, head: -86, th: 18, shn: 17, aL: { t: [51, 47], b: 1 }, lL: [100, 150], lR: [96, 146] },
    B: { hip: [46, 61], torso: -74, head: -70 },
  },

  // Sırt
  pullup: {
    view: 'front', hl: ['torso'], period: 2800, scene: '<line class="sc thick" x1="14" y1="12" x2="86" y2="12"/>',
    A: { hip: [50, 62], torso: -90, th: 16, shn: 15, aL: { t: [29, 12], b: -1 }, aR: { t: [71, 12], b: 1 }, lL: [97, 104], lR: [83, 76] },
    B: { hip: [50, 41] },
  },
  chinup: {
    view: 'side', hl: ['torso', 'ua'], period: 2800, scene: '<line class="sc thick" x1="30" y1="12" x2="76" y2="12"/>',
    A: { hip: [48, 64], torso: -90, th: 16, shn: 15, aL: { t: [52, 12], b: 1 }, lL: [95, 120], lR: [92, 116] },
    B: { hip: [46, 42] },
  },
  latPulldown: {
    view: 'front', hl: ['torso'], scene: GROUND + '<circle class="sc" cx="50" cy="5" r="2.6"/><rect class="sc-fill" x="36" y="69" width="28" height="4" rx="1.5"/><line class="sc" x1="50" y1="73" x2="50" y2="95"/>',
    A: { ...FRONT_SEAT, aL: { t: [29, 16], b: -1 }, aR: { t: [71, 16], b: 1 } },
    B: { aL: { t: [30, 40], b: -1 }, aR: { t: [70, 40], b: 1 } },
    gear: [{ t: 'cable', from: [50, 5], to: 'mid', back: true }, { t: 'bar', from: 'hL', to: 'hR', ext: 6 }],
  },
  seatedRow: {
    view: 'side', hl: ['torso'],
    scene: GROUND + '<rect class="sc-fill" x="26" y="74" width="22" height="4" rx="1.5"/><line class="sc" x1="37" y1="78" x2="37" y2="95"/><line class="sc thick" x1="77" y1="76" x2="80" y2="92"/><line class="sc" x1="92" y1="40" x2="92" y2="95"/><circle class="sc" cx="89" cy="70" r="2.6"/>',
    A: { hip: [38, 70], torso: -66, head: -60, aL: { t: [76, 62], b: 1 }, lL: { t: [74, 84], b: -1 } },
    B: { torso: -96, head: -92, aL: { t: [47, 59], b: 1 } },
    gear: [{ t: 'cable', from: [89, 70], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 90 }],
  },
  barbellRow: { ...row, gear: [{ t: 'bb', at: 'hL' }] },
  dumbbellRow: {
    ...row, scene: GROUND + SIDE_BENCH,
    A: { hip: [40, 58], torso: -22, head: -12, aL: [90, 90], aR: [62, 82], lL: { t: [46, 94], b: -1 }, lR: { t: [36, 94], b: -1 } },
    gear: [{ t: 'dbEnd', at: 'hL' }],
  },
  straightArm: {
    view: 'side', hl: ['torso'], scene: GROUND + '<line class="sc" x1="84" y1="2" x2="84" y2="95"/><circle class="sc" cx="80" cy="7" r="2.6"/>',
    A: { hip: [44, 55], torso: -76, aL: [-32, -30], lL: [92, 90], lR: [92, 90] },
    B: { aL: [78, 80] },
    gear: [{ t: 'cable', from: [80, 7], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 90, len: 8 }],
  },
  deadlift: {
    view: 'side', hl: ['torso', 'th'], scene: GROUND,
    A: { hip: [37, 69], torso: -30, head: -22, aL: [90, 90], lL: { t: [54, 94], b: -1 } },
    B: { hip: [48, 54], torso: -88, head: -88 }, gear: [{ t: 'bb', at: 'hL' }],
  },
  hyperext: {
    view: 'side', hl: ['torso'],
    scene: GROUND + '<line class="sc thick" x1="54" y1="66" x2="62" y2="58"/><circle class="sc-fill" cx="88" cy="88" r="2.6"/><line class="sc" x1="62" y1="66" x2="90" y2="95"/>',
    A: { hip: [56, 58], torso: 120, head: 125, armsRel: true, aL: [30, -150], lL: [40, 40], fa: -50 },
    B: { torso: 218, head: 214 },
  },

  // Omuz
  dbPress: {
    view: 'front', hl: ['delt'], scene: GROUND + SEAT_FRONT,
    A: { ...FRONT_SEAT, aL: { t: [30, 33], b: -1 }, aR: { t: [70, 33], b: 1 } },
    B: { aL: { t: [43, 15], b: -1 }, aR: { t: [57, 15], b: 1 } },
    gear: [{ t: 'db', at: 'hL', rot: 0 }, { t: 'db', at: 'hR', rot: 0 }],
  },
  smithPress: {
    view: 'front', hl: ['delt'], scene: GROUND + SEAT_FRONT + '<line class="sc" x1="14" y1="2" x2="14" y2="95"/><line class="sc" x1="86" y1="2" x2="86" y2="95"/>',
    A: { ...FRONT_SEAT, aL: { t: [30, 33], b: -1 }, aR: { t: [70, 33], b: 1 } },
    B: { aL: { t: [43, 15], b: -1 }, aR: { t: [57, 15], b: 1 } },
    gear: [{ t: 'bar', from: 'hL', to: 'hR', ext: 11, plates: true }],
  },
  lateralRaise: {
    view: 'front', hl: ['delt'], scene: GROUND,
    A: { ...FRONT_STAND, aL: [100, 96], aR: [80, 84] }, B: { aL: [180, 174], aR: [0, 6] },
    gear: [{ t: 'dbEnd', at: 'hL' }, { t: 'dbEnd', at: 'hR' }],
  },
  cableLateral: {
    view: 'front', hl: ['delt'], scene: GROUND + '<line class="sc" x1="8" y1="40" x2="8" y2="95"/><circle class="sc" cx="12" cy="90" r="2.6"/>',
    A: { ...FRONT_STAND, aL: [110, 70], aR: [112, 118] }, B: { aR: [-4, 2] },
    gear: [{ t: 'cable', from: [12, 90], to: 'hR' }, { t: 'grip', at: 'hR' }],
  },
  frontRaise: { view: 'side', hl: ['delt'], scene: GROUND, A: { ...STAND, aL: [88, 86] }, B: { aL: [-4, -6] }, gear: [{ t: 'dbEnd', at: 'hL' }] },
  reverseFly: {
    view: 'top', hl: ['delt'], scene: '<rect class="sc-fill" x="42" y="6" width="16" height="10" rx="2"/><rect class="sc-fill soft" x="42" y="47" width="16" height="5" rx="2"/>',
    A: { hip: [50, 60], torso: -90, aL: [-82, -86], aR: [-98, -94] },
    B: { aL: [-176, -184], aR: [-4, 4] }, gear: [{ t: 'grip', at: 'hL' }, { t: 'grip', at: 'hR' }],
  },
  cableRearFly: {
    view: 'front', hl: ['delt'], scene: GROUND + POSTS,
    A: { ...FRONT_STAND, aL: [180, 178], aR: [0, 2], ua: -5, fa2: -6 }, B: { ua: 14, fa2: 13 },
    gear: [{ t: 'cable', from: [92, 22], to: 'hL' }, { t: 'cable', from: [8, 22], to: 'hR' }, { t: 'grip', at: 'hL' }, { t: 'grip', at: 'hR' }],
  },
  facePull: {
    view: 'side', hl: ['delt'], scene: GROUND + '<line class="sc" x1="94" y1="4" x2="94" y2="95"/><circle class="sc" cx="91" cy="26" r="2.6"/>',
    A: { ...STAND, aL: { t: [74, 26], b: -1 } }, B: { aL: { t: [52, 20], b: -1 } },
    gear: [{ t: 'cable', from: [91, 26], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 90, len: 7 }],
  },
  uprightRow: {
    view: 'front', hl: ['delt'], scene: GROUND,
    A: { ...FRONT_STAND, aL: { t: [42, 54], b: 1 }, aR: { t: [58, 54], b: -1 } },
    B: { aL: { t: [38, 33], b: 1 }, aR: { t: [62, 33], b: -1 } },
    gear: [{ t: 'bar', from: 'hL', to: 'hR', ext: 7 }],
  },
  shrug: {
    view: 'front', hl: ['delt'], scene: GROUND,
    A: { ...FRONT_STAND, aL: [92, 91], aR: [88, 89] }, B: { shY: -5 },
    gear: [{ t: 'dbEnd', at: 'hL' }, { t: 'dbEnd', at: 'hR' }],
  },

  // Göğüs
  benchPress: { ...bench, scene: GROUND + BENCH + '<line class="sc" x1="29" y1="70" x2="29" y2="30"/>', gear: [{ t: 'bb', at: 'hL' }] },
  dbBench: { ...bench, gear: [{ t: 'dbEnd', at: 'hL' }] },
  inclinePress: {
    view: 'side', hl: ['torso', 'delt'],
    scene: GROUND + '<line class="sc thick" x1="62" y1="74" x2="32" y2="52"/><rect class="sc-fill" x="54" y="72" width="16" height="4" rx="1.5"/><line class="sc" x1="60" y1="76" x2="60" y2="95"/>',
    A: { hip: [58, 69], torso: -145, head: -130, aL: { t: [44, 45], b: 1 }, lL: { t: [78, 94], b: -1 } },
    B: { aL: { t: [39, 28], b: 1 } }, gear: [{ t: 'dbEnd', at: 'hL' }],
  },
  chestPress: {
    view: 'side', hl: ['torso'],
    scene: GROUND + '<line class="sc thick" x1="31" y1="72" x2="27" y2="40"/><rect class="sc-fill" x="28" y="70" width="22" height="4" rx="1.5"/><line class="sc" x1="38" y1="74" x2="38" y2="95"/>',
    A: { hip: [36, 68], torso: -96, aL: { t: [49, 46], b: 1 }, lL: { t: [56, 94], b: -1 } },
    B: { aL: { t: [62, 45], b: 1 } }, gear: [{ t: 'handle', at: 'hL', rot: 90, len: 9 }],
  },
  pecDeck: { ...fly, scene: '<rect class="sc-fill" x="42" y="6" width="16" height="10" rx="2"/>', gear: [{ t: 'grip', at: 'hL' }, { t: 'grip', at: 'hR' }] },
  dbFly: {
    ...fly, scene: '<rect class="sc-fill soft" x="42" y="46" width="16" height="50" rx="3"/>',
    A: { hip: [50, 60], torso: -90, aL: [-176, -178], aR: [-4, -2] }, B: { aL: [-84, -88], aR: [-96, -92] },
    gear: [{ t: 'dbEnd', at: 'hL' }, { t: 'dbEnd', at: 'hR' }],
  },
  crossover: {
    view: 'front', hl: ['torso'], scene: GROUND + POSTS,
    A: { ...FRONT_STAND, aL: [200, 194], aR: [-20, -14] }, B: { aL: [70, 40], aR: [110, 140] },
    gear: [{ t: 'cable', from: [8, 10], to: 'hL' }, { t: 'cable', from: [92, 10], to: 'hR' }, { t: 'grip', at: 'hL' }, { t: 'grip', at: 'hR' }],
  },
  pushUp: {
    view: 'side', hl: ['torso', 'ua'], scene: GROUND,
    A: { hip: [44, 72], torso: -16, head: -12, aL: { t: [70, 94], b: 1 }, lL: { t: [8, 92], b: -1 }, fa: 100 },
    B: { hip: [44, 83], torso: -4, head: -2 },
  },

  // Bacak
  squat: { ...squat, gear: [{ t: 'bb', at: 'neck', off: [-6, 3], rel: true, r: 7 }] },
  gobletSquat: {
    ...squat, A: { ...squat.A, aL: [80, -40] }, B: { hip: [38, 75], torso: -64, head: -50 },
    gear: [{ t: 'db', at: 'hL', rot: 90 }],
  },
  legPress: {
    view: 'side', hl: ['th'],
    scene: '<line class="sc thick" x1="42" y1="77" x2="14" y2="51"/><line class="sc" x1="30" y1="80" x2="30" y2="95"/><line class="sc" x1="60" y1="60" x2="86" y2="34"/>' + GROUND,
    A: { hip: [38, 72], torso: -138, head: -125, aL: [62, 28], lL: { t: [53, 49], b: -1 }, fa: -50 },
    B: { lL: { t: [64, 38], b: -1 } }, gear: [{ t: 'plate', at: 'fL', ang: 45, len: 20 }],
  },
  legExt: {
    view: 'side', hl: ['th'],
    scene: GROUND + '<line class="sc thick" x1="34" y1="70" x2="29" y2="40"/><rect class="sc-fill" x="30" y="69" width="30" height="4" rx="1.5"/><line class="sc" x1="44" y1="73" x2="44" y2="95"/>',
    A: { hip: [40, 66], torso: -100, aL: [78, 18], lL: [0, 92], lR: [0, 92], fa: 0 },
    B: { lL: [0, 2], lR: [0, 2], fa: -80 }, gear: [{ t: 'pad', at: 'fL', side: -90 }],
  },
  legCurl: {
    view: 'side', hl: ['th'],
    scene: GROUND + '<rect class="sc-fill" x="14" y="65" width="58" height="4" rx="1.5"/><line class="sc" x1="20" y1="69" x2="20" y2="95"/><line class="sc" x1="66" y1="69" x2="66" y2="95"/>',
    A: { hip: [50, 61], torso: 180, head: 192, aL: [100, 150], lL: [0, 2], lR: [0, 2], fa: 90 },
    B: { lL: [0, -108], lR: [0, -108], fa: -20 }, gear: [{ t: 'pad', at: 'fL', side: -90 }],
  },
  rdl: {
    view: 'side', hl: ['th', 'torso'], scene: GROUND,
    A: { hip: [48, 54], torso: -88, head: -88, aL: [90, 90], lL: { t: [54, 94], b: -1 } },
    B: { hip: [40, 58], torso: -14, head: -5 }, gear: [{ t: 'bb', at: 'hL' }],
  },
  lunge: {
    view: 'side', hl: ['th'], scene: GROUND,
    A: { hip: [49, 56], torso: -90, aL: [90, 90], lL: { t: [66, 94], b: -1 }, lR: { t: [30, 93], b: -1 }, faR: 30 },
    B: { hip: [48, 72] }, gear: [{ t: 'dbEnd', at: 'hL' }],
  },
  hipThrust: {
    view: 'side', hl: ['th'],
    scene: GROUND + '<rect class="sc-fill" x="6" y="72" width="20" height="5" rx="1.5"/><line class="sc" x1="10" y1="77" x2="10" y2="95"/><line class="sc" x1="22" y1="77" x2="22" y2="95"/>',
    A: { hip: [44, 86], torso: 210, head: 214, aL: { t: [2, -6], rel: 'hip', b: 1 }, lL: { t: [66, 94], b: -1 } },
    B: { hip: [46, 72], torso: 184, head: 196 },
    gear: [{ t: 'bb', at: 'hip', off: [1, -7] }],
  },
  calfRaise: {
    view: 'side', hl: ['sh'],
    A: { hip: [50, 54], torso: -90, aL: [90, 90], lL: { t: [50, 92], b: -1 }, fa: 12 },
    B: { hip: [51, 46], lL: { t: [52, 85], b: -1 }, fa: 62 }, gear: [{ t: 'dbEnd', at: 'hL' }],
    scene: '<rect class="sc-fill" x="46" y="92" width="22" height="3" rx="1"/>' + GROUND,
  },

  // Karın
  crunch: {
    view: 'side', hl: ['torso'], scene: GROUND,
    A: { hip: [56, 88], torso: 182, head: 184, armsRel: true, aL: [-60, -170], lL: { t: [78, 93], b: -1 } },
    B: { torso: 214, head: 222 },
  },
  plank: {
    view: 'side', hl: ['torso'], scene: GROUND, period: 3200,
    A: { hip: [44, 83], torso: -6, head: -4, aL: [92, 0], lL: { t: [8, 92], b: -1 }, fa: 100 },
    B: { hip: [44, 81] },
  },
  legRaise: {
    view: 'side', hl: ['torso', 'th'], scene: '<line class="sc thick" x1="30" y1="4" x2="70" y2="4"/>',
    A: { hip: [50, 56], torso: -90, aL: { t: [50, 4], b: 1 }, lL: [88, 90], lR: [92, 92] },
    B: { lL: [-6, -4], lR: [-2, 0] },
  },
  cableCrunch: {
    view: 'side', hl: ['torso'], scene: GROUND + PULLEY_TOP,
    A: { hip: [44, 72], torso: -78, head: -70, aL: { t: [5, 3], rel: 'head', b: 1 }, lL: [88, 178], lR: [88, 178], fa: 180 },
    B: { torso: -18, head: 10 }, gear: [{ t: 'cable', from: [70, 6], to: 'hL', back: true }],
  },

  // Kardiyo
  run: {
    view: 'side', hl: ['th', 'sh'], period: 900,
    scene: '<line class="sc thick" x1="10" y1="96" x2="84" y2="96"/><line class="sc" x1="84" y1="96" x2="80" y2="46"/><line class="sc thick" x1="80" y1="46" x2="72" y2="45"/>',
    fn(p) {
      const a = p * 2 * Math.PI;
      const leg = (s, c) => { const th = 90 - 32 * s; return [th, th + 8 + 72 * Math.max(0, c)]; };
      const arm = (s) => { const u = 90 + 32 * s; return [u, u - 85]; };
      const s = Math.sin(a), c = Math.cos(a);
      return { hip: [46, 55 + 1.5 * Math.cos(2 * a)], torso: -80, head: -84, aL: arm(s), aR: arm(-s), lL: leg(s, c), lR: leg(-s, -c), fa: 10 };
    },
  },
  bike: {
    view: 'side', hl: ['th'], period: 1100,
    scene: GROUND + '<line class="sc thick" x1="35" y1="60" x2="48" y2="60"/><line class="sc" x1="42" y1="61" x2="56" y2="80"/><line class="sc" x1="56" y1="80" x2="73" y2="52"/><line class="sc thick" x1="69" y1="50" x2="77" y2="50"/><line class="sc" x1="56" y1="80" x2="56" y2="95"/><line class="sc thick" x1="30" y1="95" x2="84" y2="95"/>',
    fn(p) {
      const a = p * 2 * Math.PI;
      const f = (k) => ({ t: [56 + 8 * Math.cos(a + k), 80 + 8 * Math.sin(a + k)], b: -1 });
      return { hip: [42, 58], torso: -48, head: -30, aL: { t: [72, 50], b: 1 }, lL: f(0), lR: f(Math.PI), fa: 10 };
    },
    gear: [{ t: 'line', from: [56, 80], to: 'fR', back: true }, { t: 'line', from: [56, 80], to: 'fL' }],
  },
  rowMachine: {
    view: 'side', hl: ['torso', 'th'],
    scene: '<line class="sc thick" x1="8" y1="85" x2="80" y2="85"/><circle class="sc" cx="86" cy="72" r="8"/><line class="sc thick" x1="72" y1="78" x2="76" y2="90"/>' + GROUND,
    A: { hip: [44, 80], torso: -58, head: -55, aL: { t: [80, 66], b: 1 }, lL: { t: [72, 84], b: -1 }, fa: -60 },
    B: { hip: [32, 80], torso: -112, head: -100, aL: { t: [38, 64], b: 1 } },
    gear: [{ t: 'cable', from: [84, 70], to: 'hL', back: true }, { t: 'handle', at: 'hL', rot: 90 }],
  },
};

// Kendi hareketini eklerken seçilebilecek animasyonlar.
export const ANIM_CHOICES = [
  ['dbCurl', 'Dumbbell curl'], ['hammerCurl', 'Hammer curl'], ['barbellCurl', 'Bar curl'], ['cableCurl', 'Kablo curl'], ['preacher', 'Preacher'],
  ['pushdown', 'Kablo itiş'], ['pushdownSingle', 'Tek kol kablo'], ['overheadExt', 'Baş üstü uzatma'], ['skullCrusher', 'Skull crusher'], ['kickback', 'Kickback'], ['dips', 'Dips'],
  ['pullup', 'Barfiks'], ['chinup', 'Dar barfiks'], ['latPulldown', 'Pulldown'], ['seatedRow', 'Oturarak çekiş'], ['barbellRow', 'Bar row'], ['dumbbellRow', 'Dumbbell row'], ['straightArm', 'Düz kol çekiş'], ['deadlift', 'Deadlift'], ['hyperext', 'Bel ekstansiyonu'],
  ['dbPress', 'Omuz press'], ['smithPress', 'Smith press'], ['lateralRaise', 'Yana açış'], ['cableLateral', 'Kablo yana açış'], ['frontRaise', 'Önden kaldırış'], ['reverseFly', 'Arka omuz makine'], ['cableRearFly', 'Kablo arka omuz'], ['facePull', 'Face pull'], ['uprightRow', 'Upright row'], ['shrug', 'Shrug'],
  ['benchPress', 'Bench press'], ['dbBench', 'Dumbbell bench'], ['inclinePress', 'Incline press'], ['chestPress', 'Göğüs makinesi'], ['pecDeck', 'Pec deck'], ['dbFly', 'Dumbbell fly'], ['crossover', 'Crossover'], ['pushUp', 'Şınav'],
  ['squat', 'Squat'], ['gobletSquat', 'Goblet squat'], ['legPress', 'Leg press'], ['legExt', 'Leg extension'], ['legCurl', 'Leg curl'], ['rdl', 'RDL'], ['lunge', 'Lunge'], ['hipThrust', 'Hip thrust'], ['calfRaise', 'Calf raise'],
  ['crunch', 'Crunch'], ['plank', 'Plank'], ['legRaise', 'Bacak kaldırma'], ['cableCrunch', 'Kablo crunch'],
  ['run', 'Koşu'], ['bike', 'Bisiklet'], ['rowMachine', 'Kürek'],
];

// B pozu yalnızca değişen alanları yazar; geri kalanı A'dan gelir.
for (const def of Object.values(PATTERNS)) if (def.A) def.B = { ...def.A, ...def.B };

// ---------- Çizim ----------
const svgEl = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};
const f = (n) => n.toFixed(2);
const setLine = (e, a, b) => {
  e.setAttribute('x1', f(a[0])); e.setAttribute('y1', f(a[1]));
  e.setAttribute('x2', f(b[0])); e.setAttribute('y2', f(b[1]));
};

function pointOf(P, key, o = {}) {
  let pt = Array.isArray(key) ? key : P[key];
  if (!pt) return [0, 0];
  if (o.off) pt = add(pt, o.rel ? rot(o.off, P.torso + 90) : o.off);
  return pt;
}

function gearNode(o) {
  const g = svgEl('g', { class: 'gear' });
  switch (o.t) {
    case 'db':
      g.innerHTML = '<line class="gl" x1="-5" y1="0" x2="5" y2="0"/><rect x="-8.5" y="-4.5" width="3.8" height="9" rx="1"/><rect x="4.7" y="-4.5" width="3.8" height="9" rx="1"/>';
      break;
    case 'dbEnd':
      g.innerHTML = '<rect x="-3.6" y="-3.6" width="7.2" height="7.2" rx="1.8"/>';
      break;
    case 'bb':
      g.innerHTML = `<circle class="plate" r="${o.r || 8}"/><circle class="hub" r="1.6"/>`;
      break;
    case 'grip':
      g.innerHTML = '<circle r="2.4"/>';
      break;
    case 'pad':
      g.innerHTML = '<circle r="3.4"/>';
      break;
    case 'handle':
      g.innerHTML = `<line class="gl thick" x1="${-(o.len || 6) / 2}" y1="0" x2="${(o.len || 6) / 2}" y2="0"/>`;
      break;
    case 'plate':
      g.innerHTML = `<line class="gl plate-line" x1="${-(o.len || 20) / 2}" y1="0" x2="${(o.len || 20) / 2}" y2="0"/>`;
      break;
    default: {
      const line = svgEl('line', { class: o.t === 'cable' ? 'cable' : 'gl' });
      g.append(line);
      if (o.t === 'bar' && o.plates) {
        g.append(svgEl('rect', { class: 'p1', width: 3.6, height: 13, rx: 1 }), svgEl('rect', { class: 'p2', width: 3.6, height: 13, rx: 1 }));
      }
    }
  }
  return g;
}

function updateGear(g, o, P) {
  if (o.t === 'cable' || o.t === 'line') {
    setLine(g.firstChild, pointOf(P, o.from), pointOf(P, o.to, o));
    return;
  }
  if (o.t === 'bar') {
    const a = P[o.from], b = P[o.to];
    const ang = angle(a, b), ext = o.ext || 6;
    const a2 = add(a, dir(ang + 180, ext)), b2 = add(b, dir(ang, ext));
    setLine(g.firstChild, a2, b2);
    if (o.plates) {
      const [p1, p2] = g.querySelectorAll('rect');
      const pa = add(a, dir(ang + 180, ext - 2)), pb = add(b, dir(ang, ext - 2));
      p1.setAttribute('transform', `translate(${f(pa[0])} ${f(pa[1])}) rotate(${f(ang)}) translate(-1.8 -6.5)`);
      p2.setAttribute('transform', `translate(${f(pb[0])} ${f(pb[1])}) rotate(${f(ang)}) translate(-1.8 -6.5)`);
    }
    return;
  }
  let at = pointOf(P, o.at, o);
  let r = typeof o.rot === 'number' ? o.rot : 0;
  if (o.rot === 'fa') {
    const side = o.at.endsWith('R') ? 'R' : 'L';
    r = angle(P['e' + side], P['h' + side]) + (o.add || 0);
  }
  if (o.t === 'pad' && o.side != null) {
    const side = o.at.endsWith('R') ? 'R' : 'L';
    at = add(at, dir(angle(P['k' + side], P['f' + side]) + o.side, 3.6));
  }
  if (o.t === 'plate') r = o.ang;
  g.setAttribute('transform', `translate(${f(at[0])} ${f(at[1])}) rotate(${f(r)})`);
}

function build(def) {
  const view = def.view || 'side';
  const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'anim', 'aria-hidden': 'true' });
  const hl = new Set(def.hl || []);
  if (def.scene) {
    const sc = svgEl('g', { class: 'scene' });
    sc.innerHTML = def.scene;
    svg.append(sc);
  }
  const gears = (def.gear || []).map((o) => ({ o, g: gearNode(o) }));
  for (const x of gears) if (x.o.back) svg.append(x.g);

  const seg = (cls, key) => svgEl('line', { class: `seg ${cls}${hl.has(key) ? ' hl' : ''}` });
  const side = view === 'side';
  const far = svgEl('g', { class: side ? 'far' : '' });
  const parts = {
    uaR: seg('limb', 'ua'), faR: seg('limb', 'fa'), thR: seg('limb', 'th'), shR: seg('limb', 'sh'), toeR: seg('toe', 'sh'),
    uaL: seg('limb', 'ua'), faL: seg('limb', 'fa'), thL: seg('limb', 'th'), shL: seg('limb', 'sh'), toeL: seg('toe', 'sh'),
  };
  const hasLegs = view !== 'top' && (def.A?.lL || def.fn);
  if (hasLegs) far.append(parts.thR, parts.shR, parts.toeR);
  far.append(parts.uaR, parts.faR);
  svg.append(far);

  let torso;
  if (side) torso = svgEl('line', { class: `seg torso${hl.has('torso') ? ' hl' : ''}` });
  else if (view === 'front') torso = svgEl('polygon', { class: `body${hl.has('torso') ? ' hl' : ''}` });
  else torso = svgEl('line', { class: `seg shoulders${hl.has('torso') ? ' hl' : ''}` });
  svg.append(torso);
  const delts = hl.has('delt') ? [svgEl('circle', { class: 'delt', r: 4.3 }), svgEl('circle', { class: 'delt', r: 4.3 })] : [];
  const head = svgEl('circle', { class: 'head', r: view === 'top' ? 7 : 6 });
  if (hasLegs) svg.append(parts.thL, parts.shL, parts.toeL);
  if (side) svg.append(head, ...delts.slice(0, 1));
  else svg.append(...delts, head);
  svg.append(parts.uaL, parts.faL);
  for (const x of gears) if (!x.o.back) svg.append(x.g);

  const render = (P) => {
    setLine(parts.uaL, P.sL, P.eL); setLine(parts.faL, P.eL, P.hL);
    setLine(parts.uaR, P.sR, P.eR); setLine(parts.faR, P.eR, P.hR);
    if (hasLegs) {
      setLine(parts.thL, P.pL, P.kL); setLine(parts.shL, P.kL, P.fL); setLine(parts.toeL, P.fL, P.tL);
      setLine(parts.thR, P.pR, P.kR); setLine(parts.shR, P.kR, P.fR); setLine(parts.toeR, P.fR, P.tR);
    }
    if (side) setLine(torso, P.hip, P.neck);
    else if (view === 'front') torso.setAttribute('points', [P.sL, P.sR, P.pR, P.pL].map((p) => `${f(p[0])},${f(p[1])}`).join(' '));
    else setLine(torso, P.sL, P.sR);
    head.setAttribute('cx', f(P.head[0])); head.setAttribute('cy', f(P.head[1]));
    if (delts.length) {
      delts[0].setAttribute('cx', f(P.sL[0])); delts[0].setAttribute('cy', f(P.sL[1]));
      delts[1].setAttribute('cx', f(P.sR[0])); delts[1].setAttribute('cy', f(P.sR[1]));
    }
    for (const x of gears) updateGear(x.g, x.o, P);
  };
  return { svg, render, view };
}

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
function poseAt(def, p) {
  if (def.fn) return def.fn(p);
  let s;
  if (p < 0.12) s = 0;
  else if (p < 0.5) s = ease((p - 0.12) / 0.38);
  else if (p < 0.62) s = 1;
  else s = 1 - ease((p - 0.62) / 0.38);
  return lerp(def.A, def.B, s);
}

// ---------- Oynatıcı: görünen animasyonları tek bir döngüde çalıştırır ----------
const live = new Set();
let raf = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const en of entries) if (en.target.__anim) en.target.__anim.visible = en.isIntersecting;
    kick();
  }, { rootMargin: '40px' })
  : null;

function kick() { if (!raf && live.size) raf = requestAnimationFrame(frame); }

function frame(now) {
  raf = 0;
  let any = false;
  for (const inst of live) {
    if (!inst.svg.isConnected) {
      if (inst.seen || now - inst.born > 3000) { live.delete(inst); io?.unobserve(inst.svg); }
      continue;
    }
    inst.seen = true;
    if (!inst.visible) continue;
    any = true;
    const per = inst.def.period || 2600;
    inst.draw(solve(poseAt(inst.def, (now / per) % 1), inst.view));
  }
  if (any) raf = requestAnimationFrame(frame);
}

// still: 0–1 arası bir anda durdurulmuş çizim (hareket azaltma tercihinde ve testlerde).
export function animSvg(key, { still = null } = {}) {
  const def = PATTERNS[key] || PATTERNS.dbCurl;
  const { svg, render, view } = build(def);
  render(solve(poseAt(def, still ?? (def.fn ? 0.1 : 0.5)), view));
  if (reduced.matches || still != null) return svg;
  const inst = { svg, def, view, draw: render, visible: !io, seen: false, born: performance.now() };
  svg.__anim = inst;
  live.add(inst);
  io?.observe(svg);
  kick();
  return svg;
}
