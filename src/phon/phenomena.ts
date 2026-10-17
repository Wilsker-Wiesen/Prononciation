/**
 * Aussprachephänomene für Missionen und Fokus-Übungen: Erkennung im
 * Wortschatz (über das G2P-Modul), Erklärtexte und Minimalpaare.
 */
import type { Transcription } from './g2p';

export type PhenomenonId =
  | 'silent-final'
  | 'silent-e'
  | 'ent-ending'
  | 'nasal'
  | 'u-ou'
  | 'r'
  | 'j-zh'
  | 'ch'
  | 'liaison'
  | 'h'
  | 'glide-ui'
  | 'eu'
  | 'oi';

export interface MinimalPair {
  a: string;
  b: string;
  ipaA: string;
  ipaB: string;
  /** deutsche Bedeutungen (kurz) */
  deA?: string;
  deB?: string;
}

export interface Phenomenon {
  id: PhenomenonId;
  title: string;
  /** Kurzname für Chips/Abzeichen */
  short: string;
  emoji: string;
  /** Regel in Lernendensprache */
  rule: string;
  /** Artikulationstipp */
  tip: string;
  /** typische Lesefehler ("so steht es da") */
  pitfall: string;
  examples: { fr: string; ipa: string }[];
  pairs: MinimalPair[];
  /** empfohlenes Lernjahr des ersten Fokus */
  year: 1 | 2 | 3 | 4;
}

