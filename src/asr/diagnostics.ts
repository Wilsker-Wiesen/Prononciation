/**
 * Didaktische Diagnose typischer Aussprachefehler deutschsprachiger
 * Französischlernender aus dem Alignment. Liefert deutschsprachige Hinweise.
 */
import type { Transcription } from '../phon/g2p';
import type { Insertion, ScoreResult, WordResult } from './score';

export type FindingId =
  | 'silent-final'
  | 'ent-ending'
  | 'silent-e'
  | 'nasal'
  | 'u-ou'
  | 'r'
  | 'j-zh'
  | 'final-voicing'
  | 'h-aspire'
  | 'liaison-missing'
  | 'liaison-false'
  | 'glide-ui'
  | 'ch'
  | 'e-ouvert-ferme'
  | 'eu'
  | 'missing-sound';

export interface Finding {
  id: FindingId;
  /** 0 = Hinweis, 1 = wichtig, 2 = zentral */
  severity: 0 | 1 | 2;
  wordIndex: number;
  word: string;
  title: string;
  message: string;
  tip: string;
  target?: string;
  heard?: string;
}

const TEXT: Record<FindingId, { title: string; tip: string }> = {
  'silent-final': {
    title: 'Stummer Endkonsonant',
    tip: 'Im Französischen sind -s, -t, -d, -x, -z und oft -p am Wortende stumm: „petit“ klingt wie „peti“.',
  },
  'ent-ending': {
    title: 'Verbendung -ent ist stumm',
    tip: 'Bei „ils chantent“ wird -ent nicht gesprochen: „chantent“ klingt genau wie „chante“.',
  },
  'silent-e': {
    title: 'Stummes e am Wortende',
    tip: 'Ein -e am Wortende wird nicht gesprochen: „classe“ endet auf [s], „petite“ auf [t].',
  },
  nasal: {
    title: 'Nasalvokal',
    tip: 'Bei an/en, in, on, un klingt kein [n] oder [m]: Der Vokal selbst wird „durch die Nase“ gesprochen. Übe „bon“ – „bonne“ im Kontrast.',
  },
  'u-ou': {
    title: 'u [y] und ou [u] unterscheiden',
    tip: 'Französisches „u“ klingt wie deutsches „ü“ (tu = „tü“). Nur „ou“ klingt wie deutsches „u“ (tout).',
  },
  r: {
    title: 'Französisches r',
    tip: 'Das r wird hinten im Rachen gesprochen, ähnlich wie ein leichtes Gurgeln – nicht gerollt und nicht wie im Englischen.',
  },
  'j-zh': {
    title: 'j und g wie in „journal“',
    tip: 'Französisches j ist ein weiches „sch“ mit Stimme [ʒ], wie das g in „Garage“. Kein deutsches j wie in „ja“.',
  },
  'final-voicing': {
    title: 'Stimmhafter Konsonant am Wortende',
    tip: 'Anders als im Deutschen bleiben b, d, g, v, z und [ʒ] am Wortende stimmhaft: „rouge“ endet auf [ʒ], nicht auf „sch“.',
  },
  'h-aspire': {
    title: 'h ist stumm',
    tip: 'Das h wird im Französischen nie gesprochen: „habiter“ beginnt mit dem Vokal [a].',
  },
  'liaison-missing': {
    title: 'Liaison fehlt',
    tip: 'Vor einem Vokal wird der stumme Endkonsonant hörbar und an das nächste Wort gebunden: „les amis“ = „le-z-ami“.',
  },
  'liaison-false': {
    title: 'Keine Liaison an dieser Stelle',
    tip: 'Nach „et“, vor h aspiré und nach Nomen im Singular wird nicht gebunden.',
  },
  'glide-ui': {
    title: 'ui wie in „huit“',
    tip: 'Die Lautfolge „ui“ beginnt mit einem gerundeten „ü“-Gleitlaut: „huit“ ≈ „üit“, nicht „wit“.',
  },
  ch: {
    title: 'ch wie „sch“',
    tip: 'Französisches „ch“ klingt immer wie deutsches „sch“: „chat“ = „scha“.',
  },
  'e-ouvert-ferme': {
    title: 'Offenes und geschlossenes e',
    tip: '„é“ ist geschlossen wie in „See“ [e], „è/ê“ offen wie in „Bett“ [ɛ].',
  },
  eu: {
    title: 'eu-Laut',
    tip: '„eu“ klingt wie deutsches „ö“: „deux“ ≈ „dö“, „peur“ ≈ „pör“.',
  },
  'missing-sound': {
    title: 'Laut nicht gehört',
    tip: 'Sprich das Wort noch einmal deutlich und etwas langsamer – jeder Laut sollte hörbar sein.',
  },
};

const VOICED_TO_VOICELESS: Record<string, string> = { b: 'p', d: 't', ɡ: 'k', v: 'f', z: 's', ʒ: 'ʃ' };

