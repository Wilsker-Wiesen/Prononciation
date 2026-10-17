/** Pegelwerte und Wellenform-Daten für die Anzeige. */

/**
 * Maximaler Betrag pro Abschnitt (für das Zeichnen einer Wellenform).
 * Liefert immer `buckets` Werte; bei weniger Samples als Abschnitten werden
 * Samples wiederholt (das Signal wird gestreckt statt mit 0 aufgefüllt).
 */
export function waveformPeaks(pcm: Float32Array, buckets: number): Float32Array {
  const n = Math.max(0, Math.floor(buckets));
  const peaks = new Float32Array(n);
  if (n === 0 || pcm.length === 0) return peaks;
  const perBucket = pcm.length / n;
  for (let b = 0; b < n; b++) {
    const start = Math.floor(b * perBucket);
    const end = Math.max(start + 1, Math.floor((b + 1) * perBucket));
    let peak = 0;
    for (let i = start; i < end && i < pcm.length; i++) {
      const v = Math.abs(pcm[i]!);
      if (v > peak) peak = v;
    }
    peaks[b] = peak;
  }
  return peaks;
}

/** Effektivwert (root mean square) des gesamten Signals, 0 für leere Signale. */
export function rms(pcm: Float32Array): number {
  if (pcm.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) {
    const v = pcm[i]!;
    sum += v * v;
  }
  return Math.sqrt(sum / pcm.length);
}

/** Pegel in dBFS (RMS); -Infinity für Stille. */
export function rmsDb(pcm: Float32Array): number {
  const r = rms(pcm);
  return r > 0 ? 20 * Math.log10(r) : -Infinity;
}