export const PHENOMENA: Phenomenon[] = [
  {
    id: 'silent-final',
    title: 'Stumme Endkonsonanten',
    short: 'Stumme Enden',
    emoji: '🤫',
    rule: 'Am Wortende werden -s, -t, -d, -x, -z, -p und -g normalerweise nicht gesprochen: „petit“ klingt wie „peti“, „les“ wie „le“.',
    tip: 'Sprich das Wort und stoppe beim letzten Vokal. Nur c, r, f und l (CaReFuL) sind am Ende meist hörbar: „sac“, „mer“, „neuf“, „sel“.',
    pitfall: 'Wer alle Buchstaben liest, sagt „petit-t“ und „les-s“. Das ist der häufigste Lesefehler überhaupt.',
    examples: [{ fr: 'petit', ipa: 'pəti' }, { fr: 'grand', ipa: 'ɡʁɑ̃' }, { fr: 'les amis', ipa: 'lez‿ami' }, { fr: 'beaucoup', ipa: 'boku' }],
    pairs: [
      { a: 'petit', b: 'petite', ipaA: 'pəti', ipaB: 'pətit', deA: 'klein (m.)', deB: 'klein (w.)' },
      { a: 'grand', b: 'grande', ipaA: 'ɡʁɑ̃', ipaB: 'ɡʁɑ̃d', deA: 'groß (m.)', deB: 'groß (w.)' },
      { a: 'vert', b: 'verte', ipaA: 'vɛʁ', ipaB: 'vɛʁt', deA: 'grün (m.)', deB: 'grün (w.)' },
      { a: 'gris', b: 'grise', ipaA: 'ɡʁi', ipaB: 'ɡʁiz', deA: 'grau (m.)', deB: 'grau (w.)' },
      { a: 'français', b: 'française', ipaA: 'fʁɑ̃sɛ', ipaB: 'fʁɑ̃sɛz', deA: 'französisch (m.)', deB: 'französisch (w.)' },
      { a: 'chat', b: 'chatte', ipaA: 'ʃa', ipaB: 'ʃat', deA: 'Kater', deB: 'Katze' },
      { a: 'content', b: 'contente', ipaA: 'kɔ̃tɑ̃', ipaB: 'kɔ̃tɑ̃t', deA: 'zufrieden (m.)', deB: 'zufrieden (w.)' },
      { a: 'blond', b: 'blonde', ipaA: 'blɔ̃', ipaB: 'blɔ̃d', deA: 'blond (m.)', deB: 'blond (w.)' },
    ],
    year: 1,
  },
  {
    id: 'silent-e',
    title: 'Stummes e am Wortende',
    short: 'Stummes e',
    emoji: '🫥',
    rule: 'Ein -e am Wortende wird nicht gesprochen. Es sorgt aber dafür, dass der Konsonant davor hörbar wird: „petite“ endet auf [t].',
    tip: 'Lass das e weg, aber sprich den Konsonanten davor deutlich: „classe“ → [klas], „rouge“ → [ʁuʒ].',
    pitfall: 'Deutsch „Klasse“ endet auf [ə], französisch „classe“ nicht.',
    examples: [{ fr: 'la classe', ipa: 'la klas' }, { fr: 'une amie', ipa: 'yn ami' }, { fr: 'rouge', ipa: 'ʁuʒ' }, { fr: 'la table', ipa: 'la tabl' }],
    pairs: [
      { a: 'ami', b: 'amie', ipaA: 'ami', ipaB: 'ami', deA: 'Freund', deB: 'Freundin' },
      { a: 'cousin', b: 'cousine', ipaA: 'kuzɛ̃', ipaB: 'kuzin', deA: 'Cousin', deB: 'Cousine' },
      { a: 'voisin', b: 'voisine', ipaA: 'vwazɛ̃', ipaB: 'vwazin', deA: 'Nachbar', deB: 'Nachbarin' },
    ],
    year: 1,
  },
  {
    id: 'ent-ending',
    title: 'Die Verbendung -ent',
    short: '-ent',
    emoji: '👥',
    rule: 'Bei „ils/elles“ wird die Endung -ent nicht gesprochen: „ils chantent“ klingt wie „il chante“. Nur in Nomen und Adverbien (parent, souvent, vraiment) klingt -ent als [ɑ̃].',
    tip: 'Bei Verben: Endung streichen, Stamm sprechen. „ils aiment“ = [ilz‿ɛm].',
    pitfall: '„ils chantent“ als „schantent“ oder „schantont“ – ein Lesefehler, kein Hörfehler.',
    examples: [{ fr: 'ils chantent', ipa: 'il ʃɑ̃t' }, { fr: 'elles parlent', ipa: 'ɛl paʁl' }, { fr: 'ils aiment', ipa: 'ilz‿ɛm' }, { fr: 'souvent', ipa: 'suvɑ̃' }],
    pairs: [
      { a: 'il chante', b: 'ils chantent', ipaA: 'il ʃɑ̃t', ipaB: 'il ʃɑ̃t', deA: 'er singt', deB: 'sie singen' },
      { a: 'elle parle', b: 'elles parlent', ipaA: 'ɛl paʁl', ipaB: 'ɛl paʁl', deA: 'sie spricht', deB: 'sie sprechen' },
    ],
    year: 1,
  },
  {
    id: 'nasal',
    title: 'Nasalvokale',
    short: 'Nasale',
    emoji: '👃',
    rule: 'Vokal + n/m am Silbenende wird zu einem Nasalvokal: an/en → [ɑ̃], in/ain/ein → [ɛ̃], on → [ɔ̃], un → [œ̃]. Das n oder m selbst wird nicht gesprochen.',
    tip: 'Halte den Mund offen und lass die Luft gleichzeitig durch die Nase strömen. Kontrolle: Nase zuhalten – bei einem echten Nasalvokal ändert sich der Klang. Folgt ein Vokal (bonne, année), ist es kein Nasal mehr.',
    pitfall: '„bon“ als „bonn“, „vin“ als „win“, „enfant“ als „enfant“ mit hörbarem n.',
    examples: [{ fr: 'bon', ipa: 'bɔ̃' }, { fr: 'vin', ipa: 'vɛ̃' }, { fr: 'enfant', ipa: 'ɑ̃fɑ̃' }, { fr: 'un', ipa: 'œ̃' }, { fr: 'bonne', ipa: 'bɔn' }],
    pairs: [
      { a: 'bon', b: 'bonne', ipaA: 'bɔ̃', ipaB: 'bɔn', deA: 'gut (m.)', deB: 'gut (w.)' },
      { a: 'un', b: 'une', ipaA: 'œ̃', ipaB: 'yn', deA: 'ein', deB: 'eine' },
      { a: 'fin', b: 'fine', ipaA: 'fɛ̃', ipaB: 'fin', deA: 'fein (m.)', deB: 'fein (w.)' },
      { a: 'plein', b: 'pleine', ipaA: 'plɛ̃', ipaB: 'plɛn', deA: 'voll (m.)', deB: 'voll (w.)' },
      { a: 'italien', b: 'italienne', ipaA: 'italjɛ̃', ipaB: 'italjɛn', deA: 'italienisch (m.)', deB: 'italienisch (w.)' },
      { a: 'vin', b: 'vent', ipaA: 'vɛ̃', ipaB: 'vɑ̃', deA: 'Wein', deB: 'Wind' },
      { a: 'bain', b: 'banc', ipaA: 'bɛ̃', ipaB: 'bɑ̃', deA: 'Bad', deB: 'Bank' },
      { a: 'blanc', b: 'blond', ipaA: 'blɑ̃', ipaB: 'blɔ̃', deA: 'weiß', deB: 'blond' },
      { a: 'sans', b: 'son', ipaA: 'sɑ̃', ipaB: 'sɔ̃', deA: 'ohne', deB: 'sein' },
      { a: 'main', b: 'mon', ipaA: 'mɛ̃', ipaB: 'mɔ̃', deA: 'Hand', deB: 'mein' },
    ],
    year: 1,
  },
  {
    id: 'u-ou',
    title: 'u [y] und ou [u]',
    short: 'u / ou',
    emoji: '👄',
    rule: 'Französisches u klingt wie deutsches ü: „tu“ = [ty]. Nur „ou“ klingt wie deutsches u: „tout“ = [tu].',
    tip: 'Für [y]: Sag „i“ und runde dabei die Lippen wie zum Pfeifen. Für [u]: Lippen rund und weit vor, Zunge weit hinten.',
    pitfall: '„tu“ wie deutsch „du“ gesprochen. Dann versteht man „tout“ (alles).',
    examples: [{ fr: 'tu', ipa: 'ty' }, { fr: 'tout', ipa: 'tu' }, { fr: 'la rue', ipa: 'la ʁy' }, { fr: 'nous', ipa: 'nu' }, { fr: 'salut', ipa: 'saly' }],
    pairs: [
      { a: 'tu', b: 'tout', ipaA: 'ty', ipaB: 'tu', deA: 'du', deB: 'alles' },
      { a: 'rue', b: 'roue', ipaA: 'ʁy', ipaB: 'ʁu', deA: 'Straße', deB: 'Rad' },
      { a: 'vu', b: 'vous', ipaA: 'vy', ipaB: 'vu', deA: 'gesehen', deB: 'ihr/Sie' },
      { a: 'pur', b: 'pour', ipaA: 'pyʁ', ipaB: 'puʁ', deA: 'rein', deB: 'für' },
      { a: 'dessus', b: 'dessous', ipaA: 'dəsy', ipaB: 'dəsu', deA: 'oben', deB: 'unten' },
      { a: 'su', b: 'sous', ipaA: 'sy', ipaB: 'su', deA: 'gewusst', deB: 'unter' },
      { a: 'lu', b: 'loup', ipaA: 'ly', ipaB: 'lu', deA: 'gelesen', deB: 'Wolf' },
    ],
    year: 1,
  },
  {
    id: 'r',
    title: 'Das französische r',
    short: 'r',
    emoji: '🗣️',
    rule: 'Das r wird hinten im Rachen gesprochen [ʁ], ähnlich wie ein weiches Gurgeln. Am Wortende ist es hörbar: „mer“, „pour“, „bonjour“.',
    tip: 'Sag „ach“ (wie in Bach) und mach den Laut stimmhaft und weicher. Zungenspitze bleibt unten.',
    pitfall: 'Gerolltes Zungen-r oder englisches r. Am Wortende lassen viele das r ganz weg („bonjou“).',
    examples: [{ fr: 'bonjour', ipa: 'bɔ̃ʒuʁ' }, { fr: 'la rue', ipa: 'la ʁy' }, { fr: 'merci', ipa: 'mɛʁsi' }, { fr: 'trois', ipa: 'tʁwa' }],
    pairs: [
      { a: 'rat', b: 'la', ipaA: 'ʁa', ipaB: 'la', deA: 'Ratte', deB: 'die' },
      { a: 'rond', b: 'long', ipaA: 'ʁɔ̃', ipaB: 'lɔ̃', deA: 'rund', deB: 'lang' },
    ],
    year: 1,
  },
  {
    id: 'j-zh',
    title: 'j und g wie in „journal“',
    short: 'j / g [ʒ]',
    emoji: '📰',
    rule: 'j und g (vor e, i, y) klingen wie das g in „Garage“ [ʒ]: „je“, „jour“, „rouge“, „manger“. Niemals wie deutsches j in „ja“.',
    tip: 'Sag „sch“ und schalte die Stimme dazu – die Stimmbänder summen.',
    pitfall: '„je“ wie „je“ in „jeder“ oder „bonjour“ als „bonjur“ mit deutschem j.',
    examples: [{ fr: 'je', ipa: 'ʒə' }, { fr: 'bonjour', ipa: 'bɔ̃ʒuʁ' }, { fr: 'rouge', ipa: 'ʁuʒ' }, { fr: 'manger', ipa: 'mɑ̃ʒe' }],
    pairs: [
      { a: 'jeu', b: 'yeux', ipaA: 'ʒø', ipaB: 'jø', deA: 'Spiel', deB: 'Augen' },
      { a: 'cage', b: 'cache', ipaA: 'kaʒ', ipaB: 'kaʃ', deA: 'Käfig', deB: 'versteckt' },
      { a: 'joue', b: 'chou', ipaA: 'ʒu', ipaB: 'ʃu', deA: 'Wange', deB: 'Kohl' },
      { a: 'bouge', b: 'bouche', ipaA: 'buʒ', ipaB: 'buʃ', deA: 'beweg dich', deB: 'Mund' },
    ],
    year: 1,
  },
  {
    id: 'ch',
    title: 'ch wie „sch“',
    short: 'ch [ʃ]',
    emoji: '🤫',
    rule: 'Französisches ch klingt immer wie deutsches sch [ʃ]: „chat“, „chercher“, „chocolat“.',
    tip: 'Nie wie in „ich“ oder „Bach“ – immer „sch“.',
    pitfall: '„chat“ als „kat“ oder mit ich-Laut.',
    examples: [{ fr: 'le chat', ipa: 'lə ʃa' }, { fr: 'chercher', ipa: 'ʃɛʁʃe' }, { fr: 'le chocolat', ipa: 'lə ʃɔkɔla' }],
    pairs: [
      { a: 'chou', b: 'sou', ipaA: 'ʃu', ipaB: 'su', deA: 'Kohl', deB: 'Groschen' },
      { a: 'chat', b: 'sa', ipaA: 'ʃa', ipaB: 'sa', deA: 'Katze', deB: 'seine' },
    ],
    year: 1,
  },
  {
    id: 'liaison',
    title: 'Liaison',
    short: 'Liaison',
    emoji: '🔗',
    rule: 'Vor einem Vokal wird der stumme Endkonsonant hörbar und an das nächste Wort gebunden: „les amis“ = [lez‿ami], „un ami“ = [œ̃n‿ami], „vous êtes“ = [vuz‿ɛt].',
    tip: 'Sprich beide Wörter wie ein einziges: „le-za-mi“. Das s klingt dabei wie [z].',
    pitfall: '„les amis“ mit Pause („le | ami“) oder mit hartem s.',
    examples: [{ fr: 'les amis', ipa: 'lez‿ami' }, { fr: 'un ami', ipa: 'œ̃n‿ami' }, { fr: 'vous êtes', ipa: 'vuz‿ɛt' }, { fr: 'ils ont', ipa: 'ilz‿ɔ̃' }],
    pairs: [
      { a: 'les amis', b: 'les mamies', ipaA: 'lez‿ami', ipaB: 'le mami', deA: 'die Freunde', deB: 'die Omas' },
      { a: 'ils ont', b: 'ils sont', ipaA: 'ilz‿ɔ̃', ipaB: 'il sɔ̃', deA: 'sie haben', deB: 'sie sind' },
    ],
    year: 1,
  },
  {
    id: 'h',
    title: 'Das stumme h',
    short: 'h',
    emoji: '🤐',
    rule: 'Das h wird im Französischen nie gesprochen: „habiter“ beginnt mit [a], „l’hôtel“ wird gebunden. Nur bei h aspiré (le héros, les haricots) gibt es keine Liaison.',
    tip: 'Stell dir vor, das h wäre gar nicht da.',
    pitfall: 'Deutsches [h] in „habiter“, „heure“, „hôtel“.',
    examples: [{ fr: 'habiter', ipa: 'abite' }, { fr: 'l’heure', ipa: 'lœʁ' }, { fr: 'l’hôtel', ipa: 'lotɛl' }, { fr: 'les héros', ipa: 'le eʁo' }],
    pairs: [],
    year: 1,
  },
  {
    id: 'glide-ui',
    title: 'ui wie in „huit“',
    short: 'ui [ɥi]',
    emoji: '8️⃣',
    rule: '„ui“ beginnt mit einem gerundeten ü-Gleitlaut [ɥ]: „huit“ [ɥit], „lui“ [lɥi], „la nuit“ [nɥi].',
    tip: 'Sag schnell „ü-i“ und lass beide zu einer Silbe verschmelzen.',
    pitfall: '„huit“ als „wit“ oder „üt“.',
    examples: [{ fr: 'huit', ipa: 'ɥit' }, { fr: 'lui', ipa: 'lɥi' }, { fr: 'la nuit', ipa: 'la nɥi' }, { fr: 'aujourd’hui', ipa: 'oʒuʁdɥi' }],
    pairs: [
      { a: 'lui', b: 'Louis', ipaA: 'lɥi', ipaB: 'lwi', deA: 'ihm', deB: 'Louis' },
      { a: 'huit', b: 'oui', ipaA: 'ɥit', ipaB: 'wi', deA: 'acht', deB: 'ja' },
    ],
    year: 1,
  },
  {
    id: 'eu',
    title: 'eu [ø] und [œ]',
    short: 'eu',
    emoji: '🎈',
    rule: '„eu“ und „œu“ klingen wie deutsches ö: geschlossen [ø] in „deux“, „peu“; offen [œ] vor Konsonant in „peur“, „sœur“, „jeune“.',
    tip: 'Lippen runden wie bei „o“, aber die Zunge wie bei „e“.',
    pitfall: '„deux“ als „de-u“ oder „döx“ mit gesprochenem x.',
    examples: [{ fr: 'deux', ipa: 'dø' }, { fr: 'la sœur', ipa: 'la sœʁ' }, { fr: 'jeune', ipa: 'ʒœn' }, { fr: 'heureux', ipa: 'øʁø' }],
    pairs: [
      { a: 'deux', b: 'doux', ipaA: 'dø', ipaB: 'du', deA: 'zwei', deB: 'sanft' },
      { a: 'peu', b: 'pou', ipaA: 'pø', ipaB: 'pu', deA: 'wenig', deB: 'Laus' },
    ],
    year: 1,
  },
  {
    id: 'oi',
    title: 'oi wie [wa]',
    short: 'oi [wa]',
    emoji: '🦆',
    rule: '„oi“ klingt wie „wa“: „moi“ [mwa], „trois“ [tʁwa], „voilà“ [vwala].',
    tip: 'Ein kurzes „u“ geht in ein „a“ über: u-a → [wa].',
    pitfall: '„moi“ als „meu“ oder „moi“ wie „Moi“ im Deutschen.',
    examples: [{ fr: 'moi', ipa: 'mwa' }, { fr: 'trois', ipa: 'tʁwa' }, { fr: 'voilà', ipa: 'vwala' }, { fr: 'le soir', ipa: 'lə swaʁ' }],
    pairs: [
      { a: 'moi', b: 'mois', ipaA: 'mwa', ipaB: 'mwa', deA: 'ich/mich', deB: 'Monat' },
      { a: 'toi', b: 'tout', ipaA: 'twa', ipaB: 'tu', deA: 'du/dich', deB: 'alles' },
    ],
    year: 1,
  },
];

