import { describe, expect, it } from 'vitest';
import { decodeWav, encodeWav, encodeWavBuffer, isWav } from './wav';

describe('WAV encode/decode', () => {
  it('Roundtrip 16-Bit mono bleibt im Quantisierungsfehler', async () => {
    const rate = 16000;
    const src = new Float32Array(1600);
    for (let i = 0; i < src.length; i++) src[i] = 0.9 * Math.sin((2 * Math.PI * 440 * i) / rate);

    const blob = encodeWav(src, rate);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + src.length * 2);

    const buffer = await blob.arrayBuffer();
    expect(isWav(buffer)).toBe(true);
    const { pcm, sampleRate } = decodeWav(buffer);
    expect(sampleRate).toBe(rate);
    expect(pcm.length).toBe(src.length);
    let maxErr = 0;
    for (let i = 0; i < src.length; i++) maxErr = Math.max(maxErr, Math.abs(pcm[i]! - src[i]!));
    expect(maxErr).toBeLessThanOrEqual(0.5 / 32768 + 1e-7);
  });

  it('begrenzt Übersteuerung auf ±1', () => {
    const src = new Float32Array([2, -2, 0.5]);
    const { pcm } = decodeWav(encodeWavBuffer(src, 8000));
    expect(pcm[0]).toBeCloseTo(1, 3);
    expect(pcm[1]).toBeCloseTo(-1, 3);
    expect(pcm[2]).toBeCloseTo(0.5, 3);
  });

  it('mischt Stereo auf mono', () => {
    // Stereo-WAV von Hand bauen: L = 0.5, R = -0.25 → Mittel 0.125
    const frames = 10;
    const buffer = new ArrayBuffer(44 + frames * 4);
    const view = new DataView(buffer);
    const ascii = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    ascii(0, 'RIFF');
    view.setUint32(4, 36 + frames * 4, true);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    ascii(36, 'data');
    view.setUint32(40, frames * 4, true);
    for (let i = 0; i < frames; i++) {
      view.setInt16(44 + i * 4, 0.5 * 32767, true);
      view.setInt16(46 + i * 4, -0.25 * 32768, true);
    }
    const { pcm, sampleRate } = decodeWav(buffer);
    expect(sampleRate).toBe(44100);
    expect(pcm.length).toBe(frames);
    expect(pcm[0]).toBeCloseTo(0.125, 3);
  });

  it('wirft bei Nicht-WAV-Daten', () => {
    expect(() => decodeWav(new ArrayBuffer(100))).toThrow();
    expect(isWav(new ArrayBuffer(4))).toBe(false);
  });
});
