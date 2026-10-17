/**
 * Regelbasiertes Graphem-Phonem-Modul für das Französische.
 *
 * Ziel ist nicht eine vollständige Phonologie, sondern eine verlässliche
 * Zieltranskription für Lehrwerks-Wortschatz der Sekundarstufe I, die zum
 * Phoneminventar des Erkennungsmodells passt (siehe ipa.ts). Unregelmäßige
 * Wörter stehen in lexicon.ts; Lehrkräfte können jede Transkription im
 * Editor überschreiben.
 *
 * Ausgabe: Wörter mit Phonen, Graphemspannen (für die Markierung im Text),
 * fakultativen Lauten (Schwa, Gleitlaut) und Liaison-Information.
 */
import { ENT_NON_VERB, ENT_VERB, H_ASPIRE, ILL_AS_IL_PREFIXES, LEXICON, NO_LIAISON_BEFORE } from './lexicon';
import { expandNumbers } from './numbers';
import { isVowelOrGlide } from './ipa';

export interface Phone {
  ipa: string;
  /** Zeichenspanne im Originaltext */
  start: number;
  end: number;
  /** fakultativ: Fehlen wird nicht als Fehler gewertet */
  optional?: boolean;
  /** Liaison-Konsonant (an das vorhergehende Wort gebunden) */
  liaison?: 'obligatory' | 'optional';
  /** Markierung für die Rückmeldung */
  tag?: 'schwa' | 'glide' | 'nasal' | 'silent-final';
  /** in der Lautschrift-Anzeige ausblenden (z. B. fakultatives End-Schwa) */
  hidden?: boolean;
}

export interface PhonWord {
  orth: string;
  lower: string;
  start: number;
  end: number;
  phones: Phone[];
  /** latenter Liaison-Konsonant (z, t, n, ʁ, p) */
  latent?: string;
  hAspire?: boolean;
  /** Anzahl der stummen Endbuchstaben (für Hinweise) */
  silentFinal?: string;
  /** eng gebunden an das nächste Wort (Bindestrich) */
  tight?: boolean;
  /** Satzzeichen/Gruppengrenze nach diesem Wort */
  boundaryAfter?: boolean;
}

