// Kopiert die WebAssembly-Laufzeit von onnxruntime-web nach public/ort,
// damit sie unter dem Basis-Pfad der App ausgeliefert wird (kein CDN nötig).
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dst = join(root, 'public', 'ort');
mkdirSync(dst, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  // Nur die eigentliche WASM-Laufzeit, keine JSEP/WebGPU-Varianten (die ziehen 20 MB nach sich).
  if (/^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(f)) {
    copyFileSync(join(src, f), join(dst, f));
    n++;
  }
}
console.log(`copy-ort: ${n} Dateien nach public/ort kopiert`);
