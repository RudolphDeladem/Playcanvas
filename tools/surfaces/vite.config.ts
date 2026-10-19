// A dev server for the long audit runs (tools/surfaces/audit.mjs, PORT=5321): no file watching or hot reload, so that
// editing the project while an audit runs does not restart it.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname, '../..'), server: { port: 5321, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
