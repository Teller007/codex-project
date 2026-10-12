import '@fontsource/heebo/400.css';
import '@fontsource/heebo/500.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import '@fontsource/anton';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { renderPoster, WIDTH, HEIGHT } from './poster.js';
import { PHOTO_DEFAULTS } from './photo-effects.js';
import { t, getLanguage, setLanguage, localizedError } from './i18n.js';
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

const copy = (key, cls = '') => `<span class="${cls}" data-i18n="${key}">${t(key)}</span>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" data-i18n-aria-label="home" aria-label="${t('home')}"><span class="brand-mark">p<span>.</span></span><span dir="ltr">POST<span class="brand-divider">/</span>STUDIO</span></a>
    <div class="header-actions"><div class="event-label"><span class="live-dot"></span><span dir="ltr">SPORTS TECH NATION 2026</span></div>
      <label class="language-picker" for="language">${copy('language', 'visually-hidden')}<select id="language" data-i18n-aria-label="language" aria-label="${t('language')}" dir="ltr"><option value="en" lang="en">English</option><option value="he" lang="he">עברית</option></select></label>
    </div>
  </header>
  <main>
    <section class="intro"><p class="eyebrow">YOUR NEXT POST STARTS HERE</p><h1>${copy('headlineFirst', 'headline-primary')}<br>${copy('headlineSecond')}</h1><p class="intro-copy" data-i18n="intro">${t('intro')}</p></section>
    <div class="workspace">
      <section class="editor" data-i18n-aria-label="editor" aria-label="${t('editor')}">
        <div class="section-heading"><div><span class="step-number">01</span><h2 data-i18n="meet">${t('meet')}</h2></div>${copy('details', 'small-note')}</div>
        <div class="field"><label for="name">${copy('name', 'field-name')} ${copy('nameHint')}</label><input id="name" type="text" data-i18n-placeholder="namePlaceholder" placeholder="${t('namePlaceholder')}" maxlength="50" autocomplete="name" dir="auto" /><span id="name-count" class="field-count" aria-hidden="true">0 / 50</span></div>
        <div class="field"><label for="title">${copy('title', 'field-name')} ${copy('titleHint')}</label><input id="title" type="text" data-i18n-placeholder="titlePlaceholder" placeholder="${t('titlePlaceholder')}" maxlength="70" autocomplete="organization-title" dir="auto" /></div>
        <div class="section-heading photo-heading"><div><span class="step-number">02</span><h2 data-i18n="photo">${t('photo')}</h2></div>${copy('yourTurn', 'small-note')}</div>
        <input id="photo" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" data-i18n-aria-label="photoInput" aria-label="${t('photoInput')}" />
        <button id="upload" class="upload-area" type="button"><span class="upload-icon">${icon('upload')}</span><strong id="upload-label" data-i18n="uploadPhoto">${t('uploadPhoto')}</strong><span id="upload-hint" data-i18n="uploadHint">${t('uploadHint')}</span><span class="file-types" dir="ltr">JPG, PNG, WebP · up to 20 MB</span></button>
        <div class="photo-guidance">${icon('image')}<p data-i18n="photoGuidance">${t('photoGuidance')}</p></div>
        <div class="processing-options">
          <label class="check-option"><input type="checkbox" id="remove-bg" checked />${copy('removeBackground')}${icon('sparkle')}</label><p data-i18n="poseNote">${t('poseNote')}</p><p data-i18n="cutoutNote">${t('cutoutNote')}</p>
          <label class="check-option enhancement-option"><input type="checkbox" id="enhance" checked />${copy('enhance')}${icon('sparkle')}</label><p data-i18n="enhanceNote">${t('enhanceNote')}</p>
        </div>
        <details id="position-panel" class="adjustments"><summary>${icon('settings')}${copy('position')}<span class="chevron">⌄</span></summary><div class="sliders">
          <div class="range-field"><label for="scale">${copy('scale')} <output id="scale-value">100%</output></label><input id="scale" type="range" min="60" max="155" value="100" /></div>
          <div class="range-field"><label for="offset-x" data-i18n="horizontal">${t('horizontal')}</label><input id="offset-x" type="range" min="-220" max="220" value="0" /></div>
          <div class="range-field"><label for="offset-y" data-i18n="vertical">${t('vertical')}</label><input id="offset-y" type="range" min="-300" max="300" value="0" /></div>
          <button id="reset-position" class="text-button" type="button">${icon('reset')}${copy('resetPosition')}</button>
        </div></details>
        <details id="effects-panel" class="adjustments"><summary>${icon('sparkle')}${copy('effects')}<span class="chevron">⌄</span></summary><div class="sliders"><div class="tone-controls">
          <div class="range-field"><label for="brightness">${copy('brightness')} <output id="brightness-value">104%</output></label><input id="brightness" type="range" min="70" max="130" value="104" /></div>
          <div class="range-field"><label for="contrast">${copy('contrast')} <output id="contrast-value">108%</output></label><input id="contrast" type="range" min="80" max="135" value="108" /></div>
          <div class="range-field"><label for="saturation">${copy('saturation')} <output id="saturation-value">98%</output></label><input id="saturation" type="range" min="0" max="140" value="98" /></div>
        </div><div class="range-field glow-start"><label for="rim">${copy('rim')} <output id="rim-value">65%</output></label><input id="rim" type="range" min="0" max="100" value="65" /></div>
          <div class="range-field"><label for="rim-width">${copy('rimWidth')} <output id="rim-width-value">18</output></label><input id="rim-width" type="range" min="4" max="40" value="18" /></div>
          <button id="reset-effects" class="text-button" type="button">${icon('reset')}${copy('resetEffects')}</button><p class="adjustment-note" data-i18n="glowNote">${t('glowNote')}</p>
        </div></details>
        <button id="download" class="primary-button" type="button" disabled>${icon('download')}${copy('download')}${icon('arrow')}</button>
        <p id="status" class="status" role="status" aria-live="polite" data-i18n="initialStatus">${t('initialStatus')}</p>
        <div class="privacy">${icon('lock')}${copy('privacy')}</div>
      </section>
      <section class="preview-section" data-i18n-aria-label="preview" aria-label="${t('preview')}">
        <div class="preview-heading"><span><span class="live-dot"></span>${copy('preview')}</span><span class="format-pill" dir="ltr">PNG · 1080 × 1350</span></div>
        <div class="poster-stage"><div class="poster-frame"><canvas id="poster" width="${WIDTH}" height="${HEIGHT}" data-i18n-aria-label="posterPreview" aria-label="${t('posterPreview')}"></canvas><span id="sample-badge" class="sample-badge" data-i18n="demoPhoto">${t('demoPhoto')}</span></div></div>
        <div class="preview-caption"><span>${icon('check')}${copy('feedReady')}</span><span id="template-label" data-i18n="demoTemplate">${t('demoTemplate')}</span></div>
      </section>
    </div>
    <details class="template-settings"><summary><span>${icon('settings')}${copy('templateSettings')}</span><span class="chevron">⌄</span></summary><div class="template-content"><div>
      <h3 data-i18n="templateHeading">${t('templateHeading')}</h3><p data-i18n="templateInstructions">${t('templateInstructions')}</p><p class="template-small" data-i18n="templateSize">${t('templateSize')}</p>
      <label class="secondary-button" for="foreground">${icon('upload')}${copy('uploadLayer')}</label><input id="foreground" class="visually-hidden" type="file" accept="image/png" /><p id="layer-status" class="layer-status" data-i18n="layerMissing">${t('layerMissing')}</p>
    </div><div class="template-share"><h3 data-i18n="sharingHeading">${t('sharingHeading')}</h3><p data-i18n="sharingInstructions">${t('sharingInstructions')}</p>
      <button id="export-site" type="button" class="secondary-button">${icon('download')}${copy('exportSite')}</button><button id="reset-template" type="button" class="text-button" data-i18n="resetDemo">${t('resetDemo')}</button><p class="template-small" data-i18n="bundlePrivacy">${t('bundlePrivacy')}</p>
    </div></div></details>
  </main>
  <footer><span dir="ltr">Made for the people moving sports forward.</span><span dir="ltr">POST / STUDIO <span class="footer-dot">●</span> 2026</span></footer>
`;

