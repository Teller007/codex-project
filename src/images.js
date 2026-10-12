import { localizedError } from './i18n.js';

const MAX_BYTES = 20 * 1024 * 1024;
let segmenter;
let loading;

export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(localizedError('errorReadImage'));
    image.src = src;
  });
}

export async function readImage(file, { layer = false } = {}) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw localizedError('errorImageType');
  }
  if (layer && file.type !== 'image/png') throw localizedError('errorLayerType');
  if (file.size > MAX_BYTES) throw localizedError('errorImageSize');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > 50_000_000) throw localizedError('errorResolution');
    const ratio = Math.min(1, (layer ? 2500 : 1800) / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function hasTransparency(canvas) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = 48;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, 48, 48);
  const pixels = ctx.getImageData(0, 0, 48, 48).data;
  let transparent = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 200) transparent++;
  return transparent > 48;
}

async function getSegmenter() {
  if (segmenter) return segmenter;
  if (loading) return loading;
  loading = (async () => {
    if (!window.SelfieSegmentation) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${import.meta.env.BASE_URL}vendor/segmentation/selfie_segmentation.js`;
        script.onload = resolve;
        script.onerror = () => { script.remove(); reject(localizedError('errorModelLoad')); };
        document.head.appendChild(script);
      });
    }
    const model = new window.SelfieSegmentation({ locateFile: (file) => `${import.meta.env.BASE_URL}vendor/segmentation/${file}` });
    model.setOptions({ modelSelection: 0, selfieMode: false });
    segmenter = model;
    return model;
  })();
  try { return await loading; } finally { loading = null; }
}

export async function removeBackground(source) {
  // Transparent corners (for example in a circular profile photo) do not
  // establish that the photographic background inside the image is removed.
  const model = await getSegmenter();
  let output;
  model.onResults((results) => {
    output = document.createElement('canvas');
    output.width = source.width;
    output.height = source.height;
    const ctx = output.getContext('2d');
    ctx.drawImage(results.segmentationMask, 0, 0, output.width, output.height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  });
  try {
    await model.send({ image: source });
    if (!output) throw new Error('No mask returned');
    return trimTransparent(output);
  } catch (error) {
    console.warn('Background removal unavailable:', error.message);
    throw localizedError('errorSegmentation');
  }
}

export function trimTransparent(source) {
  const ctx = source.getContext('2d', { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, source.width, source.height);
  let left = source.width, right = -1, top = source.height, bottom = -1;
  for (let y = 0; y < source.height; y += 2) {
    for (let x = 0; x < source.width; x += 2) {
      if (data[(y * source.width + x) * 4 + 3] > 90) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || (right - left) * (bottom - top) < source.width * source.height * .015) {
    throw localizedError('errorNoPerson');
  }
  left = Math.max(0, left - 6); top = Math.max(0, top - 6);
  right = Math.min(source.width, right + 8); bottom = Math.min(source.height, bottom + 8);
  const canvas = document.createElement('canvas');
  canvas.width = right - left; canvas.height = bottom - top;
  canvas.getContext('2d').drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(localizedError('errorPngExport')), 'image/png'));
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
