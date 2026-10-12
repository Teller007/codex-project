import { mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await mkdir('artifacts', { recursive: true });
await rm('artifacts/post-studio-site.zip', { force: true });
execFileSync('zip', ['-qr', '../artifacts/post-studio-site.zip', '.'], { cwd: 'dist' });
console.log('Shareable static site: artifacts/post-studio-site.zip');
