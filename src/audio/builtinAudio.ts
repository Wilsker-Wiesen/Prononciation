/**
 * Vorab erzeugte Vorbild-Aufnahmen für die eigenen Inhalte der App
 * (Konjugation, Beispielpaket, Beispiele und Minimalpaare der Missionen).
 *
 * Die Dateien entstehen im Workflow „Vorbildstimme erzeugen“ mit einer neuronalen
 * Sprachsynthese, werden dort mit dem Phonem-Erkenner geprüft und liegen dann unter
 * public/tts/ (Schlüssel = Hash des normalisierten Textes). Verlagsinhalte bekommen
 * nie synthetisches Audio aus dieser Quelle; dort gilt die Lehrwerk-Aufnahme.
 */
import { ttsKey } from './ttsKey';

export { normalizeTtsText, ttsKey } from './ttsKey';

export interface BuiltinAudioManifest {
  voice: string;
  /** Quellenangabe der Stimme (Lizenz der Trainingsdaten) */
  credit: string;
  format: string;
  /** Schlüssel → Dateiname */
  files: Record<string, string>;
}

const BASE = `${import.meta.env.BASE_URL}tts/`;
let manifestPromise: Promise<BuiltinAudioManifest | null> | null = null;

export function loadBuiltinManifest(): Promise<BuiltinAudioManifest | null> {
  manifestPromise ??= fetch(`${BASE}manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<BuiltinAudioManifest>) : null))
    .catch(() => null);
  return manifestPromise;
}

/** Vorbild-Aufnahme zu einem Text, falls vorhanden. */
export async function builtinAudio(text: string): Promise<Blob | null> {
  const m = await loadBuiltinManifest();
  const file = m?.files[ttsKey(text)];
  if (!file) return null;
  try {
    const r = await fetch(BASE + file);
    return r.ok ? await r.blob() : null;
  } catch {
    return null;
  }
}
