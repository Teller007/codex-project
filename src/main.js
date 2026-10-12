import '@fontsource/heebo/400.css';
import '@fontsource/heebo/500.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import '@fontsource/anton';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { renderPoster, WIDTH, HEIGHT } from './poster.js';
import { readImage, removeBackground, hasTransparency, loadImage, canvasToBlob, download } from './images.js';

const icons = {
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  reset: '<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header"><a class="brand" href="./" aria-label="Post Studio, עמוד הבית"><span class="brand-mark">p<span>.</span></span><span dir="ltr">POST<span class="brand-divider">/</span>STUDIO</span></a><div class="event-label"><span class="live-dot"></span><span dir="ltr">SPORTS TECH NATION 2026</span></div></header>
  <main>
    <section class="intro"><p class="eyebrow">YOUR NEXT POST STARTS HERE</p><h1>אתם בפריים.<br><span>הפוסט כבר מוכן.</span></h1><p class="intro-copy">תמונה שלכם, שם וטייטל. כמה רגעים — ויש לכם פוסט ללינקדאין.</p></section>
    <div class="workspace">
      <section class="editor" aria-label="עריכת הפוסט">
        <div class="section-heading"><div><span class="step-number">01</span><h2>נעים להכיר</h2></div><span class="small-note">הפרטים שלכם</span></div>
        <div class="field"><label for="name">שם מלא <span>כמו שיופיע בפוסט</span></label><input id="name" type="text" placeholder="לדוגמה: Dana Cohen" maxlength="50" autocomplete="name" dir="auto" /><span id="name-count" class="field-count" aria-hidden="true">0 / 50</span></div>
        <div class="field"><label for="title">טייטל <span>תפקיד או חברה</span></label><input id="title" type="text" placeholder="לדוגמה: Founder & CEO" maxlength="70" autocomplete="organization-title" dir="auto" /></div>
        <div class="section-heading photo-heading"><div><span class="step-number">02</span><h2>התמונה שלכם</h2></div><span class="small-note">עכשיו אתם</span></div>
        <input id="photo" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" aria-label="העלאת תמונה" />
        <button id="upload" class="upload-area" type="button"><span class="upload-icon">${icon('upload')}</span><strong id="upload-label">העלו תמונה שלכם</strong><span id="upload-hint">גררו לכאן או לחצו לבחירת קובץ</span><span class="file-types" dir="ltr">JPG, PNG, WebP · up to 20 MB</span></button>
        <div class="photo-guidance">${icon('image')}<p>לתוצאה הכי טובה: צילום מול המצלמה, מהמותניים ומעלה, עם ידיים משולבות.</p></div>
        <div class="processing-options"><label class="check-option"><input type="checkbox" id="remove-bg" checked /><span>הסרת רקע אוטומטית</span>${icon('sparkle')}</label><p>הפנים והפוזה נשארים כמו בתמונה המקורית.</p><p>אם הרקע כבר הוסר מהתמונה, אפשר לבטל את האפשרות.</p></div>
        <details id="position-panel" class="adjustments"><summary>${icon('settings')}<span>דיוק המיקום והתאורה</span><span class="chevron">⌄</span></summary><div class="sliders"><div class="range-field"><label for="scale">גודל התמונה <output id="scale-value">100%</output></label><input id="scale" type="range" min="60" max="155" value="100" /></div><div class="range-field"><label for="offset-x">מיקום אופקי</label><input id="offset-x" type="range" min="-220" max="220" value="0" /></div><div class="range-field"><label for="offset-y">מיקום אנכי</label><input id="offset-y" type="range" min="-300" max="300" value="0" /></div><div class="range-field"><label for="rim">אור כתום בקצוות <output id="rim-value">65%</output></label><input id="rim" type="range" min="0" max="100" value="65" /></div><button id="reset-position" class="text-button" type="button">${icon('reset')}איפוס מיקום</button><p class="adjustment-note">האפקט מוסיף זוהר בקצוות; הוא אינו משנה את התאורה על הפנים.</p></div></details>
        <button id="download" class="primary-button" type="button" disabled>${icon('download')}<span>הורדת הפוסט שלי</span>${icon('arrow')}</button>
        <p id="status" class="status" role="status" aria-live="polite">הוסיפו שם, טייטל ותמונה כדי להוריד את הפוסט.</p>
        <div class="privacy">${icon('lock')}<span>התמונה שלכם נשארת בדפדפן. אין העלאה לשרת.</span></div>
      </section>
      <section class="preview-section" aria-label="תצוגה מקדימה"><div class="preview-heading"><span><span class="live-dot"></span> תצוגה מקדימה</span><span class="format-pill" dir="ltr">PNG · 1080 × 1350</span></div><div class="poster-stage"><div class="poster-frame"><canvas id="poster" width="${WIDTH}" height="${HEIGHT}" aria-label="תצוגה מקדימה של הפוסט שלכם"></canvas><span id="sample-badge" class="sample-badge">תמונת הדגמה</span></div></div><div class="preview-caption"><span>${icon('check')}מוכן לפיד שלכם</span><span id="template-label">תצוגת דוגמה לפי העיצוב</span></div></section>
    </div>
    <details class="template-settings"><summary><span>${icon('settings')}הגדרת העיצוב ושיתוף הטופס</span><span class="chevron">⌄</span></summary><div class="template-content"><div><h3>העיצוב שלכם, בדיוק כמו בקאנבה</h3><p>העלו את שכבת ה-PNG השקופה עם כל הטקסטים והלוגואים, ללא האדם, השם והטייטל. היא תופיע מעל התמונה, על רקע שחור.</p><p class="template-small">התבנית מיועדת לאותם מיקומים כמו בדוגמה. מומלץ לייצא במידות 1080 × 1350, או באותו יחס.</p><label class="secondary-button" for="foreground">${icon('upload')}העלאת שכבת העיצוב</label><input id="foreground" class="visually-hidden" type="file" accept="image/png" /><p id="layer-status" class="layer-status">עדיין לא הועלתה השכבה המקורית. מוצגת הדמיה של העיצוב.</p></div><div class="template-share"><h3>שלחו לאחרים את הטופס שלכם</h3><p>אחרי העלאת שכבת העיצוב, הורידו חבילת אתר. העלו אותה לאחסון אתר סטטי, ושלחו את הקישור למקבלים. העיצוב ייטען אצל כולם באופן אוטומטי.</p><button id="export-site" type="button" class="secondary-button">${icon('download')}הורדת האתר עם העיצוב שלי</button><button id="reset-template" type="button" class="text-button">חזרה לעיצוב הדוגמה</button><p class="template-small">החבילה כוללת את העיצוב בלבד; התמונה והפרטים האישיים שלכם אינם נכללים.</p></div></div></details>
  </main>
  <footer><span dir="ltr">Made for the people moving sports forward.</span><span dir="ltr">POST / STUDIO <span class="footer-dot">●</span> 2026</span></footer>
`;

const $ = (selector) => document.querySelector(selector);
const state = { name: '', title: '', portrait: null, foreground: null, background: null, cutout: true, scale: 1, x: 0, y: 0, rim: 65, uploaded: false };
let originalPhoto = null;
let publishedTemplate = null;
let busy = false;
let drawFrame;

function draw() {
  cancelAnimationFrame(drawFrame);
  drawFrame = requestAnimationFrame(() => renderPoster($('#poster'), state));
  $('#download').disabled = busy || !state.uploaded || !state.name.trim() || !state.title.trim();
}
function setStatus(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function setBusy(value) {
  busy = value;
  $('#upload').disabled = value;
  $('#remove-bg').disabled = value;
  $('#photo').disabled = value;
  $('#upload').classList.toggle('processing', value);
  draw();
}

async function processPhoto() {
  if (!originalPhoto || busy) return;
  setBusy(true);
  const remove = $('#remove-bg').checked;
  setStatus(remove ? 'מכינים את התמונה ומסירים את הרקע…' : 'מכינים את התמונה…');
  try {
    const result = remove ? await removeBackground(originalPhoto) : originalPhoto;
    state.portrait = result;
    state.cutout = hasTransparency(result);
    state.uploaded = true;
    $('#sample-badge').hidden = true;
    $('#upload-label').textContent = 'התמונה שלכם בפנים';
    $('#upload-hint').textContent = 'לחצו כדי להחליף תמונה';
    $('#upload').classList.add('has-image');
    setStatus('התמונה מוכנה. אפשר לדייק את המיקום לפני ההורדה.');
  } catch (error) { setStatus(error.message, true); }
  finally { setBusy(false); }
}
async function uploadPhoto(file) {
  if (busy || !file) return;
  try {
    const next = await readImage(file);
    originalPhoto = next;
    await processPhoto();
  } catch (error) { setStatus(error.message, true); }
}

$('#upload').addEventListener('click', () => $('#photo').click());
$('#photo').addEventListener('change', async (e) => { await uploadPhoto(e.target.files[0]); e.target.value = ''; });
$('#remove-bg').addEventListener('change', processPhoto);
['dragenter', 'dragover'].forEach((event) => $('#upload').addEventListener(event, (e) => { e.preventDefault(); $('#upload').classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => $('#upload').addEventListener(event, (e) => { e.preventDefault(); $('#upload').classList.remove('dragging'); }));
$('#upload').addEventListener('drop', (e) => uploadPhoto(e.dataTransfer.files[0]));
['name', 'title'].forEach((field) => $(`#${field}`).addEventListener('input', (e) => { state[field] = e.target.value; $('#name-count').textContent = `${state.name.length} / 50`; draw(); }));
const controls = { scale: (v) => { state.scale = v / 100; $('#scale-value').value = `${v}%`; }, 'offset-x': (v) => { state.x = v; }, 'offset-y': (v) => { state.y = v; }, rim: (v) => { state.rim = v; $('#rim-value').value = `${v}%`; } };
Object.entries(controls).forEach(([id, update]) => $(`#${id}`).addEventListener('input', (e) => { update(Number(e.target.value)); draw(); }));
$('#reset-position').addEventListener('click', () => { Object.entries({ scale: 100, 'offset-x': 0, 'offset-y': 0, rim: 65 }).forEach(([id, value]) => { $(`#${id}`).value = value; controls[id](value); }); draw(); });

$('#download').addEventListener('click', async () => {
  if (busy || !state.uploaded || !state.name.trim() || !state.title.trim()) return;
  try {
    await document.fonts.ready;
    renderPoster($('#poster'), state);
    const filename = state.name.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-').slice(0, 60) || 'my-post';
    download(await canvasToBlob($('#poster')), `${filename}-sports-tech-nation.png`);
    setStatus('הפוסט מוכן! הקובץ הורד ואפשר להעלות אותו ללינקדאין.');
  } catch (error) { setStatus(error.message, true); }
});

async function setForeground(source) {
  if (!hasTransparency(source)) throw new Error('השכבה אינה שקופה. ייצאו מקאנבה PNG עם רקע שקוף, כדי שהתמונה תישאר גלויה מתחת לטקסט.');
  if (Math.abs((source.width / source.height) / (WIDTH / HEIGHT) - 1) > .025) throw new Error('יחס המידות שונה מהתבנית. ייצאו את כל הדף מקאנבה באותו יחס כמו הדוגמה.');
  state.foreground = source;
  $('#template-label').textContent = 'העיצוב המקורי שלכם';
  $('#layer-status').textContent = 'השכבה שלכם נטענה. כל הטקסטים והלוגואים מוצגים מעל התמונה.';
  draw();
}
$('#foreground').addEventListener('change', async (e) => {
  if (!e.target.files[0]) return;
  try { await setForeground(await readImage(e.target.files[0], { layer: true })); setStatus('העיצוב שלכם נטען בהצלחה.'); }
  catch (error) { setStatus(error.message, true); $('#layer-status').textContent = error.message; }
  finally { e.target.value = ''; }
});
$('#reset-template').addEventListener('click', () => {
  state.foreground = publishedTemplate;
  $('#template-label').textContent = publishedTemplate ? 'העיצוב המקורי שלכם' : 'תצוגת דוגמה לפי העיצוב';
  $('#layer-status').textContent = publishedTemplate ? 'העיצוב המקורי שמור וטעון.' : 'מוצגת הדמיה של העיצוב.';
  draw();
});

$('#export-site').addEventListener('click', async () => {
  const button = $('#export-site');
  button.disabled = true;
  setStatus('מכינים את האתר לשיתוף…');
  try {
    const { default: JSZip } = await import('jszip');
    const base = import.meta.env.DEV ? '/site-export/' : import.meta.env.BASE_URL;
    const response = await fetch(`${base}site-manifest.json`);
    if (!response.ok) throw new Error('חבילת האתר עדיין לא נבנתה. הריצו npm run build ונסו שוב.');
    const files = await response.json();
    const zip = new JSZip();
    // Small batches keep memory and simultaneous requests bounded on mobile.
    for (let i = 0; i < files.length; i += 4) {
      await Promise.all(files.slice(i, i + 4).map(async (file) => {
        if (file === 'template.json' || file === 'site-manifest.json') return;
        const asset = await fetch(`${base}${file}`);
        if (!asset.ok) throw new Error('אחד מקבצי האתר לא נטען. נסו שוב.');
        zip.file(file, await asset.arrayBuffer());
      }));
    }
    zip.file('template.json', JSON.stringify({ version: 1, foreground: state.foreground ? state.foreground.toDataURL('image/png') : null }));
    zip.file('site-manifest.json', JSON.stringify([...new Set([...files, 'template.json'])]));
    download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } }), 'sports-tech-post-studio.zip');
    setStatus('האתר הורד עם העיצוב שלכם. העלו את החבילה לאחסון אתר סטטי ושלחו את הקישור.');
  } catch (error) { setStatus(error.message, true); }
  finally { button.disabled = false; }
});

