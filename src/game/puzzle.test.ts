import { describe, expect, it } from 'vitest';
import { checkOrder, makePuzzle, makePuzzleRound, puzzleEligible, tiles } from './puzzle';

const v = (id: string, fr: string) => ({ id, fr, de: '' });

describe('Satzpuzzle', () => {
  it('hängt Satzzeichen an das Wort davor', () => {
    expect(tiles('Comment tu t’appelles ?')).toEqual(['Comment', 'tu', 't’appelles ?']);
    expect(tiles('Léo habite à Paris, avec sa famille.')).toEqual(['Léo', 'habite', 'à', 'Paris,', 'avec', 'sa', 'famille.']);
  });

  it('nimmt nur Sätze mit 3 bis 10 Kärtchen', () => {
    expect(puzzleEligible(v('a', 'le collège'))).toBe(false);
    expect(puzzleEligible(v('b', 'Il a un chat.'))).toBe(true);
    expect(puzzleEligible(v('c', 'un deux trois quatre cinq six sept huit neuf dix onze'))).toBe(false);
  });

  it('mischt, bietet aber nie die Lösung an', () => {
    for (let i = 0; i < 30; i++) {
      const p = makePuzzle(v('a', 'Il a un chat.'), () => 0.999);
      expect(p.shuffled.join(' ')).not.toBe(p.solution.join(' '));
      expect([...p.shuffled].sort()).toEqual([...p.solution].sort());
    }
  });

  it('prüft je Position, gleiche Wörter sind austauschbar', () => {
    expect(checkOrder(['la', 'fille', 'voit', 'la', 'mer'], ['la', 'fille', 'voit', 'la', 'mer']).every(Boolean)).toBe(true);
    expect(checkOrder(['fille', 'la', 'voit'], ['la', 'fille', 'voit'])).toEqual([false, false, true]);
  });

  it('Runde: nur geeignete Sätze, höchstens count', () => {
    const r = makePuzzleRound([v('a', 'le chat'), v('b', 'Il a un chat.'), v('c', 'Elle mange une pomme.'), v('d', 'Nous allons au collège.')], 2);
    expect(r).toHaveLength(2);
    expect(r.every((p) => p.solution.length >= 3)).toBe(true);
  });
});
