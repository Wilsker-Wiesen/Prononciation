import { describe, expect, it } from 'vitest';
import { parseWordList } from './bulkImport';

describe('parseWordList', () => {
  it('liest Tab-, Semikolon- und Gedankenstrich-Listen', () => {
    expect(parseWordList('le collège\tdie Schule\nla classe;die Klasse\nmerci – danke')).toEqual([
      { fr: 'le collège', de: 'die Schule', lesson: undefined, audio: undefined },
      { fr: 'la classe', de: 'die Klasse', lesson: undefined, audio: undefined },
      { fr: 'merci', de: 'danke', lesson: undefined, audio: undefined },
    ]);
  });
  it('erkennt Kopfzeile, Lektion und Audiodatei', () => {
    const rows = parseWordList('Französisch\tDeutsch\tLektion\tAudio\nbonjour\thallo\tUnité 1\t001.mp3');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ fr: 'bonjour', de: 'hallo', lesson: 'Unité 1', audio: '001.mp3' });
  });
});
