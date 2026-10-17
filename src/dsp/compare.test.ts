import { describe, expect, it } from 'vitest';
import { compareFeatures, compareRecordings, tempoScore } from './compare';
import { pad, speechLike, stretch, tone } from './testSignals';

const SR = 16000;

/** Zwei unterschiedliche "Äußerungen" aus Vokalfolgen. */
const segmentsA = [
  { f0: 120, formants: [700, 1200], durS: 0.25 }, // a
  { f0: 130, formants: [300, 2300], durS: 0.2 }, // i
  { f0: 110, formants: [400, 800], durS: 0.3 }, // o
];
const utteranceA = speechLike(SR, segmentsA, 1);
/** Dieselbe Äußerung, 20 % langsamer gesprochen (gleiche Formanten). */
const utteranceASlow = speechLike(SR, segmentsA.map((s) => ({ ...s, durS: s.durS * 1.2 })), 1);
const utteranceB = speechLike(SR, [
  { f0: 180, formants: [350, 650], durS: 0.3 }, // u
  { f0: 200, formants: [500, 1800], durS: 0.25 }, // e
  { f0: 170, formants: [300, 2300], durS: 0.15 }, // i
  { f0: 190, formants: [700, 1200], durS: 0.2 }, // a
], 2);

describe('compareRecordings', () => {
  it('Signal mit sich selbst → Ähnlichkeit ≈ 100, Distanz ≈ 0', () => {
    const r = compareRecordings(utteranceA, utteranceA);
    expect(r.dtwDistance).toBeCloseTo(0, 5);
    expect(r.similarity).toBeGreaterThan(99.9);
    expect(r.durationRatio).toBeCloseTo(1, 6);
    expect(r.tempo).toBe(100);
    expect(r.hopMs).toBe(10);
    expect(r.path[0]).toEqual([0, 0]);
  });

  it('440 Hz gegen 220 Hz mit Rauschen ist deutlich unähnlicher als Selbstvergleich', () => {
    const a = tone(440, 0.6, SR, 0.5, 0.02, 1);
    const b = tone(220, 0.6, SR, 0.5, 0.02, 2);
    const self = compareRecordings(a, a);
    const other = compareRecordings(a, b);
    expect(self.similarity).toBeGreaterThan(99.9);
    // Reine Töne haben ähnliche Mel-Hüllkurven; der Abstand ist dennoch deutlich.
    expect(other.similarity).toBeLessThan(self.similarity - 10);
    expect(other.dtwDistance).toBeGreaterThan(1);
  });

  it('per Resampling gestreckte Version (×1.2) bleibt ähnlicher als ein anderes Signal', () => {
    // Resampling verschiebt auch Tonhöhe und Formanten → nur relativ zu "anders" hoch.
    const stretched = stretch(utteranceA, 1.2);
    const same = compareRecordings(utteranceA, stretched);
    const other = compareRecordings(utteranceA, utteranceB);
    expect(same.similarity).toBeGreaterThan(other.similarity + 15);
    expect(same.similarity).toBeGreaterThan(40);
    expect(same.durationRatio).toBeCloseTo(1.2, 1);
    expect(same.tempo).toBe(100);
    // Pfad läuft monoton vom Anfang zum Ende
    const last = same.path[same.path.length - 1] as [number, number];
    expect(same.path[0]).toEqual([0, 0]);
    expect(last[0]).toBe(compareFeatures(utteranceA, SR).frames.length - 1);
  });

  it('langsamer gesprochene Version (×1.2, gleiche Formanten) bleibt hoch ähnlich', () => {
    const same = compareRecordings(utteranceA, utteranceASlow);
    const other = compareRecordings(utteranceA, utteranceB);
    expect(same.similarity).toBeGreaterThan(80);
    expect(same.similarity).toBeGreaterThan(other.similarity + 30);
    expect(same.durationRatio).toBeCloseTo(1.2, 1);
    expect(same.tempo).toBe(100);
    // Pfad endet beim letzten Rahmen beider Folgen
    const last = same.path[same.path.length - 1] as [number, number];
    expect(last[0]).toBe(compareFeatures(utteranceA, SR).frames.length - 1);
    expect(last[1]).toBe(compareFeatures(utteranceASlow, SR).frames.length - 1);
  });

  it('verschiedene Äußerungen liegen im kalibrierten Bereich (~20–60)', () => {
    const r = compareRecordings(utteranceA, utteranceB);
    expect(r.similarity).toBeGreaterThan(10);
    expect(r.similarity).toBeLessThan(70);
  });

  it('zusätzliche Stille an den Rändern beeinflusst das Ergebnis kaum', () => {
    // Modell mit 100 ms Rand, eigene Aufnahme mit 1 s / 0.5 s Rand (leises Rauschen)
    const reference = pad(utteranceA, 1600, 1600, 0.001, 4);
    const padded = pad(utteranceA, SR, Math.round(0.5 * SR), 0.001, 5);
    const r = compareRecordings(reference, padded);
    expect(r.similarity).toBeGreaterThan(90);
    expect(r.durationRatio).toBeGreaterThan(0.9);
    expect(r.durationRatio).toBeLessThan(1.1);
  });

  it('leere Eingaben führen nicht zu Fehlern', () => {
    const r = compareRecordings(new Float32Array(0), new Float32Array(0));
    expect(Number.isFinite(r.similarity)).toBe(true);
    expect(r.similarity).toBeGreaterThanOrEqual(0);
    expect(r.similarity).toBeLessThanOrEqual(100);
    const r2 = compareRecordings(utteranceA, new Float32Array(0));
    expect(r2.similarity).toBeGreaterThanOrEqual(0);
  });

  it('compareFeatures liefert 24 Dimensionen pro Rahmen', () => {
    const f = compareFeatures(utteranceA, SR);
    expect(f.frames[0]?.length).toBe(24);
    expect(f.hopMs).toBe(10);
  });
});

describe('tempoScore', () => {
  it('100 im Bereich 0.8–1.25, fallend darüber/darunter', () => {
    expect(tempoScore(1)).toBe(100);
    expect(tempoScore(0.8)).toBe(100);
    expect(tempoScore(1.25)).toBe(100);
    expect(tempoScore(1.6)).toBeLessThan(100);
    expect(tempoScore(1.6)).toBeGreaterThan(0);
    expect(tempoScore(0.5)).toBeLessThan(tempoScore(0.7));
    expect(tempoScore(3)).toBe(0);
    expect(tempoScore(0)).toBe(0);
    expect(tempoScore(Infinity)).toBe(0);
  });
});
