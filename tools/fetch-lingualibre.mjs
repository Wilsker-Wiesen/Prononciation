#!/usr/bin/env node
/**
 * Lädt für eine Wortliste echte französische Wortaufnahmen aus Lingua Libre
 * (Wikimedia Commons, CC BY-SA 4.0) und wandelt sie mit ffmpeg in 16-kHz-WAV um.
 *
 *   node tools/fetch-lingualibre.mjs tools/fixtures/validation-words.txt out/real-audio [max]
 *
 * Dateiname = Wort (für tools/validate-model.mjs --audio-dir). Nur Einzelwörter
 * ohne Leerzeichen werden gesucht; Treffer sind nicht garantiert.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [listFile = 'tools/fixtures/validation-words.txt', outDir = 'out/real-audio', maxStr = '80'] = process.argv.slice(2);
const max = Number(maxStr);
mkdirSync(outDir, { recursive: true });
const UA = 'Prononciation-Validation/0.1 (https://github.com/Wilsker-Wiesen/Prononciation)';
const words = readFileSync(listFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

let found = 0;
const credits = [];
for (const word of words) {
  if (found >= max) break;
  const bare = word.replace(/^(le|la|les|l'|un|une|des)\s+/i, '');
  if (/\s/.test(bare)) continue;
  try {
    const search = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '10', srsearch: `intitle:"LL-Q150 (fra)" intitle:"${bare}.wav"` });
    const hits = (search.query?.search ?? []).filter((h) => new RegExp(`^File:LL-Q150 \\(fra\\)-[^-]+-${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.wav$`, 'i').test(h.title));
    if (!hits.length) { console.log(`– ${word}: keine Aufnahme`); continue; }
    const title = hits[0].title;
    const info = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|user|extmetadata' });
    const page = Object.values(info.query.pages)[0];
    const url = page.imageinfo?.[0]?.url;
    if (!url) continue;
    const raw = join(outDir, `${word}.src.wav`);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', join(outDir, `${word}.wav`)]);
    credits.push(`${word}: ${title} (${page.imageinfo?.[0]?.user ?? '?'}, CC BY-SA 4.0, ${url})`);
    found++;
    console.log(`✓ ${word}: ${title}`);
  } catch (e) {
    console.log(`! ${word}: ${e instanceof Error ? e.message : e}`);
  }
}
writeFileSync(join(outDir, 'QUELLEN.txt'), credits.join('\n') + '\n');
console.log(`${found} Aufnahmen gespeichert in ${outDir}`);
if (found === 0) process.exit(1);
