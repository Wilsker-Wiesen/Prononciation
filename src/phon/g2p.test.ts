import { describe, expect, it } from 'vitest';
import { ipaString, toIpa, transcribe } from './g2p';
import { numberToFrench } from './numbers';
import { phoneDistance, toModelSpace } from './ipa';

/** Standard-IPA ohne fakultative Phone (Schwa, optionale Liaison) */
const ipa = (s: string) => toIpa(s);

describe('G2P Französisch – Einzelwörter', () => {
  it.each([
    ['bonjour', 'bɔ̃ʒuʁ'],
    ['merci', 'mɛʁsi'],
    ['la maison', 'la mɛzɔ̃'],
    ['le garçon', 'lə ɡaʁsɔ̃'],
    ['la fille', 'la fij'],
    ['la ville', 'la vil'],
    ['le travail', 'lə tʁavaj'],
    ['le soleil', 'lə sɔlɛj'],
    ['la famille', 'la famij'],
    ['une chatte', 'yn ʃat'],
    ['tu', 'ty'],
    ['tout', 'tu'],
    ['la nuit', 'la nɥi'],
    ['huit', 'ɥit'],
    ['le pain', 'lə pɛ̃'],
    ['le vin', 'lə vɛ̃'],
    ['brun', 'bʁœ̃'],
    ['enfant', 'ɑ̃fɑ̃'],
    ['bon', 'bɔ̃'],
    ['bonne', 'bɔn'],
    ['année', 'ane'],
    ['femme', 'fam'],
    ['monsieur', 'məsjø'],
    ['deux', 'dø'],
    ['peur', 'pœʁ'],
    ['jeune', 'ʒœn'],
    ['heureux', 'øʁø'],
    ['chaud', 'ʃo'],
    ['beau', 'bo'],
    ['beaucoup', 'boku'],
    ['oiseau', 'wazo'],
    ['moi', 'mwa'],
    ['loin', 'lwɛ̃'],
    ['bien', 'bjɛ̃'],
    ['chien', 'ʃjɛ̃'],
    ['rien', 'ʁjɛ̃'],
    ['italienne', 'italjɛn'],
    ['nation', 'nasjɔ̃'],
    ['question', 'kɛstjɔ̃'],
    ['patient', 'pasjɑ̃'],
    ['partie', 'paʁti'],
    ['premier', 'pʁəmje'],
    ['cahier', 'kaje'],
    ['mer', 'mɛʁ'],
    ['parler', 'paʁle'],
    ['vous parlez', 'vu paʁle'],
    ['ils parlent', 'il paʁl'],
    ['elles étudient', 'ɛlz‿etydi'],
    ['vraiment', 'vʁɛmɑ̃'],
    ['appartement', 'apaʁtəmɑ̃'],
    ['petit', 'pəti'],
    ['petite', 'pətit'],
    ['cheval', 'ʃəval'],
    ['reste', 'ʁɛst'],
    ['secret', 'səkʁɛ'],
    ['belle', 'bɛl'],
    ['cette', 'sɛt'],
    ['école', 'ekɔl'],
    ['élève', 'elɛv'],
    ['père', 'pɛʁ'],
    ['fête', 'fɛt'],
    ['chercher', 'ʃɛʁʃe'],
    ['manger', 'mɑ̃ʒe'],
    ['nous mangeons', 'nu mɑ̃ʒɔ̃'],
    ['guitare', 'ɡitaʁ'],
    ['langue', 'lɑ̃ɡ'],
    ['montagne', 'mɔ̃taɲ'],
    ['gagner', 'ɡaɲe'],
    ['six', 'sis'],
    ['six chats', 'si ʃa'],
    ['six amis', 'siz‿ami'],
    ['dix', 'dis'],
    ['cinq', 'sɛ̃k'],
    ['vingt', 'vɛ̃'],
    ['vingt-deux', 'vɛ̃tdø'],
    ['quatre', 'katʁ'],
    ['exemple', 'ɛɡzɑ̃pl'],
    ['excuse', 'ɛkskyz'],
    ['taxi', 'taksi'],
    ['piscine', 'pisin'],
    ['excellent', 'ɛksɛlɑ̃'],
    ['photo', 'fɔto'],
    ['thé', 'te'],
    ['cœur', 'kœʁ'],
    ['œuf', 'œf'],
    ['œufs', 'ø'],
    ['yeux', 'jø'],
    ['payer', 'pɛje'],
    ['voyage', 'vwajaʒ'],
    ['crier', 'kʁie'],
    ['février', 'fevʁie'],
    ['week-end', 'wikɛnd'],
    ['parking', 'paʁkiŋ'],
    ['sport', 'spɔʁ'],
    ['rose', 'ʁoz'],
    ['chose', 'ʃoz'],
    ['porte', 'pɔʁt'],
    ['vélo', 'velo'],
    ['Paris', 'paʁi'],
    ['Münster', 'mynstɛʁ'],
  ])('%s → %s', (text, expected) => {
    expect(ipa(text)).toBe(expected);
  });
});

