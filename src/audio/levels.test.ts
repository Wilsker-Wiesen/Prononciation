import { describe, expect, it } from 'vitest';
import { rms, rmsDb, waveformPeaks } from './levels';

describe('waveformPeaks', () => {
  it('liefert den maximalen Betrag je Abschnitt', () => {
    const pcm = new Float32Array([0.1, -0.5, 0.2, 0.3, -0.9, 0.0, 0.4, 0.1]);
    const peaks = waveformPeaks(pcm, 4);
    expect(Array.from(peaks)).toEqual([0.5, 0.3, 0.9, 0.4].map((v) => Math.fround(v)));
  });

  it('streckt kurze Signale, wenn mehr Abschnitte als Samples angefragt sind', () => {
    const peaks = waveformPeaks(new Float32Array([0.5, -0.25]), 5);
    expect(peaks).toHaveLength(5);
    expect(peaks[0]).toBeCloseTo(0.5);
    expect(peaks[4]).toBeCloseTo(0.25);
    for (const v of peaks) expect([Math.fround(0.5), Math.fround(0.25)]).toContain(v);
  });

  it('kommt mit leeren Eingaben zurecht', () => {
    expect(waveformPeaks(new Float32Array(0), 3)).toHaveLength(3);
    expect(waveformPeaks(new Float32Array(10), 0)).toHaveLength(0);
  });
});

describe('rms', () => {
  it('berechnet den Effektivwert', () => {
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5, 6);
    expect(rms(new Float32Array(0))).toBe(0);
    expect(rmsDb(new Float32Array([1, -1]))).toBeCloseTo(0, 6);
    expect(rmsDb(new Float32Array(4))).toBe(-Infinity);
  });
});
