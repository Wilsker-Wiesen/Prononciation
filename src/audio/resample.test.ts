import { describe, expect, it } from 'vitest';
import { decodeAudioFile, resampleTo } from './resample';
import { encodeWav } from './wav';

function sine(freq: number, rate: number, seconds: number, amp = 0.8): Float32Array {
  const n = Math.round(rate * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / rate);
  return out;
}

/** Nulldurchgänge zählen → Frequenz ≈ Durchgänge / (2 · Dauer). */
function zeroCrossings(pcm: Float32Array): number {
  let count = 0;
  for (let i = 1; i < pcm.length; i++) {
    const a = pcm[i - 1]!;
    const b = pcm[i]!;
    if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) count++;
  }
  return count;
}

function maxAbs(pcm: Float32Array, from = 0, to = pcm.length): number {
  let m = 0;
  for (let i = from; i < to; i++) m = Math.max(m, Math.abs(pcm[i]!));
  return m;
}

function rmsOf(pcm: Float32Array): number {
  let s = 0;
  for (let i = 0; i < pcm.length; i++) s += pcm[i]! * pcm[i]!;
  return Math.sqrt(s / pcm.length);
}

describe('resampleTo', () => {
  it('liefert die erwartete Länge', () => {
    expect(resampleTo(new Float32Array(48000), 48000, 16000)).toHaveLength(16000);
    expect(resampleTo(new Float32Array(44100), 44100, 16000)).toHaveLength(16000);
    expect(resampleTo(new Float32Array(16000), 16000, 48000)).toHaveLength(48000);
    expect(resampleTo(new Float32Array(1234), 44100, 16000)).toHaveLength(Math.round((1234 * 16000) / 44100));
    expect(resampleTo(new Float32Array(0), 48000, 16000)).toHaveLength(0);
  });

  it('kopiert bei gleicher Rate', () => {
    const src = sine(440, 16000, 0.1);
    const out = resampleTo(src, 16000, 16000);
    expect(out).not.toBe(src);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it('erhält Frequenz und Amplitude beim Herunterrechnen 48 kHz → 16 kHz', () => {
    const src = sine(440, 48000, 1);
    const out = resampleTo(src, 48000, 16000);
    // 440 Hz über 1 s → 880 Nulldurchgänge (±1 am Rand)
    expect(Math.abs(zeroCrossings(out) - 880)).toBeLessThanOrEqual(2);
    // Amplitude (Ränder ausgenommen)
    expect(maxAbs(out, 200, out.length - 200)).toBeCloseTo(0.8, 2);
    // Signal nahezu identisch mit der Soll-Sinuskurve
    const ref = sine(440, 16000, 1);
    let err = 0;
    for (let i = 200; i < out.length - 200; i++) err = Math.max(err, Math.abs(out[i]! - ref[i]!));
    expect(err).toBeLessThan(0.01);
  });

  it('erhält die Frequenz bei nicht-ganzzahligem Verhältnis 44,1 kHz → 16 kHz', () => {
    const out = resampleTo(sine(1000, 44100, 1), 44100, 16000);
    expect(Math.abs(zeroCrossings(out) - 2000)).toBeLessThanOrEqual(2);
    expect(maxAbs(out, 200, out.length - 200)).toBeCloseTo(0.8, 2);
  });

  it('erhält die Frequenz beim Hochrechnen 16 kHz → 48 kHz', () => {
    const out = resampleTo(sine(440, 16000, 1), 16000, 48000);
    expect(Math.abs(zeroCrossings(out) - 880)).toBeLessThanOrEqual(2);
    expect(maxAbs(out, 500, out.length - 500)).toBeCloseTo(0.8, 2);
  });

  it('unterdrückt Frequenzen oberhalb der neuen Nyquist-Grenze (Anti-Aliasing)', () => {
    // 12 kHz liegt über 8 kHz (Nyquist bei 16 kHz) und muss verschwinden
    const out = resampleTo(sine(12000, 48000, 0.5), 48000, 16000);
    expect(rmsOf(out)).toBeLessThan(0.02);
  });
});

describe('decodeAudioFile (ohne Web Audio)', () => {
  it('liest WAV-Dateien über den manuellen Decoder', async () => {
    const src = sine(300, 22050, 0.2);
    const blob = encodeWav(src, 22050);
    const decoded = await decodeAudioFile(blob);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.pcm.length).toBe(src.length);
    expect(decoded.durationMs).toBeCloseTo(200, 0);
  });

  it('lehnt unbekannte Formate ab', async () => {
    await expect(decodeAudioFile(new Blob([new Uint8Array(64)]))).rejects.toThrow();
  });
});
