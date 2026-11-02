// Karakterin görünümü: saç, şapka, gözlük, sakal, aksesuarlar ve boy/cinsiyet/kilodan gelen beden ölçüleri.
// Baş parçaları başın merkezine göre çizilir (baş yarıçapı 14; gözler y = -1, ağız y = 6.5).
import { state, lastWeight } from './store.js';

const A = 'var(--accent)';
const A2 = 'color-mix(in srgb, var(--accent) 68%, #000)';
const DARK = '#2b2d33';
const GOLD = '#f2c230';

const SHORT_FRONT = '<path d="M-14 -2Q-13 -17 0 -16Q13 -17 14 -2Q8 -9 0 -9Q-8 -9 -14 -2Z"/>';
const SHORT_BACK = '<path d="M-14 3Q-15 -17 0 -16Q15 -17 14 3Q0 8 -14 3Z"/>';
const LONG_FRONT = '<path d="M-14.5 1Q-15 -17 0 -16Q15 -17 14.5 1Q11 -9 3 -11Q-6 -10 -14.5 1Z"/>';

// behind: öndeyken vücudun arkasında kalan kısım
export const HAIRS = [
  { id: 'none', name: 'Kel' },
  { id: 'buzz', name: 'Kazıma', front: '<path d="M-13.6 -5Q-12 -15.4 0 -15.4Q12 -15.4 13.6 -5Q8 -11.5 0 -11.5Q-8 -11.5 -13.6 -5Z"/>', back: '<path d="M-13.8 1Q-14.5 -15.6 0 -15.4Q14.5 -15.6 13.8 1Q0 5 -13.8 1Z"/>' },
  { id: 'short', name: 'Kısa', front: SHORT_FRONT, back: SHORT_BACK },
  { id: 'mohawk', name: 'Mohawk', front: '<path d="M-3.5 -12Q-5 -25 0 -28Q5 -25 3.5 -12Q0 -10 -3.5 -12Z"/>', back: '<path d="M-3.5 -14Q-5 -26 0 -28Q5 -26 3.5 -14L3.5 8Q0 10 -3.5 8Z"/>' },
  { id: 'afro', name: 'Afro', behind: '<circle cy="-7" r="21"/>', front: '<path d="M-14 -1Q-16 -13 -8 -15Q0 -19 8 -15Q16 -13 14 -1Q9 -10 0 -10Q-9 -10 -14 -1Z"/>', back: '<circle cy="-7" r="21"/>' },
  { id: 'bob', name: 'Küt', behind: '<path d="M-16 -4Q-18 -19 0 -18Q18 -19 16 -4L17 12Q12 16 9 10L-9 10Q-12 16 -17 12Z"/>', front: LONG_FRONT, back: '<path d="M-16 -4Q-18 -19 0 -18Q18 -19 16 -4L17 13Q0 19 -17 13Z"/>' },
  { id: 'long', name: 'Uzun', behind: '<path d="M-15 -5Q-17 -19 0 -18Q17 -19 15 -5L19 27Q11 32 7 21L-7 21Q-11 32 -19 27Z"/>', front: LONG_FRONT, back: '<path d="M-14.5 -5Q-16 -18 0 -17Q16 -18 14.5 -5Q17 10 12 24Q7 31 0 31Q-7 31 -12 24Q-17 10 -14.5 -5Z"/>' },
  { id: 'ponytail', name: 'At kuyruğu', behind: '<path d="M9 -12Q25 -14 25 6Q25 18 19 25Q19 10 11 1Z"/>', front: '<path d="M-14 -1Q-14 -17 0 -16Q14 -17 14 -1Q10 -10 2 -10Q-7 -10 -14 -1Z"/>', back: `${SHORT_BACK}<path d="M-4 -6Q-7 14 0 30Q7 14 4 -6Z"/>` },
  { id: 'bun', name: 'Topuz', behind: '<circle cy="-19" r="7"/>', front: SHORT_FRONT, back: `<circle cy="-19" r="7"/>${SHORT_BACK}` },
];

