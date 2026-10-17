import { describe, expect, it } from 'vitest';
import { dtw, euclidean } from './dtw';
import { seededRandom } from './testSignals';

function seq(values: number[]): Float32Array[] {
  return values.map((v) => new Float32Array([v]));
}

function expectValidPath(path: Array<[number, number]>, n: number, m: number): void {
  expect(path.length).toBeGreaterThan(0);
  expect(path[0]).toEqual([0, 0]);
  expect(path[path.length - 1]).toEqual([n - 1, m - 1]);
  for (let k = 1; k < path.length; k++) {
    const [pi, pj] = path[k - 1] as [number, number];
    const [ci, cj] = path[k] as [number, number];
    const di = ci - pi;
    const dj = cj - pj;
    // Monoton, Schritte (1,0), (0,1) oder (1,1)
    expect(di === 0 || di === 1).toBe(true);
    expect(dj === 0 || dj === 1).toBe(true);
    expect(di + dj).toBeGreaterThan(0);
  }
}

describe('dtw', () => {
  it('identische Folgen haben Kosten 0 und einen diagonalen Pfad', () => {
    const a = seq([1, 2, 3, 4, 5]);
    const r = dtw(a, a);
    expect(r.cost).toBe(0);
    expect(r.normalizedCost).toBe(0);
    expect(r.path).toEqual([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
  });

  it('Pfad ist monoton und verbindet Start- und Endpunkt', () => {
    const a = seq([0, 0, 1, 2, 3, 3, 2, 1, 0]);
    const b = seq([0, 1, 2, 3, 2, 1, 0]);
    const r = dtw(a, b, { band: 1 });
    expectValidPath(r.path, a.length, b.length);
    expect(r.cost).toBe(0); // gestreckte Version derselben Kurve
  });

  it('Bandbeschränkung liefert gültigen Pfad bei ungleichen Längen', () => {
    const rnd = seededRandom(5);
    const a: Float32Array[] = [];
    const b: Float32Array[] = [];
    for (let i = 0; i < 120; i++) a.push(new Float32Array([rnd(), rnd()]));
    for (let i = 0; i < 70; i++) b.push(new Float32Array([rnd(), rnd()]));
    const r = dtw(a, b, { band: 0.1 });
    expectValidPath(r.path, a.length, b.length);
    expect(Number.isFinite(r.cost)).toBe(true);
    expect(r.normalizedCost).toBeCloseTo(r.cost / r.path.length, 10);
  });

  it('engeres Band ergibt nie geringere Kosten als ein weites', () => {
    const rnd = seededRandom(11);
    const a: Float32Array[] = [];
    const b: Float32Array[] = [];
    for (let i = 0; i < 50; i++) a.push(new Float32Array([rnd()]));
    for (let i = 0; i < 50; i++) b.push(new Float32Array([rnd()]));
    const wide = dtw(a, b, { band: 1 });
    const narrow = dtw(a, b, { band: 0.05 });
    expect(narrow.cost).toBeGreaterThanOrEqual(wide.cost - 1e-9);
  });

  it('leere Eingaben → Infinity und leerer Pfad', () => {
    expect(dtw([], seq([1, 2])).cost).toBe(Infinity);
    expect(dtw(seq([1]), []).path).toEqual([]);
    expect(dtw([], []).normalizedCost).toBe(Infinity);
  });

  it('eigenes Abstandsmaß wird verwendet', () => {
    const a = seq([1, 2]);
    const b = seq([3, 5]);
    const r = dtw(a, b, { distance: () => 1 });
    expect(r.cost).toBe(r.path.length);
  });

  it('euclidean', () => {
    expect(euclidean(new Float32Array([0, 0]), new Float32Array([3, 4]))).toBe(5);
  });

  it('bewältigt 1000 × 1000 Rahmen', () => {
    const rnd = seededRandom(99);
    const a: Float32Array[] = [];
    const b: Float32Array[] = [];
    for (let i = 0; i < 1000; i++) a.push(new Float32Array([rnd(), rnd(), rnd()]));
    for (let i = 0; i < 1000; i++) b.push(new Float32Array([rnd(), rnd(), rnd()]));
    const r = dtw(a, b, { band: 0.25 });
    expectValidPath(r.path, 1000, 1000);
  });
});