describe('G2P – Liaison und Kontext', () => {
  it('bindet Determinanten und Pronomen obligatorisch', () => {
    expect(ipa('les amis')).toBe('lez‿ami');
    expect(ipa('un ami')).toBe('œ̃n‿ami');
    expect(ipa('mon ami')).toBe('mɔ̃n‿ami');
    expect(ipa('ils ont')).toBe('ilz‿ɔ̃');
    expect(ipa('vous êtes')).toBe('vuz‿ɛt');
    expect(ipa('nous avons')).toBe('nuz‿avɔ̃');
    expect(ipa('en été')).toBe('ɑ̃n‿ete');
    expect(ipa('très important')).toBe('tʁɛz‿ɛ̃pɔʁtɑ̃');
    expect(ipa("c'est un ami")).toBe('sɛt‿œ̃n‿ami');
  });
  it('entnasaliert bon/certain/ancien', () => {
    expect(ipa('un bon ami')).toBe('œ̃ bɔn‿ami');
  });
  it('bindet nicht vor h aspiré und nach et', () => {
    expect(ipa('les héros')).toBe('le eʁo');
    expect(ipa('les haricots')).toBe('le aʁiko');
  });
  it('bindet nicht nach Singular-Nomen', () => {
    expect(ipa('un enfant intelligent')).toBe('œ̃n‿ɑ̃fɑ̃ ɛ̃tɛliʒɑ̃');
  });
  it('markiert fakultative Liaison nach Verbformen', () => {
    const t = transcribe('il est ici');
    const liaison = t.words[1]!.phones.find((p) => p.liaison);
    expect(liaison?.ipa).toBe('t');
    expect(liaison?.liaison).toBe('obligatory');
    const t2 = transcribe('elles ont acheté');
    const l2 = t2.words[1]!.phones.find((p) => p.liaison);
    expect(l2?.liaison).toBe('obligatory');
  });
  it('bindet nicht über Satzzeichen', () => {
    expect(ipa('Ils sont là. Elles aussi.')).toBe('il sɔ̃ la ɛlz‿osi');
    expect(ipa('les amis, ils arrivent')).toBe('lez‿ami ilz‿aʁiv');
  });
  it('behandelt Apostrophe und Bindestriche', () => {
    expect(ipa("l'école")).toBe('lekɔl');
    expect(ipa("j'habite à Paris")).toBe('ʒabit a paʁi');
    expect(ipa("qu'est-ce que c'est ?")).toBe('kɛs kə sɛ');
    expect(ipa('est-il')).toBe('ɛt‿il');
    expect(ipa('aujourd’hui')).toBe('oʒuʁdɥi');
  });
  it('unterscheidet plus/tous/est im Kontext', () => {
    expect(ipa('plus ou moins')).toBe('plyz‿u mwɛ̃');
    expect(ipa('je ne veux plus')).toBe('ʒə nə vø ply');
    expect(ipa('en plus')).toBe('ɑ̃ plys');
    expect(ipa('tous les jours')).toBe('tu le ʒuʁ');
    expect(ipa('nous sommes tous là')).toBe('nu sɔm tus la');
    expect(ipa("l'est")).toBe('lɛst');
    expect(ipa('il est')).toBe('il ɛ');
  });
  it('schreibt Zahlen aus', () => {
    expect(numberToFrench(21)).toBe('vingt et un');
    expect(numberToFrench(71)).toBe('soixante et onze');
    expect(numberToFrench(80)).toBe('quatre-vingts');
    expect(numberToFrench(99)).toBe('quatre-vingt-dix-neuf');
    expect(numberToFrench(200)).toBe('deux cents');
    expect(numberToFrench(1999)).toBe('mille neuf cent quatre-vingt-dix-neuf');
    expect(ipa('il a 15 ans')).toBe('il a kɛ̃z ɑ̃');
  });
});

describe('G2P – Graphemspannen und Modellraum', () => {
  it('liefert Zeichenspannen für jedes Phon', () => {
    const t = transcribe('chanson');
    const w = t.words[0]!;
    expect(w.phones.map((p) => p.ipa).join('')).toBe('ʃɑ̃sɔ̃');
    expect(w.phones[1]!.start).toBe(2);
    expect(w.phones[1]!.end).toBe(4); // „an“
    expect(w.phones[1]!.tag).toBe('nasal');
  });
  it('markiert Schwa als fakultativ und zeigt es optional an', () => {
    const t = transcribe('le petit');
    expect(ipaString(t)).toBe('lə pəti');
    expect(t.words[1]!.phones[1]!.optional).toBe(true);
    const q = transcribe('quatre');
    expect(ipaString(q)).toBe('katʁ');
    expect(ipaString(q, { showOptional: true })).toBe('katʁə');
  });
  it('bildet ɥ und ɲ auf den eSpeak-Zeichensatz ab', () => {
    const t = transcribe('la nuit');
    const m = toModelSpace(t.words.flatMap((w) => w.phones)).map((p) => p.ipa);
    expect(m).toEqual(['l', 'a', 'n', 'y', 'i']);
    const g = transcribe('gagner');
    expect(toModelSpace(g.words[0]!.phones).map((p) => p.ipa)).toEqual(['ɡ', 'a', 'n', 'j', 'e']);
    expect(toModelSpace(transcribe('montagne').words[0]!.phones).map((p) => p.ipa)).toEqual(['m', 'ɔ̃', 't', 'a', 'ɲ']);
  });
  it('misst artikulatorische Distanzen sinnvoll', () => {
    expect(phoneDistance('y', 'y')).toBe(0);
    expect(phoneDistance('y', 'u')).toBeGreaterThan(phoneDistance('e', 'ɛ'));
    expect(phoneDistance('ɑ̃', 'a')).toBeGreaterThan(0.3);
    expect(phoneDistance('p', 'b')).toBeLessThan(phoneDistance('p', 'ʁ'));
    expect(phoneDistance('a', 'p')).toBe(1);
  });
});
