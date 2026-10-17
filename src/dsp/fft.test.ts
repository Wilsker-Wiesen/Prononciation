import { describe, expect, it } from 'vitest';
import { fftInPlace, magnitudeSpectrum, nextPowerOfTwo, powerSpectrum } from './fft';
import { seededRandom } from './testSignals';

/** Naive DFT als Referenz. */
function naivePower(frame: Float32Array, nfft: number): Float64Array {
  const bins = nfft / 2 + 1;
  const out = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < nfft; n++) {
      const x = frame[n] ?? 0;
      const ang = (-2 * Math.PI * k * n) / nfft;
      re += x * Math.cos(ang);
      im += x * Math.sin(ang);
    }
    out[k] = re * re + im * im;
  }
  return out;
}

describe('fft', () => {
  it('stimmt mit der naiven DFT auf einem Zufallsframe überein', () => {
    const rnd = seededRandom(42);
    const nfft = 512;
    const frame = new Float32Array(400);
    for (let i = 0; i < frame.length; i++) frame[i] = rnd() * 2 - 1;

    const fast = powerSpectrum(frame, nfft);
    const slow = naivePower(frame, nfft);
    expect(fast.length).toBe(nfft / 2 + 1);
    let maxVal = 0;
    for (let k = 0; k < slow.length; k++) maxVal = Math.max(maxVal, slow[k] as number);
    for (let k = 0; k < slow.length; k++) {
      expect(Math.abs((fast[k] as number) - (slow[k] as number))).toBeLessThan(1e-4 * maxVal);
    }
  });

  it('findet die Spitze eines reinen Sinustons im richtigen Bin', () => {
    const nfft = 1024;
    const sr = 16000;
    const bin = 64; // 1000 Hz
    const frame = new Float32Array(nfft);
    for (let i = 0; i < nfft; i++) frame[i] = Math.sin((2 * Math.PI * bin * i) / nfft);
    const mag = magnitudeSpectrum(frame, nfft);
    let argmax = 0;
    for (let k = 1; k < mag.length; k++) if ((mag[k] as number) > (mag[argmax] as number)) argmax = k;
    expect(argmax).toBe(bin);
    expect((bin * sr) / nfft).toBe(1000);
    expect(mag[bin] as number).toBeCloseTo(nfft / 2, 3);
  });

  it('lehnt Nicht-Zweierpotenzen ab und liefert nextPowerOfTwo', () => {
    expect(() => powerSpectrum(new Float32Array(10), 100)).toThrow();
    expect(nextPowerOfTwo(400)).toBe(512);
    expect(nextPowerOfTwo(512)).toBe(512);
    expect(nextPowerOfTwo(1)).toBe(2);
  });

  it('fftInPlace eines Impulses ergibt ein flaches Spektrum', () => {
    const n = 16;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    re[0] = 1;
    fftInPlace(re, im, n);
    for (let k = 0; k < n; k++) {
      expect(re[k]).toBeCloseTo(1, 12);
      expect(im[k]).toBeCloseTo(0, 12);
    }
  });
});
