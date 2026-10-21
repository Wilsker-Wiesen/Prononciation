/**
 * Satzpuzzle: Satz hören, aus Wortkärtchen zusammensetzen, dann nachsprechen.
 * Satzzeichen hängen am Wort davor („Paris,“ „appelles ?“), damit keine Kärtchen nur aus „?“ bestehen.
 */
import type { VocabEntry } from '../types/content';

export const MIN_TILES = 3;
export const MAX_TILES = 10;

export function tiles(fr: string): string[] {
  const out: string[] = [];
  for (const t of fr.trim().split(/\s+/)) {
    if (!/\p{L}|\p{N}/u.test(t) && out.length) out[out.length - 1] += ` ${t}`;
    else out.push(t);
  }
  return out;
}

export function puzzleEligible(e: VocabEntry): boolean {
  const n = tiles(e.fr).length;
  return n >= MIN_TILES && n <= MAX_TILES;
}

export interface PuzzleItem {
  entry: VocabEntry;
  solution: string[];
  /** gemischte Kärtchen; Index = Kärtchen-ID */
  shuffled: string[];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

export function makePuzzle(entry: VocabEntry, rng: () => number = Math.random): PuzzleItem {
  const solution = tiles(entry.fr);
  let shuffled = shuffle(solution, rng);
  // nie in Lösungsreihenfolge anbieten (sofern überhaupt verschiedene Reihenfolgen möglich sind)
  for (let i = 0; i < 10 && shuffled.join(' ') === solution.join(' ') && new Set(solution).size > 1; i++) shuffled = shuffle(solution, rng);
  if (shuffled.join(' ') === solution.join(' ') && new Set(solution).size > 1) shuffled = [...solution.slice(1), solution[0]!];
  return { entry, solution, shuffled };
}

export function makePuzzleRound(entries: VocabEntry[], count = 5, rng: () => number = Math.random): PuzzleItem[] {
  return shuffle(entries.filter(puzzleEligible), rng).slice(0, count).map((e) => makePuzzle(e, rng));
}

/** Je Position: stimmt das gelegte Wort? (gleiche Wörter sind austauschbar) */
export function checkOrder(placed: string[], solution: string[]): boolean[] {
  return solution.map((w, i) => placed[i] === w);
}
