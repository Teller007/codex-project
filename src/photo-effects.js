export const PHOTO_DEFAULTS = Object.freeze({ enhance: true, brightness: 104, contrast: 108, saturation: 98, rim: 65, rimWidth: 18 });

const cache = new WeakMap();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Blur the inverse alpha with a sliding window. Outside the image is transparent,
// so cropped silhouettes receive the same soft inner edge as the rest of the photo.
function blurInverseAlpha(pixels, width, height, radius) {
  const horizontal = new Float32Array(width * height);
  const result = new Float32Array(width * height);
  const window = radius * 2 + 1;
  const inverse = (x, y) => x < 0 || x >= width || y < 0 || y >= height ? 1 : 1 - pixels[(y * width + x) * 4 + 3] / 255;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += inverse(x, y);
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = sum / window;
      sum += inverse(x + radius + 1, y) - inverse(x - radius, y);
    }
  }
  const sample = (x, y) => y < 0 || y >= height ? 1 : horizontal[y * width + x];
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += sample(x, y);
    for (let y = 0; y < height; y++) {
      result[y * width + x] = sum / window;
      sum += sample(x, y + radius + 1) - sample(x, y - radius);
    }
  }
  return result;
}

export function processPortrait(image, options = {}) {
  const settings = { ...PHOTO_DEFAULTS, ...options };
  const brightness = settings.enhance ? clamp(settings.brightness, 70, 130) / 100 : 1;
  const contrast = settings.enhance ? clamp(settings.contrast, 80, 135) / 100 : 1;
  const saturation = settings.enhance ? clamp(settings.saturation, 0, 140) / 100 : 1;
  const rim = settings.cutout === false ? 0 : clamp(settings.rim, 0, 100) / 100;
  const radius = Math.max(1, Math.round(clamp(settings.rimWidth, 4, 40) * image.height / 1120));
  const key = [brightness, contrast, saturation, rim, radius].join(':');
  const previous = cache.get(image);
  if (previous?.key === key) return previous.canvas;
  if (brightness === 1 && contrast === 1 && saturation === 1 && rim === 0) return image;

  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;
  const innerMask = rim > 0 ? blurInverseAlpha(pixels, canvas.width, canvas.height, radius) : null;
  const adjust = (value) => clamp((value * brightness - 127.5) * contrast + 127.5, 0, 255);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    let red = adjust(pixels[i]), green = adjust(pixels[i + 1]), blue = adjust(pixels[i + 2]);
    const luminance = .2126 * red + .7152 * green + .0722 * blue;
    red = clamp(luminance + (red - luminance) * saturation, 0, 255);
    green = clamp(luminance + (green - luminance) * saturation, 0, 255);
    blue = clamp(luminance + (blue - luminance) * saturation, 0, 255);
    // Screen orange into the existing RGB only. Never add pixels or alter alpha:
    // the glow stays inside the cutout, including its soft hair edges.
    const light = innerMask ? clamp(innerMask[i / 4] * 1.5, 0, 1) * rim : 0;
    pixels[i] = red + (255 - red) * light;
    pixels[i + 1] = green + (255 - green) * light * (104 / 255);
    pixels[i + 2] = blue + (255 - blue) * light * (46 / 255);
  }
  ctx.putImageData(frame, 0, 0);
  cache.set(image, { key, canvas });
  return canvas;
}
