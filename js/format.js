// Tarih ve sayı biçimleri (Türkçe / İngilizce). Tarihler her yerde yerel 'YYYY-AA-GG' metni olarak tutulur.
import { getLang } from './i18n.js';

const NAMES = {
  tr: {
    months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    monthsShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    days: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
    daysLong: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
};
const names = () => NAMES[getLang()] || NAMES.tr;
export const monthName = (i) => names().months[i];
export const monthShort = (i) => names().monthsShort[i];
export const dayShort = (i) => names().days[i];

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
export function weekStart(s) {
  const d = parseYmd(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

export function fmtDate(s, { weekday = false, year = 'auto', long = false } = {}) {
  if (!s) return '';
  const d = parseYmd(s);
  const n = names();
  const showYear = year === true || (year === 'auto' && d.getFullYear() !== new Date().getFullYear());
  const m = long ? n.months[d.getMonth()] : n.monthsShort[d.getMonth()];
  let out = `${d.getDate()} ${m}${showYear ? ' ' + d.getFullYear() : ''}`;
  if (weekday) out = `${(long ? n.daysLong : n.days)[d.getDay()]}, ${out}`;
  return out;
}

export function relDays(s) {
  const n = daysBetween(s, today());
  const en = getLang() === 'en';
  if (n === 0) return en ? 'today' : 'bugün';
  if (n === 1) return en ? 'yesterday' : 'dün';
  if (n === -1) return en ? 'tomorrow' : 'yarın';
  if (n < 0) return en ? `in ${-n} days` : `${-n} gün sonra`;
  if (n < 14) return en ? `${n} days ago` : `${n} gün önce`;
  if (n < 60) { const w = Math.round(n / 7); return en ? `${w} weeks ago` : `${w} hafta önce`; }
  const mo = Math.round(n / 30);
  return en ? `${mo} month${mo === 1 ? '' : 's'} ago` : `${mo} ay önce`;
}

// 22.5 → "22.5", 80 → "80", 17.25 → "17.25"
export function num(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return '';
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
}

export function parseNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const compact = (n) => (n >= 10000 ? `${num(n / 1000, 1)}${getLang() === 'en' ? 'k' : 'B'}` : String(Math.round(n)));
