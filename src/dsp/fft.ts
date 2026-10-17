/**
 * Reelle FFT (Radix-2, Zweierpotenz) für Leistungsspektren.
 * Reines TypeScript, läuft im Browser (Web Worker) und in Node.
 */

interface Twiddle {
  cos: Float64Array;
  sin: Float64Array;
  bitrev: Uint32Array;
}

const twiddleCache = new Map<number, Twiddle>();

/** Prüft, ob n eine Zweierpotenz >= 2 ist. */
export function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/** Nächste Zweierpotenz >= n (mindestens 2). */
export function nextPowerOfTwo(n: number): number {
  let p = 2;
  while (p < n) p <<= 1;
  return p;
}

/** Drehfaktoren und Bit-Umkehr-Tabelle pro nfft (gecacht). */
function getTwiddle(nfft: number): Twiddle {
  const cached = twiddleCache.get(nfft);
  if (cached) return cached;
  const half = nfft / 2;
  const cos = new Float64Array(half);
  const sin = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    const ang = (-2 * Math.PI * i) / nfft;
    cos[i] = Math.cos(ang);
    sin[i] = Math.sin(ang);
  }
  const bits = Math.log2(nfft);
  const bitrev = new Uint32Array(nfft);
  for (let i = 0; i < nfft; i++) {
    let r = 0;
    let v = i;
    for (let b = 0; b < bits; b++) {
      r = (r << 1) | (v & 1);
      v >>= 1;
    }
    bitrev[i] = r;
  }
  const tw: Twiddle = { cos, sin, bitrev };
  twiddleCache.set(nfft, tw);
  return tw;
}

/**
 * In-place-FFT (komplex). re/im müssen Länge nfft haben (Zweierpotenz).
 */
export function fftInPlace(re: Float64Array, im: Float64Array, nfft: number): void {
  if (!isPowerOfTwo(nfft)) throw new Error(`nfft muss Zweierpotenz sein, erhalten: ${nfft}`);
  const { cos, sin, bitrev } = getTwiddle(nfft);

  // Bit-Umkehr-Permutation
  for (let i = 0; i < nfft; i++) {
    const j = bitrev[i] as number;
    if (j > i) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }

  // Butterflies
  for (let size = 2; size <= nfft; size <<= 1) {
    const halfSize = size >> 1;
    const step = nfft / size;
    for (let start = 0; start < nfft; start += size) {
      for (let k = 0; k < halfSize; k++) {
        const t = k * step;
        const wr = cos[t] as number;
        const wi = sin[t] as number;
        const a = start + k;
        const b = a + halfSize;
        const br = re[b] as number;
        const bi = im[b] as number;
        const xr = br * wr - bi * wi;
        const xi = br * wi + bi * wr;
        const ar = re[a] as number;
        const ai = im[a] as number;
        re[b] = ar - xr;
        im[b] = ai - xi;
        re[a] = ar + xr;
        im[a] = ai + xi;
      }
    }
  }
}

/**
 * Leistungsspektrum |X[k]|^2 eines reellen Frames, k = 0..nfft/2.
 * Ist der Frame kürzer als nfft, wird mit Nullen aufgefüllt; ist er länger,
 * wird abgeschnitten.
 */
export function powerSpectrum(frame: Float32Array, nfft: number): Float32Array {
  if (!isPowerOfTwo(nfft)) throw new Error(`nfft muss Zweierpotenz sein, erhalten: ${nfft}`);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  const n = Math.min(frame.length, nfft);
  for (let i = 0; i < n; i++) re[i] = frame[i] as number;
  fftInPlace(re, im, nfft);
  const bins = nfft / 2 + 1;
  const out = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const r = re[k] as number;
    const i = im[k] as number;
    out[k] = r * r + i * i;
  }
  return out;
}

/** Betragsspektrum |X[k]|, k = 0..nfft/2. */
export function magnitudeSpectrum(frame: Float32Array, nfft: number): Float32Array {
  const p = powerSpectrum(frame, nfft);
  for (let k = 0; k < p.length; k++) p[k] = Math.sqrt(p[k] as number);
  return p;
}
