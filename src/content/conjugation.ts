/**
 * Konjugationsmodul (Präsens): eingebautes Paket mit vollständigen Paradigmen
 * häufiger Verben der Lernjahre 1–4. Eigene Zusammenstellung, kein Verlagsmaterial.
 *
 * Didaktischer Schwerpunkt: 3. Person Plural. Je nach Verb ist der Plural
 *  – gar nicht hörbar (il parle = ils parlent),
 *  – nur über die Liaison hörbar (il aime – ils‿aiment),
 *  – am Stamm hörbar (il prend – ils prennent).
 */
import { PACK_FORMAT_VERSION, type Lesson, type Pack, type VocabEntry } from '../types/content';
import { ipaString, transcribe } from '../phon/g2p';

export const CONJUGATION_PACK_ID = 'pack_conjugaison';
/** Bei inhaltlichen Änderungen erhöhen: Das Paket wird dann neu installiert. */
export const CONJUGATION_VERSION = 2;

type Group = 'er' | 'big4' | 'ir' | 'stem' | 're';

interface Verb {
  inf: string;
  de: string;
  group: Group;
  /** je, tu, il/elle, nous, vous, ils/elles – jeweils mit Pronomen */
  forms: [string, string, string, string, string, string];
  /** Hinweis zur Aussprache der 3. Person Plural */
  note?: string;
}

const PERSONS_DE = ['ich', 'du', 'er/sie', 'wir', 'ihr / Sie', 'sie (Pl.)'];