// back verilmezse arkadan da aynı görünür
export const HATS = [
  { id: 'none', name: 'Yok' },
  { id: 'headband', name: 'Ter bandı', front: `<rect fill="${A}" x="-14.6" y="-10" width="29.2" height="4.6" rx="2"/>`, back: `<rect fill="${A}" x="-14.6" y="-10" width="29.2" height="4.6" rx="2"/><path fill="${A}" d="M2 -7Q6 3 10 10L5 10Q1 2 -1 -7Z"/>` },
  { id: 'beanie', name: 'Bere', front: `<path fill="${A}" d="M-15 -5Q-16 -22 0 -22Q16 -22 15 -5Z"/><rect fill="${A2}" x="-16" y="-8" width="32" height="6" rx="2.5"/><circle fill="${A2}" cy="-24" r="3.5"/>` },
  { id: 'cap', name: 'Kep', front: `<path fill="${A}" d="M-14.6 -5Q-15 -20 0 -20Q15 -20 14.6 -5Z"/><path fill="${A2}" d="M-15 -6Q0 -10 15 -6Q19 -4 17 -2Q0 -6 -17 -2Q-19 -4 -15 -6Z"/>`, back: `<path fill="${A}" d="M-14.6 -2Q-15 -20 0 -20Q15 -20 14.6 -2Z"/><path fill="var(--hero-skin)" d="M-4 -2Q0 -9 4 -2Z"/><rect fill="${A2}" x="-5" y="-4" width="10" height="2" rx="1"/>` },
  { id: 'backcap', name: 'Ters kep', front: `<path fill="${A}" d="M-14.6 -6Q-15 -20 0 -20Q15 -20 14.6 -6Z"/><path fill="var(--hero-skin)" d="M-4 -6Q0 -13 4 -6Z"/><rect fill="${A2}" x="-5" y="-8" width="10" height="2" rx="1"/>`, back: `<path fill="${A}" d="M-14.6 -2Q-15 -20 0 -20Q15 -20 14.6 -2Z"/><path fill="${A2}" d="M-15 -3Q0 -7 15 -3Q19 -1 17 1Q0 -3 -17 1Q-19 -1 -15 -3Z"/>` },
  { id: 'tophat', name: 'Silindir', front: `<rect fill="${DARK}" stroke="var(--gear)" stroke-width=".6" x="-12" y="-36" width="24" height="25" rx="2"/><rect fill="${A}" x="-12" y="-17" width="24" height="5"/><rect fill="${DARK}" stroke="var(--gear)" stroke-width=".6" x="-20" y="-13" width="40" height="4" rx="2"/>` },
  { id: 'cowboy', name: 'Kovboy', front: '<path fill="#8a5a2b" d="M-27 -9Q-15 -15 0 -13Q15 -15 27 -9Q15 -5 0 -7Q-15 -5 -27 -9Z"/><path fill="#9c6a36" d="M-12 -11Q-14 -27 -4 -26Q0 -23 4 -26Q14 -27 12 -11Q0 -8 -12 -11Z"/><path fill="#5d3b1a" d="M-12 -14Q0 -11 12 -14L12 -11Q0 -8 -12 -11Z"/>' },
  { id: 'crown', name: 'Taç', front: `<path fill="${GOLD}" stroke="#b88a10" stroke-width=".7" d="M-13 -11L-15 -28L-7 -19L0 -30L7 -19L15 -28L13 -11Z"/><circle fill="#e4424d" cy="-15" r="2"/><circle fill="#3b82f6" cx="-7.5" cy="-14.5" r="1.4"/><circle fill="#3b82f6" cx="7.5" cy="-14.5" r="1.4"/>` },
  { id: 'viking', name: 'Viking', front: '<path fill="#e9e3d2" d="M-14 -9Q-27 -13 -25 -29Q-20 -19 -11 -16Z"/><path fill="#e9e3d2" d="M14 -9Q27 -13 25 -29Q20 -19 11 -16Z"/><path fill="#8d939b" d="M-15 -6Q-15 -21 0 -21Q15 -21 15 -6Z"/><rect fill="#6f747b" x="-15.5" y="-9" width="31" height="4.5" rx="2"/>' },
  { id: 'party', name: 'Parti', front: `<path fill="${A}" d="M-9 -12L0 -35L9 -12Q0 -9 -9 -12Z"/><path fill="#fff" opacity=".65" d="M-6.6 -18L-4.6 -23L4.6 -23L6.6 -18Q0 -16 -6.6 -18Z"/><circle fill="#ffd23f" cy="-35" r="3"/>` },
  { id: 'santa', name: 'Noel', front: '<path fill="#d9302f" d="M-15 -8Q-12 -24 5 -23Q16 -21 21 -6Q14 -13 8 -13L15 -8Z"/><circle fill="#fff" cx="22" cy="-5" r="3"/><rect fill="#fff" x="-16" y="-10" width="32" height="5.5" rx="2.7"/>' },
];

