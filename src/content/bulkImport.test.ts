import { describe, expect, it } from 'vitest';
import { materialize, parseWordList, planBulkImport } from './bulkImport';

describe('parseWordList', () => {
  it('liest Tab-, Semikolon- und Gedankenstrich-Listen', () => {
    expect(parseWordList('le collège\tdie Schule\nla classe;die Klasse\nmerci – danke')).toEqual([
      { fr: 'le collège', de: 'die Schule', lesson: undefined, audio: undefined, ipa: undefined },
      { fr: 'la classe', de: 'die Klasse', lesson: undefined, audio: undefined, ipa: undefined },
      { fr: 'merci', de: 'danke', lesson: undefined, audio: undefined, ipa: undefined },
    ]);
  });
  it('erkennt Kopfzeile, Lektion und Audiodatei', () => {
    const rows = parseWordList('Französisch\tDeutsch\tLektion\tAudio\nbonjour\thallo\tUnité 1\t001.mp3');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ fr: 'bonjour', de: 'hallo', lesson: 'Unité 1', audio: '001.mp3', ipa: undefined });
  });
  it('erlaubt leere Übersetzung und liest die Lautschrift aus Spalte 5', () => {
    const rows = parseWordList(
      'französisch\tdeutsch\tLektion\tAudiodateiname\tIPA\n' +
        'Salut, ça va ?\t\tB1 Unité 1 – Texte\tb1_s_T01-002.mp3\t\n' +
        'le marché\tder Markt\tB1 Unité 1 – Vokabeln\tb1_v_001.mp3\t[ləmaʁʃe]\n',
    );
    expect(rows).toEqual([
      { fr: 'Salut, ça va ?', de: '', lesson: 'B1 Unité 1 – Texte', audio: 'b1_s_T01-002.mp3', ipa: undefined },
      { fr: 'le marché', de: 'der Markt', lesson: 'B1 Unité 1 – Vokabeln', audio: 'b1_v_001.mp3', ipa: 'ləmaʁʃe' },
    ]);
  });
});

describe('planBulkImport', () => {
  it('ordnet über ASCII-Dateinamen zu und übernimmt die Lautschrift nur zur Anzeige', async () => {
    const list = new File(['französisch\tdeutsch\tLektion\tAudiodateiname\tIPA\nle marché\tder Markt\tU1 – Vokabeln\tb1_v_001.mp3\t[ləmaʁʃe]\nIls arrivent.\t\tU1 – Texte\tb1_s_002.mp3\t\n'], 'wortliste.tsv');
    const a1 = new File([new Uint8Array(10)], 'b1_v_001.mp3', { type: 'audio/mpeg' });
    const a2 = new File([new Uint8Array(10)], 'b1_s_002.mp3', { type: 'audio/mpeg' });
    const plan = await planBulkImport([list, a1, a2]);
    expect(plan.unmatchedRows).toHaveLength(0);
    expect(plan.unmatchedAudio).toHaveLength(0);
    expect(plan.lessons.map((l) => l.title)).toEqual(['U1 – Vokabeln', 'U1 – Texte']);
    const { lessons, assets } = materialize(plan, 'p1');
    expect(assets).toHaveLength(2);
    const v = lessons[0]!.vocab[0]!;
    expect(v.ipaRef).toBe('ləmaʁʃe');
    expect(v.ipa).toBeUndefined();
    expect(lessons[1]!.vocab[0]!.de).toBe('');
  });
});
