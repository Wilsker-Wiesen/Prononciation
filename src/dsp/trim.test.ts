import { describe, expect, it } from 'vitest';
import { trimSilence } from './trim';
import { pad, tone } from './testSignals';

const SR = 16000;

describe('trimSilence', () => {
  it('entfernt Stille vorne und hinten (mit 50 ms Rand)', () => {
    const speech = tone(440, 0.5, SR, 0.5);
    const before = SR; // 1 s
    const after = Math.round(0.7 * SR);
    const padded = pad(speech, before, after);
    const r = trimSilence(padded, SR);
    const margin = Math.round(0.05 * SR);
    // Start: innerhalb Rand + ein Rahmen vor dem Sprachbeginn
    expect(r.startSample).toBeGreaterThanOrEqual(before - margin - 400);
    expect(r.startSample).toBeLessThanOrEqual(before);
    expect(r.endSample).toBeGreaterThanOrEqual(before + speech.length);
    expect(r.endSample).toBeLessThanOrEqual(before + speech.length + margin + 400);
    expect(r.pcm.length).toBe(r.endSample - r.startSample);
    expect(r.pcm.length).toBeLessThan(padded.length);
  });

  it('entfernt auch leises Hintergrundrauschen', () => {
    const speech = tone(300, 0.4, SR, 0.4);
    const padded = pad(speech, SR, SR, 0.002);
    const r = trimSilence(padded, SR);
    expect(r.startSample).toBeGreaterThan(SR - 2000);
    expect(r.endSample).toBeLessThan(SR + speech.length + 2000);
  });

  it('lässt ein Signal ohne Stille unverändert', () => {
    const speech = tone(440, 0.3, SR, 0.5);
    const r = trimSilence(speech, SR);
    expect(r.startSample).toBe(0);
    expect(r.endSample).toBe(speech.length);
    expect(r.pcm.length).toBe(speech.length);
  });

  it('gibt reine Stille und leere Eingaben unverändert zurück', () => {
    const silent = new Float32Array(8000);
    const r = trimSilence(silent, SR);
    expect(r.pcm.length).toBe(8000);
    expect(r.startSample).toBe(0);
    const e = trimSilence(new Float32Array(0), SR);
    expect(e.pcm.length).toBe(0);
    expect(e.endSample).toBe(0);
  });
});
