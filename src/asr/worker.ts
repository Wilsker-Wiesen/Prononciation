/**
 * Web Worker: lädt das Phonem-Modell mit onnxruntime-web und berechnet Logits
 * für 16-kHz-Audio. Die Dekodierung (CTC) findet ebenfalls hier statt.
 */
import * as ort from 'onnxruntime-web/wasm';
import { ctcGreedyDecode, type RecognizedPhone } from './ctc';
import { fetchCached, parseVocab, resolveUrl, type ModelSource } from './modelLoader';

export type WorkerRequest =
  | { type: 'load'; seq: number; sources: ModelSource[]; numThreads: number }
  | { type: 'recognize'; seq: number; pcm: Float32Array }
  | { type: 'unload'; seq: number };

export type WorkerResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'loaded'; seq: number; vocabSize: number; vocab: string[]; ms: number; source?: ModelSource }
  | { type: 'result'; seq: number; phones: RecognizedPhone[]; frames: number; ms: number }
  | { type: 'error'; seq: number; message: string };

let session: ort.InferenceSession | null = null;
let vocab: string[] = [];

const post = (m: WorkerResponse) => (self as unknown as Worker).postMessage(m);

async function load(req: Extract<WorkerRequest, { type: 'load' }>): Promise<void> {
  const t0 = performance.now();
  ort.env.wasm.numThreads = req.numThreads;
  ort.env.wasm.proxy = false;
  const errors: string[] = [];
  for (const source of req.sources) {
    try {
      const vocabBuf = await fetchCached(resolveUrl(source.baseUrl, source.vocabFile), undefined, 'Vokabular');
      const v = parseVocab(JSON.parse(new TextDecoder().decode(vocabBuf)));
      const modelBuf = await fetchCached(resolveUrl(source.baseUrl, source.modelFile), (p) => post({ type: 'progress', ...p, file: 'Modell' }), 'Modell');
      session = await ort.InferenceSession.create(modelBuf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      vocab = v;
      post({ type: 'loaded', seq: req.seq, vocabSize: vocab.length, vocab, ms: Math.round(performance.now() - t0), source });
      return;
    } catch (e) {
      errors.push(`${source.baseUrl}${source.modelFile}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Kein Modell ladbar.\n${errors.join('\n')}`);
}

/** Wav2Vec2-Vorverarbeitung: Mittelwert 0, Varianz 1 (feature_extractor do_normalize). */
function normalize(pcm: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < pcm.length; i++) mean += pcm[i]!;
  mean /= Math.max(1, pcm.length);
  let varSum = 0;
  for (let i = 0; i < pcm.length; i++) { const d = pcm[i]! - mean; varSum += d * d; }
  const std = Math.sqrt(varSum / Math.max(1, pcm.length) + 1e-7);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = (pcm[i]! - mean) / std;
  return out;
}

async function recognize(req: Extract<WorkerRequest, { type: 'recognize' }>): Promise<void> {
  if (!session) throw new Error('Modell nicht geladen');
  const t0 = performance.now();
  // Mindestlänge: 0,5 s, sonst instabile Ausgabe
  let pcm = req.pcm;
  if (pcm.length < 8000) {
    const padded = new Float32Array(8000);
    padded.set(pcm);
    pcm = padded;
  }
  const input = new ort.Tensor('float32', normalize(pcm), [1, pcm.length]);
  const inputName = session.inputNames[0] ?? 'input_values';
  const feeds: Record<string, ort.Tensor> = { [inputName]: input };
  if (session.inputNames.includes('attention_mask')) {
    feeds['attention_mask'] = new ort.Tensor('int64', new BigInt64Array(pcm.length).fill(1n), [1, pcm.length]);
  }
  const outputs = await session.run(feeds);
  const outName = session.outputNames[0] ?? 'logits';
  const logits = outputs[outName]!;
  const dims = logits.dims; // [1, frames, vocab]
  const frames = dims[1] ?? 0;
  const vocabSize = dims[2] ?? vocab.length;
  const data = logits.data as Float32Array;
  const phones = ctcGreedyDecode(data, frames, vocabSize, vocab);
  post({ type: 'result', seq: req.seq, phones, frames, ms: Math.round(performance.now() - t0) });
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    if (req.type === 'load') await load(req);
    else if (req.type === 'recognize') await recognize(req);
    else if (req.type === 'unload') {
      await session?.release();
      session = null;
      post({ type: 'loaded', seq: req.seq, vocabSize: 0, vocab: [], ms: 0 });
    }
  } catch (e) {
    post({ type: 'error', seq: req.seq, message: e instanceof Error ? e.message : String(e) });
  }
};
