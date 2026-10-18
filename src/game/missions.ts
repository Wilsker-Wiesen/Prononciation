/**
 * Missionen: Für jedes Phänomen werden passende Einträge aus den geladenen
 * Paketen gesammelt (Audio bevorzugt) und Hörquiz-Aufgaben erzeugt.
 */
import { transcribe, ipaString } from '../phon/g2p';
import { PHENOMENA, detectPhenomena, type MinimalPair, type Phenomenon, type PhenomenonId } from '../phon/phenomena';
import type { Pack } from '../types/content';
import type { TrainItem } from '../ui/useTrainer';

export interface MissionItem extends TrainItem {
  hasAudio: boolean;
}

export interface ListeningTask {
  /** gespieltes Wort */
  play: { text: string; audioId?: string; start?: number; end?: number; ipa: string };
  /** Auswahl (enthält das gespielte Wort) */
  options: { text: string; ipa: string; de?: string }[];
  correct: number;
}

export interface MissionPlan {
  phenomenon: Phenomenon;
  /** Beispiele mit Audio (falls vorhanden) für die Einführung */
  examples: MissionItem[];
  listening: ListeningTask[];
  speaking: MissionItem[];
  /** Anzahl passender Einträge im Wortschatz insgesamt */
  available: number;
}

const cache = new Map<string, Set<PhenomenonId>>();
function phenomenaFor(text: string): Set<PhenomenonId> {
  let s = cache.get(text);
  if (!s) { s = detectPhenomena(transcribe(text)); cache.set(text, s); }
  return s;
}

/** Alle Vokabeln aller Pakete mit Phänomenmarkierung. */
export function collectItems(packs: Pack[]): (MissionItem & { phenomena: Set<PhenomenonId> })[] {
  const out: (MissionItem & { phenomena: Set<PhenomenonId> })[] = [];
  for (const p of packs) {
    for (const l of p.lessons) {
      for (const v of l.vocab) {
        if (!v.fr.trim()) continue;
        out.push({ id: v.id, kind: 'vocab', text: v.fr, de: v.de, ipaOverride: v.ipa, ipaRef: v.ipaRef, contrast: v.contrast, audioId: v.audioId, start: v.start, end: v.end, packId: p.id, lessonId: l.id, hasAudio: !!v.audioId, phenomena: phenomenaFor(v.fr) });
      }
    }
  }
  return out;
}

function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

/** Zählt verfügbare Einträge je Phänomen (für die Übersicht). */
export function missionAvailability(packs: Pack[]): Record<PhenomenonId, { total: number; withAudio: number }> {
  const items = collectItems(packs);
  const out = {} as Record<PhenomenonId, { total: number; withAudio: number }>;
  for (const ph of PHENOMENA) {
    const m = items.filter((i) => i.phenomena.has(ph.id));
    out[ph.id] = { total: m.length, withAudio: m.filter((i) => i.hasAudio).length };
  }
  return out;
}

/** Erstellt einen Missionsdurchlauf (zufällige Auswahl; kurze Einträge bevorzugt). */
export function planMission(packs: Pack[], id: PhenomenonId, opts: { listeningCount?: number; speakingCount?: number } = {}): MissionPlan {
  const phenomenon = PHENOMENA.find((p) => p.id === id)!;
  const listeningCount = opts.listeningCount ?? 6;
  const speakingCount = opts.speakingCount ?? 5;
  const items = collectItems(packs).filter((i) => i.phenomena.has(id));
  const short = items.filter((i) => i.text.split(/\s+/).length <= 3);
  const pool = short.length >= 5 ? short : items;
  const withAudio = pool.filter((i) => i.hasAudio);
  const examples = shuffle(withAudio.length >= 3 ? withAudio : pool).slice(0, 3);
  const speaking = shuffle(pool).slice(0, speakingCount);

  // Hörquiz: Minimalpaare des Phänomens; bevorzugt Paare, deren gespieltes Wort Audio im Wortschatz hat.
  const vocabByText = new Map<string, MissionItem>();
  for (const i of pool) vocabByText.set(normalize(i.text), i);
  const listening: ListeningTask[] = [];
  const pairs = shuffle(phenomenon.pairs);
  for (const pair of pairs) {
    if (listening.length >= listeningCount) break;
    listening.push(taskFromPair(pair, vocabByText));
  }
  // Auffüllen mit „Welches Wort hörst du?“ aus dem Wortschatz (zwei Einträge des Phänomens)
  const extra = shuffle(withAudio.length >= 2 ? withAudio : pool);
  while (listening.length < listeningCount && extra.length >= 2) {
    const a = extra.pop()!;
    const b = extra[Math.floor(Math.random() * extra.length)]!;
    const correct = Math.random() < 0.5 ? 0 : 1;
    const opts2 = correct === 0 ? [a, b] : [b, a];
    const play = opts2[correct]!;
    listening.push({
      play: { text: play.text, audioId: play.audioId, start: play.start, end: play.end, ipa: ipaString(transcribe(play.text)) },
      options: opts2.map((o) => ({ text: o.text, ipa: ipaString(transcribe(o.text)), de: o.de })),
      correct,
    });
  }
  return { phenomenon, examples, listening, speaking, available: items.length };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

function taskFromPair(pair: MinimalPair, vocab: Map<string, MissionItem>): ListeningTask {
  const a = vocab.get(normalize(pair.a));
  const b = vocab.get(normalize(pair.b));
  // Gespielt wird bevorzugt das Wort mit Audio
  let correct: number;
  if (a?.hasAudio && !b?.hasAudio) correct = 0;
  else if (b?.hasAudio && !a?.hasAudio) correct = 1;
  else correct = Math.random() < 0.5 ? 0 : 1;
  const playItem = correct === 0 ? a : b;
  const playText = correct === 0 ? pair.a : pair.b;
  return {
    play: { text: playText, audioId: playItem?.audioId, start: playItem?.start, end: playItem?.end, ipa: correct === 0 ? pair.ipaA : pair.ipaB },
    options: [
      { text: pair.a, ipa: pair.ipaA, de: pair.deA },
      { text: pair.b, ipa: pair.ipaB, de: pair.deB },
    ],
    correct,
  };
}