export const PHENOMENON_BY_ID: Record<PhenomenonId, Phenomenon> = Object.fromEntries(PHENOMENA.map((p) => [p.id, p])) as Record<PhenomenonId, Phenomenon>;

/** Erkennt, welche Phänomene in einem transkribierten Eintrag vorkommen. */
export function detectPhenomena(t: Transcription): Set<PhenomenonId> {
  const out = new Set<PhenomenonId>();
  for (const w of t.words) {
    const ipa = w.phones.map((p) => p.ipa);
    const lower = w.lower;
    if (w.silentFinal && !/e$/.test(lower)) out.add('silent-final');
    if (/[^aeiouy]e$/.test(lower) && lower.length > 2 && !/^(le|de|je|me|te|se|ne|ce|que)$/.test(lower)) out.add('silent-e');
    if (/ent$/.test(lower) && !ipa.includes('ɑ̃') && lower.length > 4) out.add('ent-ending');
    if (ipa.some((p) => /̃/.test(p))) out.add('nasal');
    if (ipa.includes('y') || ipa.includes('u')) out.add('u-ou');
    if (ipa.includes('ʁ')) out.add('r');
    if (ipa.includes('ʒ')) out.add('j-zh');
    if (ipa.includes('ʃ') && /ch/.test(lower)) out.add('ch');
    if (w.phones.some((p) => p.liaison === 'obligatory')) out.add('liaison');
    if (/^h/.test(lower)) out.add('h');
    if (ipa.includes('ɥ')) out.add('glide-ui');
    if (ipa.includes('ø') || ipa.includes('œ')) out.add('eu');
    if (/oi/.test(lower) && ipa.includes('w')) out.add('oi');
  }
  return out;
}
