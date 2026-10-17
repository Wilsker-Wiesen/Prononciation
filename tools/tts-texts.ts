#!/usr/bin/env node
/**
 * Sammelt alle eigenen Texte der App, die eine Vorbild-Aufnahme brauchen
 * (keine Verlagsinhalte), und schreibt sie als JSON [{ key, text }].
 *
 *   npx tsx tools/tts-texts.ts out/texts.json [--sample]
 *
 * --sample: kleine, repräsentative Auswahl für den Stimmenvergleich.
 */
import { writeFileSync } from 'node:fs';
import { conjugationPack } from '../src/content/conjugation.ts';
import { demoPack } from '../src/content/demo.ts';
import { PHENOMENA } from '../src/phon/phenomena.ts';
import { normalizeTtsText, ttsKey } from '../src/audio/ttsKey.ts';

const out = process.argv[2] ?? 'texts.json';
const sample = process.argv.includes('--sample');

const texts = new Map<string, string>();
const add = (t: string): void => {
  const n = normalizeTtsText(t);
  if (n) texts.set(ttsKey(n), n);
};

if (sample) {
  [
    'bonjour', 'un ami, une amie', 'J’habite à Münster.', 'Comment tu t’appelles ?',
    'Le matin, nous allons au collège à vélo.', 'Les cours finissent à cinq heures.',
    'il prend', 'ils prennent', 'elle finit', 'elles finissent', 'il parle', 'ils parlent',
    'vous parlez', 'nous parlons', 'vous êtes', 'ils ont', 'ils sont', 'nous avons', 'vous faites', 'ils font',
    'il peut', 'ils peuvent', 'elle vend', 'elles vendent', 'tu es', 'tout', 'tu', 'vin', 'vent', 'vont',
    'le pain', 'un', 'deux', 'six', 'dix', 'les enfants', 'grand', 'grande', 'le jus', 'le journal',
    'Et toi, tu habites où ?', 'Nous sommes dans la même classe.',
  ].forEach(add);
} else {
  for (const pack of [conjugationPack(), demoPack()]) {
    for (const l of pack.lessons) {
      for (const v of l.vocab) add(v.fr);
      for (const t of l.texts) for (const s of t.sentences) add(s.fr);
    }
  }
  for (const p of PHENOMENA) {
    for (const e of p.examples) add(e.fr);
    for (const pr of p.pairs) { add(pr.a); add(pr.b); }
  }
}

const rows = [...texts].map(([key, text]) => ({ key, text }));
writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`${rows.length} Texte → ${out}`);