export const GLASSES = [
  { id: 'none', name: 'Yok' },
  { id: 'sun', name: 'Güneş', svg: '<rect fill="#15161a" x="-11" y="-4.5" width="9.5" height="6.5" rx="2.5"/><rect fill="#15161a" x="1.5" y="-4.5" width="9.5" height="6.5" rx="2.5"/><path fill="none" stroke="#15161a" stroke-width="1.3" d="M-1.5 -2.6H1.5M-11 -3H-14M11 -3H14"/>' },
  { id: 'aviator', name: 'Pilot', svg: `<path fill="#3a2a12" fill-opacity=".85" stroke="${GOLD}" stroke-width=".9" d="M-11.5 -4.5H-1.8Q-1 2 -6 2.8Q-11.5 2.8 -11.5 -4.5Z"/><path fill="#3a2a12" fill-opacity=".85" stroke="${GOLD}" stroke-width=".9" d="M11.5 -4.5H1.8Q1 2 6 2.8Q11.5 2.8 11.5 -4.5Z"/><path fill="none" stroke="${GOLD}" stroke-width=".9" d="M-1.8 -3.8H1.8M-11.5 -3.6H-14M11.5 -3.6H14"/>` },
  { id: 'round', name: 'Yuvarlak', svg: '<circle fill="#bfe4ff" fill-opacity=".28" stroke="#15161a" stroke-width="1.3" cx="-5.5" cy="-1" r="4.6"/><circle fill="#bfe4ff" fill-opacity=".28" stroke="#15161a" stroke-width="1.3" cx="5.5" cy="-1" r="4.6"/><path fill="none" stroke="#15161a" stroke-width="1.3" d="M-.9 -1.5H.9M-10.1 -1.5H-14M10.1 -1.5H14"/>' },
  { id: 'pixel', name: 'Piksel', svg: '<path fill="#000" d="M-14 -4.6H14V-2.8H12V-.8H10V1.2H3V-.8H1V-2.8H-1V-.8H-3V1.2H-10V-.8H-12V-2.8H-14Z"/><path fill="#fff" d="M-9.6 -2.8H-8V-1.2H-9.6ZM-6.4 -.9H-4.8V.7H-6.4ZM4.4 -2.8H6V-1.2H4.4ZM7.6 -.9H9.2V.7H7.6Z"/>' },
];

const MUSTACHE = '<path d="M-6.5 4.5Q-3 1.8 0 3.2Q3 1.8 6.5 4.5Q3 5.6 0 4.6Q-3 5.6 -6.5 4.5Z"/>';
export const BEARDS = [
  { id: 'none', name: 'Yok' },
  { id: 'mustache', name: 'Bıyık', svg: MUSTACHE },
  { id: 'goatee', name: 'Keçi', svg: `${MUSTACHE}<path d="M-4 9.4Q0 8.4 4 9.4Q3.5 14.5 0 15Q-3.5 14.5 -4 9.4Z"/>` },
  { id: 'full', name: 'Sakal', svg: '<path d="M-14 0Q-13 15 0 16.5Q13 15 14 0Q11 6 6.5 3.6Q0 2 -6.5 3.6Q-11 6 -14 0Z"/>' },
  { id: 'long', name: 'Uzun sakal', svg: '<path d="M-14 0Q-13 14 -8 20Q-3 30 0 33Q3 30 8 20Q13 14 14 0Q11 6 6.5 3.6Q0 2 -6.5 3.6Q-11 6 -14 0Z"/>' },
];

export const EXTRAS = [
  { id: 'chain', name: '📿 Altın zincir' },
  { id: 'belt', name: '🏆 Şampiyon kemeri' },
  { id: 'cape', name: '🦸 Pelerin' },
  { id: 'phones', name: '🎧 Kulaklık' },
  { id: 'wrist', name: '⌚ Bileklik' },
  { id: 'knee', name: '🦵 Dizlik' },
];
export const CHAIN_SVG = `<path fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-dasharray="2.2 1" d="M-9 -8Q-12 10 0 18Q12 10 9 -8"/><circle fill="${GOLD}" stroke="#b88a10" stroke-width=".7" cy="20" r="4.2"/>`;
export const PHONES_SVG = `<path fill="none" stroke="${DARK}" stroke-width="2.6" d="M-15.5 -2Q-16 -20 0 -20Q16 -20 15.5 -2"/><rect fill="${A}" x="-18.5" y="-6" width="6" height="11" rx="3"/><rect fill="${A}" x="12.5" y="-6" width="6" height="11" rx="3"/>`;

