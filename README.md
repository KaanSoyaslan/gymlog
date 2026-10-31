<p align="center">
  <img src="icons/icon-512.png" alt="GymLog logo" width="88">
</p>

<h1 align="center">GymLog</h1>

<p align="center">
  <b>A workout log that replaces the notes app on your phone.</b><br>
  Animated exercises, one-tap "copy last workout", plans and progress charts. Free, offline, no account.
</p>

<p align="center">
  <a href="https://kaansoyaslan.github.io/gymlog/"><b>▶ Open the app</b></a>
  &nbsp;·&nbsp;
  <a href="https://kaansoyaslan.github.io/gymlog/?demo">Try the demo</a>
  &nbsp;·&nbsp;
  <a href="#türkçe">🇹🇷 Türkçe</a>
</p>

<p align="center">
  <img src="docs/screenshots/home.jpg" alt="Workout tab: suggested next plan, saved plans and recent workouts to copy" width="200">
  <img src="docs/screenshots/workout.jpg" alt="Logging a workout: weight, reps and assisted reps per set, last time's numbers and a new record highlighted" width="200">
  <img src="docs/screenshots/history.jpg" alt="History: workouts grouped by month in the same short format as the old notes" width="200">
</p>
<p align="center">
  <img src="docs/screenshots/progress.jpg" alt="Progress: body weight chart, training calendar and workouts per month" width="200">
  <img src="docs/screenshots/library.jpg" alt="Exercise library with an animation for every exercise" width="200">
  <img src="docs/screenshots/detail.jpg" alt="Exercise detail: animation, tip, best set and estimated one-rep max" width="200">
</p>

## Overview

GymLog started as a plain text file on a phone: a date with the body weight in brackets, then one line per exercise such as `lpd 54x12 x3`. It worked, but there were no charts, no way to see last week's numbers at a glance, and every workout was typed from scratch.

GymLog keeps that speed and adds the rest. Start a workout by copying a previous one or a saved plan, change only the weights that went up, and save. Every exercise has a small animation, so abbreviations like `LPD` or `D Rise` turn into something you can recognise. Your old notes can be pasted in once and are converted automatically.

It is a progressive web app (PWA): it runs in the phone's browser, can be installed to the home screen and works offline at the gym. There is no server and no account; everything is stored on your device. The interface is available in English and Turkish.

## Features

**Logging**
- Pick the muscle groups for the day (chest, back, shoulders, biceps, triceps, legs, core, cardio) and choose exercises from those groups, or search by name or abbreviation.
- Per set: weight, reps and assisted/partial reps (`7+3`). Bodyweight, timed and cardio exercises have their own fields.
- Last time's numbers appear on every exercise and as placeholders in the inputs. A new record is highlighted while you type.
- Change the first set's weight and the following sets with the same weight update too.
- Swap an exercise for another one from the same group, reorder, skip ("pas geç") or add a note to a single exercise (for example "machine was broken").
- A general note and a quick "how was it?" rating for the whole workout. The draft is saved continuously, so closing the browser loses nothing.

**Copy and plans**
- Copy any previous workout with one tap and only adjust what changed.
- Save workouts as plans. Starting a plan fills in the weights you used last time for each exercise.
- "Next up" suggests the plan you haven't done for the longest time, and plans can be suggested automatically from your history.

**Exercises**
- 56 built-in exercises, each with an animated figure showing the movement, the target muscles highlighted, and a short form tip.
- Add your own exercises: name, abbreviation, muscle groups, type and one of 54 animations. Built-in exercises can be renamed or hidden.

**Progress**
- Body-weight chart with 3 month, 6 month, 1 year and all-time views and an optional goal line.
- Training calendar (heatmap), workouts per month, longest break, weekly average.
- Per-exercise progress: heaviest set, estimated one-rep max (Epley) or volume, plus personal records.
- Sets per muscle group over the last 30 days.

**Importing old notes**
- Paste the text file from your phone. GymLog reads the date lines (`02 01 26 (80.9)`), the exercise lines and common formats such as `50x12 x3`, `54 54 54 12 12 10+2`, `59 63 63 10x3`, `4x10 55 60 60 60` and `7(+3)`.
- Typos are matched to the closest exercise (`barfiz`, `kpd`, `machin3 back`), `pass`/`skip` marks an exercise as skipped and any other words become notes.
- Dates that are out of order are flagged with a suggested fix, and you can review everything before importing.

## Getting started