function mk(id: FindingId, severity: 0 | 1 | 2, wordIndex: number, word: string, message: string, target?: string, heard?: string): Finding {
  const t = TEXT[id];
  return { id, severity, wordIndex, word, title: t.title, message, tip: t.tip, target, heard };
}

/**
 * Leitet aus Wortbewertungen und Einfügungen didaktische Hinweise ab.
 * Pro Fehlertyp wird höchstens ein Hinweis (mit dem ersten betroffenen Wort) ausgegeben.
 */
export function diagnose(t: Transcription, result: ScoreResult): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<FindingId>();
  const add = (f: Finding) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    findings.push(f);
  };

  result.words.forEach((w, wi) => {
    const pw = t.words[wi]!;
    const lastIdx = w.phones.length - 1;
    const insAfterWord = result.insertions.filter((ins) => ins.afterWord === wi && isLastPhoneOfWord(ins, result, wi));

    // Stumme Endbuchstaben gesprochen
    if (pw.silentFinal) {
      const letters = pw.silentFinal;
      for (const ins of insAfterWord) {
        if (matchesSilentLetter(ins.ipa, letters)) {
          add(mk('silent-final', 2, wi, w.orth, `In „${w.orth}“ wurde das stumme „${letters}“ gesprochen ([${ins.ipa}] gehört).`, '', ins.ipa));
          break;
        }
      }
    }
    // Verbendung -ent
    if (/ent$/i.test(pw.lower) && !/[ɑ̃]$/.test(pw.phones.map((p) => p.ipa).join(''))) {
      for (const ins of insAfterWord) {
        if (['ɑ̃', 'ɛ̃', 'n', 't', 'ɛ', 'ə'].includes(ins.ipa) || ins.ipa === 'ɑ̃') {
          add(mk('ent-ending', 2, wi, w.orth, `Die Endung -ent in „${w.orth}“ ist stumm; gehört wurde [${ins.ipa}].`, '', ins.ipa));
          break;
        }
      }
    }
    // Stummes e gesprochen (Einfügung von ə/e/ɛ nach Wortende bei orthographischem -e)
    if (/e$/i.test(pw.lower) && lastIdx >= 0 && !pw.phones[lastIdx]!.optional && pw.lower.length > 2) {
      const ins = insAfterWord.find((x) => ['ə', 'e', 'ɛ', 'ɐ'].includes(x.ipa));
      if (ins) add(mk('silent-e', 1, wi, w.orth, `Das -e am Ende von „${w.orth}“ wird nicht gesprochen (gehört: [${ins.ipa}]).`, '', ins.ipa));
    }
    // h gesprochen
    if (/^h/i.test(pw.lower)) {
      const insBefore = result.insertions.find((ins) => ins.afterWord === wi - 1 && ins.ipa === 'h');
      const insStart = wi === 0 && result.insertions.find((ins) => ins.afterWord === -1 && ins.ipa === 'h');
      if (insBefore || insStart) add(mk('h-aspire', 1, wi, w.orth, `In „${w.orth}“ wurde ein [h] gesprochen.`, '', 'h'));
    }

    w.phones.forEach((p, pi) => {
      const heard = p.heard;
      const next = w.phones[pi + 1];
      const insAfterPhone = result.insertions.filter((ins) => ins.afterTarget === flatIndex(result, wi, pi));
      // Liaison
      if (p.liaison === 'obligatory' && p.status === 'missing') {
        add(mk('liaison-missing', 2, wi, w.orth, `Zwischen „${w.orth}“ und dem nächsten Wort fehlt die Liaison [${p.ipa}].`, p.ipa));
        return;
      }
      if (p.status === 'ok' || p.status === 'skipped') {
        // falsche Liaison: Einfügung von z/t/n am Wortende vor vokalischem Folgewort ohne Liaison-Ziel
        if (pi === lastIdx && !p.liaison && insAfterPhone.some((i) => ['z', 't', 'n', 's'].includes(i.ipa)) && nextWordStartsWithVowel(t, wi)) {
          const ins = insAfterPhone.find((i) => ['z', 't', 'n', 's'].includes(i.ipa))!;
          if (!pw.silentFinal || !matchesSilentLetter(ins.ipa, pw.silentFinal)) {
            add(mk('liaison-false', 1, wi, w.orth, `Nach „${w.orth}“ wurde [${ins.ipa}] gebunden, hier gibt es aber keine Liaison.`, '', ins.ipa));
          }
        }
        return;
      }
      // Nasalvokal durch Vokal + n/m ersetzt oder entnasaliert
      if (p.tag === 'nasal') {
        const oralFollowedByNasalC = insAfterPhone.some((i) => ['n', 'm', 'ŋ'].includes(i.ipa)) || (next && next.heard && ['n', 'm'].includes(next.heard) && !['n', 'm'].includes(next.ipa));
        if (p.status === 'sub' || p.status === 'missing' || oralFollowedByNasalC) {
          add(mk('nasal', 2, wi, w.orth, `In „${w.orth}“ wurde der Nasalvokal [${p.ipa}] als „${heard ?? '–'}${oralFollowedByNasalC ? ' + n' : ''}“ gesprochen.`, p.ipa, heard));
          return;
        }
      }
      if (p.status !== 'sub' || !heard) {
        if (p.status === 'missing' && !p.optional) add(mk('missing-sound', 0, wi, w.orth, `In „${w.orth}“ wurde [${p.ipa}] nicht gehört.`, p.ipa));
        return;
      }
      // u/ou
      if ((p.ipa === 'y' && ['u', 'ʊ', 'o'].includes(heard)) || (p.ipa === 'u' && ['y', 'ʏ', 'ø'].includes(heard))) {
        add(mk('u-ou', 2, wi, w.orth, `In „${w.orth}“: [${p.ipa}] erwartet, [${heard}] gehört.`, p.ipa, heard));
        return;
      }
      if (p.ipa === 'ɥ' && ['w', 'v'].includes(heard)) {
        add(mk('glide-ui', 1, wi, w.orth, `In „${w.orth}“: „ui“ wurde wie [w] gesprochen.`, p.ipa, heard));
        return;
      }
      if (p.ipa === 'ʁ' && ['r', 'ɹ', 'ɾ', 'ɐ', 'l'].includes(heard)) {
        add(mk('r', 1, wi, w.orth, `In „${w.orth}“ klang das r wie [${heard}].`, p.ipa, heard));
        return;
      }
      if (pi === lastIdx && VOICED_TO_VOICELESS[p.ipa] === heard) {
        add(mk('final-voicing', 1, wi, w.orth, `„${w.orth}“ endet auf stimmhaftes [${p.ipa}], gehört wurde [${heard}].`, p.ipa, heard));
        return;
      }
      if (p.ipa === 'ʒ' && ['j', 'dʒ', 'ʃ', 'tʃ'].includes(heard)) {
        add(mk('j-zh', 2, wi, w.orth, `In „${w.orth}“: [ʒ] erwartet, [${heard}] gehört.`, p.ipa, heard));
        return;
      }
      if (p.ipa === 'ʃ' && ['ç', 'x', 'k', 'tʃ'].includes(heard)) {
        add(mk('ch', 1, wi, w.orth, `In „${w.orth}“: „ch“ wurde als [${heard}] gesprochen.`, p.ipa, heard));
        return;
      }
      if ((p.ipa === 'e' && heard === 'ɛ') || (p.ipa === 'ɛ' && heard === 'e')) {
        add(mk('e-ouvert-ferme', 0, wi, w.orth, `In „${w.orth}“: [${p.ipa}] erwartet, [${heard}] gehört.`, p.ipa, heard));
        return;
      }
      if ((p.ipa === 'ø' || p.ipa === 'œ') && ['o', 'ɔ', 'e', 'ɛ', 'u'].includes(heard)) {
        add(mk('eu', 1, wi, w.orth, `In „${w.orth}“: [${p.ipa}] erwartet, [${heard}] gehört.`, p.ipa, heard));
        return;
      }
    });
  });

  return findings.sort((a, b) => b.severity - a.severity);
}