const VERBS: Verb[] = [
  // --- Verben auf -er: Plural nicht hörbar (außer Liaison) ---
  { inf: 'parler', de: 'sprechen', group: 'er', forms: ['je parle', 'tu parles', 'il parle', 'nous parlons', 'vous parlez', 'ils parlent'], note: 'il parle = ils parlent: gleich gesprochen' },
  { inf: 'regarder', de: 'ansehen', group: 'er', forms: ['je regarde', 'tu regardes', 'elle regarde', 'nous regardons', 'vous regardez', 'elles regardent'] },
  { inf: 'jouer', de: 'spielen', group: 'er', forms: ['je joue', 'tu joues', 'il joue', 'nous jouons', 'vous jouez', 'ils jouent'] },
  { inf: 'chanter', de: 'singen', group: 'er', forms: ['je chante', 'tu chantes', 'elle chante', 'nous chantons', 'vous chantez', 'elles chantent'] },
  { inf: 'travailler', de: 'arbeiten', group: 'er', forms: ['je travaille', 'tu travailles', 'il travaille', 'nous travaillons', 'vous travaillez', 'ils travaillent'] },
  { inf: 'manger', de: 'essen', group: 'er', forms: ['je mange', 'tu manges', 'il mange', 'nous mangeons', 'vous mangez', 'ils mangent'], note: 'nous mangeons: e nach g, damit es [ʒ] bleibt' },
  { inf: 'commencer', de: 'anfangen', group: 'er', forms: ['je commence', 'tu commences', 'elle commence', 'nous commençons', 'vous commencez', 'elles commencent'] },
  { inf: 'aimer', de: 'mögen, lieben', group: 'er', forms: ['j’aime', 'tu aimes', 'il aime', 'nous aimons', 'vous aimez', 'ils aiment'], note: 'Plural nur durch Liaison hörbar: ils‿aiment [ilzɛm]' },
  { inf: 'habiter', de: 'wohnen', group: 'er', forms: ['j’habite', 'tu habites', 'elle habite', 'nous habitons', 'vous habitez', 'elles habitent'], note: 'Liaison: elles‿habitent [ɛlzabit]' },
  { inf: 'écouter', de: 'hören', group: 'er', forms: ['j’écoute', 'tu écoutes', 'il écoute', 'nous écoutons', 'vous écoutez', 'ils écoutent'] },
  { inf: 'arriver', de: 'ankommen', group: 'er', forms: ['j’arrive', 'tu arrives', 'il arrive', 'nous arrivons', 'vous arrivez', 'ils arrivent'] },
  { inf: 'étudier', de: 'studieren, lernen', group: 'er', forms: ['j’étudie', 'tu étudies', 'elle étudie', 'nous étudions', 'vous étudiez', 'elles étudient'] },
  { inf: 'acheter', de: 'kaufen', group: 'er', forms: ['j’achète', 'tu achètes', 'il achète', 'nous achetons', 'vous achetez', 'ils achètent'], note: 'è in den stammbetonten Formen: [aʃɛt], aber nous achetons [aʃtɔ̃]' },
  { inf: 'appeler', de: 'rufen, anrufen', group: 'er', forms: ['j’appelle', 'tu appelles', 'il appelle', 'nous appelons', 'vous appelez', 'ils appellent'] },
  { inf: 'préférer', de: 'vorziehen', group: 'er', forms: ['je préfère', 'tu préfères', 'elle préfère', 'nous préférons', 'vous préférez', 'elles préfèrent'] },
  // --- Die großen Vier ---
  { inf: 'être', de: 'sein', group: 'big4', forms: ['je suis', 'tu es', 'il est', 'nous sommes', 'vous êtes', 'ils sont'], note: 'ils sont [il sɔ̃] ≠ ils ont [ilzɔ̃]' },
  { inf: 'avoir', de: 'haben', group: 'big4', forms: ['j’ai', 'tu as', 'il a', 'nous avons', 'vous avez', 'ils ont'], note: 'ils‿ont [ilzɔ̃] mit stimmhaftem [z]' },
  { inf: 'aller', de: 'gehen', group: 'big4', forms: ['je vais', 'tu vas', 'il va', 'nous allons', 'vous allez', 'ils vont'] },
  { inf: 'faire', de: 'machen', group: 'big4', forms: ['je fais', 'tu fais', 'elle fait', 'nous faisons', 'vous faites', 'elles font'], note: 'nous faisons [fəzɔ̃] mit Schwa' },
  // --- -ir mit Stammerweiterung -iss- und kurze -ir-Verben ---
  { inf: 'finir', de: 'beenden', group: 'ir', forms: ['je finis', 'tu finis', 'il finit', 'nous finissons', 'vous finissez', 'ils finissent'], note: 'il finit [fini] – ils finissent [finis]: Plural hörbar' },
  { inf: 'choisir', de: 'wählen', group: 'ir', forms: ['je choisis', 'tu choisis', 'elle choisit', 'nous choisissons', 'vous choisissez', 'elles choisissent'] },
  { inf: 'partir', de: 'weggehen', group: 'ir', forms: ['je pars', 'tu pars', 'il part', 'nous partons', 'vous partez', 'ils partent'], note: 'il part [paʁ] – ils partent [paʁt]' },
  { inf: 'sortir', de: 'ausgehen', group: 'ir', forms: ['je sors', 'tu sors', 'elle sort', 'nous sortons', 'vous sortez', 'elles sortent'] },
  { inf: 'dormir', de: 'schlafen', group: 'ir', forms: ['je dors', 'tu dors', 'il dort', 'nous dormons', 'vous dormez', 'ils dorment'] },
  // --- Unregelmäßig: Plural am Stamm hörbar ---
  { inf: 'prendre', de: 'nehmen', group: 'stem', forms: ['je prends', 'tu prends', 'il prend', 'nous prenons', 'vous prenez', 'ils prennent'], note: 'il prend [pʁɑ̃] – ils prennent [pʁɛn]' },
  { inf: 'comprendre', de: 'verstehen', group: 'stem', forms: ['je comprends', 'tu comprends', 'elle comprend', 'nous comprenons', 'vous comprenez', 'elles comprennent'] },
  { inf: 'venir', de: 'kommen', group: 'stem', forms: ['je viens', 'tu viens', 'il vient', 'nous venons', 'vous venez', 'ils viennent'], note: 'il vient [vjɛ̃] – ils viennent [vjɛn]' },
  { inf: 'pouvoir', de: 'können', group: 'stem', forms: ['je peux', 'tu peux', 'il peut', 'nous pouvons', 'vous pouvez', 'ils peuvent'], note: 'il peut [pø] – ils peuvent [pœv]' },
  { inf: 'vouloir', de: 'wollen', group: 'stem', forms: ['je veux', 'tu veux', 'elle veut', 'nous voulons', 'vous voulez', 'elles veulent'] },
  { inf: 'devoir', de: 'müssen', group: 'stem', forms: ['je dois', 'tu dois', 'il doit', 'nous devons', 'vous devez', 'ils doivent'], note: 'il doit [dwa] – ils doivent [dwav]' },
  { inf: 'savoir', de: 'wissen', group: 'stem', forms: ['je sais', 'tu sais', 'il sait', 'nous savons', 'vous savez', 'ils savent'] },
  { inf: 'boire', de: 'trinken', group: 'stem', forms: ['je bois', 'tu bois', 'elle boit', 'nous buvons', 'vous buvez', 'elles boivent'] },
  { inf: 'lire', de: 'lesen', group: 'stem', forms: ['je lis', 'tu lis', 'il lit', 'nous lisons', 'vous lisez', 'ils lisent'], note: 'il lit [li] – ils lisent [liz]' },
  { inf: 'écrire', de: 'schreiben', group: 'stem', forms: ['j’écris', 'tu écris', 'il écrit', 'nous écrivons', 'vous écrivez', 'ils écrivent'] },
  { inf: 'dire', de: 'sagen', group: 'stem', forms: ['je dis', 'tu dis', 'elle dit', 'nous disons', 'vous dites', 'elles disent'] },
  { inf: 'mettre', de: 'legen, stellen', group: 'stem', forms: ['je mets', 'tu mets', 'il met', 'nous mettons', 'vous mettez', 'ils mettent'] },
  { inf: 'voir', de: 'sehen', group: 'stem', forms: ['je vois', 'tu vois', 'il voit', 'nous voyons', 'vous voyez', 'ils voient'], note: 'Ausnahme: ils voient [vwa] klingt wie il voit' },
  { inf: 'connaître', de: 'kennen', group: 'stem', forms: ['je connais', 'tu connais', 'elle connaît', 'nous connaissons', 'vous connaissez', 'elles connaissent'] },
  // --- Verben auf -re ---
  { inf: 'attendre', de: 'warten', group: 're', forms: ['j’attends', 'tu attends', 'il attend', 'nous attendons', 'vous attendez', 'ils attendent'], note: 'il attend [atɑ̃] – ils‿attendent [ilzatɑ̃d]' },
  { inf: 'répondre', de: 'antworten', group: 're', forms: ['je réponds', 'tu réponds', 'elle répond', 'nous répondons', 'vous répondez', 'elles répondent'] },
  { inf: 'vendre', de: 'verkaufen', group: 're', forms: ['je vends', 'tu vends', 'il vend', 'nous vendons', 'vous vendez', 'ils vendent'] },
];

