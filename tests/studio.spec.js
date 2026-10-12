import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

test('upload, live editing, positioning, and correctly sized PNG export', async ({ page }) => {
  const failures = []; page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'הורדת הפוסט שלי' })).toBeDisabled();
  await page.locator('#name').fill('Dana Cohen');
  await page.locator('#title').fill('Founder & CEO');
  await page.locator('#photo').setInputFiles('public/demo-portrait.png');
  await expect(page.locator('#status')).toContainText('התמונה מוכנה', { timeout: 60000 });
  await expect(page.locator('#sample-badge')).toBeHidden();
  const before = await page.locator('#poster').evaluate((canvas) => canvas.toDataURL());
  await page.locator('#name').fill('דנה כהן');
  await page.waitForTimeout(100);
  const after = await page.locator('#poster').evaluate((canvas) => canvas.toDataURL());
  expect(after).not.toBe(before);
  await page.locator('#position-panel summary').click();
  await page.locator('#scale').fill('115');
  await expect(page.locator('#scale-value')).toHaveText('115%');
  await page.locator('#reset-position').click();
  await expect(page.locator('#scale-value')).toHaveText('100%');
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת הפוסט שלי' }).click();
  const file = await saved;
  const png = await readFile(await file.path());
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1350);
  expect(file.suggestedFilename()).toBe('דנה-כהן-sports-tech-nation.png');
  expect(failures).toEqual([]);
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
  await expect(page.locator('#status')).toContainText('התמונה מוכנה', { timeout: 60000 });
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
  await page.locator('.template-settings summary').click();
  const overlay = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#22dd99'; ctx.fillRect(90, 700, 60, 60);
    return canvas.toDataURL().split(',')[1];
  });
  await page.locator('#foreground').setInputFiles({ name: 'original-overlay.png', mimeType: 'image/png', buffer: Buffer.from(overlay, 'base64') });
  await expect(page.locator('#layer-status')).toContainText('השכבה שלכם נטענה');
  await page.waitForTimeout(200);
  const pixel = await page.locator('#poster').evaluate((canvas) => [...canvas.getContext('2d').getImageData(110, 720, 1, 1).data]);
  expect(pixel).toEqual([34, 221, 153, 255]);
  await page.locator('#name').fill('Private Name');
  await page.locator('#title').fill('Private Title');
  await page.locator('#photo').setInputFiles('public/demo-portrait.png');
  await expect(page.locator('#status')).toContainText('התמונה מוכנה', { timeout: 60000 });
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
  await expect(restored.locator('#template-label')).toHaveText('העיצוב המקורי שלכם');
  await expect(restored.locator('#name')).toHaveValue('');
  await expect(restored.locator('#title')).toHaveValue('');
  await expect(restored.locator('#download')).toBeDisabled();
  await restored.close();
  await page.locator('#reset-template').click();
  await expect(page.locator('#template-label')).toContainText('העיצוב המקורי');
});

test('the original bundled text-and-logo layer is rendered without reconstructed logos underneath', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#template-label')).toHaveText('העיצוב המקורי שלכם');
  await expect(page.locator('#reset-template')).toHaveText('חזרה לעיצוב המקורי');
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
  await expect(page.locator('#status')).toContainText('בחרו תמונת');
  await expect(page.getByRole('button', { name: 'הורדת הפוסט שלי' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.template-settings summary').click();
  const opaque = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1350);
    return canvas.toDataURL().split(',')[1];
  });
  await page.locator('#foreground').setInputFiles({ name: 'opaque.png', mimeType: 'image/png', buffer: Buffer.from(opaque, 'base64') });
  await expect(page.locator('#layer-status')).toContainText('השכבה אינה שקופה');
});