function flatIndex(result: ScoreResult, wordIndex: number, phoneIndex: number): number {
  let idx = 0;
  for (let i = 0; i < wordIndex; i++) idx += result.words[i]!.phones.length;
  return idx + phoneIndex;
}

function isLastPhoneOfWord(ins: Insertion, result: ScoreResult, wi: number): boolean {
  const w: WordResult | undefined = result.words[wi];
  if (!w) return false;
  return ins.afterTarget === flatIndex(result, wi, w.phones.length - 1);
}

function matchesSilentLetter(ipa: string, letters: string): boolean {
  const l = letters.toLowerCase();
  if (/[sxz]/.test(l) && ['s', 'z'].includes(ipa)) return true;
  if (/[td]/.test(l) && ['t', 'd'].includes(ipa)) return true;
  if (/p/.test(l) && ipa === 'p') return true;
  if (/g/.test(l) && ['ɡ', 'k'].includes(ipa)) return true;
  if (/b/.test(l) && ['b', 'p'].includes(ipa)) return true;
  return false;
}

function nextWordStartsWithVowel(t: Transcription, wi: number): boolean {
  const next = t.words[wi + 1];
  if (!next || t.words[wi]!.boundaryAfter) return false;
  const first = next.phones[0];
  return !!first && /^[aeiouyøœəɛɔɑɛ̃ɑ̃ɔ̃œ̃]/.test(first.ipa);
}
