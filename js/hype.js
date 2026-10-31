// Set öncesi motivasyon sesleri: salon kültürünün meşhur sözleri telefonun kendi sesiyle söylenir,
// hava kornası gibi efektler tarayıcıda sentezlenir. Telifli ses kaydı yok; her şey cihazda üretilir.
import { state, commit } from './store.js';
import { t, getLang } from './i18n.js';
import { h, sheet, toast } from './ui.js';
import { audioCtx, haptic, confetti, pop } from './juice.js';

// ---------- Ses üretimi ----------
let out = null;
function bus(a) {
  if (out?.context === a) return out;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  const g = a.createGain();
  g.gain.value = 0.9;
  comp.connect(g).connect(a.destination);
  out = comp;
  return out;
}

function shaper(a, amount, dest = bus(a)) {
  const ws = a.createWaveShaper();
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  ws.curve = c;
  ws.connect(dest);
  return ws;
}

function filter(a, type, f, dest = bus(a), q = 0.7) {
  const fl = a.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  fl.connect(dest);
  return fl;
}

// env: 'hold' sesi süre boyunca tutar, 'decay' vurup söner (davul, zil)
function osc(a, { type = 'sine', f, to, glide, at = 0, dur, vol = 0.3, attack = 0.01, release = 0.06, env = 'hold', dest = bus(a) }) {
  const t0 = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + (glide ?? dur));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  if (env === 'hold') g.gain.setValueAtTime(vol, t0 + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return o;
}