const LESSONS: { group: Group; id: string; title: string }[] = [
  { group: 'big4', id: 'les_conj_big4', title: 'Die großen Vier: être, avoir, aller, faire' },
  { group: 'er', id: 'les_conj_er', title: 'Verben auf -er: Plural meist nicht hörbar' },
  { group: 'ir', id: 'les_conj_ir', title: 'Verben auf -ir: finir, partir & Co.' },
  { group: 'stem', id: 'les_conj_stem', title: 'Unregelmäßig: Plural am Stamm hörbar' },
  { group: 're', id: 'les_conj_re', title: 'Verben auf -re: attendre, répondre, vendre' },
];

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase();
}

export function conjugationVerbs(): readonly Verb[] {
  return VERBS;
}

export function conjugationPack(): Pack {
  const lessons: Lesson[] = LESSONS.map((l) => {
    const verbs = VERBS.filter((v) => v.group === l.group);
    const vocab: VocabEntry[] = [];
    for (const v of verbs) {
      v.forms.forEach((form, i) => {
        const entry: VocabEntry = {
          id: `conj_${slug(v.inf)}_${i + 1}`,
          fr: form,
          de: `${v.de} · ${PERSONS_DE[i]}${i === 5 && v.note ? ` – ${v.note}` : ''}`,
          sectionId: `sec_${slug(v.inf)}`,
          tags: i === 5 ? ['3pl'] : undefined,
        };
        // 3. Person Plural: Singular als Kontrastform, sofern hörbar verschieden
        if (i === 5) {
          const sg = v.forms[2];
          if (ipaString(transcribe(sg.replace(/’/g, "'"))) !== ipaString(transcribe(form.replace(/’/g, "'")))) entry.contrast = sg;
        }
        vocab.push(entry);
      });
    }
    return {
      id: l.id,
      title: l.title,
      sections: verbs.map((v) => ({ id: `sec_${slug(v.inf)}`, title: `${v.inf} – ${v.de}` })),
      vocab,
      texts: [],
    };
  });
  const now = '2026-10-17T00:00:00.000Z';
  return {
    id: CONJUGATION_PACK_ID,
    title: 'Konjugation – Präsens',
    source: 'Eigene Zusammenstellung (keine Verlagsinhalte)',
    level: 'Lernjahr 1–4',
    author: 'Prononciation',
    rightsNote: 'Inhalte der App, frei verwendbar. Ohne Lehrwerk-Audio: Hören über die Gerätestimme.',
    formatVersion: PACK_FORMAT_VERSION,
    createdAt: now,
    updatedAt: now,
    lessons,
  };
}
