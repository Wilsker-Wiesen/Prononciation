import { describe, expect, it } from 'vitest';
import { groupPlanByBand, groupPlanByUnit, materialize, parseWordList, planBulkImport, splitLessonTitle } from './bulkImport';

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

  it('macht aus der optionalen 6. Spalte Abschnitte in Buchreihenfolge', async () => {
    const list = new File(['französisch\tdeutsch\tLektion\tAudiodateiname\tIPA\tAbschnitt\nIls arrivent.\t\tU1 – Texte\t\t\tAtelier B\nIl pleut.\t\tU1 – Texte\t\t\tAtelier A\nOn y va.\t\tU1 – Texte\t\t\tAtelier B\nSalut !\t\tU1 – Texte\t\t\t\n'], 'wortliste.tsv');
    const { lessons } = materialize(await planBulkImport([list]), 'p1');
    const l = lessons[0]!;
    expect(l.sections).toEqual([{ id: 'sec_1', title: 'Atelier B' }, { id: 'sec_2', title: 'Atelier A' }]);
    expect(l.vocab.map((v) => v.sectionId)).toEqual(['sec_1', 'sec_2', 'sec_1', undefined]);
  });
});

describe('groupPlanByUnit', () => {
  it('teilt nach Einheit in Buchreihenfolge und kürzt die Lektionstitel', async () => {
    const list = new File([
      'französisch\tdeutsch\tLektion\tAudiodateiname\n' +
        'le marché\tder Markt\tB1 Unité 1 – Vokabeln\ta.mp3\n' +
        'Il arrive.\t\tB1 Unité 1 – Texte\tb.mp3\n' +
        'la gare\tder Bahnhof\tB1 Unité 2 – Vokabeln\tc.mp3\n',
    ], 'wortliste.tsv');
    const files = ['a.mp3', 'b.mp3', 'c.mp3'].map((n) => new File([new Uint8Array(4)], n, { type: 'audio/mpeg' }));
    const groups = groupPlanByUnit(await planBulkImport([list, ...files]));
    expect(groups.map((g) => g.unit)).toEqual(['B1 Unité 1', 'B1 Unité 2']);
    expect(groups[0]!.plan.lessons.map((l) => l.title)).toEqual(['Vokabeln', 'Texte']);
    expect(groups[0]!.plan.audioFiles).toHaveLength(2);
    expect(splitLessonTitle('Unité 1')).toEqual({ unit: 'Unité 1', part: 'Unité 1' });
  });
});

describe('groupPlanByBand', () => {
  it('fasst alle Einheiten eines Bandes in einem Paket zusammen', async () => {
    const list = new File([
      'französisch\tdeutsch\tLektion\tAudiodateiname\n' +
        'le marché\tder Markt\tD1 Unité 1 – Vokabeln\ta.mp3\n' +
        'Il arrive.\t\tD1 Unité 1 – Lektionstexte\tb.mp3\n' +
        'la gare\tder Bahnhof\tD1 Unité 2 – Vokabeln\tc.mp3\n' +
        'le train\tder Zug\tD2 Unité 1 – Vokabeln\td.mp3\n',
    ], 'wortliste.tsv');
    const files = ['a.mp3', 'b.mp3', 'c.mp3', 'd.mp3'].map((n) => new File([new Uint8Array(4)], n, { type: 'audio/mpeg' }));
    const groups = groupPlanByBand(await planBulkImport([list, ...files]));
    expect(groups.map((g) => g.title)).toEqual(['Découvertes 1', 'Découvertes 2']);
    expect(groups[0]!.plan.lessons.map((l) => l.title)).toEqual(['Unité 1 – Vokabeln', 'Unité 1 – Lektionstexte', 'Unité 2 – Vokabeln']);
    expect(groups[0]!.plan.audioFiles).toHaveLength(3);
  });
});
