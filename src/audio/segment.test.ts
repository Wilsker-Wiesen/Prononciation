import { describe, expect, it } from 'vitest';
import { detectSegments, mergeSegments } from './segment';

function tone(sr: number, seconds: number, amp = 0.5): Float32Array {
  const out = new Float32Array(Math.round(sr * seconds));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * 220 * i) / sr);
  return out;
}

describe('detectSegments', () => {
  it('findet drei Wörter mit Pausen dazwischen', () => {
    const sr = 16000;
    const parts = [new Float32Array(sr * 0.5), tone(sr, 0.6), new Float32Array(sr * 0.6), tone(sr, 0.4), new Float32Array(sr * 0.8), tone(sr, 0.9), new Float32Array(sr * 0.3)];
    const total = parts.reduce((a, p) => a + p.length, 0);
    const pcm = new Float32Array(total);
    let off = 0;
    for (const p of parts) { pcm.set(p, off); off += p.length; }
    const segs = detectSegments(pcm, sr);
    expect(segs).toHaveLength(3);
    // 80 ms Rand vor/nach jedem Abschnitt
    expect(segs[0]!.start).toBeCloseTo(0.42, 2);
    expect(segs[0]!.end).toBeCloseTo(1.18, 2);
    expect(segs[2]!.end).toBeCloseTo(3.88, 2);
  });
  it('ignoriert kurze Pausen innerhalb eines Wortes', () => {
    const sr = 16000;
    const pcm = new Float32Array(sr * 2);
    pcm.set(tone(sr, 0.5), sr * 0.2);
    pcm.set(tone(sr, 0.5), sr * 0.8); // 100 ms Pause
    expect(detectSegments(pcm, sr)).toHaveLength(1);
  });
  it('liefert nichts bei Stille', () => {
    expect(detectSegments(new Float32Array(16000), 16000)).toEqual([]);
  });
  it('fasst Abschnitte zusammen', () => {
    const m = mergeSegments([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }], 0);
    expect(m).toEqual([{ start: 0, end: 3 }, { start: 4, end: 5 }]);
  });
});