export interface Transcription {
  text: string;
  words: PhonWord[];
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const V_LETTERS = 'aàâäeéèêëiîïoôöuùûüyœæ';
const isVowelLetter = (c: string | undefined): boolean => !!c && V_LETTERS.includes(c);
const hasVowel = (s: string): boolean => [...s].some(isVowelLetter);

/** Beginnt `after` mit einem gesprochenen Vokal (nicht mit stummem End-e/-es/-ent)? */
function pronouncedVowelFollows(after: string): boolean {
  const c = after[0];
  if (!isVowelLetter(c)) return false;
  if (c === 'e' && /^e(s|nt)?$/.test(after)) return false;
  return true;
}

/** Konsonantencluster am Anfang von `after` in Einheiten (Digraphen als eine Einheit). */
function consonantUnits(after: string): string[] {
  const units: string[] = [];
  let i = 0;
  while (i < after.length) {
    const two = after.slice(i, i + 2);
    if (['ch', 'ph', 'th', 'gn', 'sh', 'rh'].includes(two)) {
      units.push(two);
      i += 2;
      continue;
    }
    const c = after[i]!;
    if (isVowelLetter(c) || c === '-' || c === "'") break;
    units.push(c);
    i += 1;
  }
  return units;
}

function nasalContext(after: string): boolean {
  // Nasalvokal, wenn Wortende oder ein Konsonant (außer n/m) folgt
  if (after === '') return true;
  const c = after[0]!;
  if (isVowelLetter(c) || c === 'n' || c === 'm') return false;
  if (c === 'h' && after.length > 1 && isVowelLetter(after[1])) return false;
  return true;
}

interface Ctx {
  word: string;
  i: number;
  before: string;
  after: string;
  prev?: string;
  next?: string;
  verbEnt: boolean;
  /** vom Regelwerk gesetzt */
  latent?: string;
  silentFinal?: string;
}

interface Rule {
  g: string;
  left?: RegExp;
  right?: RegExp;
  cond?: (c: Ctx) => boolean;
  /** Phone, durch Leerzeichen getrennt; „?“ = fakultativ; „“ = stumm */
  out: string | ((c: Ctx) => string);
}

const OBSTRUENT = /^[bcdfgkptv]$/;
const LIQUID = /^[lr]$/;

function afterObstruentLiquid(before: string): boolean {
  const b = [...before].reverse();
  return b.length >= 2 && LIQUID.test(b[0]!) && OBSTRUENT.test(b[1]!);
}

/** Konsonantenbuchstaben am Ende von `before` (als Einheiten). */
function trailingConsonantUnits(before: string): string[] {
  let k = before.length;
  while (k > 0 && !isVowelLetter(before[k - 1]) && before[k - 1] !== '-' && before[k - 1] !== "'") k--;
  return consonantUnits(before.slice(k));
}

function eRule(c: Ctx): string {
  const { before, after } = c;
  if (after === '') {
    if (!hasVowel(before)) return 'ə';
    // Endungs-e nach Konsonantencluster: fakultatives Schwa (quatre, table)
    const units = trailingConsonantUnits(before);
    return units.length >= 2 ? 'ə?' : '';
  }
  if (after === 's') return hasVowel(before) ? '' : 'e';
  if (before === '' && /^(ff|ss)/.test(after)) return 'e';
  if (/^([bcdfglmnprstz])\1/.test(after)) return 'ɛ';
  const units = consonantUnits(after);
  if (units.length === 0) return 'e';
  const rest = after.slice(units.join('').length);
  if (rest === '' || /^(e|es|ent)$/.test(rest)) return 'ɛ';
  if (units.length === 1) return 'ə';
  if (units.length === 2 && OBSTRUENT.test(units[0]!) && LIQUID.test(units[1]!)) return 'ə';
  return 'ɛ';
}

function euRule(c: Ctx): string {
  const { after } = c;
  if (after === '' || /^(s|x|t|e|es)$/.test(after)) return 'ø';
  const units = consonantUnits(after);
  if (units.length === 0) return 'ø';
  const rest = after.slice(units.join('').length);
  const closed = rest === '' || /^(e|es|ent)$/.test(rest);
  if (!closed) return 'ø';
  // geschlossene Silbe: œ, außer vor [z] und [t] (creuse, neutre)
  if (units[0] === 's' && /^[eé]/.test(rest)) return 'ø';
  if (units.join('') === 't' || units.join('') === 'tr') return 'ø';
  return 'œ';
}

function oRule(c: Ctx): string {
  const { after } = c;
  if (after === '' || /^(s|t|ts|p|ps|d|ds)$/.test(after)) return 'o';
  if (/^s[aeiouéè]/.test(after)) return 'o'; // rose, chose, position
  if (/^z/.test(after)) return 'o';
  if (/^me?s?$/.test(after)) return 'o'; // -ome, atome
  if (/^ti(on|e)/.test(after)) return 'o'; // émotion
  return 'ɔ';
}

function iRule(c: Ctx): string {
  const { before, after } = c;
  if (!pronouncedVowelFollows(after)) return 'i';
  // Nach Obstruent + Liquid wird i vor Vokal silbisch mit Gleitlaut (crier, oublier)
  if (afterObstruentLiquid(before)) return 'i j?';
  return 'j';
}

function uRule(c: Ctx): string {
  const { before, after } = c;
  if (!pronouncedVowelFollows(after)) return 'y';
  if (afterObstruentLiquid(before)) return 'y ɥ?';
  return 'ɥ';
}

function finalSilent(latent: string, letters: string): (c: Ctx) => string {
  return (c) => {
    c.latent = latent;
    c.silentFinal = letters;
    return '';
  };
}

const END = /^$/;
const END_S = /^s?$/;
const V_RE = new RegExp(`^[${V_LETTERS}]`);
const V_END = new RegExp(`[${V_LETTERS}]$`);
const EIY = /^[eiyéèêë]/;

// ---------------------------------------------------------------------------
// Regelwerk (Reihenfolge = Priorität; an jeder Position gewinnt die erste passende Regel)
// ---------------------------------------------------------------------------
const RULES: Rule[] = [
  // --- Endungen ---
  { g: 'i', right: /^ent$/, cond: (c) => c.verbEnt, out: 'i' },
  { g: 'ent', right: END, cond: (c) => c.verbEnt, out: '' },
  { g: 'ement', right: END_S, out: 'ə m ɑ̃' },
  { g: 'ing', right: END, out: 'i ŋ' },
  { g: 'ier', right: END_S, out: (c) => (afterObstruentLiquid(c.before) ? 'i j? e' : 'j e') },
  { g: 'ière', right: END_S, out: (c) => (afterObstruentLiquid(c.before) ? 'i j? ɛ ʁ' : 'j ɛ ʁ') },
  { g: 'er', right: END_S, out: (c) => (c.before.length <= 1 ? 'ɛ ʁ' : 'e') },
  { g: 'ez', right: END, out: 'e' },
  { g: 'et', right: END_S, out: 'ɛ' },
  { g: 'es', right: END, cond: (c) => hasVowel(c.before), out: finalSilent('z', 'es') },
  { g: 'aient', right: END, out: 'ɛ' },
  { g: 'ais', right: END, out: (c) => { c.latent = 'z'; return 'ɛ'; } },
  { g: 'ait', right: END, out: (c) => { c.latent = 't'; return 'ɛ'; } },
  { g: 'ct', right: END_S, out: 'k t' },
  { g: 'ps', right: END, out: finalSilent('z', 'ps') },
  { g: 'gt', right: END_S, out: finalSilent('t', 'gt') },
  { g: 'mb', right: END_S, out: finalSilent('', 'mb') },
  { g: 'ds', right: END, out: finalSilent('z', 'ds') },
  { g: 'ts', right: END, out: finalSilent('z', 'ts') },
  { g: 'eux', right: END, out: (c) => { c.latent = 'z'; return 'ø'; } },
  { g: 'oux', right: END, out: (c) => { c.latent = 'z'; return 'u'; } },
  { g: 'aux', right: END, out: (c) => { c.latent = 'z'; return 'o'; } },
  { g: 'eaux', right: END, out: (c) => { c.latent = 'z'; return 'o'; } },
  // --- Vokalgruppen ---
  { g: 'eau', out: 'o' },
  { g: 'aill', out: 'a j' },
  { g: 'ail', right: END_S, out: 'a j' },
  { g: 'eill', out: 'ɛ j' },
  { g: 'eil', right: END_S, out: 'ɛ j' },
  { g: 'euill', out: 'œ j' },
  { g: 'ueill', out: 'œ j' },
  { g: 'euil', right: END_S, out: 'œ j' },
  { g: 'ueil', right: END_S, out: 'œ j' },
  { g: 'ouill', out: 'u j' },
  { g: 'ouil', right: END_S, out: 'u j' },
  { g: 'œill', out: 'œ j' },
  { g: 'ain', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'aim', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'ein', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'eim', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'oin', cond: (c) => nasalContext(c.after), out: 'w ɛ̃' },
  { g: 'ienn', out: 'j ɛ n' },
  { g: 'ien', right: /^[ct]/, out: 'j ɑ̃' },
  { g: 'ien', cond: (c) => nasalContext(c.after), out: 'j ɛ̃' },
  { g: 'ion', cond: (c) => nasalContext(c.after), out: 'j ɔ̃' },
  { g: 'ian', cond: (c) => nasalContext(c.after), out: 'j ɑ̃' },
  { g: 'yn', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'ym', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'aon', cond: (c) => nasalContext(c.after), out: 'ɑ̃' },
  { g: 'ann', right: V_RE, out: 'a n' },
  { g: 'enn', right: V_RE, out: 'ɛ n' },
  { g: 'emm', right: V_RE, out: 'ɛ m' },
  { g: 'onn', right: V_RE, out: 'ɔ n' },
  { g: 'omm', right: V_RE, out: 'ɔ m' },
  { g: 'inn', right: V_RE, out: 'i n' },
  { g: 'imm', right: V_RE, out: 'i m' },
  { g: 'an', cond: (c) => nasalContext(c.after), out: 'ɑ̃' },
  { g: 'am', cond: (c) => nasalContext(c.after), out: 'ɑ̃' },
  { g: 'en', right: END, left: /[iéy]$/, out: 'ɛ̃' },
  { g: 'en', cond: (c) => nasalContext(c.after), out: 'ɑ̃' },
  { g: 'em', cond: (c) => nasalContext(c.after), out: 'ɑ̃' },
  { g: 'in', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'im', cond: (c) => nasalContext(c.after), out: 'ɛ̃' },
  { g: 'on', cond: (c) => nasalContext(c.after), out: 'ɔ̃' },
  { g: 'om', cond: (c) => nasalContext(c.after), out: 'ɔ̃' },
  { g: 'un', cond: (c) => nasalContext(c.after), out: 'œ̃' },
  { g: 'um', cond: (c) => nasalContext(c.after), out: 'œ̃' },
  { g: 'ai', out: 'ɛ' },
  { g: 'aî', out: 'ɛ' },
  { g: 'ay', right: V_RE, out: 'ɛ j' },
  { g: 'ay', out: 'ɛ' },
  { g: 'au', right: /^r/, out: 'ɔ' },
  { g: 'au', out: 'o' },
  { g: 'ei', out: 'ɛ' },
  { g: 'ey', right: V_RE, out: 'ɛ j' },
  { g: 'ey', out: 'ɛ' },
  { g: 'eu', out: euRule },
  { g: 'œu', out: euRule },
  { g: 'œ', out: 'œ' },
  { g: 'oy', right: V_RE, out: 'w a j' },
  { g: 'oi', out: 'w a' },
  { g: 'oî', out: 'w a' },
  { g: 'ou', cond: (c) => pronouncedVowelFollows(c.after), out: 'w' },
  { g: 'ou', out: 'u' },
  { g: 'où', out: 'u' },
  { g: 'oû', out: 'u' },
  { g: 'uy', right: V_RE, out: 'ɥ i j' },
  { g: 'exc', left: /^$/, right: EIY, out: 'ɛ k s' },
  { g: 'ex', left: /^$/, right: V_RE, out: 'ɛ ɡ z' },
  { g: 'ex', left: /^$/, out: 'ɛ k s' },
  { g: 'ill', cond: (c) => ILL_AS_IL_PREFIXES.some((p) => c.word.startsWith(p)), out: 'i l' },
  { g: 'ill', left: /[^aeiouy]$|^$/, out: 'i j' },
  { g: 'il', right: END_S, left: /[aeiouœ]$/, out: 'j' },
  // --- Einzelvokale ---
  { g: 'é', out: 'e' },
  { g: 'è', out: 'ɛ' },
  { g: 'ê', out: 'ɛ' },
  { g: 'ë', out: 'ɛ' },
  { g: 'e', out: eRule },
  { g: 'à', out: 'a' },
  { g: 'â', out: 'a' },
  { g: 'ä', out: 'a' },
  { g: 'a', out: 'a' },
  { g: 'î', out: 'i' },
  { g: 'ï', out: 'i' },
  { g: 'i', out: iRule },
  { g: 'ô', out: 'o' },
  { g: 'ö', out: 'ɔ' },
  { g: 'o', out: oRule },
  { g: 'û', out: 'y' },
  { g: 'ù', out: 'y' },
  { g: 'ü', out: 'y' },
  { g: 'u', out: uRule },
  { g: 'y', left: V_END, right: V_RE, out: 'j' },
  { g: 'y', cond: (c) => pronouncedVowelFollows(c.after), out: 'j' },
  { g: 'y', out: 'i' },
  // --- Konsonanten ---
  { g: 'ch', right: /^[rln]/, out: 'k' },
  { g: 'ch', out: 'ʃ' },
  { g: 'ck', out: 'k' },
  { g: 'cc', right: EIY, out: 'k s' },
  { g: 'cc', out: 'k' },
  { g: 'c', right: EIY, out: 's' },
  { g: 'ç', out: 's' },
  { g: 'c', out: 'k' },
  { g: 'qu', out: 'k' },
  { g: 'q', out: 'k' },
  { g: 'gn', left: /.+/, out: 'ɲ' },
  { g: 'gu', right: EIY, out: 'ɡ' },
  { g: 'ge', right: /^[aou]/, out: 'ʒ' },
  { g: 'g', right: EIY, out: 'ʒ' },
  { g: 'gg', out: 'ɡ' },
  { g: 'g', right: END_S, out: finalSilent('', 'g') },
  { g: 'g', out: 'ɡ' },
  { g: 'ph', out: 'f' },
  { g: 'th', out: 't' },
  { g: 'sch', out: 'ʃ' },
  { g: 'sh', out: 'ʃ' },
  { g: 'rh', out: 'ʁ' },
  { g: 'h', out: '' },
  { g: 'll', out: 'l' },
  { g: 'l', out: 'l' },
  { g: 'mm', out: 'm' },
  { g: 'm', out: 'm' },
  { g: 'nn', out: 'n' },
  { g: 'n', out: 'n' },
  { g: 'pp', out: 'p' },
  { g: 'pt', left: /m$/, out: 't' },
  { g: 'p', right: END_S, out: finalSilent('p', 'p') },
  { g: 'p', out: 'p' },
  { g: 'bb', out: 'b' },
  { g: 'b', out: 'b' },
  { g: 'dd', out: 'd' },
  { g: 'd', right: END_S, out: finalSilent('t', 'd') },
  { g: 'd', out: 'd' },
  { g: 'tt', out: 't' },
  { g: 't', right: /^i(on|el|al|eu|en[ct]|a[il]|aire|able)/, left: /[^s]$|^$/, out: 's' },
  { g: 't', right: END_S, out: finalSilent('t', 't') },
  { g: 't', out: 't' },
  { g: 'x', right: END, out: finalSilent('z', 'x') },
  { g: 'x', out: 'k s' },
  { g: 'ss', out: 's' },
  { g: 'sc', right: EIY, out: 's' },
  { g: 'sce', right: /^[aou]/, out: 's' },
  { g: 's', right: END, out: finalSilent('z', 's') },
  { g: 's', left: V_END, right: V_RE, out: 'z' },
  { g: 's', out: 's' },
  { g: 'z', right: END, out: finalSilent('z', 'z') },
  { g: 'z', out: 'z' },
  { g: 'v', out: 'v' },
  { g: 'w', out: 'w' },
  { g: 'j', out: 'ʒ' },
  { g: 'k', out: 'k' },
  { g: 'rr', out: 'ʁ' },
  { g: 'r', out: 'ʁ' },
  { g: 'ff', out: 'f' },
  { g: 'f', out: 'f' },
];

// Regeln nach Position indexieren (erster Buchstabe) – reine Beschleunigung
const RULES_BY_FIRST = new Map<string, Rule[]>();
for (const r of RULES) {
  const k = r.g[0]!;
  if (!RULES_BY_FIRST.has(k)) RULES_BY_FIRST.set(k, []);
  RULES_BY_FIRST.get(k)!.push(r);
}

/** Phone-String („a j?“) in Phone-Objekte umwandeln. */
function parsePhones(spec: string, start: number, end: number): Phone[] {
  if (!spec) return [];
  return spec.split(/\s+/).filter(Boolean).map((tok) => {
    const optional = tok.endsWith('?');
    const ipa = optional ? tok.slice(0, -1) : tok;
    const p: Phone = { ipa, start, end };
    if (optional) { p.optional = true; p.hidden = true; }
    if (ipa === 'ə') { p.tag = 'schwa'; p.optional = true; }
    if (/̃/.test(ipa)) p.tag = 'nasal';
    if (ipa === 'j' || ipa === 'w' || ipa === 'ɥ') p.tag = 'glide';
    return p;
  });
}

/** Lexikoneintrag („le(z)“) parsen. */
function parseLexicon(entry: string, start: number, end: number): { phones: Phone[]; latent?: string } {
  const m = /^(.*?)(?:\((.)\))?$/.exec(entry)!;
  const body = m[1]!;
  const latent = m[2];
  const phones: Phone[] = [];
  const chars = [...body];
  for (let i = 0; i < chars.length; i++) {
    let ipa = chars[i]!;
    // Kombinierende Tilde gehört zum vorangehenden Zeichen
    while (chars[i + 1] === '̃') { ipa += chars[++i]; }
    // Affrikaten als ein Phon
    if ((ipa === 't' && (chars[i + 1] === 'ʃ' || chars[i + 1] === 's')) || (ipa === 'd' && chars[i + 1] === 'ʒ')) {
      ipa += chars[++i];
    }
    const p: Phone = { ipa, start, end };
    if (ipa === 'ə') { p.tag = 'schwa'; p.optional = true; }
    if (/̃/.test(ipa)) p.tag = 'nasal';
    if (ipa === 'j' || ipa === 'w' || ipa === 'ɥ') p.tag = 'glide';
    phones.push(p);
  }
  // Wortfinales Schwa nach Konsonantencluster (quatre, notre) wird in der Anzeige ausgeblendet
  const n = phones.length;
  if (n >= 3 && phones[n - 1]!.ipa === 'ə' && !isVowelOrGlide(phones[n - 2]!.ipa) && !isVowelOrGlide(phones[n - 3]!.ipa)) {
    phones[n - 1]!.hidden = true;
  }
  return { phones, latent };
}

const SUBJECT_CLITICS = new Set(['ils', 'elles', 'qui', 'se', 'ne', "n'", "s'", 'les', 'me', 'te', 'nous', 'vous', 'lui', 'leur', 'y', 'en', 'le', 'la', "l'", "m'", "t'"]);
const DETERMINERS_AFTER_TOUS = new Set(['les', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix']);

function isVerbEnt(lower: string, prev?: string): boolean {
  if (!lower.endsWith('ent') || lower.length < 5) return false;
  if (ENT_NON_VERB.has(lower)) return false;
  if (ENT_VERB.has(lower)) return true;
  if (lower.endsWith('aient')) return true;
  if (prev && SUBJECT_CLITICS.has(prev)) return !/(ement|amment|emment)$/.test(lower);
  return false;
}

/** Ein einzelnes Wort (ohne Apostroph/Bindestrich) transkribieren. */
function transcribeWord(orth: string, start: number, end: number, prev?: string, next?: string, prevs: string[] = []): PhonWord {
  const lower = orth.toLowerCase().normalize('NFC');
  const word: PhonWord = { orth, lower, start, end, phones: [] };
  const bare = lower.replace(/'$/, '');
  if (H_ASPIRE.has(lower)) word.hAspire = true;

  // Kontextabhängige Lexikonvarianten
  let key: string | undefined;
  if (lower === 'est' && prev === "l'") key = 'est_';
  else if ((lower === 'six' || lower === 'dix') && next) key = startsWithVowelSound(next) ? `${lower}_v` : `${lower}_`;
  else if (lower === 'neuf' && next && (next === 'ans' || next === 'heures')) key = 'neuf_';
  else if (lower === 'tous' && next && DETERMINERS_AFTER_TOUS.has(next)) key = 'tout';
  else if (lower === 'plus') {
    if (next && startsWithVowelSound(next)) key = 'plus';
    else if (!next && !prevs.some((w) => w === 'ne' || w === "n'")) key = 'plus_s';
    else key = 'plus';
  }
  const entry = key ? (key === 'plus_s' ? 'plys' : LEXICON[key]) : (LEXICON[lower] ?? LEXICON[bare]);
  if (entry !== undefined) {
    const { phones, latent } = parseLexicon(entry, start, end);
    word.phones = phones;
    if (latent) word.latent = latent;
    const lastPhone = phones[phones.length - 1];
    const silent = /([bcdgpstxz]+)$/.exec(bare);
    if (silent && lastPhone && isVowelOrGlide(lastPhone.ipa)) word.silentFinal = silent[1];
    return word;
  }

  const verbEnt = isVerbEnt(lower, prev);
  const chars = bare;
  let i = 0;
  const ctx: Ctx = { word: chars, i: 0, before: '', after: '', prev, next, verbEnt };
  while (i < chars.length) {
    const c = chars[i]!;
    const candidates = RULES_BY_FIRST.get(c) ?? [];
    let matched = false;
    for (const r of candidates) {
      if (!chars.startsWith(r.g, i)) continue;
      ctx.i = i;
      ctx.before = chars.slice(0, i);
      ctx.after = chars.slice(i + r.g.length);
      if (r.left && !r.left.test(ctx.before)) continue;
      if (r.right && !r.right.test(ctx.after)) continue;
      if (r.cond && !r.cond(ctx)) continue;
      ctx.latent = undefined;
      ctx.silentFinal = undefined;
      const spec = typeof r.out === 'function' ? r.out(ctx) : r.out;
      const sp = start + i;
      const ep = start + i + r.g.length;
      word.phones.push(...parsePhones(spec, sp, ep));
      if (ctx.latent !== undefined) word.latent = ctx.latent || undefined;
      if (ctx.silentFinal) word.silentFinal = ctx.silentFinal;
      i += r.g.length;
      matched = true;
      break;
    }
    if (!matched) i += 1; // unbekanntes Zeichen überspringen
  }
  // Nasalvokal am Wortende → latentes n (für Liaison bei un/mon/bon …)
  const last = word.phones[word.phones.length - 1];
  if (!word.latent && last && last.tag === 'nasal' && /n$/.test(lower)) word.latent = 'n';
  // Wortende auf -er (nicht Infinitiv-Lexikon): latentes ʁ nur für pränominale Adjektive
  if (!word.latent && /ier$/.test(lower) && PRENOMINAL.has(lower)) word.latent = 'ʁ';
  return word;
}

function startsWithVowelSound(lowerNext: string): boolean {
  const w = lowerNext.replace(/^[^\p{L}]+/u, '');
  if (!w) return false;
  if (H_ASPIRE.has(w) || NO_LIAISON_BEFORE.has(w)) return false;
  const c = w[0]!;
  if (isVowelLetter(c)) return true;
  if (c === 'h') return true;
  if (c === 'y' && w === 'yeux') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Liaison
// ---------------------------------------------------------------------------

const PRENOMINAL = new Set(['petit', 'petits', 'grand', 'grands', 'gros', 'bon', 'bons', 'mauvais', 'premier', 'premiers', 'dernier', 'derniers', 'nouveaux', 'vieux', 'beaux', 'autres', 'certains', 'plusieurs', 'quelques', 'tout', 'tous', 'jeunes', 'vrais', 'faux', 'longs', 'courts', 'hauts', 'joyeux', 'meilleurs']);

const OBLIGATORY_BEFORE_VOWEL = new Set([
  'les', 'des', 'un', 'mes', 'tes', 'ses', 'ces', 'nos', 'vos', 'leurs', 'aux', 'mon', 'ton', 'son', 'en', 'on',
  'ils', 'elles', 'nous', 'vous', 'deux', 'trois', 'six', 'dix', 'vingt', 'cent', 'quelques', 'plusieurs',
  'dans', 'chez', 'sans', 'sous', 'très', 'bien', 'rien', 'tout', 'plus', 'moins', 'quand', 'dont', 'est',
  'petit', 'petits', 'grand', 'grands', 'gros', 'bon', 'bons', 'mauvais', 'premier', 'dernier', 'autres',
  'certains', 'nouveaux', 'vieux', 'beaux', 'tous', 'ont', 'sont', 'font', 'vont', 'avons', 'avez', 'allons',
  'allez', 'êtes', 'sommes', 'pas', 'jamais', 'devant', 'pendant', 'avant', 'depuis', 'après', 'comment', 'combien',
]);

const DENASALIZE: Record<string, string> = { 'ɔ̃': 'ɔ', 'ɛ̃': 'ɛ', 'œ̃': 'œ', 'ɑ̃': 'a' };
const DENASALIZE_WORDS = new Set(['bon', 'certain', 'plein', 'ancien', 'prochain', 'moyen', 'vilain', 'divin', 'vain', 'soudain', 'lointain', 'hautain', 'aucun_']);

function applyLiaison(words: PhonWord[]): void {
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i]!;
    const w2 = words[i + 1]!;
    if (w1.boundaryAfter || !w1.latent) continue;
    if (!w2.phones.length || !isVowelOrGlide(w2.phones[0]!.ipa)) continue;
    if (w2.hAspire || NO_LIAISON_BEFORE.has(w2.lower)) continue;
    // Gleitlaut-Anlaut: w- (oui, whisky) nicht, oi-/ou- (oiseau) und yeux ja
    if (w2.phones[0]!.ipa === 'w' && !/^o/.test(w2.lower)) continue;
    if (w2.phones[0]!.ipa === 'j' && w2.lower !== 'yeux' && /^y/.test(w2.lower)) continue;
    if (w1.lower === 'et') continue;
    let cls: 'obligatory' | 'optional' | 'none';
    if (w1.tight) cls = 'obligatory';
    else if (OBLIGATORY_BEFORE_VOWEL.has(w1.lower)) cls = 'obligatory';
    else if (w1.lower === 'c' || w1.lower === "c'") cls = 'obligatory';
    else if (LEXICON[w1.lower] !== undefined && w1.latent) cls = 'optional'; // Verbformen etc. aus dem Lexikon
    else if (/[sx]$/.test(w1.lower)) cls = 'optional'; // Plural + Adjektiv
    else cls = 'none';
    if (cls === 'none') continue;
    // Ein Nomen im Singular vor Adjektiv: keine Liaison (un enfant intelligent)
    if (cls === 'optional' && w1.latent === 't' && !LEXICON[w1.lower]) continue;
    const latent = w1.latent;
    const lastIdx = w1.phones.length - 1;
    const last = w1.phones[lastIdx];
    const span = { start: Math.max(w1.start, w1.end - 1), end: w1.end };
    if (latent === 'n' && last && DENASALIZE_WORDS.has(w1.lower)) {
      const oral = DENASALIZE[last.ipa];
      if (oral) w1.phones[lastIdx] = { ...last, ipa: oral, tag: undefined };
    }
    w1.phones.push({ ipa: latent, ...span, liaison: cls, optional: cls === 'optional' });
  }
}

// ---------------------------------------------------------------------------
// Tokenisierung
// ---------------------------------------------------------------------------

interface Token {
  text: string;
  start: number;
  end: number;
  kind: 'word' | 'punct';
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[\p{L}\p{M}\d]+(?:['’][\p{L}\p{M}\d]+)*['’]?(?:-[\p{L}\p{M}\d]+(?:['’][\p{L}\p{M}\d]+)*)*|[.,;:!?…«»"()\n]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const t = m[0];
    const isPunct = /^[.,;:!?…«»"()\n]$/.test(t);
    tokens.push({ text: t, start: m.index, end: m.index + t.length, kind: isPunct ? 'punct' : 'word' });
  }
  return tokens;
}

/** Zerlegt ein Token an Apostrophen und Bindestrichen in Einzelwörter. */
function splitToken(t: Token): { text: string; start: number; end: number; tight: boolean }[] {
  const lower = t.text.toLowerCase().replace(/’/g, "'");
  if (LEXICON[lower] !== undefined) return [{ text: t.text, start: t.start, end: t.end, tight: false }];
  const parts: { text: string; start: number; end: number; tight: boolean }[] = [];
  // Zuerst an Bindestrichen (jeweils eng gebunden), dann an Apostrophen
  let pos = 0;
  const hy = t.text.split('-');
  for (let h = 0; h < hy.length; h++) {
    const seg = hy[h]!;
    const segStart = t.start + pos;
    const segLower = seg.toLowerCase().replace(/’/g, "'");
    const lastOfHyphen = h === hy.length - 1;
    if (seg.length && LEXICON[segLower] !== undefined) {
      parts.push({ text: seg, start: segStart, end: segStart + seg.length, tight: !lastOfHyphen });
    } else {
      const ap = seg.split(/(['’])/);
      let p = 0;
      let buf = '';
      let bufStart = segStart;
      for (const piece of ap) {
        if (piece === "'" || piece === '’') {
          // Apostroph gehört zum vorangehenden Wort (l', d', qu' …)
          buf += "'";
          parts.push({ text: buf, start: bufStart, end: segStart + p + 1, tight: true });
          buf = '';
          bufStart = segStart + p + 1;
        } else {
          buf += piece;
        }
        p += piece.length;
      }
      if (buf.length) parts.push({ text: buf, start: bufStart, end: segStart + seg.length, tight: !lastOfHyphen });
    }
    pos += seg.length + 1;
  }
  return parts.filter((p) => p.text.length > 0);
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export function transcribe(text: string): Transcription {
  const normalized = expandNumbers(text.normalize('NFC'));
  const tokens = tokenize(normalized);
  const units: { text: string; start: number; end: number; tight: boolean; boundaryAfter: boolean }[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!;
    if (t.kind === 'punct') {
      const last = units[units.length - 1];
      if (last) last.boundaryAfter = true;
      continue;
    }
    for (const p of splitToken(t)) units.push({ ...p, boundaryAfter: false });
  }
  const words: PhonWord[] = [];
  for (let k = 0; k < units.length; k++) {
    const u = units[k]!;
    const prev = k > 0 && !units[k - 1]!.boundaryAfter ? units[k - 1]!.text.toLowerCase().replace(/’/g, "'") : undefined;
    const next = !u.boundaryAfter && units[k + 1] ? units[k + 1]!.text.toLowerCase().replace(/’/g, "'") : undefined;
    const prevs: string[] = [];
    for (let j = k - 1; j >= 0 && j >= k - 4 && !units[j]!.boundaryAfter; j--) prevs.push(units[j]!.text.toLowerCase().replace(/’/g, "'"));
    const w = transcribeWord(u.text.replace(/’/g, "'"), u.start, u.end, prev, next, prevs);
    w.tight = u.tight;
    w.boundaryAfter = u.boundaryAfter;
    words.push(w);
  }
  applyLiaison(words);
  // Fakultatives Schwa am Wortende vor Vokal entfällt; am Gruppenende bleibt es fakultativ.
  return { text: normalized, words };
}

/** Lautschrift zur Anzeige (Standard-IPA, Wörter durch Leerzeichen, Liaison mit ‿). */
export function ipaString(t: Transcription, opts: { showOptional?: boolean } = {}): string {
  let out = '';
  t.words.forEach((w, i) => {
    let s = '';
    for (const p of w.phones) {
      if (p.hidden && !opts.showOptional) continue;
      if (p.liaison) s += p.liaison === 'optional' ? `(${p.ipa})` : `${p.ipa}‿`;
      else s += p.ipa;
    }
    out += s;
    const joined = w.tight || s.endsWith('‿') || /['’]$/.test(w.orth);
    if (i < t.words.length - 1 && !joined) out += ' ';
  });
  return out;
}

/** Zielphone als flache Liste mit Wortindex (Eingabe für die Bewertung). */
export interface TargetPhone extends Phone {
  wordIndex: number;
}

export function targetPhones(t: Transcription): TargetPhone[] {
  const out: TargetPhone[] = [];
  t.words.forEach((w, wi) => {
    for (const p of w.phones) out.push({ ...p, wordIndex: wi });
  });
  return out;
}

/** Bequeme Kurzform: Lautschrift eines Textes. */
export function toIpa(text: string): string {
  return ipaString(transcribe(text));
}
