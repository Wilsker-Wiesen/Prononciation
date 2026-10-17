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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [listFile = 'tools/fixtures/validation-words.txt', outDir = 'out/real-audio', maxStr = '80'] = process.argv.slice(2);
const max = Number(maxStr);
mkdirSync(outDir, { recursive: true });
const UA = 'Prononciation-Validation/0.1 (https://github.com/Wilsker-Wiesen/Prononciation)';
const words = readFileSync(listFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

const HEADERS = { 'User-Agent': UA, 'Api-User-Agent': UA, Accept: '*/*' };

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function looksLikeAudio(buf) {
  const head = buf.subarray(0, 4).toString('latin1');
  return head === 'RIFF' || head === 'OggS' || head.startsWith('ID3') || head === 'fLaC' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
}

/** Datei laden; bei Nicht-Audio die transkodierte MP3-Fassung versuchen. */
async function downloadAudio(url) {
  const tryUrl = async (u) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(u, { headers: HEADERS, redirect: 'follow' });
      const buf = Buffer.from(await res.arrayBuffer());
      if (res.status === 429) {
        // Drosselung: warten und erneut versuchen
        await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
        continue;
      }
      if (!res.ok || !looksLikeAudio(buf)) {
        console.log(`  ! ${res.status} ${res.headers.get('content-type')} ${u} → ${buf.subarray(0, 60).toString('utf8').replace(/\s+/g, ' ')}`);
        return null;
      }
      return buf;
    }
    console.log(`  ! wiederholt gedrosselt (429): ${u}`);
    return null;
  };
  const direct = await tryUrl(url);
  if (direct) return { buf: direct, ext: url.split('.').pop() };
  const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+)$/.exec(url);
  if (m) {
    const name = url.split('/').pop();
    const mp3 = await tryUrl(`${m[1]}/transcoded/${m[2]}/${name}.mp3`);
    if (mp3) return { buf: mp3, ext: 'mp3' };
  }
  return null;
}

let found = 0;
const credits = [];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const word of words) {
  if (found >= max) break;
  await pause(1500); // Wikimedia bittet um moderate Abfrageraten
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
    const dl = await downloadAudio(url);
    if (!dl) { console.log(`– ${word}: Download lieferte kein Audio`); continue; }
    const raw = join(outDir, `${word}.src.${dl.ext}`);
    writeFileSync(raw, dl.buf);
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', join(outDir, `${word}.wav`)]);
    } catch {
      if (dl.ext !== 'wav') { console.log(`– ${word}: ffmpeg fehlt, ${dl.ext} nicht nutzbar`); continue; }
      // ohne ffmpeg: WAV unverändert übernehmen (der Prüfstand resampelt selbst)
      writeFileSync(join(outDir, `${word}.wav`), dl.buf);
    }
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
