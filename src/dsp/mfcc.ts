/**
 * MFCC-Merkmale (Mel-Frequency Cepstral Coefficients) für den akustischen
 * Vergleich zweier Aufnahmen. Reines TypeScript, ohne Abhängigkeiten.
 *
 * Pipeline: Pre-Emphasis → Rahmen (Hamming) → Leistungsspektrum → Mel-Filterbank
 * (HTK-Formel) → log → DCT-II (orthonormal). Koeffizient 0 wird durch die
 * logarithmische Rahmenenergie ersetzt.
 */

import { nextPowerOfTwo, powerSpectrum } from './fft';

export interface MfccOptions {
  /** Abtastrate in Hz (Standard 16000) */
  sampleRate?: number;
  /** Rahmenlänge in ms (Standard 25) */
  frameMs?: number;
  /** Rahmenvorschub in ms (Standard 10) */
  hopMs?: number;
  /** Anzahl Mel-Filter (Standard 26) */
  nMels?: number;
  /** Anzahl Cepstralkoeffizienten inkl. Energie (Standard 13) */
  nCoeffs?: number;
  /** Pre-Emphasis-Faktor (Standard 0.97) */
  preEmphasis?: number;
}

export interface MfccResult {
  /** Ein Vektor pro Rahmen, Länge nCoeffs; Koeffizient 0 = log-Energie */
  frames: Float32Array[];
  hopMs: number;
  frameMs: number;
}

/** Untergrenze für Logarithmen (vermeidet log(0)). */
const LOG_FLOOR = 1e-10;

/** Hz → Mel (HTK). */
export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/** Mel → Hz (HTK). */
export function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

/** Hamming-Fenster der Länge n (gecacht). */
const windowCache = new Map<number, Float32Array>();
function hammingWindow(n: number): Float32Array {
  const cached = windowCache.get(n);
  if (cached) return cached;
  const w = new Float32Array(n);
  const denom = n > 1 ? n - 1 : 1;
  for (let i = 0; i < n; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / denom);
  windowCache.set(n, w);
  return w;
}

/**
 * Mel-Filterbank als Dreiecksfilter über den FFT-Bins (nfft/2+1).
 * Rückgabe: pro Filter [startBin, Gewichte...] als kompakte Struktur.
 */
interface MelFilter {
  start: number;
  weights: Float32Array;
}
const filterbankCache = new Map<string, MelFilter[]>();
function melFilterbank(nMels: number, nfft: number, sampleRate: number): MelFilter[] {
  const key = `${nMels}|${nfft}|${sampleRate}`;
  const cached = filterbankCache.get(key);
  if (cached) return cached;

  const nBins = nfft / 2 + 1;
  const melLow = hzToMel(0);
  const melHigh = hzToMel(sampleRate / 2);
  // nMels + 2 Stützstellen in Mel, gleichmäßig verteilt
  const binOf = new Float64Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    const mel = melLow + ((melHigh - melLow) * i) / (nMels + 1);
    binOf[i] = (melToHz(mel) * nfft) / sampleRate;
  }

  const filters: MelFilter[] = [];
  for (let m = 0; m < nMels; m++) {
    const left = binOf[m] as number;
    const center = binOf[m + 1] as number;
    const right = binOf[m + 2] as number;
    const start = Math.max(0, Math.ceil(left));
    const end = Math.min(nBins - 1, Math.floor(right));
    const len = Math.max(0, end - start + 1);
    const weights = new Float32Array(len);
    for (let k = start; k <= end; k++) {
      const w =
        k < center
          ? center > left
            ? (k - left) / (center - left)
            : 0
          : right > center
            ? (right - k) / (right - center)
            : 0;
      weights[k - start] = Math.max(0, w);
    }
    filters.push({ start, weights });
  }
  filterbankCache.set(key, filters);
  return filters;
}

/** DCT-II-Matrix (orthonormal), nCoeffs × nMels (gecacht). */
const dctCache = new Map<string, Float32Array>();
function dctMatrix(nCoeffs: number, nMels: number): Float32Array {
  const key = `${nCoeffs}|${nMels}`;
  const cached = dctCache.get(key);
  if (cached) return cached;
  const mat = new Float32Array(nCoeffs * nMels);
  const scale = Math.sqrt(2 / nMels);
  for (let k = 0; k < nCoeffs; k++) {
    const s = k === 0 ? scale / Math.SQRT2 : scale;
    for (let m = 0; m < nMels; m++) {
      mat[k * nMels + m] = s * Math.cos((Math.PI * k * (m + 0.5)) / nMels);
    }
  }
  dctCache.set(key, mat);
  return mat;
}

/** Anzahl Rahmen für eine Signallänge (mindestens 1). */
export function frameCount(nSamples: number, frameLen: number, hop: number): number {
  if (nSamples <= frameLen) return 1;
  return Math.floor((nSamples - frameLen) / hop) + 1;
}

/**
 * Berechnet MFCC-Vektoren. Eingabe: Mono-PCM, Float32 in [-1, 1].
 * Zu kurze Eingaben ergeben genau einen (nullgepolsterten) Rahmen.
 */
