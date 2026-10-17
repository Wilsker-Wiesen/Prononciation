/**
 * Lädt das ONNX-Modell und das Vokabular, legt beides in der Cache-API ab und
 * meldet den Fortschritt. Läuft im Worker oder im Hauptthread.
 *
 * Modell: onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX (Phonemerkennung,
 * Ausgabe im eSpeak-IPA-Zeichensatz, 392 Tokens). Quantisiert ≈ 300 MB.
 */

export interface ModelSource {
  /** Basis-URL, endet mit „/“ */
  baseUrl: string;
  /** Pfad der ONNX-Datei relativ zur Basis */
  modelFile: string;
  /** Vokabular (vocab.json oder tokenizer.json), relativ zur Basis oder absolut */
  vocabFile: string;
}

export function resolveUrl(base: string, file: string): string {
  if (/^https?:\/\//.test(file) || file.startsWith('/')) return file;
  return base + file;
}

export type ProgressFn = (info: { file: string; loaded: number; total: number }) => void;

const CACHE_NAME = 'prononciation-models-v1';

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** Datei mit Fortschrittsmeldung laden; Ergebnis wird in der Cache-API abgelegt. */
/** In der nativen App liegen gebündelte Modelle schon im App-Paket: nicht ein zweites Mal speichern. */
function isBundledInNativeApp(url: string): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.() || typeof location === 'undefined') return false;
  return new URL(url, location.href).origin === location.origin;
}

export async function fetchCached(url: string, onProgress?: ProgressFn, label = url): Promise<ArrayBuffer> {
  const cache = isBundledInNativeApp(url) ? null : await openCache();
  if (cache) {
    const hit = await cache.match(url);
    if (hit) {
      const buf = await hit.arrayBuffer();
      onProgress?.({ file: label, loaded: buf.byteLength, total: buf.byteLength });
      return buf;
    }
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${url} (${res.status})`);
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.({ file: label, loaded, total });
  }
  const buf = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  if (cache) {
    try {
      await cache.put(url, new Response(buf, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(loaded) } }));
    } catch {
      // Speicher voll o. ä. – ohne Cache weiterarbeiten
    }
  }
  return buf.buffer;
}

export async function isModelCached(src: ModelSource): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  return !!(await cache.match(src.baseUrl + src.modelFile));
}

export async function deleteModelCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(CACHE_NAME);
}

/** Vokabular aus tokenizer.json (bevorzugt, selbst gehostet) oder vocab.json lesen. */
export function parseVocab(json: unknown): string[] {
  const obj = json as { model?: { vocab?: Record<string, number> } } & Record<string, number>;
  const map: Record<string, number> = obj?.model?.vocab ?? (obj as Record<string, number>);
  const entries = Object.entries(map).filter(([, v]) => typeof v === 'number');
  if (!entries.length) throw new Error('Vokabular leer oder unbekanntes Format');
  const size = Math.max(...entries.map(([, v]) => v)) + 1;
  const vocab = new Array<string>(size).fill('');
  for (const [k, v] of entries) vocab[v] = k;
  return vocab;
}
