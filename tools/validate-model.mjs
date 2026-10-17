#!/usr/bin/env node
/**
 * Prüfstand für Phonem-Erkennungsmodelle (läuft unter Node, z. B. in GitHub Actions).
 *
 *   npx tsx tools/validate-model.mjs --model pfad/model.onnx --vocab pfad/vocab.json
 *          [--words tools/fixtures/validation-words.txt] [--audio-dir ordner] [--report out.json]
 *
 * Ohne --audio-dir wird Testsprache mit eSpeak NG synthetisiert (robotisch, aber
 * phonetisch sauber). Mit --audio-dir werden WAV-Dateien (16-bit PCM) verwendet,
 * deren Dateiname (ohne Endung) das gesprochene Wort ist, z. B. "bonjour.wav".
 * Der Prüfstand lädt das Modell mit onnxruntime-node, dekodiert CTC und bewertet
 * mit demselben Code wie die App (ctc.ts, assess.ts).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { ctcGreedyDecode } from '../src/asr/ctc.ts';
import { assess } from '../src/asr/assess.ts';
import { parseVocab } from '../src/asr/modelLoader.ts';
import { ipaString, transcribe } from '../src/phon/g2p.ts';
import { resampleTo } from '../src/audio/resample.ts';
import { decodeWav } from '../src/audio/wav.ts';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? ''] : [])).filter((x) => x.length));
const modelPath = args.model;
const vocabPath = args.vocab;
if (!modelPath || !vocabPath) {
  console.error('Aufruf: --model <onnx> --vocab <json> [--words <txt>] [--audio-dir <dir>] [--report <json>]');
  process.exit(2);
}
const wordsFile = args.words ?? 'tools/fixtures/validation-words.txt';
const minMean = Number(args['min-mean'] ?? 45);

// onnxruntime-node (schnell) bevorzugen, sonst onnxruntime-web (WASM, läuft auch unter Node)
let ort;
let providers;
try {
  ort = await import('onnxruntime-node');
  providers = ['cpu'];
} catch {
  ort = await import('onnxruntime-web/wasm');
  providers = ['wasm'];
  // Unter Node kann fetch keine file://-URLs laden: WASM-Binärdatei direkt übergeben
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const dist = fileURLToPath(new URL('../node_modules/onnxruntime-web/dist/', import.meta.url));
  ort.env.wasm.wasmPaths = { mjs: pathToFileURL(dist + 'ort-wasm-simd-threaded.mjs').href };
  ort.env.wasm.wasmBinary = readFileSync(dist + 'ort-wasm-simd-threaded.wasm');
  ort.env.wasm.numThreads = 1;
}
const vocab = parseVocab(JSON.parse(readFileSync(vocabPath, 'utf8')));
const vocabSet = new Set(vocab.map((v) => v.replace(/[ːˈˌ]/g, '')));
console.log(`Modell: ${modelPath}\nVokabular: ${vocab.length} Tokens`);
const t0 = Date.now();
const session = await ort.InferenceSession.create(readFileSync(modelPath), { executionProviders: providers, graphOptimizationLevel: 'all' });
console.log(`Geladen in ${Date.now() - t0} ms. Eingaben: ${session.inputNames.join(', ')}; Ausgaben: ${session.outputNames.join(', ')}`);

function normalize(pcm) {
  let mean = 0;
  for (const v of pcm) mean += v;
  mean /= pcm.length;
  let varSum = 0;
  for (const v of pcm) varSum += (v - mean) ** 2;
  const std = Math.sqrt(varSum / pcm.length + 1e-7);
  return Float32Array.from(pcm, (v) => (v - mean) / std);
}

async function recognize(pcm16k) {
  let pcm = pcm16k;
  if (pcm.length < 8000) { const p = new Float32Array(8000); p.set(pcm); pcm = p; }
  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', normalize(pcm), [1, pcm.length]) };
  if (session.inputNames.includes('attention_mask')) feeds.attention_mask = new ort.Tensor('int64', new BigInt64Array(pcm.length).fill(1n), [1, pcm.length]);
  const t = Date.now();
  const out = await session.run(feeds);
  const logits = out[session.outputNames[0]];
  const [, frames, vocabSize] = logits.dims;
  return { phones: ctcGreedyDecode(logits.data, frames, vocabSize, vocab), ms: Date.now() - t };
}

// ---- Testsignale ----
const samples = []; // { text, pcm16k, source }
if (args['audio-dir']) {
  for (const f of readdirSync(args['audio-dir']).filter((f) => extname(f).toLowerCase() === '.wav').sort()) {
    const { pcm, sampleRate } = decodeWav(readFileSync(join(args['audio-dir'], f)).buffer);
    const text = basename(f, extname(f)).replace(/[_-]+/g, ' ');
    samples.push({ text, pcm16k: sampleRate === 16000 ? pcm : resampleTo(pcm, sampleRate, 16000), source: f });
  }
} else {
  const { default: Init } = await import('@echogarden/espeak-ng-emscripten');
  const m = await Init();
  const inst = await new m.eSpeakNGWorker();
  inst.set_voice('fr');
  inst.set_rate(140);
  const words = readFileSync(wordsFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const text of words) {
    const chunks = [];
    inst.synthesize(text, (s) => { if (s && s.length) chunks.push(Float32Array.from(s, (v) => v / 32768)); });
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const pcm = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { pcm.set(c, off); off += c.length; }
    samples.push({ text, pcm16k: resampleTo(pcm, 22050, 16000), source: 'espeak' });
  }
}
if (!samples.length) { console.error('Keine Testsignale.'); process.exit(2); }

// ---- Durchlauf ----
const rows = [];
for (const s of samples) {
  const { phones, ms } = await recognize(s.pcm16k);
  const a = assess(s.text, phones, undefined, vocabSet);
  const target = ipaString(transcribe(s.text));
  rows.push({ text: s.text, target, heard: a.recognizedIpa, overall: a.overall, phoneme: a.overall, ms, findings: a.findings.map((f) => f.id), source: s.source });
  console.log(`${a.overall.toString().padStart(3)}  ${s.text.padEnd(28)} ziel [${target}]  gehört [${a.recognizedIpa}]  ${ms} ms${a.findings.length ? '  ' + a.findings.map((f) => f.id).join(',') : ''}`);
}
const mean = rows.reduce((x, r) => x + r.overall, 0) / rows.length;
const good = rows.filter((r) => r.overall >= 65).length;
const meanMs = rows.reduce((x, r) => x + r.ms, 0) / rows.length;
console.log(`\nMittelwert ${mean.toFixed(1)} Punkte, ${good}/${rows.length} Einträge ≥ 65, Ø ${meanMs.toFixed(0)} ms je Äußerung (${samples[0].source === 'espeak' ? 'eSpeak-Synthese' : 'Aufnahmen'})`);
if (args.report) writeFileSync(args.report, JSON.stringify({ model: modelPath, vocabSize: vocab.length, mean, good, n: rows.length, meanMs, rows }, null, 1));
if (mean < minMean) { console.error(`FEHLER: Mittelwert unter ${minMean}`); process.exit(1); }
