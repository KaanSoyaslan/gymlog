// Dokunma hissi: titreşim, dokunma dalgası, konfeti, sayı sayma, kısa sesler ve liste giriş animasyonları.
import { state } from './store.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function haptic(pattern = 10) {
  if (state.settings.haptics === false) return;
  // Tarayıcı, sayfaya hiç dokunulmadan titreşime izin vermez
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch { /* desteklenmiyor */ }
}

// Ses, ilk dokunuşta açılır (tarayıcılar kullanıcı etkileşimi olmadan ses çalmaya izin vermez).
let audio = null;
export function unlockAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { audio = null; }
}
export function audioCtx() {
  unlockAudio();
  return audio;
}
export function beep() {
  if (!audio) return;
  const now = audio.currentTime;
  [[0, 880], [0.2, 1175], [0.4, 1568]].forEach(([d, f]) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + d);
    g.gain.exponentialRampToValueAtTime(0.3, now + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.17);
    o.connect(g).connect(audio.destination);
    o.start(now + d);
    o.stop(now + d + 0.2);
  });
}

// Dokunulan yerden yayılan dalga
const RIPPLE = '.btn, .rep-btn, .chip, .seg-btn, .nav-item, .set-check, .pick-row, .menu-item, .setting-row, .ex-tile, .session-card, .mood, .add-ex, .anim-choice, .suggest-chip, .icon-btn, .hype-play, .hype-fav';
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest(RIPPLE);
  if (!el || reduced()) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 1.3;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.append(s);
  s.addEventListener('animationend', () => s.remove());
}, { passive: true });

export function pop(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

// Listelerin elemanları sırayla belirir
export function stagger(root) {
  if (reduced()) return;
  root.querySelectorAll('.list, .ex-grid, .tiles, .items, .status').forEach((box) => {
    [...box.children].forEach((c, i) => {
      c.classList.add('rise');
      c.style.setProperty('--d', `${Math.min(i, 12) * 40}ms`);
    });
  });
}

export function countUp(el, to, { dur = 900, decimals = 0, suffix = '' } = {}) {
  const fmt = (v) => (decimals ? v.toFixed(decimals) : String(Math.round(v))) + suffix;
  if (reduced() || !Number.isFinite(to)) { el.textContent = fmt(to); return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = fmt(to * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Konfeti
export function confetti({ x = innerWidth / 2, y = innerHeight * 0.35, count = 90, power = 1 } = {}) {
  if (reduced()) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const colors = [css.getPropertyValue('--accent').trim() || '#c6f24e', css.getPropertyValue('--series').trim() || '#3987e5', '#ff8a3d', '#e87ba4', '#fab219'];
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const v = (6 + Math.random() * 7) * power;
    return {
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: colors[(Math.random() * colors.length) | 0],
    };
  });
  const start = performance.now();
  const frame = (now) => {
    const life = (now - start) / 1600;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - life ** 3);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (life < 1) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}
