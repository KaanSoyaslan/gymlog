// Tarih ve sayı biçimleri (Türkçe). Tarihler her yerde yerel 'YYYY-AA-GG' metni olarak tutulur.

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

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
  const showYear = year === true || (year === 'auto' && d.getFullYear() !== new Date().getFullYear());
  const m = long ? MONTHS[d.getMonth()] : MONTHS_SHORT[d.getMonth()];
  let out = `${d.getDate()} ${m}${showYear ? ' ' + d.getFullYear() : ''}`;
  if (weekday) out = `${(long ? DAYS_LONG : DAYS)[d.getDay()]}, ${out}`;
  return out;
}

export function relDays(s) {
  const n = daysBetween(s, today());
  if (n === 0) return 'bugün';
  if (n === 1) return 'dün';
  if (n === -1) return 'yarın';
  if (n < 0) return `${-n} gün sonra`;
  if (n < 14) return `${n} gün önce`;
  if (n < 60) return `${Math.round(n / 7)} hafta önce`;
  return `${Math.round(n / 30)} ay önce`;
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

export const compact = (n) => (n >= 10000 ? `${num(n / 1000, 1)}B` : String(Math.round(n)));
export const plural = (n, word) => `${n} ${word}`;
