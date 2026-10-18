// The asset converter's dev server: it serves this project's export page and imports the ORIGINAL LEGONRUSH source
// read-only (ORIG, default ../legonrush-world) to build its campus, then receives the converted files over POST
// /__write and writes them under this project only. Nothing is ever written to the original repository.
import { defineConfig, type Plugin } from 'vite';
import { resolve, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = resolve(__dirname, '../..');
const ORIG = resolve(process.env.ORIG ?? resolve(HERE, '../legonrush-world'));
const OUT = resolve(HERE, process.env.OUT ?? 'public/campus');

const writer = (): Plugin => ({
  name: 'export-writer',
  configureServer(server) {
    server.middlewares.use('/__write', (req, res) => {
      const url = new URL(req.url ?? '', 'http://x');
      const rel = url.searchParams.get('path') ?? '';
      if (!rel || rel.includes('..') || rel.startsWith('/')) { res.statusCode = 400; res.end('bad path'); return; }
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const file = resolve(OUT, rel);
        if (!file.startsWith(OUT)) { res.statusCode = 400; res.end('bad path'); return; }
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, Buffer.concat(chunks));
        res.end('ok');
      });
    });
  },
});

export default defineConfig({
  root: HERE,
  resolve: { alias: { '/orig': ORIG } },
  // (no watching and no hot reload: a long conversion must not restart when this project's files change meanwhile)
  server: { port: 5310, strictPort: true, fs: { allow: [HERE, ORIG] }, hmr: false, watch: { ignored: ['**/*'] } },
  optimizeDeps: { entries: [] },
  plugins: [writer()],
});