const $ = (selector) => document.querySelector(selector);
function setCopy(selector, key) {
  const element = $(selector);
  element.dataset.i18n = key;
  element.textContent = t(key);
}
function applyLanguage() {
  document.documentElement.lang = getLanguage();
  document.documentElement.dir = getLanguage() === 'he' ? 'rtl' : 'ltr';
  document.querySelector('meta[name="description"]').content = t('pageDescription');
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  $('#language').value = getLanguage();
}
$('#language').addEventListener('change', (event) => { setLanguage(event.target.value); applyLanguage(); });
applyLanguage();

const state = { name: '', title: '', portrait: null, foreground: null, background: null, cutout: true, scale: 1, x: 0, y: 0, ...PHOTO_DEFAULTS, uploaded: false };
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
  setCopy('#status', message);
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
  setStatus(remove ? 'preparingCutout' : 'preparingPhoto');
  try {
    const result = remove ? await removeBackground(originalPhoto) : originalPhoto;
    state.portrait = result;
    state.cutout = hasTransparency(result);
    state.uploaded = true;
    $('#sample-badge').hidden = true;
    setCopy('#upload-label', 'photoReadyLabel');
    setCopy('#upload-hint', 'replacePhoto');
    $('#upload').classList.add('has-image');
    setStatus('photoReady');
  } catch (error) { setStatus(error.translationKey || error.message, true); }
  finally { setBusy(false); }
}
async function uploadPhoto(file) {
  if (busy || !file) return;
  try {
    const next = await readImage(file);
    originalPhoto = next;
    await processPhoto();
  } catch (error) { setStatus(error.translationKey || error.message, true); }
}

