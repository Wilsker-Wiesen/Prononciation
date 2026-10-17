/**
 * WAV (RIFF) schreiben und lesen – reines TypeScript ohne Browser-APIs,
 * damit es im Browser, in Node und in Tests gleichermaßen läuft.
 *
 * encodeWav: 16-Bit PCM, mono.
 * decodeWav: PCM 8/16/24/32 Bit und IEEE-Float 32/64 Bit, beliebige Kanalzahl
 *            (wird auf mono gemischt), auch WAVE_FORMAT_EXTENSIBLE.
 */

export interface DecodedWav {
  pcm: Float32Array;
  sampleRate: number;
}

const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;

/** Float32-PCM (-1..1) als 16-Bit-Mono-WAV. */
export function encodeWav(pcm: Float32Array, sampleRate: number): Blob {
  return new Blob([encodeWavBuffer(pcm, sampleRate)], { type: 'audio/wav' });
}

/** Wie encodeWav, liefert aber den rohen ArrayBuffer (z. B. zum Speichern in IndexedDB). */
export function encodeWavBuffer(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Länge des fmt-Chunks
  view.setUint16(20, FORMAT_PCM, true);
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Bytes pro Sekunde
  view.setUint16(32, 2, true); // Block-Align
  view.setUint16(34, 16, true); // Bits pro Sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    // symmetrisch mit 32768 skalieren und runden → Fehler ≤ ½ LSB, +1.0 wird auf 32767 begrenzt
    const s = Math.round(pcm[i]! * 32768);
    view.setInt16(offset, Math.max(-32768, Math.min(32767, s)), true);
  }
  return buffer;
}

/** Prüft nur den RIFF/WAVE-Header. */
export function isWav(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const view = new DataView(buffer);
  return readAscii(view, 0, 4) === 'RIFF' && readAscii(view, 8, 4) === 'WAVE';
}

/** Liest eine WAV-Datei und mischt alle Kanäle auf mono. */
export function decodeWav(buffer: ArrayBuffer): DecodedWav {
  if (!isWav(buffer)) throw new Error('Keine WAV-Datei (RIFF/WAVE-Header fehlt)');
  const view = new DataView(buffer);

  let formatTag = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  // Chunks durchlaufen; Reihenfolge ist nicht garantiert
  let pos = 12;
  while (pos + 8 <= view.byteLength) {
    const id = readAscii(view, pos, 4);
    const size = view.getUint32(pos + 4, true);
    const body = pos + 8;
    if (id === 'fmt ' && body + 16 <= view.byteLength) {
      formatTag = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
      if (formatTag === FORMAT_EXTENSIBLE && size >= 26 && body + 26 <= view.byteLength) {
        // Subformat-GUID: die ersten zwei Bytes enthalten das eigentliche Format
        formatTag = view.getUint16(body + 24, true);
      }
    } else if (id === 'data') {
      dataOffset = body;
      // Streaming-WAVs tragen manchmal 0 oder 0xFFFFFFFF als Länge → auf Rest der Datei begrenzen
      dataLength = Math.min(size, view.byteLength - body);
      if (size === 0) dataLength = view.byteLength - body;
    }
    pos = body + size + (size & 1); // Chunks sind auf 2 Byte ausgerichtet
    if (size === 0 && id === 'data') break;
  }

  if (dataOffset < 0) throw new Error('WAV ohne data-Chunk');
  if (channels < 1 || sampleRate <= 0) throw new Error('WAV ohne gültigen fmt-Chunk');
  const bytesPerSample = bitsPerSample >> 3;
  if (bytesPerSample < 1) throw new Error(`Ungültige Bittiefe: ${bitsPerSample}`);

  const read = sampleReader(view, formatTag, bitsPerSample);
  const frameBytes = bytesPerSample * channels;
  const frames = Math.floor(dataLength / frameBytes);
  const pcm = new Float32Array(frames);
  const scale = 1 / channels;

  let offset = dataOffset;
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++, offset += bytesPerSample) sum += read(offset);
    pcm[i] = sum * scale;
  }
  return { pcm, sampleRate };
}

function sampleReader(view: DataView, formatTag: number, bits: number): (offset: number) => number {
  if (formatTag === FORMAT_FLOAT) {
    if (bits === 32) return (o) => view.getFloat32(o, true);
    if (bits === 64) return (o) => view.getFloat64(o, true);
  } else if (formatTag === FORMAT_PCM) {
    if (bits === 8) return (o) => (view.getUint8(o) - 128) / 128;
    if (bits === 16) return (o) => view.getInt16(o, true) / 32768;
    if (bits === 24) {
      return (o) => {
        const v = view.getUint8(o) | (view.getUint8(o + 1) << 8) | (view.getUint8(o + 2) << 16);
        return ((v << 8) >> 8) / 8388608; // Vorzeichen erweitern
      };
    }
    if (bits === 32) return (o) => view.getInt32(o, true) / 2147483648;
  }
  throw new Error(`Nicht unterstütztes WAV-Format (Tag ${formatTag}, ${bits} Bit)`);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function readAscii(view: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
