#!/usr/bin/env node
/**
 * Erzeugt eine Referenz-Phonemisierung mit eSpeak NG (WASM-Build) für das
 * Testkorpus in tools/fixtures/words.txt. Dient zur Kalibrierung des eigenen
 * G2P-Moduls (src/phon/g2p.ts), dessen Ausgabe zum Phoneminventar des
 * Erkennungsmodells (wav2vec2-lv-60-espeak-cv-ft) passen muss.
 *
 * Hinweis: @echogarden/espeak-ng-emscripten steht unter GPL-3.0. Es wird nur
 * hier als Entwicklungswerkzeug verwendet und nicht in die App eingebaut.
 *
 * Aufruf: node tools/espeak-reference.mjs [eingabe.txt] [ausgabe.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Init from '@echogarden/espeak-ng-emscripten';

const input = process.argv[2] ?? 'tools/fixtures/words.txt';
const output = process.argv[3] ?? 'tools/fixtures/espeak-reference.json';

const lines = readFileSync(input, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const m = await Init();
const inst = await new m.eSpeakNGWorker();
inst.set_voice('fr');

const out = {};
for (const line of lines) {
  const raw = String(inst.synthesize_ipa(line).ipa).trim();
  // espeak-Notation: Phoneme durch "_" getrennt, Wörter durch Leerzeichen,
  // Betonung ˈ/ˌ, "-" = kurzer Laut, "(en)...(fr)" = Sprachwechsel.
  const words = raw
    .replace(/\((\w+)\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) =>
      w
        .split('_')
        .map((p) => p.replace(/[ˈˌ-]/g, ''))
        .filter(Boolean),
    );
  out[line] = { raw, words };
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(out, null, 1));
console.log(`${lines.length} Einträge → ${output}`);
