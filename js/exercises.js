// Hazır hareket kütüphanesi ve çalışılan bölgeler.
// type: 'w' = ağırlık × tekrar, 'bw' = vücut ağırlığı (+ek kg), 'time' = süre (sn), 'cardio' = dakika + km.

export const GROUPS = [
  { id: 'chest', name: 'Göğüs' },
  { id: 'back', name: 'Sırt' },
  { id: 'shoulders', name: 'Omuz' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'legs', name: 'Bacak' },
  { id: 'core', name: 'Karın' },
  { id: 'cardio', name: 'Kardiyo' },
];

export const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]));

export const TYPES = [
  { id: 'w', name: 'Ağırlık' },
  { id: 'bw', name: 'Vücut ağırlığı' },
  { id: 'time', name: 'Süre' },
  { id: 'cardio', name: 'Kardiyo' },
];

const X = (id, name, short, groups, type, anim, tip, aliases = []) => ({ id, name, short, groups, type, anim, tip, aliases });

export const BUILTIN = [
  // Sırt
  X('pullup', 'Barfiks (Pull-up)', 'Barfix', ['back', 'biceps'], 'bw', 'pullup',
    'Omuz genişliğinden geniş tut, göğsünü bara doğru çek; aşağıda kolları tam aç.', ['barfix', 'barfiks', 'pull up', 'pullup']),
  X('pullup-close', 'Dar Tutuş Barfiks', 'Barfix Close', ['back', 'biceps'], 'bw', 'chinup',
    'Eller omuz genişliğinde ya da daha dar; dirsekleri öne-aşağı çekerek çeneyi barın üstüne taşı.', ['barfix close', 'barfiks dar', 'close grip pull up', 'chin up', 'chinup']),
  X('lat-pulldown', 'Lat Pulldown', 'LPD', ['back'], 'w', 'latPulldown',
    'Barı göğsün üst kısmına çek, dirsekleri yere doğru indir; gövdeyi sallama.', ['lpd', 'lat pull down', 'lat pulldown']),
  X('seated-row', 'Seated Cable Row', 'SR', ['back'], 'w', 'seatedRow',
    'Göğüs dik, kürek kemiklerini sıkıştırarak tutacağı karnına çek; belinden sallanma.', ['sr', 'seated row', 'cable row', 'oturarak çekiş']),
  X('barbell-row', 'Barbell Row', 'BB Row', ['back'], 'w', 'barbellRow',
    'Kalçadan öne eğil, sırt düz; barı göbeğe doğru çek.', ['barbell row', 'bent over row']),
  X('dumbbell-row', 'Tek Kol Dumbbell Row', 'DB Row', ['back'], 'w', 'dumbbellRow',
    'Bir el ve diz sehpada; dumbbellı kalçana doğru çek, dirsek gövdeye yakın.', ['db row', 'dumbbell row', 'one arm row']),
  X('straight-arm-pulldown', 'Straight-arm Pulldown', 'SA Pulldown', ['back'], 'w', 'straightArm',
    'Kollar neredeyse düz; barı kalçaya kadar bastır, latları sık.', ['straight arm pulldown', 'pullover cable']),
  X('deadlift', 'Deadlift', 'DL', ['back', 'legs'], 'w', 'deadlift',
    'Bar orta ayağın üstünde, sırt nötr; kalçayı ve dizleri birlikte açarak kalk.', ['deadlift', 'dl']),
  X('back-extension', 'Back Extension', 'Hyper', ['back', 'core'], 'bw', 'hyperext',
    'Kalçadan menteşe yap, gövde bacaklarla bir çizgiye gelince dur; fazla geriye kaçma.', ['hyperextension', 'back extension']),

  // Omuz
  X('db-shoulder-press', 'Dumbbell Shoulder Press', 'DP', ['shoulders', 'triceps'], 'w', 'dbPress',
    'Dumbbelllar kulak hizasından başlasın; başın üstüne it, belini kamburlaştırma.', ['dp', 'dumbbell press', 'omuz press', 'dumbbell shoulder press']),
  X('smith-shoulder-press', 'Smith Shoulder Press', 'Smith OP', ['shoulders', 'triceps'], 'w', 'smithPress',
    'Bar çene hizasına insin; kontrollü it, kilitlemeden dur.', ['smith omuz press', 'smith omz press', 'smith press', 'smith shoulder press']),
  X('lateral-raise', 'Dumbbell Lateral Raise', 'D Rise', ['shoulders'], 'w', 'lateralRaise',
    'Dirsekler hafif bükük; kolları omuz hizasına kadar yana kaldır, yavaş indir.', ['d rise', 'lateral raise', 'yana açış', 'side raise']),
  X('cable-lateral-raise', 'Cable Lateral Raise', 'Cable Rise', ['shoulders'], 'w', 'cableLateral',
    'Kablo karşı taraftan gelsin; kolu omuz hizasına kadar kaldır.', ['cable rise', 'cable lateral']),
  X('front-raise', 'Front Raise', 'Front Rise', ['shoulders'], 'w', 'frontRaise',
    'Kollar hafif bükük; omuz hizasına kadar öne kaldır.', ['front raise', 'önden kaldırış']),
  X('rear-delt-machine', 'Rear Delt Machine', 'Machine Back', ['shoulders', 'back'], 'w', 'reverseFly',
    'Göğsü pede yasla; kolları yana açarken kürek kemiklerini sık.', ['machine back', 'arka omuz makine', 'arka omz makine', 'reverse fly', 'reverse pec deck', 'rear delt']),
  X('cable-rear-delt', 'Cable Rear Delt Fly', 'Cable Back', ['shoulders'], 'w', 'cableRearFly',
    'Kablolar çapraz; kolları omuz hizasında yana aç.', ['cable back', 'cable rear delt']),
  X('face-pull', 'Face Pull', 'Face Pull', ['shoulders', 'back'], 'w', 'facePull',
    'Halatı yüzüne doğru çek, dirsekler yüksek ve geride.', ['face pull']),
  X('upright-row', 'Upright Row', 'Upright', ['shoulders'], 'w', 'uprightRow',
    'Barı göğüs hizasına çek, dirsekler ellerden yukarıda.', ['upright row']),
  X('shrug', 'Dumbbell Shrug', 'Shrug', ['shoulders', 'back'], 'w', 'shrug',
    'Omuzları kulaklara doğru kaldır, tepede bir saniye bekle.', ['shrug', 'omuz silkme']),

  // Göğüs
  X('bench-press', 'Bench Press', 'BP', ['chest', 'triceps'], 'w', 'benchPress',
    'Kürek kemikleri sıkışık, bar göğsün alt kısmına insin; ayaklar yere bassın.', ['bench press', 'bp', 'bench']),
  X('db-bench-press', 'Dumbbell Bench Press', 'DB Press', ['chest', 'triceps'], 'w', 'dbBench',
    'Dumbbelllar göğüs hizasına insin, yukarıda birbirine yaklaşsın.', ['db press', 'dumbbell bench']),
  X('incline-db-press', 'Incline Dumbbell Press', 'D Upper', ['chest', 'shoulders'], 'w', 'inclinePress',
    'Sehpa 30–45°; dumbbelllar üst göğse insin, yukarı it.', ['d upper', 'upper dp', 'incline press', 'incline dumbbell press']),
  X('chest-press-machine', 'Chest Press Machine', 'Chest Press', ['chest'], 'w', 'chestPress',
    'Tutacaklar göğüs hizasında; öne it, dirsekleri kilitleme.', ['chest press', 'göğüs makinesi']),
  X('pec-deck', 'Pec Deck (Chest Fly)', 'Pec Deck', ['chest'], 'w', 'pecDeck',
    'Kolları önde birleştir, göğsü sık; yavaşça aç.', ['pec deck', 'butterfly', 'chest fly']),
  X('db-fly', 'Dumbbell Fly', 'DB Fly', ['chest'], 'w', 'dbFly',
    'Dirsekler hafif bükük; kolları yana aç, göğüste gerilimi hisset.', ['db fly', 'dumbbell fly']),
  X('cable-crossover', 'Cable Crossover', 'Crossover', ['chest'], 'w', 'crossover',
    'Kabloları yukarıdan önde aşağıya doğru birleştir.', ['crossover', 'cable fly']),
  X('push-up', 'Şınav (Push-up)', 'Şınav', ['chest', 'triceps'], 'bw', 'pushUp',
    'Vücut tek çizgi; göğüs yere yaklaşana kadar in.', ['şınav', 'sinav', 'push up', 'pushup']),
  X('dips', 'Dips', 'Dips', ['chest', 'triceps'], 'bw', 'dips',
    'Paralel barlarda dirsekler geriye bükülerek in, kontrollü it.', ['dips', 'dip']),

  // Triceps
  X('triceps-pushdown', 'Triceps Cable Pushdown', 'Tri Cable', ['triceps'], 'w', 'pushdown',
    'Dirsekler gövdeye sabit; kabloyu aşağıda tam aç.', ['tri cable', 'triceps cable', 'tri cable down', 'cable pushdown', 'pushdown']),
  X('single-arm-pushdown', 'Tek Kol Triceps Pushdown', 'Tek Tek', ['triceps'], 'w', 'pushdownSingle',
    'Tek kolla çalış; dirsek sabit, aşağıda kolu tam aç.', ['tek tek', 'tri tek tek', 'tek kol triceps', 'single arm pushdown']),
  X('overhead-extension', 'Overhead Triceps Extension', 'Overhead Ext', ['triceps'], 'w', 'overheadExt',
    'Dirsekler başın yanında sabit; dumbbellı ense arkasına indir, yukarı uzat.', ['overhead extension', 'french press']),
  X('skull-crusher', 'Skull Crusher', 'Skull', ['triceps'], 'w', 'skullCrusher',
    'Üst kol sabit; barı alnına doğru indir, kolları aç.', ['skull crusher', 'lying triceps extension']),
  X('kickback', 'Triceps Kickback', 'Kickback', ['triceps'], 'w', 'kickback',
    'Üst kol gövdeye paralel; dumbbellı geriye doğru tam aç.', ['kickback']),

  // Biceps
  X('hammer-curl', 'Hammer Curl', 'Hammer', ['biceps'], 'w', 'hammerCurl',
    'Avuç içleri birbirine baksın; dirsekler sabit, yukarı kaldır.', ['hammer', 'bi hammer', 'hammer curl']),
  X('db-curl', 'Dumbbell Curl', 'DB Curl', ['biceps'], 'w', 'dbCurl',
    'Avuç içleri yukarı; dirsekleri sabit tut, omzu kullanma.', ['db curl', 'dumbbell curl', 'biceps curl']),
  X('barbell-curl', 'Barbell Curl', 'BB Curl', ['biceps'], 'w', 'barbellCurl',
    'Bar omuz genişliğinde; gövdeyi sallamadan kaldır.', ['barbell curl', 'bb curl']),
  X('ez-reverse-curl', 'Reverse EZ-bar Curl', 'Z Bar Ters', ['biceps'], 'w', 'barbellCurl',
    'Barı üstten tut (avuçlar aşağı); ön kolu da çalıştırır.', ['z bar ters curl', 'reverse curl', 'ters curl', 'ez reverse curl']),
  X('preacher-curl', 'Preacher Curl', 'Preacher', ['biceps'], 'w', 'preacher',
    'Üst kol pede yaslı; tam açıp kontrollü kaldır.', ['preacher', 'scott curl']),
  X('cable-curl', 'Cable Curl', 'Cable Curl', ['biceps'], 'w', 'cableCurl',
    'Alt makaradan; dirsekler sabit, sürekli gerilim.', ['cable curl']),

  // Bacak
  X('squat', 'Squat', 'Squat', ['legs'], 'w', 'squat',
    'Bar üst sırtta; kalçayı geriye-aşağı gönder, dizler ayak uçlarıyla aynı yönde.', ['squat', 'çömelme']),
  X('goblet-squat', 'Goblet Squat', 'Goblet', ['legs'], 'w', 'gobletSquat',
    'Dumbbell göğüs önünde; gövde dik, derin çömel.', ['goblet', 'goblet squat']),
  X('leg-press', 'Leg Press', 'LP', ['legs'], 'w', 'legPress',
    'Bel pede yapışık; dizleri kilitlemeden it.', ['leg press', 'lp']),
  X('leg-extension', 'Leg Extension', 'Leg Ext', ['legs'], 'w', 'legExt',
    'Bacakları tam aç, tepede kısa bekle; yavaş indir.', ['leg extension', 'leg ext']),
  X('leg-curl', 'Lying Leg Curl', 'Leg Curl', ['legs'], 'w', 'legCurl',
    'Kalça pede yapışık; topukları kalçana doğru çek.', ['leg curl']),
  X('rdl', 'Romanian Deadlift', 'RDL', ['legs', 'back'], 'w', 'rdl',
    'Dizler hafif bükük; kalçayı geriye ittirerek barı kaval kemiğine kadar indir.', ['rdl', 'romanian deadlift']),
  X('lunge', 'Dumbbell Lunge', 'Lunge', ['legs'], 'w', 'lunge',
    'Ön diz ayak bileğinin üstünde; arka diz yere yaklaşsın.', ['lunge', 'hamle']),
  X('hip-thrust', 'Hip Thrust', 'Hip Thrust', ['legs'], 'w', 'hipThrust',
    'Sırt sehpada; kalçayı sıkarak gövde düz olana kadar kaldır.', ['hip thrust', 'glute bridge']),
  X('calf-raise', 'Calf Raise', 'Calf', ['legs'], 'w', 'calfRaise',
    'Parmak uçlarına yüksel, tepede bekle; topukları yavaş indir.', ['calf raise', 'baldır']),

  // Karın
  X('crunch', 'Crunch', 'Crunch', ['core'], 'bw', 'crunch',
    'Bel yerde; omuzları kaldırarak karnını sık.', ['crunch', 'mekik']),
  X('plank', 'Plank', 'Plank', ['core'], 'time', 'plank',
    'Dirsekler omuz altında, vücut tek çizgi; kalçayı düşürme.', ['plank']),
  X('hanging-leg-raise', 'Hanging Leg Raise', 'Leg Raise', ['core'], 'bw', 'legRaise',
    'Bardan asıl; sallanmadan bacakları yukarı kaldır.', ['leg raise', 'bacak kaldırma']),
  X('cable-crunch', 'Cable Crunch', 'Cable Crunch', ['core'], 'w', 'cableCrunch',
    'Diz çök, halatı başının yanında tut; karnınla aşağı kıvrıl.', ['cable crunch']),

  // Kardiyo
  X('treadmill', 'Koşu Bandı', 'Koşu', ['cardio'], 'cardio', 'run',
    'Isınma için 5–10 dakika tempolu yürüyüş ya da hafif koşu.', ['koşu', 'kosu', 'treadmill', 'yürüyüş']),
  X('bike', 'Bisiklet', 'Bisiklet', ['cardio'], 'cardio', 'bike',
    'Sele kalça hizasında; sabit tempoda pedal çevir.', ['bisiklet', 'bike']),
  X('rowing-machine', 'Kürek Makinesi', 'Kürek', ['cardio'], 'cardio', 'rowMachine',
    'Önce bacaklarla it, sonra gövde ve kollarla çek.', ['kürek', 'rower', 'rowing']),
  X('elliptical', 'Eliptik', 'Eliptik', ['cardio'], 'cardio', 'run',
    'Dik dur, kolları da kullanarak sabit tempoda devam et.', ['eliptik', 'elliptical']),
];

// Kendi hareketini eklerken bölgeye göre önerilen animasyon.
export const DEFAULT_ANIM = {
  chest: 'benchPress', back: 'seatedRow', shoulders: 'dbPress', biceps: 'dbCurl',
  triceps: 'pushdown', legs: 'squat', core: 'crunch', cardio: 'run',
};
