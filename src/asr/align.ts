/**
 * Ausrichtung (Alignment) der Zielphone an die erkannten Phone mit
 * Needleman-Wunsch und artikulatorischen Ersetzungskosten.
 */
import { phoneDistance } from '../phon/ipa';
import type { RecognizedPhone } from './ctc';

export interface AlignTarget {
  ipa: string;
  optional?: boolean;
  liaison?: 'obligatory' | 'optional';
  wordIndex: number;
  /** Index des Ursprungsphons (vor der Abbildung in den Modellraum) */
  origIndex: number;
}

export type AlignOp =
  | { type: 'match'; t: number; r: number; dist: number }
  | { type: 'sub'; t: number; r: number; dist: number }
  | { type: 'del'; t: number }
  | { type: 'ins'; r: number };

export interface AlignOptions {
  insertCost?: number;
  deleteCost?: number;
  optionalDeleteCost?: number;
  /** Einfügungen von Schwa sind billig (Lernende fügen gern ein stummes e hinzu – soll aber sichtbar bleiben) */
  schwaInsertCost?: number;
  /** Abstand, bis zu dem eine Ersetzung als „match“ gilt */
  matchThreshold?: number;
}

export function align(target: AlignTarget[], rec: RecognizedPhone[], opts: AlignOptions = {}): AlignOp[] {
  const insertCost = opts.insertCost ?? 0.6;
  const deleteCost = opts.deleteCost ?? 1.0;
  const optDel = opts.optionalDeleteCost ?? 0.05;
  const schwaIns = opts.schwaInsertCost ?? 0.25;
  const matchThreshold = opts.matchThreshold ?? 0.12;
  const n = target.length;
  const m = rec.length;
  const W = m + 1;
  const cost = new Float64Array((n + 1) * W);
  const back = new Uint8Array((n + 1) * W); // 1 = diag, 2 = up (del), 3 = left (ins)
  for (let i = 1; i <= n; i++) {
    cost[i * W] = cost[(i - 1) * W]! + (target[i - 1]!.optional ? optDel : deleteCost);
    back[i * W] = 2;
  }
  for (let j = 1; j <= m; j++) {
    cost[j] = cost[j - 1]! + (rec[j - 1]!.ipa === 'ə' ? schwaIns : insertCost);
    back[j] = 3;
  }
  for (let i = 1; i <= n; i++) {
    const t = target[i - 1]!;
    for (let j = 1; j <= m; j++) {
      const r = rec[j - 1]!;
      const d = phoneDistance(t.ipa, r.ipa);
      const diag = cost[(i - 1) * W + (j - 1)]! + d;
      const up = cost[(i - 1) * W + j]! + (t.optional ? optDel : deleteCost);
      const left = cost[i * W + (j - 1)]! + (r.ipa === 'ə' ? schwaIns : insertCost);
      let best = diag;
      let b = 1;
      if (up < best) { best = up; b = 2; }
      if (left < best) { best = left; b = 3; }
      cost[i * W + j] = best;
      back[i * W + j] = b;
    }
  }
  const ops: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const b = back[i * W + j];
    if (i > 0 && j > 0 && b === 1) {
      const d = phoneDistance(target[i - 1]!.ipa, rec[j - 1]!.ipa);
      ops.push(d <= matchThreshold ? { type: 'match', t: i - 1, r: j - 1, dist: d } : { type: 'sub', t: i - 1, r: j - 1, dist: d });
      i--; j--;
    } else if (i > 0 && (b === 2 || j === 0)) {
      ops.push({ type: 'del', t: i - 1 });
      i--;
    } else {
      ops.push({ type: 'ins', r: j - 1 });
      j--;
    }
  }
  ops.reverse();
  return ops;
}
