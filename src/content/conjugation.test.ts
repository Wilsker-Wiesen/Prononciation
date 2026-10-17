import { describe, expect, it } from 'vitest';
import { ipaString, transcribe } from '../phon/g2p';
import { detectPhenomena } from '../phon/phenomena';
import { conjugationPack, conjugationVerbs } from './conjugation';

const ipa = (s: string) => ipaString(transcribe(s.replace(/’/g, "'")));

describe('Konjugationspaket', () => {
  it('enthält sechs Formen je Verb und eindeutige IDs', () => {
    const pack = conjugationPack();
    const ids = pack.lessons.flatMap((l) => l.vocab.map((v) => v.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(conjugationVerbs().length * 6);
    for (const v of conjugationVerbs()) expect(v.forms).toHaveLength(6);
  });

  it.each([
    // Plural nicht hörbar
    ['ils parlent', 'il paʁl'],
    ['elles chantent', 'ɛl ʃɑ̃t'],
    ['ils jouent', 'il ʒu'],
    ['ils mangent', 'il mɑ̃ʒ'],
    ['ils voient', 'il vwa'],
    // Plural über Liaison hörbar
    ['ils aiment', 'ilz‿ɛm'],
    ['elles habitent', 'ɛlz‿abit'],
    ['ils arrivent', 'ilz‿aʁiv'],
    ['ils ont', 'ilz‿ɔ̃'],
    ['ils attendent', 'ilz‿atɑ̃d'],
    ['ils écrivent', 'ilz‿ekʁiv'],
    // Plural am Stamm hörbar
    ['ils prennent', 'il pʁɛn'],
    ['ils viennent', 'il vjɛn'],
    ['ils peuvent', 'il pœv'],
    ['elles veulent', 'ɛl vœl'],
    ['ils doivent', 'il dwav'],
    ['ils finissent', 'il finis'],
    ['ils partent', 'il paʁt'],
    ['ils lisent', 'il liz'],
    ['ils mettent', 'il mɛt'],
    ['elles connaissent', 'ɛl kɔnɛs'],
    ['ils sont', 'il sɔ̃'],
    ['ils vont', 'il vɔ̃'],
    ['elles font', 'ɛl fɔ̃'],
    // weitere heikle Formen
    ['nous faisons', 'nu fəzɔ̃'],
    ['vous faites', 'vu fɛt'],
    ['vous êtes', 'vuz‿ɛt'],
    ['nous mangeons', 'nu mɑ̃ʒɔ̃'],
    ['nous commençons', 'nu kɔmɑ̃sɔ̃'],
    ['nous achetons', 'nuz‿aʃtɔ̃'],
    ['j’achète', 'ʒaʃɛt'],
    ['nous prenons', 'nu pʁənɔ̃'],
    ['nous buvons', 'nu byvɔ̃'],
    ['nous voyons', 'nu vwajɔ̃'],
    ['je suis', 'ʒə sɥi'],
    ['il est', 'il ɛ'],
    ['il finit', 'il fini'],
    ['il prend', 'il pʁɑ̃'],
    ['il peut', 'il pø'],
  ])('%s → [%s]', (form, expected) => {
    expect(ipa(form)).toBe(expected);
  });

  it('setzt Kontrastformen nur bei hörbarem Unterschied', () => {
    const all = conjugationPack().lessons.flatMap((l) => l.vocab);
    const byId = new Map(all.map((v) => [v.id, v]));
    expect(byId.get('conj_prendre_6')?.contrast).toBe('il prend');
    expect(byId.get('conj_aimer_6')?.contrast).toBe('il aime');
    expect(byId.get('conj_parler_6')?.contrast).toBeUndefined();
    expect(byId.get('conj_voir_6')?.contrast).toBeUndefined();
  });
  it('markiert Formen der 3. Person Plural als Phänomen', () => {
    expect(detectPhenomena(transcribe('ils parlent')).has('plural-3')).toBe(true);
    expect(detectPhenomena(transcribe('il parle')).has('plural-3')).toBe(false);
  });
});
