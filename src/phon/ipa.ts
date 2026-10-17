/**
 * Phoneminventar des Französischen (Standardaussprache), Merkmale für die
 * Ähnlichkeitsbewertung und Abbildung auf den Zeichensatz des
 * Erkennungsmodells (wav2vec2-lv-60-espeak-cv-ft, trainiert mit eSpeak-NG-
 * Transkriptionen).
 */

export type PhoneClass = 'vowel' | 'nasalVowel' | 'glide' | 'consonant';

export interface PhoneInfo {
  cls: PhoneClass;
  /** Beschreibung für Lernende (deutsch) */
  label: string;
  /** Beispielwort */
  example: string;
  /** Vokalmerkmale: Höhe 0 (offen) – 3 (geschlossen), Vorne 0 – hinten 1, gerundet, nasal */
  height?: number;
  back?: number;
  round?: boolean;
  nasal?: boolean;
  /** Konsonantenmerkmale */
  place?: number; // 0 labial, 1 dental/alveolar, 2 postalveolar, 3 palatal, 4 velar, 5 uvular
  manner?: 'plosive' | 'fricative' | 'nasal' | 'lateral' | 'approximant' | 'trill';
  voiced?: boolean;
}

export const PHONES: Record<string, PhoneInfo> = {
  // Orale Vokale
  i: { cls: 'vowel', label: 'i wie in „si“', example: 'si', height: 3, back: 0, round: false },
  e: { cls: 'vowel', label: 'geschlossenes e wie in „été“', example: 'été', height: 2, back: 0, round: false },
  ɛ: { cls: 'vowel', label: 'offenes è wie in „père“', example: 'père', height: 1, back: 0, round: false },
  a: { cls: 'vowel', label: 'a wie in „chat“', example: 'chat', height: 0, back: 0.5, round: false },
  ɑ: { cls: 'vowel', label: 'hinteres a wie in „pâte“', example: 'pâte', height: 0, back: 1, round: false },
  ɔ: { cls: 'vowel', label: 'offenes o wie in „porte“', example: 'porte', height: 1, back: 1, round: true },
  o: { cls: 'vowel', label: 'geschlossenes o wie in „mot“', example: 'mot', height: 2, back: 1, round: true },
  u: { cls: 'vowel', label: 'ou wie in „tout“', example: 'tout', height: 3, back: 1, round: true },
  y: { cls: 'vowel', label: 'ü-Laut u wie in „tu“', example: 'tu', height: 3, back: 0, round: true },
  ø: { cls: 'vowel', label: 'geschlossenes eu wie in „deux“', example: 'deux', height: 2, back: 0, round: true },
  œ: { cls: 'vowel', label: 'offenes eu wie in „peur“', example: 'peur', height: 1, back: 0, round: true },
  ə: { cls: 'vowel', label: 'stummes e (Schwa) wie in „le“', example: 'le', height: 1.5, back: 0.3, round: true },
  // Nasalvokale
  'ɑ̃': { cls: 'nasalVowel', label: 'nasales a wie in „enfant“', example: 'enfant', height: 0, back: 1, round: false, nasal: true },
  'ɛ̃': { cls: 'nasalVowel', label: 'nasales è wie in „vin“', example: 'vin', height: 1, back: 0, round: false, nasal: true },
  'ɔ̃': { cls: 'nasalVowel', label: 'nasales o wie in „bon“', example: 'bon', height: 1, back: 1, round: true, nasal: true },
  'œ̃': { cls: 'nasalVowel', label: 'nasales eu wie in „un“', example: 'un', height: 1, back: 0, round: true, nasal: true },
  // Halbvokale
  j: { cls: 'glide', label: 'j wie in „pied“', example: 'pied', height: 3, back: 0, round: false },
  w: { cls: 'glide', label: 'w wie in „oui“', example: 'oui', height: 3, back: 1, round: true },
  ɥ: { cls: 'glide', label: 'ü-Gleitlaut wie in „huit“', example: 'huit', height: 3, back: 0, round: true },
  // Konsonanten
  p: { cls: 'consonant', label: 'p', example: 'père', place: 0, manner: 'plosive', voiced: false },
  b: { cls: 'consonant', label: 'b', example: 'bon', place: 0, manner: 'plosive', voiced: true },
  t: { cls: 'consonant', label: 't', example: 'tu', place: 1, manner: 'plosive', voiced: false },
  d: { cls: 'consonant', label: 'd', example: 'dans', place: 1, manner: 'plosive', voiced: true },
  k: { cls: 'consonant', label: 'k', example: 'quatre', place: 4, manner: 'plosive', voiced: false },
  ɡ: { cls: 'consonant', label: 'g', example: 'gare', place: 4, manner: 'plosive', voiced: true },
  f: { cls: 'consonant', label: 'f', example: 'faire', place: 0, manner: 'fricative', voiced: false },
  v: { cls: 'consonant', label: 'v', example: 'vous', place: 0, manner: 'fricative', voiced: true },
  s: { cls: 'consonant', label: 's', example: 'sur', place: 1, manner: 'fricative', voiced: false },
  z: { cls: 'consonant', label: 'stimmhaftes s wie in „maison“', example: 'maison', place: 1, manner: 'fricative', voiced: true },
  ʃ: { cls: 'consonant', label: 'sch wie in „chat“', example: 'chat', place: 2, manner: 'fricative', voiced: false },
  ʒ: { cls: 'consonant', label: 'stimmhaftes sch wie in „je“', example: 'je', place: 2, manner: 'fricative', voiced: true },
  m: { cls: 'consonant', label: 'm', example: 'mère', place: 0, manner: 'nasal', voiced: true },
  n: { cls: 'consonant', label: 'n', example: 'non', place: 1, manner: 'nasal', voiced: true },
  ɲ: { cls: 'consonant', label: 'gn wie in „montagne“', example: 'montagne', place: 3, manner: 'nasal', voiced: true },
  ŋ: { cls: 'consonant', label: 'ng wie in „parking“', example: 'parking', place: 4, manner: 'nasal', voiced: true },
  l: { cls: 'consonant', label: 'l', example: 'la', place: 1, manner: 'lateral', voiced: true },
  ʁ: { cls: 'consonant', label: 'französisches r', example: 'rue', place: 5, manner: 'fricative', voiced: true },
  // Fremdlaute, die das Modell liefern kann (typische Lernerfehler)
  h: { cls: 'consonant', label: 'h (im Französischen stumm)', example: '', place: 5, manner: 'fricative', voiced: false },
  r: { cls: 'consonant', label: 'gerolltes r', example: '', place: 1, manner: 'trill', voiced: true },
  ɹ: { cls: 'consonant', label: 'englisches r', example: '', place: 1, manner: 'approximant', voiced: true },
  x: { cls: 'consonant', label: 'ach-Laut', example: '', place: 4, manner: 'fricative', voiced: false },
  ç: { cls: 'consonant', label: 'ich-Laut', example: '', place: 3, manner: 'fricative', voiced: false },
  ts: { cls: 'consonant', label: 'z wie in dt. „Zeit“', example: '', place: 1, manner: 'fricative', voiced: false },
  tʃ: { cls: 'consonant', label: 'tsch', example: '', place: 2, manner: 'fricative', voiced: false },
  dʒ: { cls: 'consonant', label: 'dsch', example: '', place: 2, manner: 'fricative', voiced: true },
  θ: { cls: 'consonant', label: 'engl. th', example: '', place: 1, manner: 'fricative', voiced: false },
  ð: { cls: 'consonant', label: 'engl. th (stimmhaft)', example: '', place: 1, manner: 'fricative', voiced: true },
  ʔ: { cls: 'consonant', label: 'Knacklaut', example: '', place: 5, manner: 'plosive', voiced: false },
  ɪ: { cls: 'vowel', label: 'kurzes i wie in dt. „bitte“', example: '', height: 2.5, back: 0.2, round: false },
  ʊ: { cls: 'vowel', label: 'kurzes u wie in dt. „Mutter“', example: '', height: 2.5, back: 0.9, round: true },
  ʏ: { cls: 'vowel', label: 'kurzes ü wie in dt. „Mütter“', example: '', height: 2.5, back: 0.2, round: true },
  ʌ: { cls: 'vowel', label: 'engl. u wie in „but“', example: '', height: 1, back: 0.8, round: false },
  æ: { cls: 'vowel', label: 'engl. a wie in „cat“', example: '', height: 0.5, back: 0.2, round: false },
  ɐ: { cls: 'vowel', label: 'a-Schwa wie in dt. „Lehrer“', example: '', height: 0.5, back: 0.5, round: false },
  ɜ: { cls: 'vowel', label: 'engl. ö-ähnlich', example: '', height: 1.5, back: 0.5, round: false },
  ɒ: { cls: 'vowel', label: 'engl. offenes o', example: '', height: 0, back: 1, round: true },
};

