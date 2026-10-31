// Dinlenme sayacı (alt menünün üstünde duran hap) ve antrenman sırasında ekranı açık tutma.
import { t } from './i18n.js';
import { state } from './store.js';
import { haptic, beep } from './juice.js';

const CIRC = 2 * Math.PI * 19;
let end = 0, total = 0, iv = 0, hideTimer = 0;
let pill = null, timeEl = null, labelEl = null, bar = null;

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function ensurePill() {
  if (pill) return;
  pill = document.createElement('div');
  pill.className = 'rest';
  pill.setAttribute('role', 'timer');
  pill.innerHTML = `
    <svg class="rest-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="bar" cx="22" cy="22" r="19"/></svg>
    <div class="rest-text"><b class="rest-time">0:00</b><span class="rest-label"></span></div>
    <button class="rest-btn" data-d="-15" type="button">−15</button>
    <button class="rest-btn" data-d="15" type="button">+15</button>
    <button class="rest-btn x" type="button">✕</button>`;
  timeEl = pill.querySelector('.rest-time');
  labelEl = pill.querySelector('.rest-label');
  bar = pill.querySelector('.bar');
  bar.style.strokeDasharray = CIRC;
  pill.addEventListener('click', (e) => {
    const b = e.target.closest('.rest-btn');
    if (!b) return;
    haptic(8);
    if (b.classList.contains('x')) { stopRest(); return; }
    const d = Number(b.dataset.d);
    end += d * 1000;
    total = Math.max(total + d, 1);
    update();
  });
  document.body.append(pill);
}

export function startRest(seconds, name) {
  if (!seconds) return;
  ensurePill();
  clearTimeout(hideTimer);
  total = seconds;
  end = Date.now() + seconds * 1000;
  pill.querySelector('.x').setAttribute('aria-label', t('Sayacı kapat'));
  labelEl.textContent = `${t('Dinlenme')} · ${name}`;
  pill.classList.remove('done', 'soon');
  pill.classList.add('show');
  clearInterval(iv);
  iv = setInterval(update, 250);
  update();
}

function update() {
  if (!pill || !end) return;
  const rem = (end - Date.now()) / 1000;
  timeEl.textContent = fmt(rem);
  bar.style.strokeDashoffset = CIRC * (1 - Math.max(0, rem) / total);
  pill.classList.toggle('soon', rem > 0 && rem <= 5);
  if (rem <= 0) finish();
}

function finish() {
  clearInterval(iv);
  end = 0;
  pill.classList.remove('soon');
  pill.classList.add('done');
  timeEl.textContent = t('Hazır!');
  labelEl.textContent = t('Sıradaki sete geç');
  haptic([200, 100, 200, 100, 350]);
  beep();
  hideTimer = setTimeout(hide, 6000);
}

function hide() { pill?.classList.remove('show', 'done', 'soon'); }

export function stopRest() {
  clearInterval(iv);
  clearTimeout(hideTimer);
  end = 0;
  hide();
}

// Ekranı açık tutma (Screen Wake Lock)
let lock = null;
let wanted = false;
export async function keepAwake(on) {
  wanted = on;
  try {
    if (on && state.settings.keepAwake !== false && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!lock) {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      }
    } else if (lock) {
      await lock.release();
      lock = null;
    }
  } catch { lock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (wanted) keepAwake(true);
  update();
});
