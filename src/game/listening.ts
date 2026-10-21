/**
 * Hörverstehen mit den Einträgen einer Lektion (z. B. Lehrwerk-Sätze mit Aufnahme).
 * Zwei Aufgabenarten, je nach Eintrag:
 *  - Bedeutung: Wort oder Wendung hören, die deutsche Bedeutung wählen (Eintrag hat eine Übersetzung);
 *  - Lücke: Satz hören, das fehlende Wort im mitgelesenen Satz wählen (Sätze ohne Übersetzung).
 */
import type { VocabEntry } from '../types/content';

export interface ListenQuestion {
  entry: VocabEntry;
  type: 'meaning' | 'gap';
  /** Bei „gap“: Satz vor und nach der Lücke */
  before?: string;
  after?: string;
  answer: string;
  options: string[];
}

const WORD_RE = /\p{L}+(?:-\p{L}+)*/gu;
const MIN_GAP_LEN = 3;

const norm = (s: string) => s.normalize('NFC').toLocaleLowerCase('fr');

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

const ELISION = new Set(['l', 'd', 'j', 'm', 'n', 's', 't', 'c', 'qu', 'jusqu', 'lorsqu', 'puisqu']);
const APOS = /['’]/;

/**
 * Brauchbare Wörter eines Satzes mit Position: keine Eigennamen (Großschreibung), keine kurzen Wörter,
 * keine Bruchstücke wie „hui“ aus „aujourd’hui“ (Apostroph gilt nur nach Elision als Wortgrenze).
 */
function usableWords(fr: string): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  for (const m of fr.matchAll(WORD_RE)) {
    const w = m[0];
    const end = m.index + w.length;
    if (w.length < MIN_GAP_LEN || w[0] !== w[0]!.toLocaleLowerCase('fr')) continue;
    if (APOS.test(fr[end] ?? '')) continue;
    if (APOS.test(fr[m.index - 1] ?? '')) {
      const prev = /\p{L}+$/u.exec(fr.slice(0, m.index - 1))?.[0] ?? '';
      if (!ELISION.has(norm(prev))) continue;
    }
    out.push({ word: w, index: m.index });
  }
  return out;
}

/** Ablenker: andere Wörter ähnlicher Länge, nicht im Satz selbst. */
function wordDistractors(answer: string, sentence: string, pool: string[], rng: () => number): string[] {
  const inSentence = new Set([...sentence.matchAll(WORD_RE)].map((m) => norm(m[0])));
  const seen = new Set<string>();
  const words: string[] = [];
  for (const fr of pool) {
    for (const { word: w } of usableWords(fr)) {
      const k = norm(w);
      if (inSentence.has(k) || seen.has(k)) continue;
      seen.add(k);
      words.push(w);
    }
  }
  const close = words.filter((w) => Math.abs(w.length - answer.length) <= 2);
  const rest = words.filter((w) => Math.abs(w.length - answer.length) > 2);
  return [...shuffle(close, rng), ...shuffle(rest, rng)].slice(0, 3);
}

function meaningDistractors(entry: VocabEntry, pool: VocabEntry[], rng: () => number): string[] {
  const seen = new Set([norm(entry.de)]);
  const out: string[] = [];
  for (const v of shuffle(pool, rng)) {
    const k = norm(v.de);
    if (!v.de || seen.has(k)) continue;
    seen.add(k);
    out.push(v.de);
    if (out.length === 3) break;
  }
  return out;
}

export function makeQuestion(entry: VocabEntry, pool: VocabEntry[], rng: () => number = Math.random): ListenQuestion | null {
  if (entry.de.trim()) {
    const d = meaningDistractors(entry, pool.filter((v) => v.id !== entry.id), rng);
    if (d.length < 2) return null;
    return { entry, type: 'meaning', answer: entry.de, options: shuffle([entry.de, ...d], rng) };
  }
  const cands = usableWords(entry.fr);
  if (!cands.length) return null;
  // längere Wörter bevorzugen: tragen meist die Bedeutung
  const sorted = [...cands].sort((a, b) => b.word.length - a.word.length);
  const pick = sorted[Math.floor(rng() * Math.min(3, sorted.length))]!;
  const d = wordDistractors(pick.word, entry.fr, pool.filter((v) => v.id !== entry.id).map((v) => v.fr), rng);
  if (d.length < 2) return null;
  return {
    entry,
    type: 'gap',
    before: entry.fr.slice(0, pick.index),
    after: entry.fr.slice(pick.index + pick.word.length),
    answer: pick.word,
    options: shuffle([pick.word, ...d], rng),
  };
}

/** Runde aus bis zu `count` Fragen; Einträge ohne passende Ablenker fallen weg. */
export function makeRound(entries: VocabEntry[], pool: VocabEntry[], count = 10, rng: () => number = Math.random): ListenQuestion[] {
  const out: ListenQuestion[] = [];
  for (const e of shuffle(entries, rng)) {
    const q = makeQuestion(e, pool, rng);
    if (q) out.push(q);
    if (out.length === count) break;
  }
  return out;
}