let noiseBuf = null;
function noise(a, { at = 0, dur, vol = 0.3, type = 'bandpass', f = 1000, q = 0.7, env = 'decay' }) {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const g = a.createGain();
  if (env === 'rise') {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur);
  } else {
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  src.connect(g).connect(filter(a, type, f, bus(a), q));
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

const boomAt = (a, at = 0, vol = 0.9) => {
  const d = shaper(a, 30);
  osc(a, { f: 150, to: 42, glide: 0.45, at, dur: 1.3, vol, attack: 0.005, env: 'decay', dest: d });
  osc(a, { type: 'triangle', f: 95, to: 36, glide: 0.5, at, dur: 0.9, vol: vol * 0.45, attack: 0.005, env: 'decay', dest: d });
  noise(a, { at, dur: 0.12, vol: 0.45, type: 'lowpass', f: 1200 });
};

// Her efekt saniye cinsinden süresini döndürür
const FX = {
  airhorn(a) {
    const dest = filter(a, 'lowpass', 3200, shaper(a, 6));
    for (const [at, dur] of [[0, 0.16], [0.2, 0.16], [0.4, 0.95]]) {
      for (const [f, v] of [[440, 0.11], [444, 0.11], [662, 0.05], [880, 0.06]]) {
        osc(a, { type: 'sawtooth', f, to: dur > 0.5 ? f * 0.95 : null, at, dur, vol: v, attack: 0.012, release: 0.05, dest });
      }
    }
    return 1.4;
  },
  boom(a) { boomAt(a); return 1.3; },
  bassdrop(a) {
    osc(a, { type: 'sawtooth', f: 180, to: 1500, dur: 1, vol: 0.06, attack: 0.3, dest: filter(a, 'lowpass', 2500) });
    noise(a, { dur: 1, vol: 0.18, type: 'highpass', f: 3000, env: 'rise' });
    boomAt(a, 1, 1);
    // Titreşen bas (wobble)
    const t0 = a.currentTime + 1;
    const lp = filter(a, 'lowpass', 500, shaper(a, 4), 6);
    const lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 5;
    depth.gain.value = 380;
    lfo.connect(depth).connect(lp.frequency);
    lfo.start(t0);
    lfo.stop(t0 + 1.7);
    osc(a, { type: 'sawtooth', f: 55, at: 1, dur: 1.6, vol: 0.35, attack: 0.02, release: 0.3, dest: lp });
    return 2.7;
  },
  bell(a) {
    for (const at of [0, 0.32, 0.64]) {
      for (const [m, v, d] of [[1, 0.24, 1.6], [2.76, 0.12, 1], [5.4, 0.07, 0.6], [8.93, 0.04, 0.4]]) {
        osc(a, { f: 640 * m, at, dur: d, vol: v, attack: 0.002, env: 'decay' });
      }
    }
    return 2.2;
  },
  drumroll(a) {
    for (let at = 0; at < 1.6; at += 0.055) noise(a, { at, dur: 0.08, vol: 0.1 + 0.25 * (at / 1.6), f: 1800 });
    noise(a, { at: 1.65, dur: 1.6, vol: 0.45, type: 'highpass', f: 4500 });
    boomAt(a, 1.65, 0.8);
    return 3.2;
  },
  charge(a) {
    // Geleneksel "hücum" borusu (stadyumlarda çalınan)
    const dest = filter(a, 'lowpass', 2600);
    for (const [at, dur, f] of [[0, 0.14, 392], [0.15, 0.14, 523.25], [0.3, 0.14, 659.25], [0.45, 0.3, 783.99], [0.8, 0.14, 659.25], [0.95, 0.75, 783.99]]) {
      osc(a, { type: 'sawtooth', f, at, dur, vol: 0.11, attack: 0.02, dest });
      osc(a, { type: 'square', f, at, dur, vol: 0.04, attack: 0.02, dest });
    }
    return 1.8;
  },
  heartbeat(a) {
    for (const at of [0, 0.75, 1.4, 1.95, 2.42, 2.82]) {
      osc(a, { f: 70, to: 45, at, dur: 0.18, vol: 0.9, attack: 0.008, env: 'decay' });
      osc(a, { f: 60, to: 40, at: at + 0.18, dur: 0.15, vol: 0.6, attack: 0.008, env: 'decay' });
    }
    return 3.1;
  },
  dundun(a) {
    const dest = filter(a, 'lowpass', 1500);
    for (const [at, dur, f] of [[0, 0.24, 233.08], [0.32, 0.24, 220], [0.64, 1.4, 185]]) {
      for (const det of [0, 1.5]) osc(a, { type: 'sawtooth', f: f + det, at, dur, vol: 0.12, attack: 0.02, release: dur > 1 ? 0.8 : 0.06, dest });
    }
    return 2.1;
  },
  levelup(a) {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i, all) => {
      osc(a, { type: 'square', f, at: i * 0.07, dur: i === all.length - 1 ? 0.4 : 0.09, vol: 0.07, attack: 0.005 });
    });
    return 0.9;
  },
  sadtrombone(a) {
    const dest = filter(a, 'lowpass', 1100);
    [[0, 0.4, 293.66], [0.45, 0.4, 277.18], [0.9, 0.4, 261.63], [1.35, 1.2, 246.94]].forEach(([at, dur, f], i) => {
      const o = osc(a, { type: 'sawtooth', f, at, dur, vol: 0.14, attack: 0.03, release: 0.2, dest });
      if (i === 3) {
        const lfo = a.createOscillator(), depth = a.createGain();
        lfo.frequency.value = 5.5;
        depth.gain.value = 7;
        lfo.connect(depth).connect(o.frequency);
        lfo.start(a.currentTime + at);
        lfo.stop(a.currentTime + at + dur);
      }
    });
    return 2.6;
  },
};

// ---------- Konuşma ----------
const synth = window.speechSynthesis;
let voices = [];
const loadVoices = () => { voices = synth?.getVoices() || []; };
loadVoices();
synth?.addEventListener?.('voiceschanged', loadVoices);

function pickVoice(lang) {
  if (!voices.length) loadVoices();
  const of = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(lang));
  return of.find((v) => /\bmale\b|daniel|david|alex|fred|guy|ryan|mark|tolga/i.test(v.name))
    || of.find((v) => /en-us|tr-tr/i.test(v.lang.replace('_', '-'))) || of[0] || null;
}

// Çağrıldığı anda konuşmaya başlar (iOS, dokunuşun içinde başlamayan konuşmayı engeller); bitince çözülür.
function speak(text, lang, { pitch = 0.8, rate = 0.95 } = {}) {
  return new Promise((resolve) => {
    if (!synth || !window.SpeechSynthesisUtterance) { resolve(false); return; }
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.lang = v?.lang || (lang === 'tr' ? 'tr-TR' : 'en-US');
    u.pitch = pitch;
    u.rate = rate;
    u.volume = 1;
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(true); } };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 700 + text.length * 95);
    synth.speak(u);
  });
}

