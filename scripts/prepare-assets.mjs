import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(`${root}public/vendor`, { recursive: true });
await cp(`${root}node_modules/@mediapipe/selfie_segmentation`, `${root}public/vendor/segmentation`, { recursive: true });
console.log('Background-removal model and WebAssembly are available locally.');
