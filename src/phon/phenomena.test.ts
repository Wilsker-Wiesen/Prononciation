import { describe, expect, it } from 'vitest';
import { ipaString, transcribe } from './g2p';
import { PHENOMENA } from './phenomena';

/** Subjektpronomen am Anfang einer Wortgruppe (nicht das Wort allein, z. B. „tu“ gegen „tout“). */
const SUBJECT = /^(je|j['’]|tu|il|elle|on|nous|vous|ils|elles)\s/i;

describe('Minimalpaare', () => {
  const pairs = PHENOMENA.flatMap((p) => p.pairs.map((pair) => ({ ph: p.id, ...pair })));

  it('haben auf beiden Seiten ein Pronomen oder auf keiner (sonst verrät das Pronomen die Lösung)', () => {
    const bad = pairs.filter((p) => SUBJECT.test(p.a) !== SUBJECT.test(p.b)).map((p) => `${p.ph}: ${p.a} | ${p.b}`);
    expect(bad).toEqual([]);
  });

  it('stimmen in der Lautschrift mit der App-eigenen Transkription überein', () => {
    const norm = (s: string) => s.replace(/[\s‿()]/g, '');
    const off = pairs.flatMap((p) => [
      norm(ipaString(transcribe(p.a))) !== norm(p.ipaA) ? `${p.a}: [${p.ipaA}] vs [${ipaString(transcribe(p.a))}]` : null,
      norm(ipaString(transcribe(p.b))) !== norm(p.ipaB) ? `${p.b}: [${p.ipaB}] vs [${ipaString(transcribe(p.b))}]` : null,
    ]).filter(Boolean);
    expect(off).toEqual([]);
  });
});
