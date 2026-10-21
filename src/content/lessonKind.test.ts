import { describe, expect, it } from 'vitest';
import { groupBySection, lessonKind } from './lessonKind';

const entries = (...fr: string[]) => fr.map((f, i) => ({ id: `v${i}`, fr: f, de: '' }));

describe('lessonKind', () => {
  it('erkennt Satz-Lektionen am Titel', () => {
    expect(lessonKind({ title: 'Unité 3 – Lektionstexte', vocab: entries('le collège') })).toBe('sentences');
    expect(lessonKind({ title: 'Unité 3 – Beispielsätze', vocab: [] })).toBe('sentences');
  });
  it('lässt Vokabel-Lektionen mit einzelnen Wendungen bei Vokabeln', () => {
    expect(lessonKind({ title: 'Unité 3 – Vokabeln', vocab: entries('le collège', 'la rue', 'Comment tu t’appelles ?') })).toBe('vocab');
  });
  it('erkennt Sätze am Inhalt, wenn der Titel nichts sagt', () => {
    expect(lessonKind({ title: 'Paris', vocab: entries('Je m’appelle Léo.', 'Où est le collège ?', 'la rue') })).toBe('sentences');
    expect(lessonKind({ title: 'Paris', vocab: entries('la rue', 'le métro', 'Bonjour !') })).toBe('vocab');
  });
});

describe('groupBySection', () => {
  const secs = [{ id: 's1', title: 'Atelier A' }, { id: 's2', title: 'Atelier B' }];
  it('hält die Buchreihenfolge, Einstieg ohne Abschnitt bleibt vorn ohne Überschrift', () => {
    const g = groupBySection<{ id: number; sectionId?: string }>([{ id: 1 }, { id: 2, sectionId: 's1' }, { id: 3, sectionId: 's1' }, { id: 4 }, { id: 5, sectionId: 's2' }], secs);
    expect(g.map((x) => [x.title, x.entries.map((e) => e.id)])).toEqual([[null, [1]], ['Atelier A', [2, 3]], ['Weitere', [4]], ['Atelier B', [5]]]);
  });
  it('ohne Abschnitte eine Gruppe ohne Überschrift', () => {
    expect(groupBySection<{ id: number; sectionId?: string }>([{ id: 1 }, { id: 2 }])).toEqual([{ title: null, entries: [{ id: 1 }, { id: 2 }] }]);
  });
});
