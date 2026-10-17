/**
 * Bewertung aus dem Alignment: Punktwerte pro Phon, Wort und gesamt.
 */
import type { Phone, Transcription } from '../phon/g2p';
import { toModelSpace } from '../phon/ipa';
import type { AlignOp, AlignTarget } from './align';
import type { RecognizedPhone } from './ctc';

export type PhoneStatus = 'ok' | 'weak' | 'sub' | 'missing' | 'skipped';

export interface PhoneResult {
  /** Standard-IPA des Zielphons */
  ipa: string;
  /** gehörtes Phon (Modellraum), falls zugeordnet */
  heard?: string;
  score: number;
  status: PhoneStatus;
  start: number;
  end: number;
  optional?: boolean;
  liaison?: 'obligatory' | 'optional';
  tag?: Phone['tag'];
  conf?: number;
}

export interface Insertion {
  ipa: string;
  /** Wort, nach dessen Phon die Einfügung steht (−1 = Anfang) */
  afterWord: number;
  /** Index des Zielphons davor in der flachen Liste (−1 = Anfang) */
  afterTarget: number;
  conf: number;
}

export interface WordResult {
  orth: string;
  start: number;
  end: number;
  score: number;
  phones: PhoneResult[];
}

export interface ScoreResult {
  /** 0–100 */
  overall: number;
  words: WordResult[];
  insertions: Insertion[];
  /** Anteil bewerteter Phone, die „ok“ sind */
  accuracy: number;
  /** Anzahl bewerteter (nicht fakultativer) Phone */
  rated: number;
}

export const BAND = { good: 85, mid: 65 } as const;

export function band(score: number): 'good' | 'mid' | 'bad' {
  return score >= BAND.good ? 'good' : score >= BAND.mid ? 'mid' : 'bad';
}

/** Zielphone für das Alignment aufbereiten (Modellraum, mit Rückverweis). */
export function buildAlignTargets(t: Transcription, vocab?: Set<string>): { targets: AlignTarget[]; flat: (Phone & { wordIndex: number })[] } {
  const flat: (Phone & { wordIndex: number })[] = [];
  t.words.forEach((w, wi) => w.phones.forEach((p) => flat.push({ ...p, wordIndex: wi })));
  const mapped = toModelSpace(flat.map((p, i) => ({ ...p, origIndex: i })), vocab);
  const targets: AlignTarget[] = mapped.map((p) => ({
    ipa: p.ipa,
    optional: p.optional,
    liaison: p.liaison,
    wordIndex: p.wordIndex,
    origIndex: p.origIndex,
  }));
  return { targets, flat };
}

export function scoreAlignment(t: Transcription, targets: AlignTarget[], flat: (Phone & { wordIndex: number })[], rec: RecognizedPhone[], ops: AlignOp[]): ScoreResult {
  // Ergebnis pro Ursprungsphon sammeln (ɲ→n j wird wieder zusammengefasst: bester Teilwert zählt)
  const perOrig = new Map<number, { scores: number[]; heard: string[]; status: PhoneStatus[]; conf: number[] }>();
  const insertions: Insertion[] = [];
  let lastTarget = -1;
  for (const op of ops) {
    if (op.type === 'ins') {
      const r = rec[op.r]!;
      const afterWord = lastTarget >= 0 ? flat[lastTarget]!.wordIndex : -1;
      insertions.push({ ipa: r.ipa, afterWord, afterTarget: lastTarget, conf: r.conf });
      continue;
    }
    const tg = targets[op.t]!;
    lastTarget = tg.origIndex;
    const entry = perOrig.get(tg.origIndex) ?? { scores: [], heard: [], status: [], conf: [] };
    if (op.type === 'del') {
      entry.scores.push(0);
      entry.status.push(tg.optional ? 'skipped' : 'missing');
    } else {
      const r = rec[op.r]!;
      const quality = 1 - op.dist;
      const confFactor = 0.75 + 0.25 * Math.min(1, r.conf);
      const s = Math.round(100 * quality * confFactor);
      entry.scores.push(s);
      entry.heard.push(r.ipa);
      entry.conf.push(r.conf);
      entry.status.push(op.type === 'match' ? (s >= BAND.good ? 'ok' : 'weak') : 'sub');
    }
    perOrig.set(tg.origIndex, entry);
  }

  const words: WordResult[] = t.words.map((w) => ({ orth: w.orth, start: w.start, end: w.end, score: 0, phones: [] }));
  let sum = 0;
  let rated = 0;
  let okCount = 0;
  flat.forEach((p, i) => {
    const e = perOrig.get(i);
    const pr: PhoneResult = { ipa: p.ipa, score: 0, status: 'missing', start: p.start, end: p.end, optional: p.optional, liaison: p.liaison, tag: p.tag };
    if (e) {
      const bestIdx = e.scores.indexOf(Math.max(...e.scores));
      pr.score = e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : 0;
      pr.status = e.status.every((s) => s === 'skipped') ? 'skipped' : e.status[bestIdx] ?? 'missing';
      if (e.heard.length) pr.heard = e.heard.join('');
      if (e.conf.length) pr.conf = e.conf.reduce((a, b) => a + b, 0) / e.conf.length;
    }
    if (pr.status === 'skipped') {
      // fakultativ, nicht realisiert: nicht werten
    } else if (p.optional && pr.status !== 'missing') {
      // fakultativ, aber realisiert: positiv werten (zählt nur halb)
      sum += pr.score * 0.5;
      rated += 0.5;
      if (pr.status === 'ok') okCount += 0.5;
    } else if (p.optional && pr.status === 'missing') {
      pr.status = 'skipped';
    } else {
      sum += pr.score;
      rated += 1;
      if (pr.status === 'ok') okCount += 1;
    }
    words[p.wordIndex]!.phones.push(pr);
  });
  for (const w of words) {
    const ratedPhones = w.phones.filter((p) => p.status !== 'skipped');
    w.score = ratedPhones.length ? Math.round(ratedPhones.reduce((a, p) => a + p.score, 0) / ratedPhones.length) : 100;
  }
  // Einfügungen: kleiner Abzug (Schwa und Zögerlaute halb)
  const insPenalty = insertions.reduce((a, ins) => a + (ins.ipa === 'ə' || ins.ipa === 'ɐ' ? 1.5 : 3), 0);
  const base = rated ? sum / rated : 0;
  const overall = Math.max(0, Math.min(100, Math.round(base - Math.min(20, insPenalty))));
  return { overall, words, insertions, accuracy: rated ? okCount / rated : 0, rated };
}