$('#upload').addEventListener('click', () => $('#photo').click());
$('#photo').addEventListener('change', async (e) => { await uploadPhoto(e.target.files[0]); e.target.value = ''; });
$('#remove-bg').addEventListener('change', processPhoto);
['dragenter', 'dragover'].forEach((event) => $('#upload').addEventListener(event, (e) => { e.preventDefault(); $('#upload').classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => $('#upload').addEventListener(event, (e) => { e.preventDefault(); $('#upload').classList.remove('dragging'); }));
$('#upload').addEventListener('drop', (e) => uploadPhoto(e.dataTransfer.files[0]));
['name', 'title'].forEach((field) => $(`#${field}`).addEventListener('input', (e) => { state[field] = e.target.value; $('#name-count').textContent = `${state.name.length} / 50`; draw(); }));
const controls = { scale: (v) => { state.scale = v / 100; $('#scale-value').value = `${v}%`; }, 'offset-x': (v) => { state.x = v; }, 'offset-y': (v) => { state.y = v; }, rim: (v) => { state.rim = v; $('#rim-value').value = `${v}%`; }, 'rim-width': (v) => { state.rimWidth = v; $('#rim-width-value').value = v; } };
['brightness', 'contrast', 'saturation'].forEach((id) => { controls[id] = (v) => { state[id] = v; $(`#${id}-value`).value = `${v}%`; }; });
Object.entries(controls).forEach(([id, update]) => $(`#${id}`).addEventListener('input', (e) => { update(Number(e.target.value)); draw(); }));
function updateEnhancement() {
  state.enhance = $('#enhance').checked;
  ['brightness', 'contrast', 'saturation'].forEach((id) => { $(`#${id}`).disabled = !state.enhance; });
  $('.tone-controls').classList.toggle('inactive', !state.enhance);
  draw();
}
$('#enhance').addEventListener('change', updateEnhancement);
$('#reset-position').addEventListener('click', () => { Object.entries({ scale: 100, 'offset-x': 0, 'offset-y': 0 }).forEach(([id, value]) => { $(`#${id}`).value = value; controls[id](value); }); draw(); });
$('#reset-effects').addEventListener('click', () => {
  ['brightness', 'contrast', 'saturation', 'rim'].forEach((id) => { $(`#${id}`).value = PHOTO_DEFAULTS[id]; controls[id](PHOTO_DEFAULTS[id]); });
  $('#rim-width').value = PHOTO_DEFAULTS.rimWidth; controls['rim-width'](PHOTO_DEFAULTS.rimWidth);
  $('#enhance').checked = PHOTO_DEFAULTS.enhance; updateEnhancement();
});

$('#download').addEventListener('click', async () => {
  if (busy || !state.uploaded || !state.name.trim() || !state.title.trim()) return;
  try {
    await document.fonts.ready;
    renderPoster($('#poster'), state);
    const filename = state.name.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-').slice(0, 60) || 'my-post';
    download(await canvasToBlob($('#poster')), `${filename}-sports-tech-nation.png`);
    setStatus('downloaded');
  } catch (error) { setStatus(error.translationKey || error.message, true); }
});

async function setForeground(source) {
  if (!hasTransparency(source)) throw localizedError('errorOpaqueLayer');
  if (Math.abs((source.width / source.height) / (WIDTH / HEIGHT) - 1) > .025) throw localizedError('errorLayerRatio');
  state.foreground = source;
  setCopy('#template-label', 'originalTemplate');
  setCopy('#layer-status', 'layerLoaded');
  draw();
}
$('#foreground').addEventListener('change', async (e) => {
  if (!e.target.files[0]) return;
  try { await setForeground(await readImage(e.target.files[0], { layer: true })); setStatus('templateReady'); }
  catch (error) { setStatus(error.translationKey || error.message, true); setCopy('#layer-status', error.translationKey || error.message); }
  finally { e.target.value = ''; }
});
$('#reset-template').addEventListener('click', () => {
  state.foreground = publishedTemplate;
  setCopy('#template-label', publishedTemplate ? 'originalTemplate' : 'demoTemplate');
  setCopy('#layer-status', publishedTemplate ? 'layerSaved' : 'demoShown');
  draw();
});

$('#export-site').addEventListener('click', async () => {
  const button = $('#export-site');
  button.disabled = true;
  setStatus('preparingSite');
  try {
    const { default: JSZip } = await import('jszip');
    const base = import.meta.env.DEV ? '/site-export/' : import.meta.env.BASE_URL;
    const response = await fetch(`${base}site-manifest.json`);
    if (!response.ok) throw localizedError('errorSiteNotBuilt');
    const files = await response.json();
    const zip = new JSZip();
    // Small batches keep memory and simultaneous requests bounded on mobile.
    for (let i = 0; i < files.length; i += 4) {
      await Promise.all(files.slice(i, i + 4).map(async (file) => {
        if (file === 'template.json' || file === 'site-manifest.json') return;
        const asset = await fetch(`${base}${file}`);
        if (!asset.ok) throw localizedError('errorSiteAsset');
        zip.file(file, await asset.arrayBuffer());
      }));
    }
    zip.file('template.json', JSON.stringify({ version: 1, foreground: state.foreground ? state.foreground.toDataURL('image/png') : null }));
    zip.file('site-manifest.json', JSON.stringify([...new Set([...files, 'template.json'])]));
    download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } }), 'sports-tech-post-studio.zip');
    setStatus('siteReady');
  } catch (error) { setStatus(error.translationKey || error.message, true); }
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
  const response = await fetch(`${import.meta.env.BASE_URL}template.json`, { cache: 'no-cache' });
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
      setCopy('#reset-template', 'resetOriginal');
    }
  }
} catch { setStatus('errorTemplateLoad', true); }
