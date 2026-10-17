#!/usr/bin/env node
/**
 * Lädt die geprüften Modelldateien aus dem GitHub-Release nach public/models/,
 * damit sie mit der App vom selben Ursprung ausgeliefert werden.
 * (GitHub-Release-Downloads senden keinen CORS-Header; ein direkter Abruf aus
 * dem Browser von github.io aus scheitert daher.)
 *
 *   node scripts/fetch-models.mjs [--all]
 *
 * Ohne --all nur das französische Standardmodell (≈ 86 MB), mit --all auch das
 * mehrsprachige Vergleichsmodell (≈ 190 MB).
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, 'public', 'models');
const RELEASE = process.env.MODEL_RELEASE_URL ?? 'https://github.com/Wilsker-Wiesen/Prononciation/releases/download/models-v1/';
const files = ['wav2vec2-french-phonemizer.onnx', 'wav2vec2-french-phonemizer.vocab.json'];
if (process.argv.includes('--all')) files.push('wav2vec2-lv-60-espeak-cv-ft.onnx', 'wav2vec2-lv-60-espeak-cv-ft.vocab.json');

mkdirSync(dest, { recursive: true });
for (const f of files) {
  const target = join(dest, f);
  if (existsSync(target) && statSync(target).size > 0) {
    console.log(`= ${f} (vorhanden)`);
    continue;
  }
  const res = await fetch(RELEASE + f, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${f} (${res.status})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
  console.log(`✓ ${f} (${(statSync(target).size / 1e6).toFixed(1)} MB)`);
}
