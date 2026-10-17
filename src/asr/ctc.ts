/**
 * CTC-Dekodierung der Modellausgabe (Greedy): pro Frame das wahrscheinlichste
 * Zeichen, Wiederholungen zusammenfassen, Blank entfernen.
 */
import { normalizeModelPhone } from '../phon/ipa';

export interface RecognizedPhone {
  ipa: string;
  /** Rohes Token des Modells */
  token: string;
  startFrame: number;
  endFrame: number;
  /** mittlere Wahrscheinlichkeit des Tokens über seine Frames (0–1) */
  conf: number;
}

export interface CtcOptions {
  blankId?: number;
  /** Tokens, die ignoriert werden (Sondertokens) */
  ignore?: Set<string>;
}

const DEFAULT_IGNORE = new Set(['<pad>', '[PAD]', '<s>', '</s>', '<unk>', '[UNK]', '|', '<blank>']);
const BLANK_TOKENS = ['<pad>', '[PAD]', '<blank>'];
const COMBINING = /^[\u0300-\u036f]+$/;

/** Index des CTC-Blanks im Vokabular (pad-Token), sonst 0. */
export function blankIdFor(vocab: string[]): number {
  for (const t of BLANK_TOKENS) {
    const i = vocab.indexOf(t);
    if (i >= 0) return i;
  }
  return 0;
}

/**
 * @param logits  [frames × vocab] zeilenweise (row-major)
 */
export function ctcGreedyDecode(logits: Float32Array, frames: number, vocabSize: number, vocab: string[], opts: CtcOptions = {}): RecognizedPhone[] {
  const blank = opts.blankId ?? blankIdFor(vocab);
  const ignore = opts.ignore ?? DEFAULT_IGNORE;
  const out: RecognizedPhone[] = [];
  let prevId = -1;
  let current: RecognizedPhone | null = null;
  let confSum = 0;
  let confN = 0;
  for (let f = 0; f < frames; f++) {
    const off = f * vocabSize;
    // Softmax nur für das Maximum (numerisch stabil)
    let max = -Infinity;
    let argmax = 0;
    for (let v = 0; v < vocabSize; v++) {
      const x = logits[off + v]!;
      if (x > max) { max = x; argmax = v; }
    }
    let denom = 0;
    for (let v = 0; v < vocabSize; v++) denom += Math.exp(logits[off + v]! - max);
    const prob = 1 / denom;
    if (argmax === blank) {
      if (current) { current.conf = confN ? confSum / confN : 0; out.push(current); current = null; confSum = 0; confN = 0; }
      prevId = argmax;
      continue;
    }
    if (argmax === prevId && current) {
      current.endFrame = f + 1;
      confSum += prob; confN++;
    } else {
      if (current) { current.conf = confN ? confSum / confN : 0; out.push(current); }
      const token = vocab[argmax] ?? '?';
      current = { ipa: normalizeModelPhone(token), token, startFrame: f, endFrame: f + 1, conf: prob };
      confSum = prob; confN = 1;
    }
    prevId = argmax;
  }
  if (current) { current.conf = confN ? confSum / confN : 0; out.push(current); }
  const filtered = out.filter((p) => !ignore.has(p.token) && p.ipa !== '');
  // Manche Vokabulare führen die Nasal-Tilde als eigenes Token: an das vorige Phon anhängen
  const merged: RecognizedPhone[] = [];
  for (const p of filtered) {
    const prev = merged[merged.length - 1];
    if (COMBINING.test(p.token) && prev) {
      prev.ipa = prev.ipa + p.token;
      prev.endFrame = p.endFrame;
      prev.conf = (prev.conf + p.conf) / 2;
    } else if (!COMBINING.test(p.token)) {
      merged.push(p);
    }
  }
  return merged;
}

/** Zeitpunkt eines Frames in Sekunden (wav2vec2: 20 ms pro Frame bei 16 kHz). */
export const FRAME_SECONDS = 0.02;
