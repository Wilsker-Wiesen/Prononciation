/**
 * Dynamic Time Warping (DTW) über Merkmalsvektor-Folgen, mit Sakoe-Chiba-Band
 * und Rückverfolgung des optimalen Pfads. Speicher: eine flache Float64-Matrix
 * (n × m), ausreichend für ~1000 × 1000 Rahmen.
 */

export interface DtwResult {
  /** Gesamtkosten des Pfads */
  cost: number;
  /** Kosten / Pfadlänge */
  normalizedCost: number;
  /** Pfad als Paare [indexA, indexB], von (0,0) bis (n-1,m-1) */
  path: Array<[number, number]>;
}

export interface DtwOptions {
  /** Sakoe-Chiba-Band als Anteil der größeren Länge (Standard 0.25) */
  band?: number;
  /** Lokales Abstandsmaß (Standard: euklidisch) */
  distance?: (x: Float32Array, y: Float32Array) => number;
}

/** Euklidischer Abstand zweier Vektoren gleicher Länge. */
export function euclidean(x: Float32Array, y: Float32Array): number {
  let acc = 0;
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const d = (x[i] as number) - (y[i] as number);
    acc += d * d;
  }
  return Math.sqrt(acc);
}

/**
 * Klassisches DTW mit Schritten (1,0), (0,1), (1,1).
 * Leere Eingaben → cost = Infinity, leerer Pfad.
 */
export function dtw(a: Float32Array[], b: Float32Array[], opts: DtwOptions = {}): DtwResult {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) {
    return { cost: Infinity, normalizedCost: Infinity, path: [] };
  }
  const distance = opts.distance ?? euclidean;
  const bandFrac = opts.band ?? 0.25;

  // Bandbreite: mindestens so groß, dass die Diagonale (0,0)→(n-1,m-1) erreichbar ist.
  const maxLen = Math.max(n, m);
  const halfWidth = Math.max(1, Math.ceil(bandFrac * maxLen));
  const slope = m / n;

  // Spalten-Grenzen pro Zeile (inklusive)
  const lo = new Int32Array(n);
  const hi = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const center = i * slope;
    lo[i] = Math.max(0, Math.floor(center - halfWidth));
    hi[i] = Math.min(m - 1, Math.ceil(center + halfWidth));
  }
  // Start und Ziel müssen im Band liegen
  lo[0] = 0;
  hi[n - 1] = m - 1;

  const D = new Float64Array(n * m).fill(Infinity);

  for (let i = 0; i < n; i++) {
    const ai = a[i] as Float32Array;
    const jLo = lo[i] as number;
    const jHi = hi[i] as number;
    const row = i * m;
    const prevRow = row - m;
    for (let j = jLo; j <= jHi; j++) {
      const d = distance(ai, b[j] as Float32Array);
      let best: number;
      if (i === 0 && j === 0) {
        best = 0;
      } else {
        best = Infinity;
        if (i > 0) {
          const up = D[prevRow + j] as number;
          if (up < best) best = up;
          if (j > 0) {
            const diag = D[prevRow + j - 1] as number;
            if (diag < best) best = diag;
          }
        }
        if (j > 0) {
          const left = D[row + j - 1] as number;
          if (left < best) best = left;
        }
      }
      D[row + j] = best + d;
    }
  }

  const cost = D[n * m - 1] as number;
  if (!Number.isFinite(cost)) {
    return { cost: Infinity, normalizedCost: Infinity, path: [] };
  }

  // Rückverfolgung: Diagonale bevorzugen, dann oben, dann links
  const path: Array<[number, number]> = [];
  let i = n - 1;
  let j = m - 1;
  path.push([i, j]);
  while (i > 0 || j > 0) {
    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const diag = D[(i - 1) * m + (j - 1)] as number;
      const up = D[(i - 1) * m + j] as number;
      const left = D[i * m + (j - 1)] as number;
      if (diag <= up && diag <= left) {
        i--;
        j--;
      } else if (up <= left) {
        i--;
      } else {
        j--;
      }
    }
    path.push([i, j]);
  }
  path.reverse();

  return { cost, normalizedCost: cost / path.length, path };
}
