/**
 * Hilfsfunktionen für synthetische Testsignale (nur für Tests).
 */

/** Deterministischer Pseudozufall (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sinuston mit Amplitude und optionalem Rauschanteil. */
export function tone(
  freqHz: number,
  durationS: number,
  sampleRate: number,
  amplitude = 0.5,
  noise = 0,
  seed = 1,
): Float32Array {
  const n = Math.round(durationS * sampleRate);
  const out = new Float32Array(n);
  const rnd = seededRandom(seed);
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate) + noise * (rnd() * 2 - 1);
  }
  return out;
}

/** Sprachähnliches Signal: Folge von "Vokalen" mit wechselnden Formanten + Grundton. */
export function speechLike(sampleRate: number, segments: Array<{ f0: number; formants: number[]; durS: number }>, seed = 7): Float32Array {
  const total = segments.reduce((s, seg) => s + Math.round(seg.durS * sampleRate), 0);
  const out = new Float32Array(total);
  const rnd = seededRandom(seed);
  let pos = 0;
  for (const seg of segments) {
    const n = Math.round(seg.durS * sampleRate);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let s = 0;
      // Harmonische des Grundtons, gewichtet nach Nähe zu den Formanten
      for (let h = 1; h * seg.f0 < 4000; h++) {
        const f = h * seg.f0;
        let w = 0;
        for (const fm of seg.formants) w += Math.exp(-((f - fm) ** 2) / (2 * 150 ** 2));
        s += w * Math.sin(2 * Math.PI * f * t);
      }
      // Ein-/Ausblenden pro Segment
      const env = Math.min(1, i / (0.02 * sampleRate), (n - i) / (0.02 * sampleRate));
      out[pos + i] = 0.3 * s * env + 0.005 * (rnd() * 2 - 1);
    }
    pos += n;
  }
  return out;
}

/** Zeitliche Streckung um Faktor (lineare Interpolation): 1.2 → 20 % länger. */
export function stretch(pcm: Float32Array, factor: number): Float32Array {
  const n = Math.round(pcm.length * factor);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const src = i / factor;
    const i0 = Math.floor(src);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = (pcm[i0] ?? 0) * (1 - frac) + (pcm[i1] ?? 0) * frac;
  }
  return out;
}

/** Fügt Stille (optional mit leisem Rauschen) vorne und hinten an. */
export function pad(pcm: Float32Array, beforeSamples: number, afterSamples: number, noise = 0, seed = 3): Float32Array {
  const out = new Float32Array(beforeSamples + pcm.length + afterSamples);
  const rnd = seededRandom(seed);
  if (noise > 0) {
    for (let i = 0; i < out.length; i++) out[i] = noise * (rnd() * 2 - 1);
  }
  out.set(pcm, beforeSamples);
  return out;
}
