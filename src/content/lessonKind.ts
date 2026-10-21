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