await Promise.all([
  document.fonts.load('138px Anton'),
  document.fonts.load('700 68px "Barlow Condensed"'),
  document.fonts.load('400 39px "Barlow Condensed"'),
  document.fonts.load('700 68px Heebo', 'שם'),
]);
await document.fonts.ready;
draw();
// Fixed sample only; visitors' photos and personal details are never persisted.
try {
  const sample = await loadImage(`${import.meta.env.BASE_URL}demo-portrait.png`);
  if (!state.uploaded && !busy) { state.portrait = sample; draw(); }
} catch { /* A neutral silhouette remains if the demo asset is unavailable. */ }
try {
  const response = await fetch(`${import.meta.env.BASE_URL}template.json`);
  if (response.ok) {
    const config = await response.json();
    let source = null;
    if (config.version === 1 && typeof config.foreground === 'string' && config.foreground.length < 30_000_000) {
      if (config.foreground.startsWith('data:image/png;base64,')) source = config.foreground;
      else {
        const base = new URL(import.meta.env.BASE_URL, location.href);
        const asset = new URL(config.foreground, base);
        if (asset.origin === base.origin && asset.pathname.startsWith(base.pathname) && asset.pathname.endsWith('.png')) source = asset.href;
      }
    }
    if (source) {
      const image = await loadImage(source);
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      await setForeground(canvas);
      publishedTemplate = canvas;
      $('#reset-template').textContent = 'חזרה לעיצוב המקורי';
    }
  }
} catch { setStatus('לא ניתן לטעון את שכבת העיצוב השמורה. אפשר להעלות אותה דרך הגדרות העיצוב.', true); }