// ---------- Ses listesi ----------
// hype: düğmenin rastgele seçtikleri. only: yalnızca o arayüz dilinde görünür.
export const CLIPS = [
  { id: 'yeahbuddy', emoji: '💪', label: 'Yeah buddy!', by: 'Ronnie Coleman', say: 'Yeah buddy!', voice: { pitch: 0.5, rate: 0.8 }, after: 'airhorn', hype: true },
  { id: 'lightweight', emoji: '🏋️', label: 'Light weight baby!', by: 'Ronnie Coleman', say: 'Light weight, baby!', voice: { pitch: 0.55, rate: 0.85 }, after: 'boom', hype: true },
  { id: 'peanut', emoji: '🥜', label: "Ain't nothin' but a peanut!", by: 'Ronnie Coleman', say: "Ain't nothing but a peanut!", voice: { pitch: 0.55, rate: 0.9 }, after: 'boom', hype: true },
  { id: 'bodybuilder', emoji: '🗣️', label: 'Everybody wanna be a bodybuilder…', by: 'Ronnie Coleman', say: "Everybody wanna be a bodybuilder, but don't nobody wanna lift no heavy weight!", voice: { pitch: 0.55, rate: 0.95 }, after: 'boom', hype: true },
  { id: 'justdoit', emoji: '✊', label: 'Just do it!', by: 'Shia LaBeouf', say: "Just do it! Don't let your dreams be dreams!", voice: { pitch: 1.05, rate: 1.15 }, after: 'airhorn', hype: true },
  { id: 'stayhard', emoji: '🪖', label: 'Stay hard!', by: 'David Goggins', say: 'Stay hard!', voice: { pitch: 0.45, rate: 0.85 }, after: 'boom', hype: true },
  { id: 'boats', emoji: '🚣', label: "Who's gonna carry the boats?", by: 'David Goggins', say: "Who's gonna carry the boats?", voice: { pitch: 0.5, rate: 0.9 }, after: 'dundun', hype: true },
  { id: 'wegojim', emoji: '🦍', label: 'We go jim!', by: 'meme', say: 'We go gym!', voice: { pitch: 0.65, rate: 0.85 }, after: 'boom', hype: true },
  { id: 'letsgo', emoji: '🚀', label: "LET'S GOOO!", by: 'meme', say: "Let's gooooo!", voice: { pitch: 1.2, rate: 1 }, after: 'airhorn', hype: true },
  { id: 'onemore', emoji: '☝️', label: 'One more rep!', by: 'meme', say: 'One more rep!', voice: { pitch: 0.7, rate: 0.95 }, after: 'charge', hype: true, only: 'en' },
  { id: 'birdaha', emoji: '☝️', label: 'Bir tane daha!', by: 'salon', say: 'Bir tane daha!', lang: 'tr', voice: { pitch: 0.7, rate: 0.95 }, after: 'charge', hype: true, only: 'tr' },
  { id: 'hafif', emoji: '🪶', label: 'Hafif bu, hafif!', by: 'salon', say: 'Hafif bu, hafif!', lang: 'tr', voice: { pitch: 0.55, rate: 0.9 }, after: 'boom', hype: true, only: 'tr' },
  { id: 'airhorn', emoji: '📯', label: 'Hava kornası', fx: 'airhorn', hype: true },
  { id: 'boom', emoji: '💥', label: 'Vine boom', fx: 'boom' },
  { id: 'bassdrop', emoji: '🔊', label: 'Bas düşüşü', fx: 'bassdrop', hype: true },
  { id: 'drumroll', emoji: '🥁', label: 'Davul + zil', fx: 'drumroll', hype: true },
  { id: 'charge', emoji: '🎺', label: 'Hücum borusu', fx: 'charge', hype: true },
  { id: 'bell', emoji: '🔔', label: 'Ring zili', fx: 'bell' },
  { id: 'heartbeat', emoji: '💓', label: 'Kalp atışı', fx: 'heartbeat' },
  { id: 'dundun', emoji: '😱', label: 'Dun dun dunnn', fx: 'dundun' },
  { id: 'levelup', emoji: '⭐', label: 'Seviye atladın', fx: 'levelup' },
  { id: 'sadtrombone', emoji: '📉', label: 'Hüzünlü trombon', fx: 'sadtrombone' },
];

