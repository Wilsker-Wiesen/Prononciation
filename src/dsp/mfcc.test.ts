import { describe, expect, it } from 'vitest';
import { addDeltas, cepstralMeanNormalize, frameCount, frameEnergies, hzToMel, melToHz, mfcc } from './mfcc';
import { tone } from './testSignals';

const SR = 16000;

describe('mfcc', () => {
  it('liefert die erwartete Form (Rahmenzahl, Koeffizienten)', () => {
    const pcm = tone(440, 1.0, SR); // 16000 Samples
    const res = mfcc(pcm);
    // frameLen 400, hop 160: floor((16000-400)/160)+1 = 98
    expect(res.frames.length).toBe(98);
    expect(res.hopMs).toBe(10);
    expect(res.frameMs).toBe(25);
    for (const fr of res.frames) {
      expect(fr.length).toBe(13);
      for (let k = 0; k < fr.length; k++) expect(Number.isFinite(fr[k])).toBe(true);
    }
  });

  it('ist deterministisch', () => {
    const pcm = tone(300, 0.5, SR, 0.4, 0.05, 9);
    const a = mfcc(pcm);
    const b = mfcc(pcm);
    expect(a.frames.length).toBe(b.frames.length);
    for (let i = 0; i < a.frames.length; i++) {
      expect(Array.from(a.frames[i] as Float32Array)).toEqual(Array.from(b.frames[i] as Float32Array));
    }
  });

  it('respektiert nCoeffs/nMels/hopMs', () => {
    const pcm = tone(440, 0.5, SR);
    const res = mfcc(pcm, { nCoeffs: 20, nMels: 40, hopMs: 20 });
    expect(res.frames.length).toBe(frameCount(pcm.length, 400, 320));
    expect(res.frames[0]?.length).toBe(20);
  });

  it('verarbeitet kurze und leere Eingaben ohne Fehler (ein Rahmen)', () => {
    expect(mfcc(new Float32Array(0)).frames.length).toBe(1);
    expect(mfcc(new Float32Array(10)).frames.length).toBe(1);
    expect(mfcc(new Float32Array(400)).frames.length).toBe(1);
    expect(mfcc(new Float32Array(401)).frames.length).toBe(1);
    expect(mfcc(new Float32Array(560)).frames.length).toBe(2);
    const fr = mfcc(new Float32Array(0)).frames[0] as Float32Array;
    expect(fr[0]).toBeCloseTo(Math.log(1e-10), 5);
  });

  it('Koeffizient 0 ist die log-Energie und wächst mit der Lautstärke', () => {
    const quiet = mfcc(tone(440, 0.3, SR, 0.1)).frames;
    const loud = mfcc(tone(440, 0.3, SR, 0.5)).frames;
    const q = quiet[5] as Float32Array;
    const l = loud[5] as Float32Array;
    expect(l[0] as number).toBeGreaterThan(q[0] as number);
    // Energie skaliert mit Amplitude^2 → log-Differenz 2·ln(5)
    expect((l[0] as number) - (q[0] as number)).toBeCloseTo(2 * Math.log(5), 1);
  });

  it('cepstralMeanNormalize ergibt Mittelwert 0 pro Koeffizient und neue Arrays', () => {
    const frames = mfcc(tone(220, 0.5, SR, 0.3, 0.02)).frames;
    const norm = cepstralMeanNormalize(frames);
    expect(norm.length).toBe(frames.length);
    expect(norm[0]).not.toBe(frames[0]);
    for (let d = 0; d < 13; d++) {
      let sum = 0;
      for (const fr of norm) sum += fr[d] as number;
      expect(sum / norm.length).toBeCloseTo(0, 4);
    }
    expect(cepstralMeanNormalize([])).toEqual([]);
  });

  it('addDeltas verdoppelt die Dimension und berechnet Differenzen', () => {
    // Linear steigende Werte → konstantes Delta = Steigung
    const frames: Float32Array[] = [];
    for (let t = 0; t < 10; t++) frames.push(new Float32Array([t, 2 * t]));
    const d = addDeltas(frames);
    expect(d.length).toBe(10);
    expect(d[0]?.length).toBe(4);
    const mid = d[5] as Float32Array;
    expect(mid[0]).toBe(5);
    expect(mid[1]).toBe(10);
    expect(mid[2]).toBeCloseTo(1, 6);
    expect(mid[3]).toBeCloseTo(2, 6);
    expect(addDeltas([])).toEqual([]);
  });

  it('frameEnergies liefert den RMS pro Rahmen', () => {
    const pcm = new Float32Array(16000).fill(0.5);
    const e = frameEnergies(pcm, SR);
    expect(e.length).toBe(98);
    for (let i = 0; i < e.length; i++) expect(e[i]).toBeCloseTo(0.5, 6);
    expect(frameEnergies(new Float32Array(0), SR).length).toBe(1);
  });

  it('Mel-Umrechnung ist invertierbar', () => {
    for (const hz of [0, 100, 1000, 4000, 8000]) {
      expect(melToHz(hzToMel(hz))).toBeCloseTo(hz, 6);
    }
    expect(hzToMel(1000)).toBeCloseTo(1000, 0);
  });
});