/**
 * Zeichen, die das Modell nicht kennt, auf eSpeak-Konventionen abbilden.
 * Arbeitet auf Phon-Objekten, damit Markierungen (fakultativ, Liaison) erhalten bleiben.
 */
export function toModelSpace<T extends { ipa: string; optional?: boolean }>(phones: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < phones.length; i++) {
    const p = phones[i]!;
    if (p.ipa === 'ɥ') out.push({ ...p, ipa: 'y' });
    else if (p.ipa === 'ɑ') out.push({ ...p, ipa: 'a' });
    else if (p.ipa === 'ɲ') {
      // eSpeak schreibt „gn“ vor Vokal als n+j, am Wortende als ɲ.
      const next = phones[i + 1];
      if (next && !next.optional && isVowelLike(next.ipa)) out.push({ ...p, ipa: 'n' }, { ...p, ipa: 'j' });
      else out.push(p);
    } else out.push(p);
  }
  return out;
}

/** Modell-Ausgabe (eSpeak-Zeichensatz) in Standard-IPA rückübersetzen, soweit eindeutig. */
export function normalizeModelPhone(p: string): string {
  // Längen- und Betonungszeichen entfernen
  const base = p.replace(/[ːˈˌ]/g, '');
  if (base === 'g') return 'ɡ';
  if (base === 'ɹ' || base === 'ɾ' || base === 'ʀ') return base === 'ʀ' ? 'ʁ' : base;
  return base;
}

