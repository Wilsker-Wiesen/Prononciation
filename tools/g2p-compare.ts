/**
 * Vergleicht das eigene G2P-Modul mit der eSpeak-Referenz (tools/fixtures/espeak-reference.json).
 * Vergleich im Modell-Zeichensatz, fakultative Phone (Schwa, Gleitlaut, optionale Liaison)
 * werden beidseitig toleriert. Aufruf: npx tsx tools/g2p-compare.ts [--all]
 */
import { readFileSync } from 'node:fs';
import { transcribe } from '../src/phon/g2p';
import { toModelSpace } from '../src/phon/ipa';

const ref = JSON.parse(readFileSync('tools/fixtures/espeak-reference.json', 'utf8')) as Record<string, { raw: string; words: string[][] }>;
const showAll = process.argv.includes('--all');

function flatten(words: string[][]): string[] {
  return words.flat().filter((p) => p !== '' && !/^[ɪɒʊɹɜ]/.test(p));
}

/** Kleinstmöglicher Abstand unter Berücksichtigung fakultativer Phone. */
function distance(target: { ipa: string; optional?: boolean }[], ref: string[]): number {
  const n = target.length, m = ref.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i]![0] = dp[i - 1]![0]! + (target[i - 1]!.optional ? 0 : 1);
  for (let j = 1; j <= m; j++) dp[0]![j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const t = target[i - 1]!;
      const sub = dp[i - 1]![j - 1]! + (t.ipa === ref[j - 1] ? 0 : 1);
      const del = dp[i - 1]![j]! + (t.optional ? 0 : 1);
      const ins = dp[i]![j - 1]! + (ref[j - 1] === 'ə' ? 0 : 1);
      dp[i]![j] = Math.min(sub, del, ins);
    }
  }
  return dp[n]![m]!;
}

let ok = 0, total = 0;
const bad: string[] = [];
for (const [text, r] of Object.entries(ref)) {
  if (/\(en\)/.test(r.raw)) continue; // Sprachwechsel in eSpeak: nicht vergleichbar
  total++;
  const t = transcribe(text);
  const phones = t.words.flatMap((w) => w.phones);
  const target = toModelSpace(phones);
  const refPhones = flatten(r.words);
  const d = distance(target, refPhones);
  if (d === 0) ok++;
  else bad.push(`${text}\n   g2p:    ${target.map((p) => (p.optional ? `(${p.ipa})` : p.ipa)).join(' ')}\n   espeak: ${refPhones.join(' ')}`);
}
console.log(`Übereinstimmung: ${ok}/${total} (${((100 * ok) / total).toFixed(1)} %)`);
for (const b of showAll ? bad : bad.slice(0, 80)) console.log(b);
if (!showAll && bad.length > 80) console.log(`… und ${bad.length - 80} weitere (--all)`);
