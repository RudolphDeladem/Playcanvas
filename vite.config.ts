import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

// LEGONRUSH on PlayCanvas. The site is served from BASE_PATH (GitHub Pages: /<repo>/; local and Netlify: /).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeManifestIcons: false,
      includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'LEGONRUSH',
        short_name: 'LEGONRUSH',
        description: 'The Campus Lifestyle Reimagined. Ride. Race. Connect.',
        theme_color: '#0a1020',
        background_color: '#0a1020',
        display: 'fullscreen',
        orientation: 'any',
        start_url: 'play/',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        // the offline install stays small for students on data bundles, as before: no landing-page images, no large icons,
        // only the Latin fonts; the campus tiles and textures are cached as they are ridden past instead (runtime cache)
        globIgnores: ['geo/**', 'assets/geo-*', 'photos/**', 'art/**', 'shots/**', 'brand/**', 'campus/**', 'video/**', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'assets/*-latin-ext-*', 'assets/*-vietnamese-*', 'assets/supabase-*'],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /\/campus\/.*\.(json|lrz|webp)$/, handler: 'CacheFirst', options: { cacheName: 'legonrush-campus', expiration: { maxEntries: 4000 } } },
          // (the ground types read off the satellite picture, satground.ts: cached once fetched, like the tiles)
          { urlPattern: /\/geo\/ground-classes\.png$/, handler: 'CacheFirst', options: { cacheName: 'legonrush-geo', expiration: { maxEntries: 4 } } },
        ],
      },
    }),
  ],
  server: { port: 5320 },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play/index.html'),
        geo: resolve(__dirname, 'geo/index.html'),
      },
      output: {
        // the engine and the campus map change rarely, so they get their own long-lived files; the Supabase client loads
        // only for riders who sign in, so it stays out of the offline install
        manualChunks: (id: string) => (id.includes('node_modules/playcanvas') ? 'playcanvas' : id.includes('legon-map.json') ? 'campus-map' : id.includes('node_modules/@supabase') ? 'supabase' : undefined),
      },
    },
  },
});
