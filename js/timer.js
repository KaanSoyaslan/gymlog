// Dinlenme sayacı (alt menünün üstünde duran kutu) ve antrenman sırasında ekranı açık tutma.
// Süre iki yerde görünür: yuvarlak halka (içinde bekleme animasyonu) ve kutunun çerçevesi.
import { t } from './i18n.js';
import { state } from './store.js';
import { haptic, beep } from './juice.js';
import { animSvg } from './anim.js';

const CIRC = 2 * Math.PI * 19;
const WAIT_FIGS = ['restSip', 'restBreath', 'restSit'];
let end = 0, total = 0, iv = 0, hideTimer = 0, figI = Math.floor(Math.random() * WAIT_FIGS.length);
let pill = null, timeEl = null, labelEl = null, bar = null, frame = null, frameBar = null, frameLen = 0;

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Çerçeve kutunun boyutuna göre çizilir: üst ortadan başlar, saat yönünde döner.
function layoutFrame() {
  const w = pill.offsetWidth, h = pill.offsetHeight;
  if (!w || !h) return;
  const i = 1.5, r = 24.5;
  frame.setAttribute('viewBox', `0 0 ${w} ${h}`);
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  const d = `M${w / 2} ${i}H${w - i - r}A${r} ${r} 0 0 1 ${w - i} ${i + r}V${h - i - r}A${r} ${r} 0 0 1 ${w - i - r} ${h - i}H${i + r}A${r} ${r} 0 0 1 ${i} ${h - i - r}V${i + r}A${r} ${r} 0 0 1 ${i + r} ${i}Z`;
  frame.querySelectorAll('path').forEach((p) => p.setAttribute('d', d));
  frameLen = frameBar.getTotalLength();
  frameBar.style.strokeDasharray = frameLen;
  update();
}

function setFig(key) {
  pill.querySelector('.rest-fig').replaceChildren(animSvg(key));
}

function ensurePill() {
  if (pill) return;
  pill = document.createElement('div');
  pill.className = 'rest';
  pill.setAttribute('role', 'timer');
  pill.innerHTML = `
    <svg class="rest-frame" aria-hidden="true"><path class="track"/><path class="bar"/></svg>
    <div class="rest-dial">
      <svg class="rest-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="bar" cx="22" cy="22" r="19"/></svg>
      <div class="rest-fig" aria-hidden="true"></div>
    </div>
    <div class="rest-text"><b class="rest-time">0:00</b><span class="rest-label"></span></div>
    <button class="rest-btn" data-d="-15" type="button">−15</button>
    <button class="rest-btn" data-d="15" type="button">+15</button>
    <button class="rest-btn x" type="button">✕</button>`;
  timeEl = pill.querySelector('.rest-time');
  labelEl = pill.querySelector('.rest-label');
  bar = pill.querySelector('.rest-ring .bar');
  frame = pill.querySelector('.rest-frame');
  frameBar = frame.querySelector('.bar');
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
  if ('ResizeObserver' in window) new ResizeObserver(layoutFrame).observe(pill);
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
  figI = (figI + 1) % WAIT_FIGS.length;
  setFig(WAIT_FIGS[figI]);
  layoutFrame();
  clearInterval(iv);
  iv = setInterval(update, 250);
  update();
}

function update() {
  if (!pill || !end) return;
  const rem = (end - Date.now()) / 1000;
  const left = Math.max(0, rem) / total;
  timeEl.textContent = fmt(rem);
  bar.style.strokeDashoffset = CIRC * (1 - left);
  frameBar.style.strokeDashoffset = frameLen * (1 - left);
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
  setFig('dbCurl');
  haptic([200, 100, 200, 100, 350]);
  beep();
  hideTimer = setTimeout(hide, 6000);
}

function hide() {
  if (!pill) return;
  pill.classList.remove('show', 'done', 'soon');
  pill.querySelector('.rest-fig').replaceChildren();
}

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
