import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Basis-Pfad: GitHub Pages liefert die App unter https://<user>.github.io/Prononciation/.
// Für ein eigenes Hosting unter der Domain-Wurzel: BASE_PATH=/ npm run build
const base = process.env.BASE_PATH ?? '/Prononciation/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Prononciation – Aussprachetrainer Französisch',
        short_name: 'Prononciation',
        description: 'Aussprache trainieren: hören, nachsprechen, vergleichen, Rückmeldung erhalten.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#eaf4fc',
        theme_color: '#cfe6f8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Das ASR-Modell (~300 MB) wird nicht über Workbox, sondern über die Cache-API
        // in src/asr/modelLoader.ts verwaltet.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,mjs,json,mp3}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/models\//],
        globIgnores: ['models/**'],
      },
    }),
  ],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('onnxruntime-web')) return 'ort';
          if (/node_modules\/(react|react-dom|scheduler|idb|jszip)\//.test(id)) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
