/**
 * Art der Einträge einer Lektion: Vokabeln oder einzelne Sätze (Beispielsätze, Sätze aus Lektionstexten).
 * Lehrwerk-Pakete legen beides als Einträge an; die Anzeige soll Sätze nicht „Vokabeln“ nennen.
 */
import type { Lesson } from '../types/content';
import { splitLessonTitle } from './bulkImport';

export type LessonKind = 'vocab' | 'sentences';

const SENTENCE_TITLE = /satz|sätze|text|phrase|dialog/i;

function looksLikeSentence(fr: string): boolean {
  const t = fr.trim();
  return /[.!?…»]$/.test(t) || t.split(/\s+/).length >= 5;
}

export function lessonKind(lesson: Pick<Lesson, 'title' | 'vocab'>): LessonKind {
  if (SENTENCE_TITLE.test(splitLessonTitle(lesson.title).part)) return 'sentences';
  const n = lesson.vocab.length;
  if (!n) return 'vocab';
  return lesson.vocab.filter((v) => looksLikeSentence(v.fr)).length / n >= 0.6 ? 'sentences' : 'vocab';
}

export const KIND_LABEL: Record<LessonKind, string> = { vocab: 'Vokabeln', sentences: 'Einzelsätze' };

/**
 * Einträge in Buchreihenfolge nach Abschnitt gruppieren: Jeder Wechsel beginnt eine neue Gruppe.
 * Einträge ohne Abschnitt bleiben an ihrer Stelle; am Anfang ohne Überschrift, sonst als „Weitere“.
 */
export function groupBySection<T extends { sectionId?: string }>(entries: T[], sections: { id: string; title: string }[] = []): { title: string | null; entries: T[] }[] {
  const titles = new Map(sections.map((s) => [s.id, s.title]));
  const groups: { key: string; title: string | null; entries: T[] }[] = [];
  for (const e of entries) {
    const key = e.sectionId && titles.has(e.sectionId) ? e.sectionId : '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, title: key ? titles.get(key)! : groups.length ? 'Weitere' : null, entries: [e] });
  }
  return groups.map(({ title, entries: es }) => ({ title, entries: es }));
}