// face: yüz çizgilerinin rengi
export const SKINS = [
  { id: 'theme', name: 'Tema' },
  { id: 'porcelain', name: 'Çok açık', color: '#f7dfcc', face: '#2a1c14' },
  { id: 'light', name: 'Açık ten', color: '#eec7a3', face: '#2a1c14' },
  { id: 'tan', name: 'Buğday', color: '#d6a274', face: '#2a1c14' },
  { id: 'brown', name: 'Esmer', color: '#a9714a', face: '#21120a' },
  { id: 'dark', name: 'Koyu esmer', color: '#744a2d', face: '#f4ece6' },
  { id: 'deep', name: 'Koyu ten', color: '#4c2f1e', face: '#f4ece6' },
  { id: 'green', name: 'Yeşil dev', color: '#7fb955', face: '#14210b' },
  { id: 'blue', name: 'Mavi', color: '#5aa7dc', face: '#0b1c2a' },
  { id: 'statue', name: 'Altın heykel', color: '#d9b23c', face: '#2c2206' },
];
export const HAIR_COLORS = [
  { id: 'theme', name: 'Tema' },
  { id: 'black', name: 'Siyah', color: '#232225' },
  { id: 'brown', name: 'Kahve', color: '#5b3a22' },
  { id: 'blond', name: 'Sarı', color: '#dcb765' },
  { id: 'red', name: 'Kızıl', color: '#b4522a' },
  { id: 'gray', name: 'Gri', color: '#a3a6ac' },
  { id: 'accent', name: 'Vurgu rengi', color: A },
];
export const OUTFITS = [
  { id: 'theme', name: 'Tema' },
  { id: 'black', name: 'Siyah', color: '#202227' },
  { id: 'navy', name: 'Lacivert', color: '#22365f' },
  { id: 'red', name: 'Kırmızı', color: '#c7342f' },
  { id: 'white', name: 'Beyaz', color: '#eef0f2' },
  { id: 'accent', name: 'Vurgu rengi', color: A },
];

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const BASE_LOOK = { fem: 0, leg: 1, fat: 0, lean: 0, hair: 'short', hairColor: 'theme', hat: 'none', glasses: 'none', beard: 'none', extras: [], skin: 'theme', outfit: 'theme' };

// Ayarlardan karakterin görünümü. Kilo son kayıttan gelir; boyla birlikte vücudun yapısını belirler.
export function heroLook() {
  const s = state.settings, g = s.hero || {};
  const fem = s.gender === 'female' ? 1 : s.gender === 'male' ? 0 : 0.4;
  const hs = s.height ? clamp(s.height / 175, 0.82, 1.18) : 1;
  const kg = lastWeight()?.kg;
  const bmi = s.height && kg ? kg / (s.height / 100) ** 2 : null;
  return {
    ...BASE_LOOK, ...g, fem,
    leg: 1 + (hs - 1) * 1.6, // boy farkının çoğu bacaktan gelir
    fat: bmi ? clamp((bmi - 25) / 9, 0, 1) : 0,
    lean: bmi ? clamp((20 - bmi) / 3, 0, 1) : 0,
    hair: g.hair || (fem === 1 ? 'ponytail' : 'short'),
  };
}

// Başın parçaları (SVG metni). Saç ve sakal aynı renkten boyanır.
export function headParts(look) {
  const hair = byId(HAIRS, look.hair), hat = byId(HATS, look.hat);
  return {
    behind: hair.behind || '', hairFront: hair.front || '', hairBack: hair.back || hair.front || '',
    beard: byId(BEARDS, look.beard).svg || '', glasses: byId(GLASSES, look.glasses).svg || '',
    hatFront: hat.front || '', hatBack: hat.back || hat.front || '',
    phones: look.extras.includes('phones') ? PHONES_SVG : '',
  };
}

export function applyLookVars(svg, look) {
  const skin = byId(SKINS, look.skin), hc = byId(HAIR_COLORS, look.hairColor), out = byId(OUTFITS, look.outfit);
  if (skin.color) {
    svg.style.setProperty('--hero-skin', skin.color);
    svg.style.setProperty('--hero-face', skin.face);
  }
  if (hc.color) svg.style.setProperty('--hero-hair', hc.color);
  if (out.color) svg.style.setProperty('--hero-outfit', out.color);
}
