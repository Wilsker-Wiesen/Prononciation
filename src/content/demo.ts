/**
 * Beispielpaket (eigene Texte, kein Verlagsmaterial) zum Ausprobieren der App.
 * Ohne Audio: Als Modellaussprache dient die System-Sprachausgabe, sofern vorhanden.
 */
import { PACK_FORMAT_VERSION, type Pack } from '../types/content';

const now = '2026-10-17T00:00:00.000Z';

export const DEMO_PACK_ID = 'pack_demo';

export function demoPack(): Pack {
  return {
    id: DEMO_PACK_ID,
    title: 'Beispiel – Premiers pas',
    source: 'Eigene Beispielinhalte (keine Verlagsinhalte)',
    level: 'Klasse 7',
    author: 'Prononciation',
    rightsNote: 'Beispielinhalte der App, frei verwendbar.',
    formatVersion: PACK_FORMAT_VERSION,
    createdAt: now,
    updatedAt: now,
    lessons: [
      {
        id: 'les_demo_1',
        title: 'Unité 1 – Bonjour !',
        sections: [
          { id: 'sec_a', title: 'Se présenter' },
          { id: 'sec_b', title: 'Au collège' },
        ],
        vocab: [
          { id: 'v01', fr: 'bonjour', de: 'guten Tag, hallo', sectionId: 'sec_a' },
          { id: 'v02', fr: 'salut', de: 'hallo, tschüss', sectionId: 'sec_a' },
          { id: 'v03', fr: 'Je m’appelle …', de: 'Ich heiße …', sectionId: 'sec_a' },
          { id: 'v04', fr: 'Comment tu t’appelles ?', de: 'Wie heißt du?', sectionId: 'sec_a' },
          { id: 'v05', fr: 'J’habite à Münster.', de: 'Ich wohne in Münster.', sectionId: 'sec_a', tags: ['h-muet'] },
          { id: 'v06', fr: 'Ça va ?', de: 'Wie geht’s?', sectionId: 'sec_a' },
          { id: 'v07', fr: 'très bien', de: 'sehr gut', sectionId: 'sec_a' },
          { id: 'v08', fr: 'merci', de: 'danke', sectionId: 'sec_a' },
          { id: 'v09', fr: 'au revoir', de: 'auf Wiedersehen', sectionId: 'sec_a' },
          { id: 'v10', fr: 'un ami, une amie', de: 'ein Freund, eine Freundin', sectionId: 'sec_a', tags: ['liaison'] },
          { id: 'v11', fr: 'les amis', de: 'die Freunde', sectionId: 'sec_a', tags: ['liaison'] },
          { id: 'v12', fr: 'le collège', de: 'die Schule (Sek. I)', sectionId: 'sec_b' },
          { id: 'v13', fr: 'la classe', de: 'die Klasse', sectionId: 'sec_b' },
          { id: 'v14', fr: 'le professeur, la professeure', de: 'der Lehrer, die Lehrerin', sectionId: 'sec_b' },
          { id: 'v15', fr: 'l’élève', de: 'der Schüler, die Schülerin', sectionId: 'sec_b' },
          { id: 'v16', fr: 'le cahier', de: 'das Heft', sectionId: 'sec_b' },
          { id: 'v17', fr: 'le livre', de: 'das Buch', sectionId: 'sec_b' },
          { id: 'v18', fr: 'la trousse', de: 'das Mäppchen', sectionId: 'sec_b' },
          { id: 'v19', fr: 'le stylo', de: 'der Kugelschreiber', sectionId: 'sec_b' },
          { id: 'v20', fr: 'Tu as un stylo ?', de: 'Hast du einen Kuli?', sectionId: 'sec_b', tags: ['nasal'] },
          { id: 'v21', fr: 'Oui, j’ai un stylo rouge.', de: 'Ja, ich habe einen roten Kuli.', sectionId: 'sec_b' },
          { id: 'v22', fr: 'Non, je n’ai pas de stylo.', de: 'Nein, ich habe keinen Kuli.', sectionId: 'sec_b' },
          { id: 'v23', fr: 'Il est huit heures.', de: 'Es ist acht Uhr.', sectionId: 'sec_b', tags: ['h-aspiré'] },
          { id: 'v24', fr: 'Nous sommes en classe.', de: 'Wir sind im Unterricht.', sectionId: 'sec_b', tags: ['nasal'] },
          { id: 'v25', fr: 'tu / tout', de: 'du / alles (u–ou-Kontrast)', sectionId: 'sec_b', tags: ['u-ou'] },
          { id: 'v26', fr: 'le petit garçon', de: 'der kleine Junge', sectionId: 'sec_b', tags: ['stummes-e'] },
          { id: 'v27', fr: 'la petite fille', de: 'das kleine Mädchen', sectionId: 'sec_b' },
          { id: 'v28', fr: 'Ils sont contents.', de: 'Sie sind zufrieden.', sectionId: 'sec_b', tags: ['endung-ent'] },
          { id: 'v29', fr: 'Ils chantent.', de: 'Sie singen.', sectionId: 'sec_b', tags: ['endung-ent'] },
          { id: 'v30', fr: 'le jardin', de: 'der Garten', sectionId: 'sec_b', tags: ['j'] },
        ],
        texts: [
          {
            id: 't_demo_1',
            title: 'Léa et Tom',
            sentences: [
              { id: 's1', fr: 'Bonjour, je m’appelle Léa.', de: 'Hallo, ich heiße Léa.' },
              { id: 's2', fr: 'J’ai douze ans et j’habite à Lyon.', de: 'Ich bin zwölf Jahre alt und wohne in Lyon.' },
              { id: 's3', fr: 'Voici mon ami Tom.', de: 'Das ist mein Freund Tom.' },
              { id: 's4', fr: 'Nous sommes dans la même classe.', de: 'Wir sind in derselben Klasse.' },
              { id: 's5', fr: 'Le matin, nous allons au collège à vélo.', de: 'Morgens fahren wir mit dem Rad zur Schule.' },
              { id: 's6', fr: 'À midi, nous mangeons à la cantine.', de: 'Mittags essen wir in der Mensa.' },
              { id: 's7', fr: 'Les cours finissent à cinq heures.', de: 'Der Unterricht endet um fünf Uhr.' },
              { id: 's8', fr: 'Et toi, tu habites où ?', de: 'Und du, wo wohnst du?' },
            ],
          },
        ],
      },
    ],
  };
}