export function mfcc(pcm: Float32Array, opts: MfccOptions = {}): MfccResult {
  const sampleRate = opts.sampleRate ?? 16000;
  const frameMs = opts.frameMs ?? 25;
  const hopMs = opts.hopMs ?? 10;
  const nMels = opts.nMels ?? 26;
  const nCoeffs = opts.nCoeffs ?? 13;
  const preEmphasis = opts.preEmphasis ?? 0.97;

  const frameLen = Math.max(2, Math.round((sampleRate * frameMs) / 1000));
  const hop = Math.max(1, Math.round((sampleRate * hopMs) / 1000));
  const nfft = nextPowerOfTwo(frameLen);
  const window = hammingWindow(frameLen);
  const filters = melFilterbank(nMels, nfft, sampleRate);
  const dct = dctMatrix(nCoeffs, nMels);

  // Pre-Emphasis auf das gesamte Signal
  const emph = new Float32Array(pcm.length);
  if (pcm.length > 0) {
    emph[0] = pcm[0] as number;
    for (let i = 1; i < pcm.length; i++) {
      emph[i] = (pcm[i] as number) - preEmphasis * (pcm[i - 1] as number);
    }
  }

  const nFrames = frameCount(pcm.length, frameLen, hop);
  const frames: Float32Array[] = [];
  const frame = new Float32Array(frameLen);
  const melEnergies = new Float64Array(nMels);

  for (let f = 0; f < nFrames; f++) {
    const offset = f * hop;
    let energy = 0;
    for (let i = 0; i < frameLen; i++) {
      const idx = offset + i;
      const s = idx < emph.length ? (emph[idx] as number) : 0;
      energy += s * s;
      frame[i] = s * (window[i] as number);
    }

    const spec = powerSpectrum(frame, nfft);

    for (let m = 0; m < nMels; m++) {
      const flt = filters[m] as MelFilter;
      let acc = 0;
      const w = flt.weights;
      for (let j = 0; j < w.length; j++) {
        acc += (w[j] as number) * (spec[flt.start + j] as number);
      }
      melEnergies[m] = Math.log(Math.max(acc, LOG_FLOOR));
    }

    const coeffs = new Float32Array(nCoeffs);
    for (let k = 0; k < nCoeffs; k++) {
      let acc = 0;
      const row = k * nMels;
      for (let m = 0; m < nMels; m++) {
        acc += (dct[row + m] as number) * (melEnergies[m] as number);
      }
      coeffs[k] = acc;
    }
    // Koeffizient 0 → logarithmische Rahmenenergie
    coeffs[0] = Math.log(Math.max(energy, LOG_FLOOR));
    frames.push(coeffs);
  }

  return { frames, hopMs, frameMs };
}

/**
 * Cepstral Mean Normalization: zieht pro Koeffizient den Mittelwert über alle
 * Rahmen ab. Gibt neue Arrays zurück.
 */
export function cepstralMeanNormalize(frames: Float32Array[]): Float32Array[] {
  if (frames.length === 0) return [];
  const dim = (frames[0] as Float32Array).length;
  const mean = new Float64Array(dim);
  for (const fr of frames) {
    for (let d = 0; d < dim; d++) mean[d] = (mean[d] as number) + (fr[d] ?? 0);
  }
  for (let d = 0; d < dim; d++) mean[d] = (mean[d] as number) / frames.length;
  return frames.map((fr) => {
    const out = new Float32Array(dim);
    for (let d = 0; d < dim; d++) out[d] = (fr[d] ?? 0) - (mean[d] as number);
    return out;
  });
}

/**
 * Hängt Delta-Koeffizienten erster Ordnung an (Fenster 2, Randrahmen werden
 * wiederholt). Ergebnis: 2 × Dimension pro Rahmen. Gibt neue Arrays zurück.
 */
export function addDeltas(frames: Float32Array[]): Float32Array[] {
  const n = frames.length;
  if (n === 0) return [];
  const dim = (frames[0] as Float32Array).length;
  const N = 2;
  // Normierung: 2 * sum_{k=1..N} k^2 = 10
  const denom = 2 * ((N * (N + 1) * (2 * N + 1)) / 6);
  const at = (t: number): Float32Array => frames[Math.min(n - 1, Math.max(0, t))] as Float32Array;

  return frames.map((fr, t) => {
    const out = new Float32Array(2 * dim);
    out.set(fr, 0);
    for (let d = 0; d < dim; d++) {
      let acc = 0;
      for (let k = 1; k <= N; k++) {
        acc += k * ((at(t + k)[d] ?? 0) - (at(t - k)[d] ?? 0));
      }
      out[dim + d] = acc / denom;
    }
    return out;
  });
}

/** RMS-Energie pro Rahmen (ohne Fenster, ohne Pre-Emphasis). */
export function frameEnergies(
  pcm: Float32Array,
  sampleRate: number,
  frameMs = 25,
  hopMs = 10,
): Float32Array {
  const frameLen = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const hop = Math.max(1, Math.round((sampleRate * hopMs) / 1000));
  const nFrames = frameCount(pcm.length, frameLen, hop);
  const out = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const offset = f * hop;
    let acc = 0;
    for (let i = 0; i < frameLen; i++) {
      const s = pcm[offset + i] ?? 0;
      acc += s * s;
    }
    out[f] = Math.sqrt(acc / frameLen);
  }
  return out;
}
