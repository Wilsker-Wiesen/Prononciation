/**
 * Entfernt Stille am Anfang und Ende einer Aufnahme anhand der Rahmenenergie.
 */

import { frameEnergies } from './mfcc';

export interface TrimOptions {
  /** Rahmenlänge in ms (Standard 25) */
  frameMs?: number;
  /** Rahmenvorschub in ms (Standard 10) */
  hopMs?: number;
  /** Schwelle relativ zum lautesten Rahmen in dB (Standard -40) */
  relativeDb?: number;
  /** Absolute RMS-Schwelle (Standard 0.01) – leisere Rahmen gelten immer als Stille */
  absoluteRms?: number;
  /** Rand in ms, der vor/nach dem Sprachanteil erhalten bleibt (Standard 50) */
  marginMs?: number;
}

export interface TrimResult {
  pcm: Float32Array;
  startSample: number;
  endSample: number;
}

/**
 * Sucht den ersten und letzten Rahmen über der Schwelle und schneidet das
 * Signal mit Rand aus. Enthält die Aufnahme keinen Rahmen über der Schwelle,
 * wird das Signal unverändert zurückgegeben.
 */
export function trimSilence(
  pcm: Float32Array,
  sampleRate: number,
  opts: TrimOptions = {},
): TrimResult {
  const frameMs = opts.frameMs ?? 25;
  const hopMs = opts.hopMs ?? 10;
  const relativeDb = opts.relativeDb ?? -40;
  const absoluteRms = opts.absoluteRms ?? 0.01;
  const marginMs = opts.marginMs ?? 50;

  if (pcm.length === 0) return { pcm, startSample: 0, endSample: 0 };

  const energies = frameEnergies(pcm, sampleRate, frameMs, hopMs);
  let peak = 0;
  for (let i = 0; i < energies.length; i++) peak = Math.max(peak, energies[i] as number);

  const relThreshold = peak * 10 ** (relativeDb / 20);
  const threshold = Math.max(relThreshold, absoluteRms);

  let first = -1;
  let last = -1;
  for (let i = 0; i < energies.length; i++) {
    if ((energies[i] as number) >= threshold) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return { pcm, startSample: 0, endSample: pcm.length };

  const hop = Math.max(1, Math.round((sampleRate * hopMs) / 1000));
  const frameLen = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const margin = Math.round((sampleRate * marginMs) / 1000);

  const startSample = Math.max(0, first * hop - margin);
  const endSample = Math.min(pcm.length, last * hop + frameLen + margin);
  return { pcm: pcm.slice(startSample, endSample), startSample, endSample };
}
