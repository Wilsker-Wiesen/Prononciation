/**
 * Massenimport: Ordner mit Audiodateien und einer Wortliste → Lektion(en).
 *
 * Wortliste (CSV/TSV/TXT), eine Zeile je Eintrag:
 *   französisch<Tab>deutsch[<Tab>Lektion][<Tab>Audiodateiname][<Tab>Lautschrift]
 * „deutsch“ darf leer sein (z. B. Sätze aus Lektionstexten). Die Lautschrift (Spalte 5)
 * wird nur angezeigt, bewertet wird mit der automatischen Transkription.
 * Trennzeichen: Tab, Semikolon, „ – “ oder „ - “. Eine Kopfzeile wird erkannt.
 * Audiodateien werden über den normalisierten Dateinamen (ohne Artikel,
 * Akzente, Sonderzeichen) den Einträgen zugeordnet; alternativ über die
 * vierte Spalte.
 */
import { newId, type AudioAsset, type Lesson, type VocabEntry } from '../types/content';
import { normalizeForMatch, stripExt } from './pack';

export interface ParsedRow {
  fr: string;
  de: string;
  lesson?: string;
  audio?: string;
  /** Lautschrift aus der Quelle, ohne [ ] bzw. / / */
  ipa?: string;
}

const AUDIO_RE = /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|flac)$/i;
const LIST_RE = /\.(csv|tsv|txt)$/i;

export function parseWordList(text: string): ParsedRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const parts = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : line.split(/\s[–-]\s/);
    const cols = parts.map((c) => c.trim().replace(/^"|"$/g, ''));
    const [fr = '', de = '', lesson, audio, ipa] = cols;
    if (!fr) continue;
    const ipaClean = ipa?.replace(/^[[/]|[\]/]$/g, '').trim();
    rows.push({ fr, de, lesson: lesson || undefined, audio: audio || undefined, ipa: ipaClean || undefined });
  }
  // Kopfzeile erkennen
  const first = rows[0];
  if (first && /^(fr|franz|französisch|mot|français)/i.test(first.fr) && /^(de|deutsch|bedeutung)/i.test(first.de)) rows.shift();
  return rows;
}

export interface BulkPlan {
  lessons: { title: string; entries: { row: ParsedRow; file?: File }[] }[];
  unmatchedAudio: File[];
  unmatchedRows: ParsedRow[];
  audioFiles: File[];
}

/** Dateien eines Ordners analysieren und Zuordnung planen (noch ohne Speicherung). */
export async function planBulkImport(files: File[], opts: { defaultLessonTitle?: string } = {}): Promise<BulkPlan> {
  const audio = files.filter((f) => AUDIO_RE.test(f.name));
  const lists = files.filter((f) => LIST_RE.test(f.name));
  const rows: ParsedRow[] = [];
  for (const l of lists) rows.push(...parseWordList(await l.text()));
  const byName = new Map<string, File>();
  const byExact = new Map<string, File>();
  for (const f of audio) {
    byName.set(normalizeForMatch(stripExt(f.name)), f);
    byExact.set(f.name.toLowerCase(), f);
    byExact.set(stripExt(f.name).toLowerCase(), f);
  }
  const used = new Set<File>();
  const lessonsMap = new Map<string, { row: ParsedRow; file?: File }[]>();
  const unmatchedRows: ParsedRow[] = [];
  for (const row of rows) {
    let file: File | undefined;
    if (row.audio) file = byExact.get(row.audio.toLowerCase()) ?? byExact.get(stripExt(row.audio).toLowerCase());
    if (!file) file = byName.get(normalizeForMatch(row.fr));
    if (!file) {
      // Kurzform ohne Artikel oder nur erstes Wort
      const key = normalizeForMatch(row.fr);
      file = byName.get(key.split(' ')[0] ?? '') ?? [...byName.entries()].find(([k]) => k === key.replace(/\s+/g, ''))?.[1];
    }
    if (file) used.add(file);
    else unmatchedRows.push(row);
    const title = row.lesson ?? opts.defaultLessonTitle ?? 'Import';
    if (!lessonsMap.has(title)) lessonsMap.set(title, []);
    lessonsMap.get(title)!.push({ row, file });
  }
  // Audiodateien ohne Listeneintrag: eigene Einträge nur mit Dateinamen (zum Nachbearbeiten)
  const unmatchedAudio = audio.filter((f) => !used.has(f));
  return {
    lessons: [...lessonsMap.entries()].map(([title, entries]) => ({ title, entries })),
    unmatchedAudio,
    unmatchedRows,
    audioFiles: audio,
  };
}

/**
 * Lektionstitel der Form „D1 Unité 3 – Vokabeln“ in Einheit („D1 Unité 3“) und Teil („Vokabeln“) zerlegen.
 * Ohne Gedankenstrich ist der ganze Titel die Einheit.
 */
export function splitLessonTitle(title: string): { unit: string; part: string } {
  const i = title.indexOf(' – ');
  return i > 0 ? { unit: title.slice(0, i).trim(), part: title.slice(i + 3).trim() } : { unit: title.trim(), part: title.trim() };
}

/**
 * Plan nach Einheit (z. B. Unité) aufteilen: je Einheit ein eigenes Paket. So bleiben die Pakete
 * klein genug für Export und Import auf Tablets. Reihenfolge = erstes Auftreten in der Liste (Buchreihenfolge).
 */
export function groupPlanByUnit(plan: BulkPlan): { unit: string; plan: BulkPlan }[] {
  const groups = new Map<string, BulkPlan['lessons']>();
  for (const l of plan.lessons) {
    const { unit, part } = splitLessonTitle(l.title);
    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit)!.push({ title: part, entries: l.entries });
  }
  return [...groups.entries()].map(([unit, lessons]) => ({
    unit,
    plan: { lessons, unmatchedAudio: [], unmatchedRows: [], audioFiles: lessons.flatMap((l) => l.entries.flatMap((e) => (e.file ? [e.file] : []))) },
  }));
}

/** Plan in Lektionen und Audio-Assets umsetzen (Assets werden vom Aufrufer gespeichert). */
export function materialize(plan: BulkPlan, packId: string, opts: { includeUnmatchedAudio?: boolean } = {}): { lessons: Lesson[]; assets: AudioAsset[] } {
  const assets: AudioAsset[] = [];
  const assetFor = new Map<File, string>();
  const ensureAsset = (f: File): string => {
    let id = assetFor.get(f);
    if (!id) {
      id = newId('a');
      assetFor.set(f, id);
      assets.push({ id, packId, mime: f.type || 'audio/mpeg', blob: f, fileName: f.name });
    }
    return id;
  };
  const lessons: Lesson[] = plan.lessons.map((l) => ({
    id: newId('les'),
    title: l.title,
    sections: [],
    vocab: l.entries.map(({ row, file }): VocabEntry => ({ id: newId('v'), fr: row.fr, de: row.de, ipaRef: row.ipa, audioId: file ? ensureAsset(file) : undefined })),
    texts: [],
  }));
  if (opts.includeUnmatchedAudio && plan.unmatchedAudio.length) {
    const extra: Lesson = {
      id: newId('les'),
      title: 'Nicht zugeordnete Aufnahmen',
      sections: [],
      vocab: plan.unmatchedAudio.map((f): VocabEntry => ({ id: newId('v'), fr: stripExt(f.name).replace(/[_-]+/g, ' '), de: '', audioId: ensureAsset(f) })),
      texts: [],
    };
    lessons.push(extra);
  }
  return { lessons, assets };
}
