/**
 * Abtastratenwandlung mit gefensterter Sinc-Interpolation (Blackman-Fenster)
 * sowie Dekodieren von Audiodateien zu Float32-PCM.
 *
 * Läuft ohne OfflineAudioContext, also auch in Node und Web Workern.
 * Zielanwendung: Sprache auf 16 kHz für das ASR-Modell bringen.
 */
import { getAudioContextCtor } from './audioContext';
import { decodeWav, isWav } from './wav';

export interface DecodedAudio {
  pcm: Float32Array;
  sampleRate: number;
  durationMs: number;
}

/** Nulldurchgänge des Sinc-Kerns je Seite – bestimmt Qualität und Rechenaufwand. */
const ZERO_CROSSINGS = 16;
/** Stützstellen der Kerntabelle je Nulldurchgang (dazwischen wird linear interpoliert). */
const TABLE_RES = 512;

let kernelTable: Float32Array | null = null;

/** Tabelle des gefensterten Sinc für x ∈ [0, ZERO_CROSSINGS]. */
function kernel(): Float32Array {
  if (kernelTable) return kernelTable;
  const len = ZERO_CROSSINGS * TABLE_RES + 1;
  const table = new Float32Array(len);
  for (let k = 0; k < len; k++) {
    const x = k / TABLE_RES;
    const u = x / ZERO_CROSSINGS; // 0..1
    const window = 0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u);
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    table[k] = sinc * window;
  }
  kernelTable = table;
  return table;
}

/**
 * Wandelt PCM von `fromRate` nach `toRate`. Beim Herunterrechnen wird der Kern
 * gestreckt, so dass er zugleich als Tiefpass (Anti-Aliasing) wirkt.
 * Liefert immer ein neues Array.
 */
export function resampleTo(pcm: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!(fromRate > 0) || !(toRate > 0)) throw new Error('Abtastraten müssen > 0 sein');
  if (fromRate === toRate) return new Float32Array(pcm);
  const n = pcm.length;
  const outLen = Math.round((n * toRate) / fromRate);
  const out = new Float32Array(outLen);
  if (n === 0 || outLen === 0) return out;

  const table = kernel();
  const tableLen = table.length;
  const ratio = fromRate / toRate; // Eingangssamples pro Ausgangssample
  const cutoff = ratio > 1 ? 1 / ratio : 1; // Grenzfrequenz relativ zur Eingangs-Nyquist
  const halfWidth = ZERO_CROSSINGS / cutoff; // Kernbreite in Eingangssamples
  const tableScale = cutoff * TABLE_RES;

  for (let i = 0; i < outLen; i++) {
    const t = i * ratio;
    let jStart = Math.ceil(t - halfWidth);
    let jEnd = Math.floor(t + halfWidth);
    if (jStart < 0) jStart = 0;
    if (jEnd > n - 1) jEnd = n - 1;

    let acc = 0;
    let weight = 0;
    for (let j = jStart; j <= jEnd; j++) {
      const pos = Math.abs(j - t) * tableScale;
      const idx = pos | 0;
      if (idx >= tableLen - 1) continue;
      const frac = pos - idx;
      const w = table[idx]! + (table[idx + 1]! - table[idx]!) * frac;
      acc += pcm[j]! * w;
      weight += w;
    }
    // Normierung auf die Gewichtssumme: Verstärkung exakt 1, auch an den Rändern
    out[i] = weight > 1e-9 ? acc / weight : 0;
  }
  return out;
}

/** Mischt alle Kanäle eines AudioBuffers auf mono. */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const first = buffer.getChannelData(0);
  if (channels === 1) return new Float32Array(first);
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i]! += data[i]!;
  }
  const scale = 1 / channels;
  for (let i = 0; i < out.length; i++) out[i]! *= scale;
  return out;
}

let decodeCtx: BaseAudioContext | null = null;

/**
 * Gemeinsamer Kontext fürs Dekodieren. Safari erlaubt nur wenige AudioContexts
 * gleichzeitig, daher wird er wiederverwendet. decodeAudioData funktioniert auch,
 * wenn der Kontext "suspended" ist (keine Nutzergeste nötig).
 */
function getDecodeContext(): BaseAudioContext | null {
  if (decodeCtx) return decodeCtx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    decodeCtx = new Ctor();
  } catch {
    return null;
  }
  return decodeCtx;
}

function decodeWithWebAudio(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Callback-Form: funktioniert auch in älteren Safari-Versionen ohne Promise-Rückgabe
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = ctx.decodeAudioData(data, resolve, (err) => reject(err ?? new Error('decodeAudioData fehlgeschlagen')));
      if (maybePromise && typeof (maybePromise as Promise<AudioBuffer>).catch === 'function') {
        (maybePromise as Promise<AudioBuffer>).catch(() => undefined); // Fehler kommt über den Callback
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Dekodiert eine Audiodatei (mp3, m4a, ogg, wav …) zu mono Float32-PCM.
 * Ohne Web Audio (Node/Tests) werden nur WAV-Dateien manuell gelesen.
 */
export async function decodeAudioFile(blob: Blob): Promise<DecodedAudio> {
  const data = await blob.arrayBuffer();
  const ctx = getDecodeContext();
  if (ctx) {
    try {
      // Kopie übergeben – decodeAudioData "detached" den Buffer in manchen Browsern
      const buffer = await decodeWithWebAudio(ctx, data.slice(0));
      const pcm = mixToMono(buffer);
      return { pcm, sampleRate: buffer.sampleRate, durationMs: (pcm.length / buffer.sampleRate) * 1000 };
    } catch (err) {
      if (!isWav(data)) {
        throw new Error('Audiodatei konnte nicht dekodiert werden', { cause: err });
      }
      // WAV-Dateien zur Not manuell lesen
    }
  }
  if (!isWav(data)) {
    throw new Error('Audioformat wird in dieser Umgebung nicht unterstützt (nur WAV ohne Web Audio)');
  }
  const { pcm, sampleRate } = decodeWav(data);
  return { pcm, sampleRate, durationMs: (pcm.length / sampleRate) * 1000 };
}
