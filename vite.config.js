import { defineConfig } from 'vite';
import { readdir, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';

async function listFiles(root, prefix = '') {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  const lists = await Promise.all(entries.map((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(root, name) : [name];
  }));
  return lists.flat();
}

const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
export default defineConfig({
  base: './',
  plugins: [{
    name: 'static-site-export',
    async writeBundle(options) {
      const dir = path.resolve(options.dir);
      const files = (await listFiles(dir)).filter((file) => file !== 'site-manifest.json');
      await writeFile(path.join(dir, 'site-manifest.json'), JSON.stringify(files));
    },
    configureServer(server) {
      // In development, the editor can download the already-built production site.
      server.middlewares.use('/site-export', async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        const root = path.resolve('dist');
        try {
          const file = path.resolve(root, `.${decodeURIComponent(req.url.split('?')[0])}`);
          if (!file.startsWith(`${root}${path.sep}`)) { res.statusCode = 403; res.end(); return; }
          if (!(await stat(file)).isFile()) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
          if (req.method === 'HEAD') { res.end(); return; }
          createReadStream(file).on('error', () => res.destroy()).pipe(res);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
  }],
});
