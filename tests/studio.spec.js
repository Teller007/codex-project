import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

// New visitors get English even when their browser's preferred language is Hebrew.
test.use({ locale: 'he-IL' });

for (const language of ['en', 'he']) {
  test(`mobile compact preview stays visible and updates during editing (${language})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#template-label')).toHaveText('Your original design');
    if (language === 'he') await page.locator('#language').selectOption('he');
    await expect(page.locator('#mobile-preview')).toBeHidden();
    const originalGeometry = await page.locator('#poster').evaluate(canvas => ({ top: canvas.getBoundingClientRect().top + scrollY, width: canvas.getBoundingClientRect().width }));
    await page.locator('#remove-bg').uncheck();
    await page.locator('#name').fill('Dana Cohen');
    await page.locator('#title').fill('Founder');
    await page.locator('#photo').setInputFiles('public/demo-portrait.png');
    await expect(page.locator('#status')).toContainText(language === 'he' ? 'התמונה מוכנה' : 'Your photo is ready');
    await page.locator('#position-panel').evaluate(details => { details.open = true; });
    await page.locator('#effects-panel').evaluate(details => { details.open = true; });
    await page.locator('#brightness').evaluate(input => {
      const poster = document.querySelector('#poster');
      const compactHeight = poster.getBoundingClientRect().width / 2 * 1350 / 1080 + 24;
      window.scrollTo({ top: scrollY + input.getBoundingClientRect().top - compactHeight - 60, behavior: 'instant' });
    });
    await expect(page.locator('#mobile-preview')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const full = document.querySelector('#poster').getBoundingClientRect();
      const mini = document.querySelector('#mobile-poster').getBoundingClientRect();
      const panel = document.querySelector('#mobile-preview').getBoundingClientRect();
      const control = document.querySelector('#brightness').getBoundingClientRect();
      return { originalTop: full.top + scrollY, fullWidth: full.width, miniWidth: mini.width, panelTop: panel.top, panelBottom: panel.bottom, controlTop: control.top };
    });
    expect(geometry.originalTop).toBeCloseTo(originalGeometry.top, 0);
    expect(geometry.fullWidth).toBe(originalGeometry.width);
    expect(geometry.miniWidth).toBeCloseTo(geometry.fullWidth / 2, 0);
    expect(geometry.panelTop).toBe(0);
    expect(geometry.controlTop).toBeGreaterThan(geometry.panelBottom + 10);
    const before = await page.locator('#mobile-poster').evaluate(canvas => canvas.toDataURL());
    await page.locator('#brightness').fill('125');
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await page.locator('#mobile-poster').evaluate(canvas => canvas.toDataURL())).not.toBe(before);
    const bright = await page.locator('#mobile-poster').evaluate(canvas => canvas.toDataURL());
    await page.locator('#offset-x').fill('50');
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await page.locator('#mobile-poster').evaluate(canvas => canvas.toDataURL())).not.toBe(bright);
    await expect(page.locator('#mobile-preview')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 360 });
    await expect(page.locator('#mobile-preview')).toBeVisible();
    await expect.poll(() => page.locator('#mobile-preview').evaluate(panel => panel.getBoundingClientRect().height)).toBeLessThanOrEqual(360 * .3);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.locator('#mobile-preview').evaluate(panel => panel.getBoundingClientRect().height)).toBeGreaterThan(150);
    const saved = page.waitForEvent('download');
    await page.locator('#download').click();
    const png = await readFile(await (await saved).path());
    expect(png.readUInt32BE(16)).toBe(1080); expect(png.readUInt32BE(20)).toBe(1350);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(page.locator('#mobile-preview')).toBeHidden();
    await page.locator('#brightness').evaluate(input => { window.scrollTo({ top: scrollY + input.getBoundingClientRect().top - 300, behavior: 'instant' }); });
    await expect(page.locator('#mobile-preview')).toBeVisible();
    await page.locator('#full-preview').click();
    await expect(page.locator('#mobile-preview')).toBeHidden();
    expect(await page.locator('#poster').evaluate(canvas => canvas.getBoundingClientRect().width)).toBe(originalGeometry.width);
    await page.locator('#brightness').evaluate(input => { window.scrollTo({ top: scrollY + input.getBoundingClientRect().top - 300, behavior: 'instant' }); });
    await expect(page.locator('#mobile-preview')).toBeVisible();
    await page.locator('.template-settings').evaluate(details => { details.open = true; });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect(page.locator('#mobile-preview')).toBeHidden();
    await page.setViewportSize({ width: 1360, height: 900 });
    await expect(page.locator('#mobile-preview')).toBeHidden();
  });
}

test('English is the default, language changes preserve the edited post, and the choice is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  await expect(page.locator('h1')).toContainText('Your post is ready.');
  await expect(page.locator('#template-label')).toHaveText('Your original design');
  await page.locator('#remove-bg').uncheck();
  await page.locator('#name').fill('Dana Cohen');
  await page.locator('#title').fill('Founder');
  await page.locator('#photo').setInputFiles('public/demo-portrait.png');
  await expect(page.locator('#status')).toContainText('Your photo is ready');
  await page.locator('#position-panel summary').click();
  await page.locator('#effects-panel summary').click();
  await page.locator('#scale').fill('110');
  await page.locator('#brightness').fill('117');
  await page.locator('#rim').fill('71');
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const originalPoster = await page.locator('#poster').evaluate(canvas => canvas.toDataURL());
  await page.locator('#language').selectOption('he');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('combobox', { name: 'שפה' })).toHaveValue('he');
  await expect(page.locator('h1')).toContainText('הפוסט כבר מוכן.');
  await expect(page.locator('#name')).toHaveAttribute('placeholder', 'לדוגמה: Dana Cohen');
  await expect(page.locator('#upload-label')).toHaveText('התמונה שלכם בפנים');
  await expect(page.locator('#status')).toContainText('התמונה מוכנה');
  await expect(page.locator('#template-label')).toHaveText('העיצוב המקורי שלכם');
  await expect(page.locator('#name')).toHaveValue('Dana Cohen');
  await expect(page.locator('#title')).toHaveValue('Founder');
  await expect(page.locator('#scale')).toHaveValue('110');
  await expect(page.locator('#brightness')).toHaveValue('117');
  await expect(page.locator('#rim')).toHaveValue('71');
  await expect(page.locator('#position-panel')).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'הורדת הפוסט שלי' })).toBeEnabled();
  expect(await page.locator('#poster').evaluate(canvas => canvas.toDataURL())).toBe(originalPoster);
  const saved = page.waitForEvent('download');
  await page.locator('#download').click();
  const png = await readFile(await (await saved).path());
  expect(png.equals(Buffer.from(originalPoster.split(',')[1], 'base64'))).toBe(true);
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#status')).toContainText('The file was downloaded');
  await page.locator('#language').selectOption('he');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await expect(page.locator('#language')).toHaveValue('he');
  await expect(page.locator('#status')).toContainText('הוסיפו שם');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#language').selectOption('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#photo').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.locator('#status')).toContainText('Choose a PNG, JPG or WebP photo.');
  await page.locator('#language').selectOption('he');
  await expect(page.locator('#status')).toContainText('בחרו תמונת');
  await expect(page.locator('#status')).toHaveClass(/error/);
});

test('upload, live editing, positioning, and correctly sized PNG export', async ({ page }) => {
  const failures = []; page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Download my post' })).toBeDisabled();
  await page.locator('#name').fill('Dana Cohen');
  await page.locator('#title').fill('Founder & CEO');
  await page.locator('#photo').setInputFiles('public/demo-portrait.png');
  await expect(page.locator('#status')).toContainText('Your photo is ready', { timeout: 60000 });
  await expect(page.locator('#sample-badge')).toBeHidden();
  const before = await page.locator('#poster').evaluate((canvas) => canvas.toDataURL());
  await page.locator('#name').fill('דנה כהן');
  await page.waitForTimeout(100);
  const after = await page.locator('#poster').evaluate((canvas) => canvas.toDataURL());
  expect(after).not.toBe(before);
  await page.locator('#position-panel summary').click();
  await page.locator('#scale').fill('115');
  await expect(page.locator('#scale-value')).toHaveText('115%');
  await page.locator('#effects-panel summary').click();
  await page.locator('#brightness').fill('120');
  await page.locator('#rim-width').fill('30');
  await expect(page.locator('#brightness-value')).toHaveText('120%');
  await expect(page.locator('#rim-width-value')).toHaveText('30');
  await page.locator('#enhance').uncheck();
  await expect(page.locator('#brightness')).toBeDisabled();
  await expect(page.locator('#rim')).toBeEnabled();
  await page.locator('#reset-position').click();
  await expect(page.locator('#scale-value')).toHaveText('100%');
  await expect(page.locator('#brightness')).toHaveValue('120');
  await page.locator('#reset-effects').click();
  await expect(page.locator('#enhance')).toBeChecked();
  await expect(page.locator('#brightness')).toBeEnabled();
  await expect(page.locator('#brightness-value')).toHaveText('104%');
  await expect(page.locator('#rim-value')).toHaveText('65%');
  await expect(page.locator('#rim-width-value')).toHaveText('18');
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my post' }).click();
  const file = await saved;
  const png = await readFile(await file.path());
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1350);
  expect(file.suggestedFilename()).toBe('דנה-כהן-sports-tech-nation.png');
  expect(failures).toEqual([]);
});

test('inner orange light warms the silhouette edge without expanding or changing its alpha mask', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { processPortrait } = await import('/src/photo-effects.js');
    const source = document.createElement('canvas'); source.width = 480; source.height = 1120;
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#808080'; ctx.fillRect(60, 100, 360, 920);
    ctx.fillStyle = 'rgba(128,128,128,.5)'; ctx.fillRect(54, 100, 6, 920);
    const original = ctx.getImageData(0, 0, 480, 1120).data;
    const narrow = processPortrait(source, { enhance: false, rim: 80, rimWidth: 8 });
    const narrowPixel = [...narrow.getContext('2d').getImageData(84, 500, 1, 1).data];
    const wide = processPortrait(source, { enhance: false, rim: 80, rimWidth: 40 });
    const pixels = wide.getContext('2d').getImageData(0, 0, 480, 1120).data;
    const pixel = (x, y) => [...pixels.slice((y * 480 + x) * 4, (y * 480 + x) * 4 + 4)];
    let alphaDifferences = 0, outsideLight = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] !== original[i + 3]) alphaDifferences++;
      if (original[i + 3] === 0 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 0) outsideLight++;
    }
    return { alphaDifferences, outsideLight, edge: pixel(64, 500), center: pixel(240, 500), widePixel: pixel(84, 500), narrowPixel, unchanged: [...ctx.getImageData(64, 500, 1, 1).data] };
  });
  expect(result.alphaDifferences).toBe(0);
  expect(result.outsideLight).toBe(0);
  expect(result.edge[0]).toBeGreaterThan(result.edge[1] + 15);
  expect(result.edge[1]).toBeGreaterThan(result.edge[2]);
  expect(result.center).toEqual([128, 128, 128, 255]);
  expect(result.widePixel[0]).toBeGreaterThan(result.narrowPixel[0] + 15);
  expect(result.unchanged).toEqual([128, 128, 128, 255]);
});

test('photo tone controls affect color and brightness while preserving transparency and the original photo', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { processPortrait } = await import('/src/photo-effects.js');
    const source = document.createElement('canvas'); source.width = source.height = 120;
    const ctx = source.getContext('2d'); ctx.fillStyle = '#804020'; ctx.fillRect(20, 20, 80, 80);
    const read = (image) => [...image.getContext('2d').getImageData(50, 50, 1, 1).data];
    const neutral = read(source);
    const bright = read(processPortrait(source, { brightness: 125, contrast: 100, saturation: 100, rim: 0 }));
    const gray = read(processPortrait(source, { brightness: 100, contrast: 100, saturation: 0, rim: 0 }));
    const disabled = read(processPortrait(source, { enhance: false, brightness: 125, saturation: 0, rim: 0 }));
    const processed = processPortrait(source, { rim: 100, cutout: false });
    const withoutRim = processPortrait(source, { rim: 0 });
    return { neutral, bright, gray, disabled, original: read(source), rimDisabled: read(processed), withoutRim: read(withoutRim), outside: [...processed.getContext('2d').getImageData(0, 0, 1, 1).data] };
  });
  expect(result.bright[0]).toBeGreaterThan(result.neutral[0]);
  expect(result.bright[1]).toBeGreaterThan(result.neutral[1]);
  expect(result.gray[0]).toBe(result.gray[1]);
  expect(result.gray[1]).toBe(result.gray[2]);
  expect(result.disabled).toEqual(result.neutral);
  expect(result.original).toEqual(result.neutral);
  expect(result.rimDisabled).toEqual(result.withoutRim);
  expect(result.outside).toEqual([0, 0, 0, 0]);
});

test('actual local segmentation removes an opaque background without sending the photo', async ({ page }) => {
  const external = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:5173/')) external.push(request.url()); });
  await page.goto('/');
  const opaque = await page.evaluate(async () => {
    const image = new Image(); image.src = '/demo-portrait.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 800;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eee7df'; ctx.fillRect(0, 0, 640, 800); ctx.drawImage(image, 0, 0, 640, 800);
    return canvas.toDataURL().split(',')[1];
  });
  await page.locator('#photo').setInputFiles({ name: 'portrait-with-background.png', mimeType: 'image/png', buffer: Buffer.from(opaque, 'base64') });
  await expect(page.locator('#status')).toContainText('Your photo is ready', { timeout: 60000 });
  // Exercise the same implementation with an opaque image and examine the actual alpha mask.
  const result = await page.evaluate(async () => {
    const { readImage, removeBackground } = await import('/src/images.js');
    const response = await fetch('/demo-portrait.png');
    const original = await readImage(new File([await response.blob()], 'portrait.png', { type: 'image/png' }));
    const ctx = original.getContext('2d'); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#eee7df'; ctx.fillRect(0, 0, original.width, original.height); ctx.globalCompositeOperation = 'source-over';
    const cutout = await removeBackground(original);
    const pixels = cutout.getContext('2d').getImageData(0, 0, cutout.width, cutout.height).data;
    let transparent = 0, opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 10) transparent++; if (pixels[i] > 240) opaque++; }
    return { transparent, opaque, size: pixels.length / 4 };
  });
  expect(result.transparent / result.size).toBeGreaterThan(.10);
  expect(result.opaque / result.size).toBeGreaterThan(.25);
  expect(external).toEqual([]);
});

test('a circular grayscale PNG with transparent corners still has its inner background removed', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { removeBackground, hasTransparency } = await import('/src/images.js');
    const image = new Image(); image.src = '/demo-portrait.png'; await image.decode();
    const source = document.createElement('canvas'); source.width = source.height = 720;
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#e5e5e5'; ctx.fillRect(0, 0, 720, 720);
    ctx.filter = 'grayscale(1)'; ctx.drawImage(image, 110, 15, 530, 690); ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath(); ctx.arc(360, 360, 350, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const cutout = await removeBackground(source);
    const pixels = cutout.getContext('2d').getImageData(0, 0, cutout.width, cutout.height).data;
    let background = 0, person = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 240) continue;
      if (pixels[i] === 229 && pixels[i + 1] === 229 && pixels[i + 2] === 229) background++;
      else person++;
    }
    return { sourceTransparent: hasTransparency(source), background: background / (pixels.length / 4), person: person / (pixels.length / 4) };
  });
  expect(result.sourceTransparent).toBe(true);
  expect(result.person).toBeGreaterThan(.25);
  expect(result.background).toBeLessThan(.06);
});

test('original transparent overlay appears above the portrait and travels in the shareable site', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#template-label')).toHaveText('Your original design');
  await page.locator('.template-settings summary').click();
  const overlay = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#22dd99'; ctx.fillRect(90, 700, 60, 60);
    return canvas.toDataURL().split(',')[1];
  });
  await page.locator('#foreground').setInputFiles({ name: 'original-overlay.png', mimeType: 'image/png', buffer: Buffer.from(overlay, 'base64') });
  await expect(page.locator('#layer-status')).toContainText('Your layer is loaded');
  await page.waitForTimeout(200);
  const pixel = await page.locator('#poster').evaluate((canvas) => [...canvas.getContext('2d').getImageData(110, 720, 1, 1).data]);
  expect(pixel).toEqual([34, 221, 153, 255]);
  await page.locator('#name').fill('Private Name');
  await page.locator('#title').fill('Private Title');
  await page.locator('#photo').setInputFiles('public/demo-portrait.png');
  await expect(page.locator('#status')).toContainText('Your photo is ready', { timeout: 60000 });
  const event = page.waitForEvent('download');
  await page.locator('#export-site').click();
  const file = await event;
  const zip = await JSZip.loadAsync(await readFile(await file.path()));
  expect(zip.file('index.html')).not.toBeNull();
  expect(zip.file('vendor/segmentation/selfie_segmentation.tflite')).not.toBeNull();
  const config = JSON.parse(await zip.file('template.json').async('string'));
  expect(config.foreground).toBe(`data:image/png;base64,${overlay}`);
  expect(config.name).toBeUndefined(); expect(config.portrait).toBeUndefined();
  expect(JSON.stringify(config)).not.toContain('Private Name');
  // Restore the actual exported bundle on a different origin and under a subdirectory.
  const restored = await page.context().newPage();
  const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm' };
  await restored.route('http://shared-site.test/campaign/**', async (route) => {
    let path = new URL(route.request().url()).pathname.replace('/campaign/', '');
    if (!path) path = 'index.html';
    const entry = zip.file(path);
    if (!entry) { await route.fulfill({ status: 404 }); return; }
    const extension = path.slice(path.lastIndexOf('.'));
    await route.fulfill({ status: 200, body: await entry.async('nodebuffer'), contentType: mime[extension] || 'application/octet-stream' });
  });
  await restored.goto('http://shared-site.test/campaign/');
  await expect(restored.locator('#template-label')).toHaveText('Your original design');
  await expect(restored.locator('#name')).toHaveValue('');
  await expect(restored.locator('#title')).toHaveValue('');
  await expect(restored.locator('#download')).toBeDisabled();
  await restored.close();
  await page.locator('#reset-template').click();
  await expect(page.locator('#template-label')).toContainText('Your original design');
});

test('the original bundled text-and-logo layer is rendered without reconstructed logos underneath', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#template-label')).toHaveText('Your original design');
  await expect(page.locator('#reset-template')).toHaveText('Restore the original design');
  await page.locator('#effects-panel summary').click();
  await page.locator('#brightness').fill('130');
  await page.locator('#contrast').fill('135');
  await page.locator('#saturation').fill('0');
  await page.locator('#rim').fill('100');
  await page.locator('#rim-width').fill('40');
  // The label updates synchronously; canvas rendering is scheduled for the next frame.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const result = await page.evaluate(async () => {
    const image = new Image(); image.src = '/template-overlay.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 160;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 160); ctx.drawImage(image, 0, 0);
    const expected = ctx.getImageData(0, 0, 1080, 160).data;
    const actual = document.querySelector('#poster').getContext('2d').getImageData(0, 0, 1080, 160).data;
    let differences = 0, visibleArtwork = 0;
    for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) differences++;
    for (let i = 0; i < expected.length; i += 4) if (expected[i] + expected[i + 1] + expected[i + 2] > 0) visibleArtwork++;
    return { differences, visibleArtwork };
  });
  expect(result.visibleArtwork).toBeGreaterThan(1000);
  expect(result.differences).toBe(0);
});

test('invalid uploads are rejected and mobile stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#photo').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.locator('#status')).toContainText('Choose a PNG, JPG or WebP photo.');
  await expect(page.getByRole('button', { name: 'Download my post' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.template-settings summary').click();
  const opaque = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1350);
    return canvas.toDataURL().split(',')[1];
  });
  await page.locator('#foreground').setInputFiles({ name: 'opaque.png', mimeType: 'image/png', buffer: Buffer.from(opaque, 'base64') });
  await expect(page.locator('#layer-status')).toContainText('This layer isn’t transparent');
});
