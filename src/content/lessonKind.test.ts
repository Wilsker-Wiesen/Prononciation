import { describe, expect, it } from 'vitest';
import { lessonKind } from './lessonKind';

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