const visible = () => CLIPS.filter((c) => !c.only || c.only === getLang());
const labelOf = (c) => (c.fx ? t(c.label) : c.label);
const favs = () => (state.settings.hypeFavs || []).filter((id) => visible().some((c) => c.id === id));

let recent = [];
function pickRandom() {
  const ids = favs();
  const pool = ids.length ? visible().filter((c) => ids.includes(c.id)) : visible().filter((c) => c.hype);
  const fresh = pool.filter((c) => !recent.includes(c.id));
  const c = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  recent = [c.id, ...recent].slice(0, Math.min(3, pool.length - 1));
  return c;
}

let token = 0;
export function playHype(id) {
  const clip = (id && CLIPS.find((c) => c.id === id)) || pickRandom();
  const a = audioCtx();
  const mine = ++token;
  caption(clip);
  if (clip.say) {
    speak(clip.say, clip.lang || 'en', clip.voice).then(() => {
      if (mine === token && a && clip.after) FX[clip.after](a);
    });
  } else {
    synth?.cancel();
    if (a) FX[clip.fx](a);
  }
  return clip;
}

// Ekranın ortasında beliren meme yazısı
function caption(clip) {
  document.querySelector('.hype-pop')?.remove();
  const el = h('div.hype-pop', { 'aria-hidden': 'true' }, h('span.e', null, clip.emoji), h('b', null, labelOf(clip)));
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), clip.say ? 1700 : 1100);
  setTimeout(() => el.remove(), 2300);
}

// Antrenman ekranındaki 📣 düğmesi: dokun → rastgele ses, basılı tut → ses panosu
export function hypeButton() {
  let timer = 0, longPressed = false;
  const btn = h('button.icon-btn.hype-btn', { type: 'button', 'aria-label': t('Motivasyon sesi çal'), title: t('Dokun: rastgele ses · Basılı tut: ses panosu') }, '📣');
  btn.addEventListener('pointerdown', () => {
    longPressed = false;
    clearTimeout(timer);
    timer = setTimeout(() => { longPressed = true; haptic(20); hypeBoard(); }, 550);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => clearTimeout(timer));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('click', () => {
    if (longPressed) return;
    playHype();
    pop(btn);
    haptic([15, 40, 25]);
    const r = btn.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.bottom, count: 36, power: 0.6 });
    if (!state.settings.hypeTip) {
      state.settings.hypeTip = true;
      commit();
      setTimeout(() => toast(t('İpucu: 📣 düğmesine basılı tutunca bütün sesler açılır.'), 4500), 1800);
    }
  });
  return btn;
}

export function hypeBoard() {
  const grid = h('div.hype-grid');
  const paint = () => {
    const ids = state.settings.hypeFavs || [];
    grid.replaceChildren(...visible().map((c) => {
      const fav = ids.includes(c.id);
      return h('div.hype-tile' + (fav ? '.fav' : ''), null,
        h('button.hype-play', { type: 'button', onclick: (e) => { playHype(c.id); pop(e.currentTarget); haptic(12); } },
          h('span.e', null, c.emoji),
          h('span.grow', null, h('b', null, labelOf(c)), h('span.muted.small', null, c.fx ? t('efekt') : c.by === 'meme' ? 'meme' : c.by === 'salon' ? t('salon klasiği') : c.by))),
        h('button.hype-fav', {
          type: 'button', 'aria-pressed': String(fav), 'aria-label': t('{name}: favori', { name: labelOf(c) }),
          onclick: () => {
            state.settings.hypeFavs = fav ? ids.filter((x) => x !== c.id) : [...ids, c.id];
            commit();
            haptic(8);
            paint();
          },
        }, fav ? '★' : '☆'));
    }));
  };
  paint();
  sheet({
    title: t('Ses panosu'),
    body: [
      h('p.muted.small', null, t('Dokun, dinle. ★ ile işaretlediklerin 📣 düğmesine basınca rastgele çalar; hiçbirini işaretlemezsen hepsinden seçer.')),
      h('button.btn.primary.block.mt', { onclick: () => playHype() }, '🎲 ', t('Rastgele çal')),
      grid,
      h('p.muted.small.mt', null, t('Sözler telefonunun kendi sesiyle okunur, efektler cihazda üretilir. Ses gelmiyorsa telefonun sessizde olmadığından emin ol.')),
    ],
  });
}
