/**
 * Vorbild abspielen, in fester Rangfolge:
 *   1. Lehrwerk- bzw. Paket-Aufnahme (audioId)
 *   2. vorab erzeugte Vorbildstimme der App (nur eigene Inhalte, siehe builtinAudio.ts)
 *   3. Sprachausgabe des Geräts (falls erlaubt)
 */
import { audioBlob } from '../content/pack';
import { builtinAudio } from './builtinAudio';
import { player } from './player';
import { speakFrench, ttsAvailable } from './tts';

export type ModelSource = 'pack' | 'builtin' | 'device' | 'none';

export async function resolveModelAudio(text: string, audioId?: string): Promise<{ blob: Blob; source: 'pack' | 'builtin' } | null> {
  const own = await audioBlob(audioId);
  if (own) return { blob: own, source: 'pack' };
  const synth = await builtinAudio(text);
  return synth ? { blob: synth, source: 'builtin' } : null;
}

export interface PlayTextOptions {
  audioId?: string;
  start?: number;
  end?: number;
  /** Tempo: 1 = normal, < 1 = langsam */
  rate?: number;
  ttsFallback: boolean;
  voiceName?: string;
}

/** Spielt das Vorbild zu `text`; liefert die verwendete Quelle. */
export async function playText(text: string, opts: PlayTextOptions): Promise<ModelSource> {
  const audio = await resolveModelAudio(text, opts.audioId);
  const rate = opts.rate ?? 1;
  if (audio) {
    await player.play(audio.blob, audio.source === 'pack' ? { start: opts.start, end: opts.end, rate } : { rate });
    return audio.source;
  }
  if (opts.ttsFallback && ttsAvailable()) {
    await speakFrench(text, { rate: rate < 1 ? 0.7 : 0.9, voiceName: opts.voiceName });
    return 'device';
  }
  return 'none';
}
