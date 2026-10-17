/**
 * Zerteilt eine lange Aufnahme (z. B. Vokabeltrack einer Unité) an Stillen in
 * Abschnitte. Dient der Lehrkraft zum Zuordnen von Audio zu Vokabeln/Sätzen.
 */

export interface SegmentOptions {
  /** Mindestlänge einer Pause, die trennt (ms) */
  minSilenceMs?: number;
  /** Schwelle relativ zum lautesten Frame (dB) */
  thresholdDb?: number;
  /** Abschnitte unter dieser Länge werden verworfen (ms) */
  minSegmentMs?: number;
  /** Rand vor/nach jedem Abschnitt (ms) */
  padMs?: number;
  /** Frame-Raster (ms) */
  frameMs?: number;
}

export interface Segment {
  /** Sekunden */
  start: number;
  end: number;
}

export function detectSegments(pcm: Float32Array, sampleRate: number, opts: SegmentOptions = {}): Segment[] {
  const minSilenceMs = opts.minSilenceMs ?? 350;
  const thresholdDb = opts.thresholdDb ?? -35;
  const minSegmentMs = opts.minSegmentMs ?? 200;
  const padMs = opts.padMs ?? 80;
  const frameMs = opts.frameMs ?? 10;
  const frame = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const n = Math.floor(pcm.length / frame);
  if (n === 0) return [];
  const rms = new Float32Array(n);
  let peak = 0;
  for (let f = 0; f < n; f++) {
    let s = 0;
    const off = f * frame;
    for (let i = 0; i < frame; i++) { const v = pcm[off + i]!; s += v * v; }
    rms[f] = Math.sqrt(s / frame);
    if (rms[f]! > peak) peak = rms[f]!;
  }
  if (peak === 0) return [];
  const thr = Math.max(peak * Math.pow(10, thresholdDb / 20), 1e-4);
  const minSilenceFrames = Math.max(1, Math.round(minSilenceMs / frameMs));
  const segments: Segment[] = [];
  let inSpeech = false;
  let segStart = 0;
  let silenceRun = 0;
  for (let f = 0; f < n; f++) {
    const loud = rms[f]! >= thr;
    if (!inSpeech) {
      if (loud) { inSpeech = true; segStart = f; silenceRun = 0; }
    } else if (loud) {
      silenceRun = 0;
    } else {
      silenceRun++;
      if (silenceRun >= minSilenceFrames) {
        segments.push({ start: segStart, end: f - silenceRun + 1 });
        inSpeech = false;
      }
    }
  }
  if (inSpeech) segments.push({ start: segStart, end: n - silenceRun });
  const total = pcm.length / sampleRate;
  return segments
    .map((s) => ({ start: Math.max(0, (s.start * frameMs - padMs) / 1000), end: Math.min(total, (s.end * frameMs + padMs) / 1000) }))
    .filter((s) => (s.end - s.start) * 1000 >= minSegmentMs);
}

/** Zwei benachbarte Abschnitte zusammenfassen. */
export function mergeSegments(segments: Segment[], index: number): Segment[] {
  if (index < 0 || index >= segments.length - 1) return segments;
  const out = segments.slice();
  out.splice(index, 2, { start: segments[index]!.start, end: segments[index + 1]!.end });
  return out;
}