1. Open <https://kaansoyaslan.github.io/gymlog/> in **Chrome** on your phone, then use ⋮ → **Add to Home screen** (or **Install app**).
2. To bring in your old notes: **Settings → Import my old notes**, paste the text, check the preview and import.
3. On the **Workout** tab, start from a plan, copy a previous workout or start an empty one.
4. Take a backup now and then (**Settings → Download backup**). You can restore it on another phone.

The app opens in your phone's language (English or Turkish); you can switch it any time under **Settings → Language**.

## Privacy

- Workouts, plans, custom exercises and settings are stored only in your browser's local storage. Nothing is sent to GitHub or to any other server.
- Importing old notes happens entirely on the device.
- Clearing the browser's site data deletes your log, so keep a backup file.

## Run locally

With Windows PowerShell (any static file server works too):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8080>. Add `?demo` (<http://localhost:8080/?demo>) to try it with sample data; demo mode uses separate storage and never touches your own log.

## Project structure

| File | Purpose |
|---|---|
| `js/app.js` | Screens and flow: workout editor, history, progress, library, settings, import |
| `js/anim.js` | Exercise animations: a small stick-figure rig with forward and inverse kinematics, and 54 movement patterns |
| `js/exercises.js` | Built-in exercises, muscle groups and abbreviations |
| `js/store.js` | On-device storage, records, last performance, plan suggestions |
| `js/importer.js` | Parser that turns the old text notes into workouts |
| `js/charts.js` | Dependency-free SVG charts: line, columns, bars and calendar heatmap |
| `js/ui.js` | Small UI helpers: elements, bottom sheets, dialogs, toasts, icons |
| `js/i18n.js` | English and Turkish interface texts, with automatic language detection |
| `js/format.js` | Date and number formatting in both languages |
| `js/demo.js` | Generated sample data for demo mode |
| `sw.js`, `manifest.webmanifest` | Installable, offline-capable PWA |

It is built with plain HTML, CSS and JavaScript, with no framework, no dependencies and no build step.

## Known limitations

- Data lives in one browser on one device. Use the backup file to move it to another phone; there is no automatic sync.
- The import is tuned for the "exercise weight x reps x sets" style of notes. Unusual lines are kept as notes and marked for review instead of being guessed.

---

## Türkçe

<p>
  <b>Telefondaki not dosyasının yerini alan bir spor defteri.</b><br>
  Animasyonlu hareketler, tek dokunuşla "son antrenmanı kopyala", planlar ve gelişim grafikleri. Ücretsiz, çevrimdışı çalışır, hesap gerekmez.
</p>

**Uygulamayı aç:** <https://kaansoyaslan.github.io/gymlog/> · **Demo:** <https://kaansoyaslan.github.io/gymlog/?demo>

<p align="center">
  <img src="docs/screenshots/tr-home.jpg" alt="Antrenman sekmesi: sıradaki plan, kayıtlı planlar ve kopyalanacak son antrenmanlar" width="200">
  <img src="docs/screenshots/tr-workout.jpg" alt="Antrenman kaydı: set set ağırlık, tekrar ve yardımlı tekrar; geçen seferki rakamlar ve yeni rekor vurgusu" width="200">
  <img src="docs/screenshots/tr-progress.jpg" alt="Gelişim: kilo grafiği, spor takvimi ve aylık antrenman sayısı" width="200">
</p>

### Genel bakış

GymLog, telefondaki düz bir metin dosyasından doğdu: parantez içinde kiloyla bir tarih, ardından her hareket için `lpd 54x12 x3` gibi bir satır. İşe yarıyordu ama grafik yoktu, geçen haftanın rakamlarını görmek zordu ve her antrenman sıfırdan yazılıyordu.

GymLog bu hızı korur, eksikleri tamamlar. Antrenmana önceki bir antrenmanı ya da kayıtlı bir planı kopyalayarak başlarsın, sadece artan ağırlıkları değiştirir ve kaydedersin. Her hareketin küçük bir animasyonu var; `LPD` ya da `D Rise` gibi kısaltmalar gözle tanınır hale gelir. Eski notlarını bir kez yapıştırman yeterli, otomatik olarak antrenmanlara çevrilir.

Telefonun tarayıcısında çalışan bir web uygulamasıdır (PWA): ana ekrana eklenebilir ve salonda internet olmasa da açılır. Sunucu ya da hesap yok; her şey cihazında saklanır. Arayüz Türkçe ve İngilizce.

### Özellikler

**Kayıt**
- Günün bölgelerini seç (göğüs, sırt, omuz, biceps, triceps, bacak, karın, kardiyo), hareketleri bu bölgelerden seç ya da adıyla veya kısaltmasıyla ara.
- Her set için ağırlık, tekrar ve yardımlı/yarım tekrar (`7+3`). Vücut ağırlığı, süreli ve kardiyo hareketlerinin kendi alanları var.
- Her harekette geçen seferki rakamlar görünür, kutulara da silik olarak yazılır. Yeni rekor yazarken vurgulanır.
- İlk setin ağırlığını değiştirince aynı ağırlıktaki sonraki setler de güncellenir.
- Bir hareketi aynı bölgeden başka bir hareketle değiştir, sırasını değiştir, pas geç ya da sadece o harekete not düş (ör. "alet bozuktu").
- Antrenmanın tamamı için genel not ve "nasıldı?" değerlendirmesi. Taslak sürekli kaydedilir; tarayıcı kapansa da bir şey kaybolmaz.

**Kopyalama ve planlar**
- Önceki herhangi bir antrenmanı tek dokunuşla kopyala, sadece değişenleri düzelt.
- Antrenmanları plan olarak kaydet. Plan başlatıldığında her hareket için en son kullandığın ağırlıklar gelir.
- "Sıradaki" kartı en uzun süredir yapmadığın planı önerir; planlar geçmişinden otomatik olarak da önerilebilir.

**Hareketler**
- Hazır 56 hareket; her birinde hareketi gösteren animasyonlu bir figür, çalışan kas vurgusu ve kısa bir teknik ipucu.
- Kendi hareketini ekle: ad, kısaltma, bölgeler, kayıt türü ve 54 animasyondan biri. Hazır hareketlerin adı değiştirilebilir ya da gizlenebilir.

**Gelişim**
- 3 ay, 6 ay, 1 yıl ve tüm zamanlar görünümlü kilo grafiği, istersen hedef kilo çizgisi.
- Spor takvimi (ısı haritası), aylık antrenman sayısı, en uzun ara, haftalık ortalama.
- Hareket bazında gelişim: en ağır set, tahmini 1RM (Epley) ya da hacim; kişisel rekorlar.
- Son 30 günde bölgelere göre set sayısı.

**Eski notları içe aktarma**
- Telefondaki metin dosyasını yapıştır. GymLog tarih satırlarını (`02 01 26 (80.9)`), hareket satırlarını ve `50x12 x3`, `54 54 54 12 12 10+2`, `59 63 63 10x3`, `4x10 55 60 60 60`, `7(+3)` gibi yazımları okur.
- Yazım hataları en yakın harekete eşlenir (`barfiz`, `kpd`, `machin3 back`); `pass`/`skip` hareketi pas geçilmiş sayar, diğer kelimeler not olur.
- Sırası bozuk tarihler önerilen düzeltmeyle işaretlenir; içe aktarmadan önce her şeyi gözden geçirebilirsin.

### Başlarken

1. Telefonda **Chrome** ile <https://kaansoyaslan.github.io/gymlog/> adresini aç, ⋮ → **Ana ekrana ekle** (ya da **Uygulamayı yükle**) de.
2. Eski notlarını almak için: **Ayarlar → Eski notlarımı içe aktar**, metni yapıştır, önizlemeyi kontrol et ve içe aktar.
3. **Antrenman** sekmesinde bir plandan başla, önceki antrenmanı kopyala ya da boş bir antrenman başlat.
4. Arada bir yedek al (**Ayarlar → Yedeği indir**). Yedeği başka bir telefonda geri yükleyebilirsin.

Uygulama telefonun diliyle (Türkçe ya da İngilizce) açılır; **Ayarlar → Dil** bölümünden istediğin zaman değiştirebilirsin.

### Gizlilik

- Antrenmanlar, planlar, kendi hareketlerin ve ayarlar sadece tarayıcının yerel depolamasında (localStorage) tutulur. GitHub'a ya da başka bir sunucuya hiçbir şey gönderilmez.
- Eski notların içe aktarılması tamamen cihazda yapılır.
- Tarayıcının site verilerini silmek kayıtlarını da siler; bu yüzden yedek dosyası sakla.

### Bilgisayarda çalıştırma

Windows PowerShell ile (herhangi bir statik dosya sunucusu da olur):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Ardından <http://localhost:8080> adresini aç. Örnek verilerle denemek için sonuna `?demo` ekle (<http://localhost:8080/?demo>); demo modu ayrı bir depolama kullanır, kendi kayıtlarına dokunmaz.

### Bilinen sınırlamalar

- Veriler tek cihazda, tek tarayıcıda durur. Başka telefona taşımak için yedek dosyasını kullan; otomatik eşitleme yok.
- İçe aktarma "hareket ağırlık x tekrar x set" tarzı notlara göre ayarlandı. Alışılmadık satırlar tahmin edilmez; not olarak saklanır ve kontrol için işaretlenir.
