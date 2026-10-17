/**
 * Vergleich einer eigenen Aufnahme mit einer Modellaufnahme:
 * Stille trimmen → MFCC (CMN + Deltas) → DTW → Ähnlichkeit 0–100.
 */

import { addDeltas, cepstralMeanNormalize, mfcc } from './mfcc';
import { dtw } from './dtw';
import { trimSilence } from './trim';

export interface SimilarityResult {
  /** 0–100, akustische Ähnlichkeit zur Modellaufnahme */
  similarity: number;
  /** Dauerverhältnis eigene Aufnahme / Modell (1 = gleich lang) */
  durationRatio: number;
  /** 0–100 Tempo-Bewertung (100 bei Verhältnis 0.8–1.25, abfallend darüber/darunter) */
  tempo: number;
  /** normalisierte DTW-Distanz (Rohwert, für Diagnose) */
  dtwDistance: number;
  /** Pfad (Frame-Indizes Modell → eigene Aufnahme), für eine Vergleichsgrafik */
  path: Array<[number, number]>;
  /** Frame-Raster in ms */
  hopMs: number;
}

/**
 * Skalierung der normalisierten DTW-Distanz in die Ähnlichkeit:
 * similarity = 100 · exp(−SIMILARITY_SCALE · normalizedCost).
 *
 * Heuristik, noch zu kalibrieren: Identische Signale haben Distanz 0 → 100.
 * Mit 24-dimensionalen Merkmalen (MFCC 1..12 + Deltas, CMN) liegen die
 * normalisierten Distanzen bei synthetischen Testsignalen etwa so:
 *   gleiche Äußerung, 20 % langsamer  ≈ 1.3  → ~91
 *   gleiche Äußerung, mehr Stille     ≈ 0.4  → ~97
 *   andere Äußerung                   ≈ 15   → ~35
 * Der Wert 0.07 bildet "andere Äußerung" auf ~30–50 ab. Mit echten
 * Schüleraufnahmen nachjustieren (Tests in compare.test.ts anpassen).
 */
export const SIMILARITY_SCALE = 0.07;

/** Sakoe-Chiba-Band für den Vergleich (Anteil der größeren Rahmenzahl). */
export const DTW_BAND = 0.3;

/** Tempo gilt als ideal, wenn das Dauerverhältnis in [0.8, 1.25] liegt. */
const TEMPO_OK_LOG = Math.log(1.25);
/** Jenseits des Idealbereichs fällt die Tempo-Note linear; 0 bei Faktor 2.5 bzw. 0.4. */
const TEMPO_ZERO_LOG = Math.log(2.5);

/** Tempo-Bewertung 0–100 aus dem Dauerverhältnis. */
export function tempoScore(durationRatio: number): number {
  if (!Number.isFinite(durationRatio) || durationRatio <= 0) return 0;
  const lr = Math.abs(Math.log(durationRatio));
  if (lr <= TEMPO_OK_LOG) return 100;
  const t = (lr - TEMPO_OK_LOG) / (TEMPO_ZERO_LOG - TEMPO_OK_LOG);
  return Math.max(0, Math.round(100 * (1 - t)));
}

/**
 * Merkmalsvektoren für den Vergleich: MFCC 1..12 (ohne Energie) und deren
 * Deltas, nach CMN. Ergebnis: 24 Dimensionen pro Rahmen.
 */
export function compareFeatures(pcm: Float32Array, sampleRate: number): { frames: Float32Array[]; hopMs: number } {
  const res = mfcc(pcm, { sampleRate });
  const withDeltas = addDeltas(cepstralMeanNormalize(res.frames));
  const nCoeffs = res.frames[0]?.length ?? 13;
  const frames = withDeltas.map((fr) => {
    const out = new Float32Array(2 * (nCoeffs - 1));
    for (let k = 1; k < nCoeffs; k++) {
      out[k - 1] = fr[k] ?? 0;
      out[nCoeffs - 1 + k - 1] = fr[nCoeffs + k] ?? 0;
    }
    return out;
  });
  return { frames, hopMs: res.hopMs };
}

/**
 * Vergleicht zwei Mono-Aufnahmen (Float32, [-1, 1], gleiche Abtastrate).
 */
export function compareRecordings(
  reference: Float32Array,
  candidate: Float32Array,
  sampleRate = 16000,
): SimilarityResult {
  const ref = trimSilence(reference, sampleRate).pcm;
  const cand = trimSilence(candidate, sampleRate).pcm;

  const durationRatio = ref.length > 0 ? cand.length / ref.length : cand.length > 0 ? Infinity : 1;
  const tempo = tempoScore(durationRatio);

  const refFeat = compareFeatures(ref, sampleRate);
  const candFeat = compareFeatures(cand, sampleRate);
  const result = dtw(refFeat.frames, candFeat.frames, { band: DTW_BAND });

  const dtwDistance = result.normalizedCost;
  const similarity = Number.isFinite(dtwDistance)
    ? Math.max(0, Math.min(100, 100 * Math.exp(-SIMILARITY_SCALE * dtwDistance)))
    : 0;

  return {
    similarity,
    durationRatio,
    tempo,
    dtwDistance,
    path: result.path,
    hopMs: refFeat.hopMs,
  };
}
