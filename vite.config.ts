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
      includeAssets: ['icons/*.svg', 'ort/*'],
      manifest: {
        name: 'Prononciation – Aussprachetrainer Französisch',
        short_name: 'Prononciation',
        description: 'Aussprache trainieren: hören, nachsprechen, vergleichen, Rückmeldung erhalten.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f7f5f0',
        theme_color: '#1f4e79',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Das ASR-Modell (~300 MB) wird nicht über Workbox, sondern über die Cache-API
        // in src/asr/modelLoader.ts verwaltet.
        globPatterns: ['**/*.{js,css,html,svg,wasm,mjs,json}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/models\//],
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
        manualChunks: {
          ort: ['onnxruntime-web'],
          vendor: ['react', 'react-dom', 'idb', 'jszip'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
