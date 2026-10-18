/**
 * Import und Export von Inhaltspaketen als ZIP-Datei.
 *
 * Aufbau eines Pakets:
 *   pack.json          – Metadaten, Lektionen, Vokabeln, Texte (ohne Audio-Binärdaten)
 *   audio/<id>.<ext>   – Audiodateien, referenziert über audioId
 *
 * Die App bringt keine Verlagsinhalte mit. Die Lehrkraft erstellt Pakete im
 * Editor und gibt sie an die Lerngruppe weiter (z. B. über die Schulplattform).
 */
import JSZip from 'jszip';
import { PACK_FORMAT_VERSION, newId, type AudioAsset, type Pack } from '../types/content';
import { absorbPacks, getAudio, listAudioForPack, putAudio, savePack } from '../storage/db';

const MIME_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
};
const EXT_MIME: Record<string, string> = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));
EXT_MIME['mp3'] = 'audio/mpeg';
EXT_MIME['wav'] = 'audio/wav';

export function mimeToExt(mime: string): string {
  return MIME_EXT[mime.split(';')[0]!.trim()] ?? 'bin';
}
export function extToMime(ext: string): string {
  return EXT_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

export interface ImportResult {
  pack: Pack;
  audioCount: number;
  warnings: string[];
}

/** Grundlegende Prüfung einer pack.json. */
export function validatePack(raw: unknown): { ok: true; pack: Pack } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'pack.json ist kein Objekt' };
  const p = raw as Partial<Pack>;
  if (typeof p.title !== 'string' || !p.title.trim()) return { ok: false, error: 'Titel fehlt' };
  if (!Array.isArray(p.lessons)) return { ok: false, error: 'Lektionen fehlen' };
  if (typeof p.formatVersion === 'number' && p.formatVersion > PACK_FORMAT_VERSION) {
    return { ok: false, error: `Paketformat ${p.formatVersion} ist neuer als diese App (${PACK_FORMAT_VERSION})` };
  }
  const now = new Date().toISOString();
  const pack: Pack = {
    id: typeof p.id === 'string' && p.id ? p.id : newId('pack'),
    title: p.title.trim(),
    source: p.source,
    level: p.level,
    author: p.author,
    rightsNote: p.rightsNote,
    sortKey: typeof p.sortKey === 'string' ? p.sortKey : undefined,
    replaces: Array.isArray(p.replaces) ? p.replaces.filter((x): x is string => typeof x === 'string') : undefined,
    formatVersion: PACK_FORMAT_VERSION,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
    lessons: p.lessons.map((l) => ({
      id: l.id ?? newId('les'),
      title: String(l.title ?? 'Lektion'),
      sections: l.sections ?? [],
      vocab: (l.vocab ?? []).map((v) => ({ ...v, id: v.id ?? newId('v'), fr: String(v.fr ?? ''), de: String(v.de ?? '') })),
      texts: (l.texts ?? []).map((t) => ({
        ...t,
        id: t.id ?? newId('t'),
        title: String(t.title ?? 'Text'),
        sentences: (t.sentences ?? []).map((s) => ({ ...s, id: s.id ?? newId('s'), fr: String(s.fr ?? '') })),
      })),
    })),
  };
  return { ok: true, pack };
}

/** Liest eine ZIP-Datei ein und speichert Paket und Audio lokal. */
export async function importPackZip(file: Blob, opts: { newId?: boolean } = {}): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file('pack.json');
  if (!entry) throw new Error('Die Datei enthält keine pack.json');
  const raw = JSON.parse(await entry.async('string')) as unknown;
  const v = validatePack(raw);
  if (!v.ok) throw new Error(v.error);
  const pack = v.pack;
  if (opts.newId) pack.id = newId('pack');
  const warnings: string[] = [];
  let audioCount = 0;
  const audioFiles = Object.keys(zip.files).filter((n) => n.startsWith('audio/') && !zip.files[n]!.dir);
  const referenced = new Set<string>();
  for (const l of pack.lessons) {
    for (const vEntry of l.vocab) {
      if (vEntry.audioId) referenced.add(vEntry.audioId);
      if (vEntry.exampleAudioId) referenced.add(vEntry.exampleAudioId);
    }
    for (const t of l.texts) {
      if (t.audioId) referenced.add(t.audioId);
      for (const s of t.sentences) if (s.audioId) referenced.add(s.audioId);
    }
  }
  for (const name of audioFiles) {
    const base = name.slice('audio/'.length);
    const dot = base.lastIndexOf('.');
    const id = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot + 1) : 'bin';
    const blob = await zip.files[name]!.async('blob');
    const asset: AudioAsset = { id, packId: pack.id, mime: extToMime(ext), blob: new Blob([blob], { type: extToMime(ext) }), fileName: base };
    await putAudio(asset);
    audioCount++;
    referenced.delete(id);
  }
  for (const missing of referenced) warnings.push(`Audio „${missing}“ wird referenziert, fehlt aber im Paket.`);
  await savePack(pack);
  if (pack.replaces?.length) {
    const n = await absorbPacks(pack.replaces, pack.id);
    if (n) warnings.push(`${n} frühere Einzelpakete ersetzt, Lernstand übernommen`);
  }
  return { pack, audioCount, warnings };
}

/** Erstellt eine ZIP-Datei aus einem gespeicherten Paket. */
export async function exportPackZip(pack: Pack): Promise<Blob> {
  const zip = new JSZip();
  const clean: Pack = { ...pack, formatVersion: PACK_FORMAT_VERSION };
  zip.file('pack.json', JSON.stringify(clean, null, 2));
  const assets = await listAudioForPack(pack.id);
  const folder = zip.folder('audio')!;
  for (const a of assets) {
    folder.file(`${a.id}.${mimeToExt(a.mime)}`, a.blob);
  }
  zip.file(
    'LIESMICH.txt',
    [
      `Prononciation – Inhaltspaket „${pack.title}“`,
      '',
      'Dieses Paket wurde mit der App „Prononciation“ erstellt.',
      'Import: App öffnen → Pakete → „Paket importieren“ → diese ZIP-Datei auswählen.',
      '',
      pack.rightsNote ? `Rechtehinweis: ${pack.rightsNote}` : 'Rechtehinweis: Die Audiodateien dürfen nur im Rahmen der geltenden Lizenz verwendet werden.',
    ].join('\n'),
  );
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/** Lädt ein Paket aus einer URL (z. B. Schulserver) und importiert es. */
export async function importPackFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status})`);
  const blob = await res.blob();
  return importPackZip(blob);
}

/** Audio-Blob eines Eintrags holen (undefined, wenn nicht vorhanden). */
export async function audioBlob(audioId: string | undefined): Promise<Blob | undefined> {
  if (!audioId) return undefined;
  const a = await getAudio(audioId);
  return a?.blob;
}

/** Dateinamen (ohne Endung) normalisieren, um Audio automatisch Vokabeln zuzuordnen. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(le|la|les|l|un|une|des|du|de)[ '’_-]+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function stripExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}