export function isVowelLike(p: string): boolean {
  const info = PHONES[p];
  return !!info && (info.cls === 'vowel' || info.cls === 'nasalVowel');
}

export function isVowelOrGlide(p: string): boolean {
  const info = PHONES[p];
  return !!info && info.cls !== 'consonant';
}

/**
 * Artikulatorische Distanz zweier Phone in [0, 1].
 * 0 = identisch, 1 = maximal verschieden. Unbekannte Phone: 0.9.
 */
export function phoneDistance(a: string, b: string): number {
  if (a === b) return 0;
  const A = PHONES[a];
  const B = PHONES[b];
  if (!A || !B) return 0.9;
  const vowA = A.cls !== 'consonant';
  const vowB = B.cls !== 'consonant';
  if (vowA !== vowB) {
    // Halbvokal vs. zugehöriger Vokal ist nah (j~i, w~u, ɥ~y)
    return 1;
  }
  if (vowA) {
    const dh = Math.abs((A.height ?? 0) - (B.height ?? 0)) / 3;
    const db = Math.abs((A.back ?? 0) - (B.back ?? 0));
    const dr = A.round === B.round ? 0 : 1;
    const dn = !!A.nasal === !!B.nasal ? 0 : 1;
    const dg = (A.cls === 'glide') === (B.cls === 'glide') ? 0 : 1;
    // Gewichte: Nasalität und Rundung sind im Französischen bedeutungsunterscheidend
    const d = 0.3 * dh + 0.2 * db + 0.25 * dr + 0.35 * dn + 0.3 * dg;
    return Math.min(1, d);
  }
  const dp = Math.abs((A.place ?? 0) - (B.place ?? 0)) / 5;
  const dm = A.manner === B.manner ? 0 : mannerDistance(A.manner, B.manner);
  const dv = A.voiced === B.voiced ? 0 : 1;
  const d = 0.35 * dp + 0.4 * dm + 0.3 * dv;
  return Math.min(1, d);
}

function mannerDistance(a?: PhoneInfo['manner'], b?: PhoneInfo['manner']): number {
  const near: Record<string, string[]> = {
    plosive: ['fricative'],
    fricative: ['plosive', 'approximant', 'trill'],
    nasal: ['plosive'],
    lateral: ['approximant'],
    approximant: ['lateral', 'fricative', 'trill'],
    trill: ['fricative', 'approximant'],
  };
  if (!a || !b) return 1;
  return near[a]?.includes(b) ? 0.5 : 1;
}

/** Hübsche Darstellung einer Phonfolge für die Anzeige (Wörter mit Leerzeichen). */
export function formatIpa(words: string[][]): string {
  return words.map((w) => w.join('')).join(' ');
}
